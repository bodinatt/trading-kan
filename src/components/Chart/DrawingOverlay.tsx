import { useRef, useEffect, useCallback, useState } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useDrawingStore } from '../../stores/drawingStore';
import { useChartStore } from '../../stores/chartStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';
import type {
  Drawing,
  HLineDrawing,
  VLineDrawing,
  TrendlineDrawing,
  FibonacciDrawing,
  RectangleDrawing,
  PitchforkDrawing,
  ParallelChannelDrawing,
  ArrowDrawing,
  TextDrawing,
  RayDrawing,
  ExtendedLineDrawing,
} from '../../types/drawing';

const EMPTY_DRAWINGS: never[] = [];

type AnySeries = ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'> | ISeriesApi<'Bar'>;

interface DrawingOverlayProps {
  chartRef: React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<AnySeries | null>;
}

/** Generate a short unique id */
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Distance from point (px,py) to line segment (x1,y1)-(x2,y2) */
function distanceToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

/** Distance from point to infinite line through (x1,y1)-(x2,y2) */
function distanceToLine(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  return Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / Math.sqrt(lenSq);
}

const HIT_TOLERANCE = 8;
const HANDLE_SIZE = 6;
const HANDLE_HALF = HANDLE_SIZE / 2;

/** Deep copy a drawing, including nested point objects */
function deepCopyDrawing(d: Drawing): Drawing {
  const copy = { ...d } as any;
  if ('point1' in d) copy.point1 = { ...(d as any).point1 };
  if ('point2' in d) copy.point2 = { ...(d as any).point2 };
  if ('anchor' in d) copy.anchor = { ...(d as any).anchor };
  if ('position' in d) copy.position = { ...(d as any).position };
  return copy;
}

