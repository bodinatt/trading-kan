import { useRef, useEffect, useCallback } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useChartStore } from '../../stores/chartStore';
import { useIndicatorStore } from '../../stores/indicatorStore';
import { useThemeStore } from '../../stores/themeStore';
import { computeVolumeProfile } from '../../utils/indicators';
import type { VolumeProfileResult } from '../../utils/indicators';

type AnySeries =
  | ISeriesApi<'Candlestick'>
  | ISeriesApi<'Line'>
  | ISeriesApi<'Area'>
  | ISeriesApi<'Bar'>;

interface VolumeProfileProps {
  chartRef: React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<AnySeries | null>;
}

export function VolumeProfile({ chartRef, seriesRef }: VolumeProfileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const data = useChartStore((s) => s.data);
  const indicators = useIndicatorStore((s) => s.indicators);
  const isDark = useThemeStore((s) => s.theme) === 'dark';

  // Find the active VPVR indicator
  const vpvrIndicator = indicators.find(
    (ind) => ind.type === 'VPVR' && ind.visible
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!canvas || !chart || !series || !vpvrIndicator || data.length === 0)
      return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to parent
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    const numBins = vpvrIndicator.params.bins ?? 50;

    // Compute volume profile
    let profile: VolumeProfileResult;
    try {
      profile = computeVolumeProfile(data, numBins);
    } catch {
      return;
    }

    if (profile.bins.length === 0) return;

    // Find max volume for scaling
    let maxBinVol = 0;
    for (const bin of profile.bins) {
      if (bin.volume > maxBinVol) maxBinVol = bin.volume;
    }
    if (maxBinVol === 0) return;

    // Calculate bar width (max 30% of chart width, positioned on right side)
    const maxBarWidth = rect.width * 0.25;
    const barStartX = rect.width - maxBarWidth - 55; // offset from right edge for price scale

    // Get the bin height in pixels using the price scale
    // Use first two bins to determine pixel height per bin
    const binPriceRange =
      profile.bins.length > 1
        ? profile.bins[1].price - profile.bins[0].price
        : 1;

    for (const bin of profile.bins) {
      // Convert price to y coordinate
      const yTop = series.priceToCoordinate(
        bin.price + binPriceRange / 2
      );
      const yBottom = series.priceToCoordinate(
        bin.price - binPriceRange / 2
      );

      if (yTop === null || yBottom === null) continue;

      const barHeight = Math.max(Math.abs(yBottom - yTop) - 1, 1);
      const barY = Math.min(yTop, yBottom);
      const volRatio = bin.volume / maxBinVol;
      const barWidth = volRatio * maxBarWidth;

      // Draw buy volume (green) from right side
      const buyRatio = bin.volume > 0 ? bin.buyVolume / bin.volume : 0;
      const buyWidth = barWidth * buyRatio;
      const sellWidth = barWidth - buyWidth;

      // Sell volume (red) - drawn first (leftmost part of bar)
      if (sellWidth > 0) {
        ctx.fillStyle = isDark
          ? 'rgba(239, 68, 68, 0.35)'
          : 'rgba(239, 68, 68, 0.3)';
        ctx.fillRect(
          barStartX + maxBarWidth - barWidth,
          barY,
          sellWidth,
          barHeight
        );
      }

      // Buy volume (green) - drawn second (rightmost part of bar)
      if (buyWidth > 0) {
        ctx.fillStyle = isDark
          ? 'rgba(34, 197, 94, 0.35)'
          : 'rgba(34, 197, 94, 0.3)';
        ctx.fillRect(
          barStartX + maxBarWidth - buyWidth,
          barY,
          buyWidth,
          barHeight
        );
      }

      // POC highlight
      if (
        Math.abs(bin.price - profile.poc) < binPriceRange / 2
      ) {
        ctx.fillStyle = isDark
          ? 'rgba(251, 191, 36, 0.5)'
          : 'rgba(245, 158, 11, 0.45)';
        ctx.fillRect(
          barStartX + maxBarWidth - barWidth,
          barY,
          barWidth,
          barHeight
        );

        // POC line across chart
        const pocY = series.priceToCoordinate(profile.poc);
        if (pocY !== null) {
          ctx.strokeStyle = isDark
            ? 'rgba(251, 191, 36, 0.6)'
            : 'rgba(245, 158, 11, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, pocY);
          ctx.lineTo(rect.width, pocY);
          ctx.stroke();
          ctx.setLineDash([]);

          // POC label
          ctx.fillStyle = isDark
            ? 'rgba(251, 191, 36, 0.9)'
            : 'rgba(245, 158, 11, 0.9)';
          ctx.font = '10px sans-serif';
          ctx.fillText('POC', 4, pocY - 3);
        }
      }

      // Value Area boundaries (subtle lines)
      if (
        Math.abs(bin.price - profile.valueAreaHigh) < binPriceRange / 2 ||
        Math.abs(bin.price - profile.valueAreaLow) < binPriceRange / 2
      ) {
        const vaY = series.priceToCoordinate(bin.price);
        if (vaY !== null) {
          ctx.strokeStyle = isDark
            ? 'rgba(148, 163, 184, 0.3)'
            : 'rgba(100, 116, 139, 0.25)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(barStartX, vaY);
          ctx.lineTo(barStartX + maxBarWidth, vaY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }, [data, vpvrIndicator, isDark, chartRef, seriesRef]);

  // Redraw on data/indicator/theme changes and chart subscribe
  useEffect(() => {
    if (!vpvrIndicator) return;

    const chart = chartRef.current;
    if (!chart) return;

    const handleCrosshairMove = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };

    // Subscribe to visible range changes and crosshair
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleCrosshairMove);

    // Initial draw
    draw();

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleCrosshairMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [vpvrIndicator, draw, chartRef]);

  // Also redraw when data changes
  useEffect(() => {
    if (vpvrIndicator) {
      draw();
    }
  }, [data, vpvrIndicator, draw]);

  if (!vpvrIndicator) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 5 }}
    />
  );
}
