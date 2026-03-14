import type { ChartType, TimezoneId } from '../stores/chartStore';
import type { TimeframeKey } from '../types/chart';
import type { IndicatorType } from '../stores/indicatorStore';

// ---------- Chart image capture ----------

/**
 * Capture the chart area as a PNG Blob by compositing all canvas elements.
 */
export function captureChartImage(
  element: HTMLElement,
  isDark: boolean
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvases = element.querySelectorAll('canvas');
    if (canvases.length === 0) {
      reject(new Error('No canvas elements found'));
      return;
    }

    const compositeCanvas = document.createElement('canvas');
    const rect = element.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    compositeCanvas.width = rect.width * dpr;
    compositeCanvas.height = rect.height * dpr;
    const ctx = compositeCanvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get 2d context'));
      return;
    }

    // Background
    ctx.fillStyle = isDark ? '#111827' : '#ffffff';
    ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);

    // Draw each canvas
    canvases.forEach((canvas) => {
      const canvasRect = canvas.getBoundingClientRect();
      const x = (canvasRect.left - rect.left) * dpr;
      const y = (canvasRect.top - rect.top) * dpr;
      try {
        ctx.drawImage(canvas, x, y);
      } catch {
        // ignore CORS errors
      }
    });

    // Watermark
    ctx.fillStyle = isDark ? '#ffffff40' : '#00000040';
    ctx.font = `${14 * dpr}px sans-serif`;
    ctx.fillText('Trading Kan', 10 * dpr, compositeCanvas.height - 10 * dpr);

    compositeCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/png'
    );
  });
}

// ---------- Clipboard ----------

/**
 * Copy a Blob image to the clipboard.
 */
export async function copyImageToClipboard(blob: Blob): Promise<void> {
  const item = new ClipboardItem({ 'image/png': blob });
  await navigator.clipboard.write([item]);
}

// ---------- Download helpers ----------

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Share-link state encoding ----------

export interface ShareableChartState {
  symbol: string;
  timeframe: TimeframeKey;
  chartType: ChartType;
  timezone: TimezoneId;
  indicators: Array<{ type: IndicatorType; params: Record<string, number> }>;
}

/**
 * Encode chart state into a URL-safe base64 string.
 */
export function encodeChartState(state: ShareableChartState): string {
  const json = JSON.stringify(state);
  // btoa only handles Latin-1 — encode as URI first to be safe
  return btoa(encodeURIComponent(json));
}

/**
 * Decode a base64-encoded chart state string back to an object.
 * Returns null on failure.
 */
export function decodeChartState(
  encoded: string
): ShareableChartState | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json) as ShareableChartState;
  } catch {
    return null;
  }
}

/**
 * Build a full shareable URL with the chart state in query params.
 */
export function generateShareUrl(state: ShareableChartState): string {
  const encoded = encodeChartState(state);
  const url = new URL(window.location.href.split('?')[0]);
  url.searchParams.set('chart', encoded);
  return url.toString();
}