export function DrawingOverlay({ chartRef, seriesRef }: DrawingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // Interaction state (not in React state to avoid re-renders during draw)
  const interactionRef = useRef<{
    isDrawing: boolean;
    startTime: number | null;
    startPrice: number | null;
    currentX: number;
    currentY: number;
    // For pitchfork: track click count and intermediate points
    clickCount: number;
    pitchforkAnchor: { time: number; price: number } | null;
    pitchforkPoint1: { time: number; price: number } | null;
    // Selection drag state (handle resize)
    isDraggingHandle: boolean;
    dragDrawingId: string | null;
    dragHandleIndex: number; // which handle is being dragged
    dragCurrentTime: number | null;
    dragCurrentPrice: number | null;
    // Snapshot of the drawing being dragged (for preview during drag)
    dragOriginalDrawing: Drawing | null;
    // Body drag state (move/translate)
    isDraggingBody: boolean;
    dragStartTime: number | null;
    dragStartPrice: number | null;
  }>({
    isDrawing: false,
    startTime: null,
    startPrice: null,
    currentX: 0,
    currentY: 0,
    clickCount: 0,
    pitchforkAnchor: null,
    pitchforkPoint1: null,
    isDraggingHandle: false,
    dragDrawingId: null,
    dragHandleIndex: -1,
    dragCurrentTime: null,
    dragCurrentPrice: null,
    dragOriginalDrawing: null,
    isDraggingBody: false,
    dragStartTime: null,
    dragStartPrice: null,
  });

  const symbol = useChartStore((s) => s.symbol);
  const activeTool = useDrawingStore((s) => s.activeTool);
  const activeColor = useDrawingStore((s) => s.activeColor);
  const activeLineWidth = useDrawingStore((s) => s.activeLineWidth);
  const drawings = useDrawingStore((s) => s.drawings[symbol] ?? EMPTY_DRAWINGS);
  const addDrawing = useDrawingStore((s) => s.addDrawing);
  const setActiveTool = useDrawingStore((s) => s.setActiveTool);
  const selectedDrawingId = useDrawingStore((s) => s.selectedDrawingId);
  const setSelectedDrawing = useDrawingStore((s) => s.setSelectedDrawing);
  const removeDrawing = useDrawingStore((s) => s.removeDrawing);
  const updateDrawing = useDrawingStore((s) => s.updateDrawing);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  // Text tool inline input state
  const [textInput, setTextInput] = useState<{
    visible: boolean;
    x: number;
    y: number;
    time: number;
    price: number;
    value: string;
  }>({ visible: false, x: 0, y: 0, time: 0, price: 0, value: '' });
  const textInputRef = useRef<HTMLInputElement>(null);

  // ─── Coordinate conversion helpers ───────────────────────────
  const timeToX = useCallback(
    (time: number): number | null => {
      const chart = chartRef.current;
      if (!chart) return null;
      const x = chart.timeScale().timeToCoordinate(time as any);
      return x ?? null;
    },
    [chartRef]
  );

  const priceToY = useCallback(
    (price: number): number | null => {
      const series = seriesRef.current;
      if (!series) return null;
      const y = series.priceToCoordinate(price);
      return y ?? null;
    },
    [seriesRef]
  );

  const xToTime = useCallback(
    (x: number): number | null => {
      const chart = chartRef.current;
      if (!chart) return null;
      const time = chart.timeScale().coordinateToTime(x);
      return time as number | null;
    },
    [chartRef]
  );

  const yToPrice = useCallback(
    (y: number): number | null => {
      const series = seriesRef.current;
      if (!series) return null;
      const price = series.coordinateToPrice(y);
      return price ?? null;
    },
    [seriesRef]
  );

  // ─── Helper: extend a line (p1->p2) to canvas edges ──────────
  const extendLineToEdges = useCallback(
    (
      x1: number, y1: number, x2: number, y2: number,
      w: number, h: number, direction: 'both' | 'forward'
    ): { sx: number; sy: number; ex: number; ey: number } => {
      const dx = x2 - x1;
      const dy = y2 - y1;

      if (dx === 0 && dy === 0) return { sx: x1, sy: y1, ex: x2, ey: y2 };

      let tMin = direction === 'both' ? -1e6 : 0;
      let tMax = 1e6;

      // Clamp to canvas bounds
      if (dx !== 0) {
        const t0 = (0 - x1) / dx;
        const tW = (w - x1) / dx;
        const tLeft = Math.min(t0, tW);
        const tRight = Math.max(t0, tW);
        tMin = Math.max(tMin, tLeft);
        tMax = Math.min(tMax, tRight);
      }
      if (dy !== 0) {
        const t0 = (0 - y1) / dy;
        const tH = (h - y1) / dy;
        const tTop = Math.min(t0, tH);
        const tBot = Math.max(t0, tH);
        tMin = Math.max(tMin, tTop);
        tMax = Math.min(tMax, tBot);
      }

      return {
        sx: x1 + dx * tMin,
        sy: y1 + dy * tMin,
        ex: x1 + dx * tMax,
        ey: y1 + dy * tMax,
      };
    },
    []
  );

  // ─── Get handle positions for a drawing (in pixel coords) ─────
  const getHandlePositions = useCallback(
    (d: Drawing): { x: number; y: number }[] => {
      const handles: { x: number; y: number }[] = [];
      switch (d.type) {
        case 'hline': {
          const y = priceToY(d.price);
          if (y !== null) handles.push({ x: 30, y });
          break;
        }
        case 'vline': {
          const x = timeToX(d.time);
          if (x !== null) handles.push({ x, y: 30 });
          break;
        }
        case 'trendline':
        case 'ray':
        case 'extline':
        case 'arrow':
        case 'fibonacci': {
          const x1 = timeToX(d.point1.time);
          const y1 = priceToY(d.point1.price);
          const x2 = timeToX(d.point2.time);
          const y2 = priceToY(d.point2.price);
          if (x1 !== null && y1 !== null) handles.push({ x: x1, y: y1 });
          if (x2 !== null && y2 !== null) handles.push({ x: x2, y: y2 });
          break;
        }
        case 'rectangle': {
          const x1 = timeToX(d.point1.time);
          const y1 = priceToY(d.point1.price);
          const x2 = timeToX(d.point2.time);
          const y2 = priceToY(d.point2.price);
          if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
            handles.push({ x: x1, y: y1 }); // top-left (point1)
            handles.push({ x: x2, y: y1 }); // top-right
            handles.push({ x: x2, y: y2 }); // bottom-right (point2)
            handles.push({ x: x1, y: y2 }); // bottom-left
          }
          break;
        }
        case 'channel': {
          const x1 = timeToX(d.point1.time);
          const y1 = priceToY(d.point1.price);
          const x2 = timeToX(d.point2.time);
          const y2 = priceToY(d.point2.price);
          if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
            handles.push({ x: x1, y: y1 });
            handles.push({ x: x2, y: y2 });
            // Also show handles on parallel line
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
              const nx = (-dy / len) * d.widthOffset;
              const ny = (dx / len) * d.widthOffset;
              handles.push({ x: x1 + nx, y: y1 + ny });
              handles.push({ x: x2 + nx, y: y2 + ny });
            }
          }
          break;
        }
        case 'pitchfork': {
          const ax = timeToX(d.anchor.time);
          const ay = priceToY(d.anchor.price);
          const x1 = timeToX(d.point1.time);
          const y1 = priceToY(d.point1.price);
          const x2 = timeToX(d.point2.time);
          const y2 = priceToY(d.point2.price);
          if (ax !== null && ay !== null) handles.push({ x: ax, y: ay }); // handle 0 = anchor
          if (x1 !== null && y1 !== null) handles.push({ x: x1, y: y1 }); // handle 1 = point1
          if (x2 !== null && y2 !== null) handles.push({ x: x2, y: y2 }); // handle 2 = point2
          break;
        }
        case 'text': {
          const x = timeToX(d.position.time);
          const y = priceToY(d.position.price);
          if (x !== null && y !== null) handles.push({ x, y });
          break;
        }
      }
      return handles;
    },
    [timeToX, priceToY]
  );

  // ─── Hit-testing: check if click at (cx,cy) hits drawing d ────
  const hitTestDrawing = useCallback(
    (d: Drawing, cx: number, cy: number, w: number, h: number): boolean => {
      switch (d.type) {
        case 'hline': {
          const y = priceToY(d.price);
          return y !== null && Math.abs(cy - y) < HIT_TOLERANCE;
        }
        case 'vline': {
          const x = timeToX(d.time);
          return x !== null && Math.abs(cx - x) < HIT_TOLERANCE;
        }
        case 'trendline': {
          const x1 = timeToX(d.point1.time);
          const y1 = priceToY(d.point1.price);
          const x2 = timeToX(d.point2.time);
          const y2 = priceToY(d.point2.price);
          if (x1 === null || y1 === null || x2 === null || y2 === null) return false;
          return distanceToLineSegment(cx, cy, x1, y1, x2, y2) < HIT_TOLERANCE;
        }
        case 'ray': {
          const x1 = timeToX(d.point1.time);
          const y1 = priceToY(d.point1.price);
          const x2 = timeToX(d.point2.time);
          const y2 = priceToY(d.point2.price);
          if (x1 === null || y1 === null || x2 === null || y2 === null) return false;
          // Ray extends forward from point1 through point2
          const ext = extendLineToEdges(x1, y1, x2, y2, w, h, 'forward');
          return distanceToLineSegment(cx, cy, x1, y1, ext.ex, ext.ey) < HIT_TOLERANCE;
        }
        case 'extline': {
          const x1 = timeToX(d.point1.time);
          const y1 = priceToY(d.point1.price);
          const x2 = timeToX(d.point2.time);
          const y2 = priceToY(d.point2.price);
          if (x1 === null || y1 === null || x2 === null || y2 === null) return false;
          return distanceToLine(cx, cy, x1, y1, x2, y2) < HIT_TOLERANCE;
        }
        case 'arrow': {
          const x1 = timeToX(d.point1.time);
          const y1 = priceToY(d.point1.price);
          const x2 = timeToX(d.point2.time);
          const y2 = priceToY(d.point2.price);
          if (x1 === null || y1 === null || x2 === null || y2 === null) return false;
          return distanceToLineSegment(cx, cy, x1, y1, x2, y2) < HIT_TOLERANCE;
        }
        case 'rectangle': {
          const x1 = timeToX(d.point1.time);
          const y1 = priceToY(d.point1.price);
          const x2 = timeToX(d.point2.time);
          const y2 = priceToY(d.point2.price);
          if (x1 === null || y1 === null || x2 === null || y2 === null) return false;
          const rx = Math.min(x1, x2);
          const ry = Math.min(y1, y2);
          const rw = Math.abs(x2 - x1);
          const rh = Math.abs(y2 - y1);
          // Inside rect or within tolerance of border
          const insideX = cx >= rx - HIT_TOLERANCE && cx <= rx + rw + HIT_TOLERANCE;
          const insideY = cy >= ry - HIT_TOLERANCE && cy <= ry + rh + HIT_TOLERANCE;
          if (!insideX || !insideY) return false;
          // Near border?
          const nearLeft = Math.abs(cx - rx) < HIT_TOLERANCE;
          const nearRight = Math.abs(cx - (rx + rw)) < HIT_TOLERANCE;
          const nearTop = Math.abs(cy - ry) < HIT_TOLERANCE;
          const nearBottom = Math.abs(cy - (ry + rh)) < HIT_TOLERANCE;
          // Inside the rect area counts as a hit too
          const fullyInside = cx >= rx && cx <= rx + rw && cy >= ry && cy <= ry + rh;
          return fullyInside || nearLeft || nearRight || nearTop || nearBottom;
        }
        case 'fibonacci': {
          const priceDiff = d.point2.price - d.point1.price;
          for (const level of d.levels) {
            const price = d.point1.price + priceDiff * level;
            const y = priceToY(price);
            if (y !== null && Math.abs(cy - y) < HIT_TOLERANCE) return true;
          }
          return false;
        }
        case 'channel': {
          const x1 = timeToX(d.point1.time);
          const y1 = priceToY(d.point1.price);
          const x2 = timeToX(d.point2.time);
          const y2 = priceToY(d.point2.price);
          if (x1 === null || y1 === null || x2 === null || y2 === null) return false;
          // Main line
          if (distanceToLineSegment(cx, cy, x1, y1, x2, y2) < HIT_TOLERANCE) return true;
          // Parallel line
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            const nx = (-dy / len) * d.widthOffset;
            const ny = (dx / len) * d.widthOffset;
            if (distanceToLineSegment(cx, cy, x1 + nx, y1 + ny, x2 + nx, y2 + ny) < HIT_TOLERANCE) return true;
          }
          return false;
        }
        case 'pitchfork': {
          const ax = timeToX(d.anchor.time);
          const ay = priceToY(d.anchor.price);
          const x1 = timeToX(d.point1.time);
          const y1 = priceToY(d.point1.price);
          const x2 = timeToX(d.point2.time);
          const y2 = priceToY(d.point2.price);
          if (ax === null || ay === null || x1 === null || y1 === null || x2 === null || y2 === null) return false;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          // Median line
          if (distanceToLineSegment(cx, cy, ax, ay, mx, my) < HIT_TOLERANCE) return true;
          // Upper prong direction
          const udx = mx - ax;
          const udy = my - ay;
          if (distanceToLineSegment(cx, cy, x1, y1, x1 + udx, y1 + udy) < HIT_TOLERANCE) return true;
          // Lower prong
          if (distanceToLineSegment(cx, cy, x2, y2, x2 + udx, y2 + udy) < HIT_TOLERANCE) return true;
          return false;
        }
        case 'text': {
          const x = timeToX(d.position.time);
          const y = priceToY(d.position.price);
          if (x === null || y === null) return false;
          // Approximate text bounding box
          const textWidth = d.text.length * d.fontSize * 0.6;
          const textHeight = d.fontSize;
          return cx >= x && cx <= x + textWidth && cy >= y - textHeight && cy <= y;
        }
      }
      return false;
    },
    [timeToX, priceToY, extendLineToEdges]
  );

  // ─── Check if click is near a handle, return handle index or -1 ─
  const hitTestHandle = useCallback(
    (d: Drawing, cx: number, cy: number): number => {
      const handles = getHandlePositions(d);
      for (let i = 0; i < handles.length; i++) {
        const h = handles[i];
        if (Math.abs(cx - h.x) < HIT_TOLERANCE && Math.abs(cy - h.y) < HIT_TOLERANCE) {
          return i;
        }
      }
      return -1;
    },
    [getHandlePositions]
  );

  // ─── Build a modified drawing with one handle moved ────────────
  const applyHandleDrag = useCallback(
    (d: Drawing, handleIndex: number, newTime: number, newPrice: number): Partial<Drawing> => {
      switch (d.type) {
        case 'hline':
          return { price: newPrice } as Partial<Drawing>;
        case 'vline':
          return { time: newTime } as Partial<Drawing>;
        case 'trendline':
        case 'ray':
        case 'extline':
        case 'arrow':
          if (handleIndex === 0) return { point1: { time: newTime, price: newPrice } } as Partial<Drawing>;
          return { point2: { time: newTime, price: newPrice } } as Partial<Drawing>;
        case 'fibonacci':
          if (handleIndex === 0) return { point1: { time: newTime, price: newPrice } } as Partial<Drawing>;
          return { point2: { time: newTime, price: newPrice } } as Partial<Drawing>;
        case 'rectangle': {
          // handleIndex: 0=p1, 1=topRight, 2=p2, 3=bottomLeft
          const p1 = { ...d.point1 };
          const p2 = { ...d.point2 };
          if (handleIndex === 0) { p1.time = newTime; p1.price = newPrice; }
          else if (handleIndex === 1) { p2.time = newTime; p1.price = newPrice; }
          else if (handleIndex === 2) { p2.time = newTime; p2.price = newPrice; }
          else if (handleIndex === 3) { p1.time = newTime; p2.price = newPrice; }
          return { point1: p1, point2: p2 } as Partial<Drawing>;
        }
        case 'channel':
          if (handleIndex === 0) return { point1: { time: newTime, price: newPrice } } as Partial<Drawing>;
          if (handleIndex === 1) return { point2: { time: newTime, price: newPrice } } as Partial<Drawing>;
          // handles 2,3 are on parallel line - adjust widthOffset
          // For simplicity, dragging parallel handles changes widthOffset
          return {} as Partial<Drawing>;
        case 'pitchfork':
          if (handleIndex === 0) return { anchor: { time: newTime, price: newPrice } } as Partial<Drawing>;
          if (handleIndex === 1) return { point1: { time: newTime, price: newPrice } } as Partial<Drawing>;
          return { point2: { time: newTime, price: newPrice } } as Partial<Drawing>;
        case 'text':
          return { position: { time: newTime, price: newPrice } } as Partial<Drawing>;
      }
      return {};
    },
    []
  );

  // ─── Build a translated copy of a drawing (move all points by delta) ──
  const applyBodyDrag = useCallback(
    (d: Drawing, deltaTime: number, deltaPrice: number): Partial<Drawing> => {
      switch (d.type) {
        case 'hline':
          return { price: d.price + deltaPrice } as Partial<Drawing>;
        case 'vline':
          return { time: d.time + deltaTime } as Partial<Drawing>;
        case 'trendline':
        case 'ray':
        case 'extline':
        case 'arrow':
          return {
            point1: { time: d.point1.time + deltaTime, price: d.point1.price + deltaPrice },
            point2: { time: d.point2.time + deltaTime, price: d.point2.price + deltaPrice },
          } as Partial<Drawing>;
        case 'fibonacci':
          return {
            point1: { time: d.point1.time + deltaTime, price: d.point1.price + deltaPrice },
            point2: { time: d.point2.time + deltaTime, price: d.point2.price + deltaPrice },
          } as Partial<Drawing>;
        case 'rectangle':
          return {
            point1: { time: d.point1.time + deltaTime, price: d.point1.price + deltaPrice },
            point2: { time: d.point2.time + deltaTime, price: d.point2.price + deltaPrice },
          } as Partial<Drawing>;
        case 'channel':
          return {
            point1: { time: d.point1.time + deltaTime, price: d.point1.price + deltaPrice },
            point2: { time: d.point2.time + deltaTime, price: d.point2.price + deltaPrice },
          } as Partial<Drawing>;
        case 'pitchfork':
          return {
            anchor: { time: d.anchor.time + deltaTime, price: d.anchor.price + deltaPrice },
            point1: { time: d.point1.time + deltaTime, price: d.point1.price + deltaPrice },
            point2: { time: d.point2.time + deltaTime, price: d.point2.price + deltaPrice },
          } as Partial<Drawing>;
        case 'text':
          return {
            position: { time: d.position.time + deltaTime, price: d.position.price + deltaPrice },
          } as Partial<Drawing>;
      }
      return {};
    },
    []
  );

  // ─── Get a preview drawing with handle dragged or body moved ──
  const getPreviewDrawing = useCallback((): Drawing | null => {
    const ref = interactionRef.current;
    if (!ref.dragOriginalDrawing || ref.dragCurrentTime === null || ref.dragCurrentPrice === null) {
      return null;
    }
    if (ref.isDraggingHandle) {
      const updates = applyHandleDrag(ref.dragOriginalDrawing, ref.dragHandleIndex, ref.dragCurrentTime, ref.dragCurrentPrice);
      return { ...ref.dragOriginalDrawing, ...updates } as Drawing;
    }
    if (ref.isDraggingBody && ref.dragStartTime !== null && ref.dragStartPrice !== null) {
      const deltaTime = ref.dragCurrentTime - ref.dragStartTime;
      const deltaPrice = ref.dragCurrentPrice - ref.dragStartPrice;
      const updates = applyBodyDrag(ref.dragOriginalDrawing, deltaTime, deltaPrice);
      return { ...ref.dragOriginalDrawing, ...updates } as Drawing;
    }
    return null;
  }, [applyHandleDrag, applyBodyDrag]);

  // ─── Drawing renderers ───────────────────────────────────────
  const drawHLine = useCallback(
    (ctx: CanvasRenderingContext2D, d: HLineDrawing, w: number) => {
      const y = priceToY(d.price);
      if (y === null) return;
      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.lineWidth;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Price label
      ctx.fillStyle = d.color;
      ctx.font = '11px monospace';
      ctx.fillText(d.price.toFixed(2), 4, y - 4);
    },
    [priceToY]
  );

  const drawVLine = useCallback(
    (ctx: CanvasRenderingContext2D, d: VLineDrawing, h: number) => {
      const x = timeToX(d.time);
      if (x === null) return;
      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.lineWidth;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.setLineDash([]);
    },
    [timeToX]
  );

  const drawTrendline = useCallback(
    (ctx: CanvasRenderingContext2D, d: TrendlineDrawing) => {
      const x1 = timeToX(d.point1.time);
      const y1 = priceToY(d.point1.price);
      const x2 = timeToX(d.point2.time);
      const y2 = priceToY(d.point2.price);
      if (x1 === null || y1 === null || x2 === null || y2 === null) return;
      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.lineWidth;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      // Small circles at endpoints
      for (const [px, py] of [[x1, y1], [x2, y2]]) {
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [timeToX, priceToY]
  );

  const drawFibonacci = useCallback(
    (ctx: CanvasRenderingContext2D, d: FibonacciDrawing, w: number) => {
      const y1 = priceToY(d.point1.price);
      const y2 = priceToY(d.point2.price);
      if (y1 === null || y2 === null) return;

      const priceDiff = d.point2.price - d.point1.price;

      for (const level of d.levels) {
        const price = d.point1.price + priceDiff * level;
        const y = priceToY(price);
        if (y === null) continue;

        const alpha = level === 0 || level === 1 ? 0.8 : 0.5;
        ctx.strokeStyle = d.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = level === 0 || level === 1 ? d.lineWidth : 1;
        ctx.setLineDash(level === 0.5 ? [4, 4] : []);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();

        // Level label
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = d.color;
        ctx.font = '10px monospace';
        ctx.fillText(`${(level * 100).toFixed(1)}% (${price.toFixed(2)})`, 4, y - 3);
      }

      // Shaded region between 0.382 and 0.618
      const y382 = priceToY(d.point1.price + priceDiff * 0.382);
      const y618 = priceToY(d.point1.price + priceDiff * 0.618);
      if (y382 !== null && y618 !== null) {
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = d.color;
        ctx.fillRect(0, Math.min(y382, y618), w, Math.abs(y618 - y382));
      }

      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    },
    [priceToY]
  );

  const drawRectangle = useCallback(
    (ctx: CanvasRenderingContext2D, d: RectangleDrawing) => {
      const x1 = timeToX(d.point1.time);
      const y1 = priceToY(d.point1.price);
      const x2 = timeToX(d.point2.time);
      const y2 = priceToY(d.point2.price);
      if (x1 === null || y1 === null || x2 === null || y2 === null) return;

      const rx = Math.min(x1, x2);
      const ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1);
      const rh = Math.abs(y2 - y1);

      ctx.globalAlpha = 0.1;
      ctx.fillStyle = d.color;
      ctx.fillRect(rx, ry, rw, rh);

      ctx.globalAlpha = 1;
      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.lineWidth;
      ctx.strokeRect(rx, ry, rw, rh);
    },
    [timeToX, priceToY]
  );

  const drawRay = useCallback(
    (ctx: CanvasRenderingContext2D, d: RayDrawing, w: number, h: number) => {
      const x1 = timeToX(d.point1.time);
      const y1 = priceToY(d.point1.price);
      const x2 = timeToX(d.point2.time);
      const y2 = priceToY(d.point2.price);
      if (x1 === null || y1 === null || x2 === null || y2 === null) return;

      const ext = extendLineToEdges(x1, y1, x2, y2, w, h, 'forward');

      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.lineWidth;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(ext.ex, ext.ey);
      ctx.stroke();

      // Dot at start
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(x1, y1, 3, 0, Math.PI * 2);
      ctx.fill();
    },
    [timeToX, priceToY, extendLineToEdges]
  );

  const drawExtLine = useCallback(
    (ctx: CanvasRenderingContext2D, d: ExtendedLineDrawing, w: number, h: number) => {
      const x1 = timeToX(d.point1.time);
      const y1 = priceToY(d.point1.price);
      const x2 = timeToX(d.point2.time);
      const y2 = priceToY(d.point2.price);
      if (x1 === null || y1 === null || x2 === null || y2 === null) return;

      const ext = extendLineToEdges(x1, y1, x2, y2, w, h, 'both');

      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.lineWidth;
      ctx.beginPath();
      ctx.moveTo(ext.sx, ext.sy);
      ctx.lineTo(ext.ex, ext.ey);
      ctx.stroke();

      // Dots at the two defining points
      for (const [px, py] of [[x1, y1], [x2, y2]]) {
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [timeToX, priceToY, extendLineToEdges]
  );

  const drawArrow = useCallback(
    (ctx: CanvasRenderingContext2D, d: ArrowDrawing) => {
      const x1 = timeToX(d.point1.time);
      const y1 = priceToY(d.point1.price);
      const x2 = timeToX(d.point2.time);
      const y2 = priceToY(d.point2.price);
      if (x1 === null || y1 === null || x2 === null || y2 === null) return;

      // Draw line
      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.lineWidth;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw arrowhead at point2
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = 12;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - headLen * Math.cos(angle - Math.PI / 6),
        y2 - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        x2 - headLen * Math.cos(angle + Math.PI / 6),
        y2 - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    },
    [timeToX, priceToY]
  );

  const drawTextDrawing = useCallback(
    (ctx: CanvasRenderingContext2D, d: TextDrawing) => {
      const x = timeToX(d.position.time);
      const y = priceToY(d.position.price);
      if (x === null || y === null) return;

      ctx.fillStyle = d.color;
      ctx.font = `${d.fontSize}px sans-serif`;
      ctx.fillText(d.text, x, y);
    },
    [timeToX, priceToY]
  );

  const drawChannel = useCallback(
    (ctx: CanvasRenderingContext2D, d: ParallelChannelDrawing) => {
      const x1 = timeToX(d.point1.time);
      const y1 = priceToY(d.point1.price);
      const x2 = timeToX(d.point2.time);
      const y2 = priceToY(d.point2.price);
      if (x1 === null || y1 === null || x2 === null || y2 === null) return;

      // Compute perpendicular offset
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return;
      const nx = -dy / len * d.widthOffset;
      const ny = dx / len * d.widthOffset;

      // Main line
      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.lineWidth;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Parallel line
      ctx.beginPath();
      ctx.moveTo(x1 + nx, y1 + ny);
      ctx.lineTo(x2 + nx, y2 + ny);
      ctx.stroke();

      // Shaded fill between
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2 + nx, y2 + ny);
      ctx.lineTo(x1 + nx, y1 + ny);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    },
    [timeToX, priceToY]
  );

  const drawPitchfork = useCallback(
    (ctx: CanvasRenderingContext2D, d: PitchforkDrawing, w: number, h: number) => {
      const ax = timeToX(d.anchor.time);
      const ay = priceToY(d.anchor.price);
      const x1 = timeToX(d.point1.time);
      const y1 = priceToY(d.point1.price);
      const x2 = timeToX(d.point2.time);
      const y2 = priceToY(d.point2.price);
      if (ax === null || ay === null || x1 === null || y1 === null || x2 === null || y2 === null) return;

      // Midpoint of point1 and point2
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;

      // Median line: anchor -> midpoint, extended to edge
      const medExt = extendLineToEdges(ax, ay, mx, my, w, h, 'forward');
      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.lineWidth;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(medExt.ex, medExt.ey);
      ctx.stroke();

      // Upper prong: parallel to median through point1
      const udx = mx - ax;
      const udy = my - ay;
      const up1x = x1;
      const up1y = y1;
      const up2x = x1 + udx;
      const up2y = y1 + udy;
      const upExt = extendLineToEdges(up1x, up1y, up2x, up2y, w, h, 'forward');
      ctx.beginPath();
      ctx.moveTo(up1x, up1y);
      ctx.lineTo(upExt.ex, upExt.ey);
      ctx.stroke();

      // Lower prong: parallel to median through point2
      const lp1x = x2;
      const lp1y = y2;
      const lp2x = x2 + udx;
      const lp2y = y2 + udy;
      const loExt = extendLineToEdges(lp1x, lp1y, lp2x, lp2y, w, h, 'forward');
      ctx.beginPath();
      ctx.moveTo(lp1x, lp1y);
      ctx.lineTo(loExt.ex, loExt.ey);
      ctx.stroke();

      // Draw dots at anchor, point1, point2
      for (const [px, py] of [[ax, ay], [x1, y1], [x2, y2]]) {
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [timeToX, priceToY, extendLineToEdges]
  );

  // ─── Render a single drawing (used for both real and preview) ──
  const renderDrawing = useCallback(
    (ctx: CanvasRenderingContext2D, d: Drawing, w: number, h: number) => {
      switch (d.type) {
        case 'hline': drawHLine(ctx, d, w); break;
        case 'vline': drawVLine(ctx, d, h); break;
        case 'trendline': drawTrendline(ctx, d); break;
        case 'fibonacci': drawFibonacci(ctx, d, w); break;
        case 'rectangle': drawRectangle(ctx, d); break;
        case 'ray': drawRay(ctx, d, w, h); break;
        case 'extline': drawExtLine(ctx, d, w, h); break;
        case 'arrow': drawArrow(ctx, d); break;
        case 'text': drawTextDrawing(ctx, d); break;
        case 'channel': drawChannel(ctx, d); break;
        case 'pitchfork': drawPitchfork(ctx, d, w, h); break;
      }
    },
    [drawHLine, drawVLine, drawTrendline, drawFibonacci, drawRectangle, drawRay, drawExtLine, drawArrow, drawTextDrawing, drawChannel, drawPitchfork]
  );

  // ─── Draw selection handles and delete button ──────────────────
  const drawSelectionUI = useCallback(
    (ctx: CanvasRenderingContext2D, d: Drawing) => {
      const handles = getHandlePositions(d);

      // Draw handles
      for (const h of handles) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 1.5;
        ctx.fillRect(h.x - HANDLE_HALF, h.y - HANDLE_HALF, HANDLE_SIZE, HANDLE_SIZE);
        ctx.strokeRect(h.x - HANDLE_HALF, h.y - HANDLE_HALF, HANDLE_SIZE, HANDLE_SIZE);
      }

      // Draw delete button (small "x" circle) near the drawing
      // Position it near the topmost-rightmost handle
      if (handles.length > 0) {
        let topRight = handles[0];
        for (const h of handles) {
          if (h.x > topRight.x || (h.x === topRight.x && h.y < topRight.y)) {
            topRight = h;
          }
        }
        const btnX = topRight.x + 16;
        const btnY = topRight.y - 16;
        const btnR = 10;

        // Circle background with shadow for visibility
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // "x" inside
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(btnX - 4, btnY - 4);
        ctx.lineTo(btnX + 4, btnY + 4);
        ctx.moveTo(btnX + 4, btnY - 4);
        ctx.lineTo(btnX - 4, btnY + 4);
        ctx.stroke();

        // Store delete button position for click detection (via interactionRef is messy,
        // so we just recalculate in handleMouseDown)
      }
    },
    [getHandlePositions]
  );

  // ─── Get delete button position for a drawing ─────────────────
  const getDeleteButtonPos = useCallback(
    (d: Drawing): { x: number; y: number; r: number } | null => {
      const handles = getHandlePositions(d);
      if (handles.length === 0) return null;
      let topRight = handles[0];
      for (const h of handles) {
        if (h.x > topRight.x || (h.x === topRight.x && h.y < topRight.y)) {
          topRight = h;
        }
      }
      return { x: topRight.x + 16, y: topRight.y - 16, r: 10 };
    },
    [getHandlePositions]
  );

  // ─── Main render function ────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const ref = interactionRef.current;
    const previewDrawing = getPreviewDrawing();

    // Render persisted drawings
    for (const d of drawings) {
      ctx.save();

      // If this drawing is being dragged (handle or body), render the preview version instead
      if ((ref.isDraggingHandle || ref.isDraggingBody) && d.id === ref.dragDrawingId && previewDrawing) {
        // Draw with selection glow
        ctx.shadowColor = previewDrawing.color;
        ctx.shadowBlur = 6;
        renderDrawing(ctx, previewDrawing, w, h);
        ctx.shadowBlur = 0;
        drawSelectionUI(ctx, previewDrawing);
      } else if (d.id === selectedDrawingId) {
        // Selected drawing: render with glow
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 6;
        renderDrawing(ctx, d, w, h);
        ctx.shadowBlur = 0;
        drawSelectionUI(ctx, d);
      } else {
        renderDrawing(ctx, d, w, h);
      }

      ctx.restore();
    }

    // Render in-progress drawing (preview)
    const { isDrawing, startTime, startPrice, currentX, currentY } = ref;
    if (isDrawing && startTime !== null && startPrice !== null && !ref.isDraggingHandle && !ref.isDraggingBody) {
      const currentTime = xToTime(currentX);
      const currentPrice = yToPrice(currentY);
      if (currentTime === null || currentPrice === null) return;

      ctx.save();
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = activeLineWidth;
      ctx.globalAlpha = 0.7;

      const sx = timeToX(startTime);
      const sy = priceToY(startPrice);
      if (sx === null || sy === null) {
        ctx.restore();
        return;
      }

      switch (activeTool) {
        case 'hline': {
          ctx.setLineDash([6, 3]);
          ctx.beginPath();
          ctx.moveTo(0, currentY);
          ctx.lineTo(w, currentY);
          ctx.stroke();
          break;
        }
        case 'vline': {
          ctx.setLineDash([6, 3]);
          ctx.beginPath();
          ctx.moveTo(currentX, 0);
          ctx.lineTo(currentX, h);
          ctx.stroke();
          break;
        }
        case 'trendline':
        case 'arrow': {
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(currentX, currentY);
          ctx.stroke();
          if (activeTool === 'arrow') {
            // Preview arrowhead
            const angle = Math.atan2(currentY - sy, currentX - sx);
            const headLen = 12;
            ctx.fillStyle = activeColor;
            ctx.beginPath();
            ctx.moveTo(currentX, currentY);
            ctx.lineTo(
              currentX - headLen * Math.cos(angle - Math.PI / 6),
              currentY - headLen * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              currentX - headLen * Math.cos(angle + Math.PI / 6),
              currentY - headLen * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
          }
          break;
        }
        case 'ray': {
          const rayExt = extendLineToEdges(sx, sy, currentX, currentY, w, h, 'forward');
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(rayExt.ex, rayExt.ey);
          ctx.stroke();
          break;
        }
        case 'extline': {
          const extExt = extendLineToEdges(sx, sy, currentX, currentY, w, h, 'both');
          ctx.beginPath();
          ctx.moveTo(extExt.sx, extExt.sy);
          ctx.lineTo(extExt.ex, extExt.ey);
          ctx.stroke();
          break;
        }
        case 'channel': {
          // Preview: main line + parallel line offset by 40px default
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(currentX, currentY);
          ctx.stroke();
          const cdx = currentX - sx;
          const cdy = currentY - sy;
          const clen = Math.sqrt(cdx * cdx + cdy * cdy);
          if (clen > 0) {
            const offset = 40;
            const cnx = (-cdy / clen) * offset;
            const cny = (cdx / clen) * offset;
            ctx.beginPath();
            ctx.moveTo(sx + cnx, sy + cny);
            ctx.lineTo(currentX + cnx, currentY + cny);
            ctx.stroke();
          }
          break;
        }
        case 'pitchfork': {
          // Preview depends on how many points placed so far
          const { clickCount, pitchforkAnchor, pitchforkPoint1 } = ref;
          if (clickCount === 1 && pitchforkAnchor) {
            // Line from anchor to cursor
            const pax = timeToX(pitchforkAnchor.time);
            const pay = priceToY(pitchforkAnchor.price);
            if (pax !== null && pay !== null) {
              ctx.beginPath();
              ctx.moveTo(pax, pay);
              ctx.lineTo(currentX, currentY);
              ctx.stroke();
            }
          } else if (clickCount === 2 && pitchforkAnchor && pitchforkPoint1) {
            const pax = timeToX(pitchforkAnchor.time);
            const pay = priceToY(pitchforkAnchor.price);
            const pp1x = timeToX(pitchforkPoint1.time);
            const pp1y = priceToY(pitchforkPoint1.price);
            if (pax !== null && pay !== null && pp1x !== null && pp1y !== null) {
              // Show line from anchor, and line from point1 to cursor
              ctx.beginPath();
              ctx.moveTo(pax, pay);
              const pmx = (pp1x + currentX) / 2;
              const pmy = (pp1y + currentY) / 2;
              ctx.lineTo(pmx, pmy);
              ctx.stroke();
              // Show points
              ctx.fillStyle = activeColor;
              for (const [px, py] of [[pax, pay], [pp1x, pp1y]]) {
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fill();
              }
              // Show cursor point
              ctx.beginPath();
              ctx.arc(currentX, currentY, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
        }
        case 'fibonacci': {
          const priceDiff = currentPrice - startPrice;
          const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          for (const level of levels) {
            const price = startPrice + priceDiff * level;
            const y = priceToY(price);
            if (y === null) continue;
            ctx.setLineDash(level === 0.5 ? [4, 4] : []);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
            ctx.font = '10px monospace';
            ctx.fillStyle = activeColor;
            ctx.fillText(`${(level * 100).toFixed(1)}%`, 4, y - 3);
          }
          break;
        }
        case 'rectangle': {
          const rx = Math.min(sx, currentX);
          const ry = Math.min(sy, currentY);
          const rw = Math.abs(currentX - sx);
          const rh = Math.abs(currentY - sy);
          ctx.globalAlpha = 0.1;
          ctx.fillStyle = activeColor;
          ctx.fillRect(rx, ry, rw, rh);
          ctx.globalAlpha = 0.7;
          ctx.strokeRect(rx, ry, rw, rh);
          break;
        }
      }
      ctx.restore();
    }
  }, [
    drawings,
    activeTool,
    activeColor,
    activeLineWidth,
    selectedDrawingId,
    renderDrawing,
    drawSelectionUI,
    getPreviewDrawing,
    extendLineToEdges,
    timeToX,
    priceToY,
    xToTime,
    yToPrice,
  ]);

  // ─── Animation loop ──────────────────────────────────────────
  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);
  }, [render]);

  // Re-render on drawings / tool / selection changes
  useEffect(() => {
    scheduleRender();
  }, [scheduleRender]);

  // Subscribe to chart viewport changes to re-render drawings
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const onVisibleRangeChange = () => scheduleRender();
    const onCrosshairMove = () => {
      if (interactionRef.current.isDrawing || interactionRef.current.isDraggingHandle || interactionRef.current.isDraggingBody) {
        scheduleRender();
      }
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleRangeChange);
    chart.subscribeCrosshairMove(onCrosshairMove);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onVisibleRangeChange);
      chart.unsubscribeCrosshairMove(onCrosshairMove);
    };
  }, [chartRef, scheduleRender]);

  // ─── Resize canvas to match parent ───────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver(() => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      scheduleRender();
    });
    ro.observe(parent);

    // Initial size
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    scheduleRender();

    return () => ro.disconnect();
  }, [scheduleRender]);

  // ─── Keyboard handler for Delete/Backspace/Escape ─────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedDrawingId) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          // Don't delete if user is typing in an input
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
          e.preventDefault();
          removeDrawing(symbol, selectedDrawingId);
        }
        if (e.key === 'Escape') {
          setSelectedDrawing(null);
          scheduleRender();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawingId, symbol, removeDrawing, setSelectedDrawing, scheduleRender]);

  // ─── Mouse handlers ──────────────────────────────────────────
  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      const canvas = canvasRef.current;
      const w = canvas?.width ?? 0;
      const h = canvas?.height ?? 0;

      // ─── Cursor mode: selection / handle drag / delete button ───
      if (activeTool === 'cursor') {
        // Check delete button on selected drawing first
        if (selectedDrawingId) {
          const selDrawing = drawings.find((d) => d.id === selectedDrawingId);
          if (selDrawing) {
            const delBtn = getDeleteButtonPos(selDrawing);
            if (delBtn) {
              const dist = Math.sqrt((x - delBtn.x) ** 2 + (y - delBtn.y) ** 2);
              if (dist <= delBtn.r + 2) {
                removeDrawing(symbol, selectedDrawingId);
                scheduleRender();
                return;
              }
            }

            // Check if clicking on a handle of the selected drawing
            const handleIdx = hitTestHandle(selDrawing, x, y);
            if (handleIdx >= 0) {
              // Start dragging this handle (resize)
              const ref = interactionRef.current;
              ref.isDraggingHandle = true;
              ref.dragDrawingId = selDrawing.id;
              ref.dragHandleIndex = handleIdx;
              ref.dragOriginalDrawing = deepCopyDrawing(selDrawing);
              ref.dragCurrentTime = xToTime(x);
              ref.dragCurrentPrice = yToPrice(y);
              ref.currentX = x;
              ref.currentY = y;
              return;
            }

            // Check if clicking on the body of the selected drawing (start body drag / move)
            if (hitTestDrawing(selDrawing, x, y, w, h)) {
              const ref = interactionRef.current;
              ref.isDraggingBody = true;
              ref.dragDrawingId = selDrawing.id;
              ref.dragOriginalDrawing = deepCopyDrawing(selDrawing);
              ref.dragStartTime = xToTime(x);
              ref.dragStartPrice = yToPrice(y);
              ref.dragCurrentTime = ref.dragStartTime;
              ref.dragCurrentPrice = ref.dragStartPrice;
              ref.currentX = x;
              ref.currentY = y;
              return;
            }
          }
        }

        // Hit-test all drawings (iterate in reverse so top-most is selected first)
        let hitId: string | null = null;
        for (let i = drawings.length - 1; i >= 0; i--) {
          if (hitTestDrawing(drawings[i], x, y, w, h)) {
            hitId = drawings[i].id;
            break;
          }
        }

        if (hitId !== selectedDrawingId) {
          setSelectedDrawing(hitId);
          scheduleRender();
        }

        // If we hit a drawing, consume the event (don't pass to chart)
        if (hitId) return;

        // If we didn't hit any drawing, pass the event through to the chart
        // by temporarily disabling pointer events and re-dispatching
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.style.pointerEvents = 'none';
          const target = document.elementFromPoint(e.clientX, e.clientY);
          if (target && target !== canvas) {
            target.dispatchEvent(new MouseEvent('mousedown', {
              clientX: e.clientX,
              clientY: e.clientY,
              button: e.button,
              bubbles: true,
              cancelable: true,
            }));
          }
          // Re-enable pointer events after a short delay
          requestAnimationFrame(() => {
            if (canvas) canvas.style.pointerEvents = needsPointerEvents ? 'auto' : 'none';
          });
        }
        return;
      }

      // ─── Tool mode: drawing creation (original logic) ───────────
      const time = xToTime(x);
      const price = yToPrice(y);

      if (activeTool === 'hline' && price !== null) {
        addDrawing(symbol, {
          id: uid(),
          type: 'hline',
          symbol,
          color: activeColor,
          lineWidth: activeLineWidth,
          price,
        });
        setActiveTool('cursor');
        return;
      }

      if (activeTool === 'vline' && time !== null) {
        addDrawing(symbol, {
          id: uid(),
          type: 'vline',
          symbol,
          color: activeColor,
          lineWidth: activeLineWidth,
          time,
        });
        setActiveTool('cursor');
        return;
      }

      // Text tool: single click opens inline text input
      if (activeTool === 'text' && time !== null && price !== null) {
        setTextInput({ visible: true, x, y, time, price, value: '' });
        // Focus will be set via useEffect
        setTimeout(() => textInputRef.current?.focus(), 50);
        return;
      }

      // Pitchfork tool: 3-click placement
      if (activeTool === 'pitchfork' && time !== null && price !== null) {
        const ref = interactionRef.current;
        if (ref.clickCount === 0) {
          // First click: set anchor
          ref.pitchforkAnchor = { time, price };
          ref.clickCount = 1;
          ref.isDrawing = true;
          ref.startTime = time;
          ref.startPrice = price;
          ref.currentX = x;
          ref.currentY = y;
          scheduleRender();
          return;
        } else if (ref.clickCount === 1) {
          // Second click: set point1
          ref.pitchforkPoint1 = { time, price };
          ref.clickCount = 2;
          ref.currentX = x;
          ref.currentY = y;
          scheduleRender();
          return;
        } else if (ref.clickCount === 2 && ref.pitchforkAnchor && ref.pitchforkPoint1) {
          // Third click: set point2 and finalize
          addDrawing(symbol, {
            id: uid(),
            type: 'pitchfork',
            symbol,
            color: activeColor,
            lineWidth: activeLineWidth,
            anchor: ref.pitchforkAnchor,
            point1: ref.pitchforkPoint1,
            point2: { time, price },
          });
          ref.isDrawing = false;
          ref.clickCount = 0;
          ref.pitchforkAnchor = null;
          ref.pitchforkPoint1 = null;
          setActiveTool('cursor');
          scheduleRender();
          return;
        }
      }

      // Two-point tools: start drawing
      if (time !== null && price !== null) {
        interactionRef.current = {
          ...interactionRef.current,
          isDrawing: true,
          startTime: time,
          startPrice: price,
          currentX: x,
          currentY: y,
          clickCount: 0,
          pitchforkAnchor: null,
          pitchforkPoint1: null,
        };
      }
    },
    [activeTool, symbol, activeColor, activeLineWidth, addDrawing, setActiveTool, getCanvasCoords, xToTime, yToPrice, scheduleRender, selectedDrawingId, drawings, setSelectedDrawing, removeDrawing, hitTestDrawing, hitTestHandle, getDeleteButtonPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);

      // Handle drag in progress (resize)
      if (interactionRef.current.isDraggingHandle) {
        interactionRef.current.dragCurrentTime = xToTime(x);
        interactionRef.current.dragCurrentPrice = yToPrice(y);
        interactionRef.current.currentX = x;
        interactionRef.current.currentY = y;
        scheduleRender();
        return;
      }

      // Body drag in progress (move/translate)
      if (interactionRef.current.isDraggingBody) {
        interactionRef.current.dragCurrentTime = xToTime(x);
        interactionRef.current.dragCurrentPrice = yToPrice(y);
        interactionRef.current.currentX = x;
        interactionRef.current.currentY = y;
        scheduleRender();
        return;
      }

      // Cursor mode with selected drawing - show appropriate cursor
      if (activeTool === 'cursor') {
        const canvas = canvasRef.current;
        if (canvas && selectedDrawingId) {
          const selDrawing = drawings.find((d) => d.id === selectedDrawingId);
          if (selDrawing) {
            const handleIdx = hitTestHandle(selDrawing, x, y);
            const delBtn = getDeleteButtonPos(selDrawing);
            const nearDel = delBtn ? Math.sqrt((x - delBtn.x) ** 2 + (y - delBtn.y) ** 2) <= delBtn.r + 2 : false;
            const w = canvas.width;
            const h = canvas.height;
            const onBody = hitTestDrawing(selDrawing, x, y, w, h);
            if (handleIdx >= 0) {
              canvas.style.cursor = 'grab';
            } else if (nearDel) {
              canvas.style.cursor = 'pointer';
            } else if (onBody) {
              canvas.style.cursor = 'move';
            } else {
              canvas.style.cursor = 'default';
            }
          }
        }
        return;
      }

      if (!interactionRef.current.isDrawing && activeTool === 'cursor') return;

      if (activeTool === 'hline' || activeTool === 'vline') {
        // Show preview for single-click tools on hover
        interactionRef.current.currentX = x;
        interactionRef.current.currentY = y;
        // For single-click preview we temporarily mark as drawing
        interactionRef.current.isDrawing = true;
        interactionRef.current.startTime = xToTime(x) ?? 0;
        interactionRef.current.startPrice = yToPrice(y) ?? 0;
        scheduleRender();
        return;
      }

      if (interactionRef.current.isDrawing || activeTool === 'pitchfork') {
        interactionRef.current.currentX = x;
        interactionRef.current.currentY = y;
        scheduleRender();
      }
    },
    [activeTool, getCanvasCoords, scheduleRender, xToTime, yToPrice, selectedDrawingId, drawings, hitTestHandle, hitTestDrawing, getDeleteButtonPos]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Finalize handle drag (resize)
      if (interactionRef.current.isDraggingHandle) {
        const ref = interactionRef.current;
        if (ref.dragDrawingId && ref.dragOriginalDrawing && ref.dragCurrentTime !== null && ref.dragCurrentPrice !== null) {
          const updates = applyHandleDrag(ref.dragOriginalDrawing, ref.dragHandleIndex, ref.dragCurrentTime, ref.dragCurrentPrice);
          updateDrawing(symbol, ref.dragDrawingId, updates);
        }
        ref.isDraggingHandle = false;
        ref.dragDrawingId = null;
        ref.dragHandleIndex = -1;
        ref.dragOriginalDrawing = null;
        ref.dragCurrentTime = null;
        ref.dragCurrentPrice = null;
        scheduleRender();
        return;
      }

      // Finalize body drag (move/translate)
      if (interactionRef.current.isDraggingBody) {
        const ref = interactionRef.current;
        if (ref.dragDrawingId && ref.dragOriginalDrawing && ref.dragCurrentTime !== null && ref.dragCurrentPrice !== null && ref.dragStartTime !== null && ref.dragStartPrice !== null) {
          const deltaTime = ref.dragCurrentTime - ref.dragStartTime;
          const deltaPrice = ref.dragCurrentPrice - ref.dragStartPrice;
          // Only apply if there was actual movement
          if (deltaTime !== 0 || deltaPrice !== 0) {
            const updates = applyBodyDrag(ref.dragOriginalDrawing, deltaTime, deltaPrice);
            updateDrawing(symbol, ref.dragDrawingId, updates);
          }
        }
        ref.isDraggingBody = false;
        ref.dragDrawingId = null;
        ref.dragOriginalDrawing = null;
        ref.dragCurrentTime = null;
        ref.dragCurrentPrice = null;
        ref.dragStartTime = null;
        ref.dragStartPrice = null;
        scheduleRender();
        return;
      }

      if (!interactionRef.current.isDrawing) return;
      if (activeTool === 'hline' || activeTool === 'vline' || activeTool === 'cursor' || activeTool === 'text' || activeTool === 'pitchfork') {
        // These are handled in mousedown
        return;
      }

      const { startTime, startPrice } = interactionRef.current;
      const { x, y } = getCanvasCoords(e);
      const endTime = xToTime(x);
      const endPrice = yToPrice(y);

      if (startTime === null || startPrice === null || endTime === null || endPrice === null) {
        interactionRef.current.isDrawing = false;
        scheduleRender();
        return;
      }

      // Require minimum drag distance to avoid accidental clicks
      const dx = Math.abs(x - (timeToX(startTime) ?? 0));
      const dy = Math.abs(y - (priceToY(startPrice) ?? 0));
      if (dx < 5 && dy < 5) {
        interactionRef.current.isDrawing = false;
        scheduleRender();
        return;
      }

      const base = {
        id: uid(),
        symbol,
        color: activeColor,
        lineWidth: activeLineWidth,
      };

      switch (activeTool) {
        case 'trendline':
          addDrawing(symbol, {
            ...base,
            type: 'trendline',
            point1: { time: startTime, price: startPrice },
            point2: { time: endTime, price: endPrice },
          });
          break;
        case 'fibonacci':
          addDrawing(symbol, {
            ...base,
            type: 'fibonacci',
            point1: { time: startTime, price: startPrice },
            point2: { time: endTime, price: endPrice },
            levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
          });
          break;
        case 'rectangle':
          addDrawing(symbol, {
            ...base,
            type: 'rectangle',
            point1: { time: startTime, price: startPrice },
            point2: { time: endTime, price: endPrice },
          });
          break;
        case 'ray':
          addDrawing(symbol, {
            ...base,
            type: 'ray',
            point1: { time: startTime, price: startPrice },
            point2: { time: endTime, price: endPrice },
          });
          break;
        case 'extline':
          addDrawing(symbol, {
            ...base,
            type: 'extline',
            point1: { time: startTime, price: startPrice },
            point2: { time: endTime, price: endPrice },
          });
          break;
        case 'arrow':
          addDrawing(symbol, {
            ...base,
            type: 'arrow',
            point1: { time: startTime, price: startPrice },
            point2: { time: endTime, price: endPrice },
          });
          break;
        case 'channel':
          addDrawing(symbol, {
            ...base,
            type: 'channel',
            point1: { time: startTime, price: startPrice },
            point2: { time: endTime, price: endPrice },
            widthOffset: 40,
          });
          break;
      }

      interactionRef.current.isDrawing = false;
      setActiveTool('cursor');
      scheduleRender();
    },
    [
      activeTool,
      symbol,
      activeColor,
      activeLineWidth,
      addDrawing,
      setActiveTool,
      getCanvasCoords,
      xToTime,
      yToPrice,
      timeToX,
      priceToY,
      scheduleRender,
      applyHandleDrag,
      applyBodyDrag,
      updateDrawing,
    ]
  );

  const handleMouseLeave = useCallback(() => {
    if (activeTool === 'hline' || activeTool === 'vline') {
      interactionRef.current.isDrawing = false;
      scheduleRender();
    }
    // Cancel handle drag on leave
    if (interactionRef.current.isDraggingHandle) {
      interactionRef.current.isDraggingHandle = false;
      interactionRef.current.dragDrawingId = null;
      interactionRef.current.dragOriginalDrawing = null;
      scheduleRender();
    }
    // Cancel body drag on leave
    if (interactionRef.current.isDraggingBody) {
      interactionRef.current.isDraggingBody = false;
      interactionRef.current.dragDrawingId = null;
      interactionRef.current.dragOriginalDrawing = null;
      interactionRef.current.dragStartTime = null;
      interactionRef.current.dragStartPrice = null;
      scheduleRender();
    }
  }, [activeTool, scheduleRender]);

  // Canvas always has pointer events so we can handle selection in cursor mode
  const isToolActive = activeTool !== 'cursor';

  // ─── Touch handlers (map touch events to mouse-like coords) ──
  const getTouchCoords = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length !== 1) return;

      const { x, y } = getTouchCoords(e);
      const canvas = canvasRef.current;
      const w = canvas?.width ?? 0;
      const h = canvas?.height ?? 0;

      // ─── Cursor mode touch: selection / handle drag / delete ───
      if (activeTool === 'cursor') {
        e.preventDefault();

        // Check delete button on selected drawing first
        if (selectedDrawingId) {
          const selDrawing = drawings.find((d) => d.id === selectedDrawingId);
          if (selDrawing) {
            const delBtn = getDeleteButtonPos(selDrawing);
            if (delBtn) {
              const dist = Math.sqrt((x - delBtn.x) ** 2 + (y - delBtn.y) ** 2);
              if (dist <= delBtn.r + 4) {
                removeDrawing(symbol, selectedDrawingId);
                scheduleRender();
                return;
              }
            }

            // Check handle hit for drag (resize)
            const handleIdx = hitTestHandle(selDrawing, x, y);
            if (handleIdx >= 0) {
              const ref = interactionRef.current;
              ref.isDraggingHandle = true;
              ref.dragDrawingId = selDrawing.id;
              ref.dragHandleIndex = handleIdx;
              ref.dragOriginalDrawing = deepCopyDrawing(selDrawing);
              ref.dragCurrentTime = xToTime(x);
              ref.dragCurrentPrice = yToPrice(y);
              ref.currentX = x;
              ref.currentY = y;
              return;
            }

            // Check body hit for move/translate
            if (hitTestDrawing(selDrawing, x, y, w, h)) {
              const ref = interactionRef.current;
              ref.isDraggingBody = true;
              ref.dragDrawingId = selDrawing.id;
              ref.dragOriginalDrawing = deepCopyDrawing(selDrawing);
              ref.dragStartTime = xToTime(x);
              ref.dragStartPrice = yToPrice(y);
              ref.dragCurrentTime = ref.dragStartTime;
              ref.dragCurrentPrice = ref.dragStartPrice;
              ref.currentX = x;
              ref.currentY = y;
              return;
            }
          }
        }

        // Hit-test all drawings
        let hitId: string | null = null;
        for (let i = drawings.length - 1; i >= 0; i--) {
          if (hitTestDrawing(drawings[i], x, y, w, h)) {
            hitId = drawings[i].id;
            break;
          }
        }

        if (hitId !== selectedDrawingId) {
          setSelectedDrawing(hitId);
          scheduleRender();
        }
        return;
      }

      // ─── Tool mode touch: drawing creation ───
      e.preventDefault();
      const time = xToTime(x);
      const price = yToPrice(y);

      if (activeTool === 'hline' && price !== null) {
        addDrawing(symbol, {
          id: uid(),
          type: 'hline',
          symbol,
          color: activeColor,
          lineWidth: activeLineWidth,
          price,
        });
        setActiveTool('cursor');
        return;
      }

      if (activeTool === 'vline' && time !== null) {
        addDrawing(symbol, {
          id: uid(),
          type: 'vline',
          symbol,
          color: activeColor,
          lineWidth: activeLineWidth,
          time,
        });
        setActiveTool('cursor');
        return;
      }

      if (time !== null && price !== null) {
        interactionRef.current = {
          ...interactionRef.current,
          isDrawing: true,
          startTime: time,
          startPrice: price,
          currentX: x,
          currentY: y,
        };
      }
    },
    [activeTool, symbol, activeColor, activeLineWidth, addDrawing, setActiveTool, getTouchCoords, xToTime, yToPrice, selectedDrawingId, drawings, setSelectedDrawing, removeDrawing, hitTestDrawing, hitTestHandle, getDeleteButtonPos, scheduleRender]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length !== 1) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // Handle drag in progress (resize)
      if (interactionRef.current.isDraggingHandle) {
        e.preventDefault();
        interactionRef.current.dragCurrentTime = xToTime(x);
        interactionRef.current.dragCurrentPrice = yToPrice(y);
        interactionRef.current.currentX = x;
        interactionRef.current.currentY = y;
        scheduleRender();
        return;
      }

      // Body drag in progress (move)
      if (interactionRef.current.isDraggingBody) {
        e.preventDefault();
        interactionRef.current.dragCurrentTime = xToTime(x);
        interactionRef.current.dragCurrentPrice = yToPrice(y);
        interactionRef.current.currentX = x;
        interactionRef.current.currentY = y;
        scheduleRender();
        return;
      }

      if (!interactionRef.current.isDrawing) return;
      e.preventDefault();
      interactionRef.current.currentX = x;
      interactionRef.current.currentY = y;
      scheduleRender();
    },
    [scheduleRender, xToTime, yToPrice]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      // Finalize handle drag (resize)
      if (interactionRef.current.isDraggingHandle) {
        e.preventDefault();
        const ref = interactionRef.current;
        if (ref.dragDrawingId && ref.dragOriginalDrawing && ref.dragCurrentTime !== null && ref.dragCurrentPrice !== null) {
          const updates = applyHandleDrag(ref.dragOriginalDrawing, ref.dragHandleIndex, ref.dragCurrentTime, ref.dragCurrentPrice);
          updateDrawing(symbol, ref.dragDrawingId, updates);
        }
        ref.isDraggingHandle = false;
        ref.dragDrawingId = null;
        ref.dragHandleIndex = -1;
        ref.dragOriginalDrawing = null;
        ref.dragCurrentTime = null;
        ref.dragCurrentPrice = null;
        scheduleRender();
        return;
      }

      // Finalize body drag (move)
      if (interactionRef.current.isDraggingBody) {
        e.preventDefault();
        const ref = interactionRef.current;
        if (ref.dragDrawingId && ref.dragOriginalDrawing && ref.dragCurrentTime !== null && ref.dragCurrentPrice !== null && ref.dragStartTime !== null && ref.dragStartPrice !== null) {
          const deltaTime = ref.dragCurrentTime - ref.dragStartTime;
          const deltaPrice = ref.dragCurrentPrice - ref.dragStartPrice;
          if (deltaTime !== 0 || deltaPrice !== 0) {
            const updates = applyBodyDrag(ref.dragOriginalDrawing, deltaTime, deltaPrice);
            updateDrawing(symbol, ref.dragDrawingId, updates);
          }
        }
        ref.isDraggingBody = false;
        ref.dragDrawingId = null;
        ref.dragOriginalDrawing = null;
        ref.dragCurrentTime = null;
        ref.dragCurrentPrice = null;
        ref.dragStartTime = null;
        ref.dragStartPrice = null;
        scheduleRender();
        return;
      }

      if (!interactionRef.current.isDrawing) return;
      if (activeTool === 'hline' || activeTool === 'vline' || activeTool === 'cursor') return;
      e.preventDefault();

      const { startTime, startPrice, currentX, currentY } = interactionRef.current;
      const endTime = xToTime(currentX);
      const endPrice = yToPrice(currentY);

      if (startTime === null || startPrice === null || endTime === null || endPrice === null) {
        interactionRef.current.isDrawing = false;
        scheduleRender();
        return;
      }

      const dx = Math.abs(currentX - (timeToX(startTime) ?? 0));
      const dy = Math.abs(currentY - (priceToY(startPrice) ?? 0));
      if (dx < 5 && dy < 5) {
        interactionRef.current.isDrawing = false;
        scheduleRender();
        return;
      }

      const base = {
        id: uid(),
        symbol,
        color: activeColor,
        lineWidth: activeLineWidth,
      };

      switch (activeTool) {
        case 'trendline':
          addDrawing(symbol, { ...base, type: 'trendline', point1: { time: startTime, price: startPrice }, point2: { time: endTime, price: endPrice } });
          break;
        case 'fibonacci':
          addDrawing(symbol, { ...base, type: 'fibonacci', point1: { time: startTime, price: startPrice }, point2: { time: endTime, price: endPrice }, levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] });
          break;
        case 'rectangle':
          addDrawing(symbol, { ...base, type: 'rectangle', point1: { time: startTime, price: startPrice }, point2: { time: endTime, price: endPrice } });
          break;
        case 'ray':
          addDrawing(symbol, { ...base, type: 'ray', point1: { time: startTime, price: startPrice }, point2: { time: endTime, price: endPrice } });
          break;
        case 'extline':
          addDrawing(symbol, { ...base, type: 'extline', point1: { time: startTime, price: startPrice }, point2: { time: endTime, price: endPrice } });
          break;
        case 'arrow':
          addDrawing(symbol, { ...base, type: 'arrow', point1: { time: startTime, price: startPrice }, point2: { time: endTime, price: endPrice } });
          break;
        case 'channel':
          addDrawing(symbol, { ...base, type: 'channel', point1: { time: startTime, price: startPrice }, point2: { time: endTime, price: endPrice }, widthOffset: 40 });
          break;
      }

      interactionRef.current.isDrawing = false;
      setActiveTool('cursor');
      scheduleRender();
    },
    [activeTool, symbol, activeColor, activeLineWidth, addDrawing, setActiveTool, xToTime, yToPrice, timeToX, priceToY, scheduleRender, applyHandleDrag, applyBodyDrag, updateDrawing]
  );

  // Determine if we need pointer events:
  // - Always on when a drawing tool is active (not cursor)
  // - When in cursor mode with drawings, we use a special approach:
  //   the canvas captures events but passes them through to the chart
  //   when the user isn't interacting with a drawing
  const needsPointerEvents = isToolActive || drawings.length > 0;

  const confirmTextInput = useCallback(() => {
    if (textInput.value.trim()) {
      addDrawing(symbol, {
        id: uid(),
        type: 'text',
        symbol,
        color: activeColor,
        lineWidth: activeLineWidth,
        position: { time: textInput.time, price: textInput.price },
        text: textInput.value.trim(),
        fontSize: 14,
      });
    }
    setTextInput((prev) => ({ ...prev, visible: false, value: '' }));
    setActiveTool('cursor');
  }, [textInput, symbol, activeColor, activeLineWidth, addDrawing, setActiveTool]);

  const cancelTextInput = useCallback(() => {
    setTextInput((prev) => ({ ...prev, visible: false, value: '' }));
    setActiveTool('cursor');
  }, [setActiveTool]);

  // Pass wheel events through to chart when in cursor mode (for zoom/scroll)
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!isToolActive) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.pointerEvents = 'none';
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && target !== canvas) {
          target.dispatchEvent(new WheelEvent('wheel', {
            clientX: e.clientX,
            clientY: e.clientY,
            deltaX: e.deltaX,
            deltaY: e.deltaY,
            deltaMode: e.deltaMode,
            bubbles: true,
            cancelable: true,
          }));
        }
        requestAnimationFrame(() => {
          if (canvas) canvas.style.pointerEvents = needsPointerEvents ? 'auto' : 'none';
        });
      }
    }
  }, [isToolActive, needsPointerEvents]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{
          pointerEvents: needsPointerEvents ? 'auto' : 'none',
          cursor: isToolActive ? 'crosshair' : 'default',
          zIndex: 10,
          touchAction: (isToolActive || interactionRef.current.isDraggingHandle || interactionRef.current.isDraggingBody) ? 'none' : 'auto',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {textInput.visible && (
        <div
          className="absolute flex items-center gap-1"
          style={{
            left: textInput.x,
            top: textInput.y - 16,
            zIndex: 20,
          }}
        >
          <input
            ref={textInputRef}
            type="text"
            value={textInput.value}
            onChange={(e) => setTextInput((prev) => ({ ...prev, value: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmTextInput();
              if (e.key === 'Escape') cancelTextInput();
            }}
            placeholder={t.enterText}
            className={`px-2 py-1 text-sm rounded border outline-none shadow-lg ${
              isDark
                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
            style={{ minWidth: 120 }}
            autoFocus
          />
          <button
            onClick={confirmTextInput}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-500"
          >
            OK
          </button>
          <button
            onClick={cancelTextInput}
            className={`px-2 py-1 text-xs rounded ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            x
          </button>
        </div>
      )}
    </>
  );
}
