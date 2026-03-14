import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  BarSeries,
  HistogramSeries,
  type CandlestickData,
  type LineWidth,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { ChartType, TimezoneId } from '../../stores/chartStore';
import { useChartStore } from '../../stores/chartStore';
import { useThemeStore, getChartOptions } from '../../stores/themeStore';
import { useCrosshairStore } from '../../stores/crosshairStore';
import { useTimeScaleSyncStore } from '../../stores/timeScaleSyncStore';

type MainSeriesApi =
  | ISeriesApi<'Candlestick'>
  | ISeriesApi<'Line'>
  | ISeriesApi<'Area'>
  | ISeriesApi<'Bar'>;

export function useChart(
  containerRef: React.RefObject<HTMLDivElement | null>,
  chartType: ChartType = 'candle'
) {
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<MainSeriesApi | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const overlaySeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const chartTypeRef = useRef<ChartType>(chartType);
  const pendingDataRef = useRef<{
    data: CandlestickData[];
    volumeData?: { time: CandlestickData['time']; value: number; color: string }[];
  } | null>(null);
  const theme = useThemeStore((s) => s.theme);
  const timezone = useChartStore((s) => s.timezone);
  /** Tracks whether this chart is the source of crosshair sync */
  const isSyncSourceRef = useRef(false);
  const MAIN_CHART_ID = '__main__';

  // Create chart once (only on mount)
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      ...getChartOptions(theme),
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      localization: {
        timeFormatter: (timestamp: number) => formatTimeForTimezone(timestamp, useChartStore.getState().timezone),
      },
    });

    chartRef.current = chart;

    // Sync time scale to indicator panes
    const timeScaleUnsub = chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) {
        useTimeScaleSyncStore.getState().setVisibleLogicalRange({
          from: range.from,
          to: range.to,
        });
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      timeScaleUnsub();
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeRef.current = null;
      overlaySeriesRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);

  // Update theme without recreating chart
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions(getChartOptions(theme));
  }, [theme]);

  // Update time formatter when timezone changes
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      localization: {
        timeFormatter: (timestamp: number) => formatTimeForTimezone(timestamp, timezone),
      },
    });
  }, [timezone]);

  // Create/recreate main series + volume when chartType changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chartTypeRef.current = chartType;

    // Remove old main series if exists
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }

    // Remove old volume series if exists
    if (volumeRef.current) {
      chart.removeSeries(volumeRef.current);
      volumeRef.current = null;
    }

    // Remove old overlay series
    for (const [, series] of overlaySeriesRef.current) {
      chart.removeSeries(series);
    }
    overlaySeriesRef.current.clear();

    // Add new main series based on chart type
    let mainSeries: MainSeriesApi;
    switch (chartType) {
      case 'candle':
        mainSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });
        break;
      case 'line':
        mainSeries = chart.addSeries(LineSeries, {
          color: '#3b82f6',
          lineWidth: 2 as LineWidth,
          crosshairMarkerVisible: true,
        });
        break;
      case 'area':
        mainSeries = chart.addSeries(AreaSeries, {
          lineColor: '#3b82f6',
          topColor: 'rgba(59, 130, 246, 0.4)',
          bottomColor: 'rgba(59, 130, 246, 0.0)',
          lineWidth: 2 as LineWidth,
          crosshairMarkerVisible: true,
        });
        break;
      case 'bar':
        mainSeries = chart.addSeries(BarSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
        });
        break;
    }
    seriesRef.current = mainSeries;

    // Re-add volume histogram
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeRef.current = volumeSeries;

    // Re-apply pending data if available
    if (pendingDataRef.current) {
      const { data, volumeData } = pendingDataRef.current;
      setSeriesData(mainSeries, data, chartType);
      if (volumeData) {
        volumeSeries.setData(volumeData);
      }
      const VISIBLE_BARS = 200;
      if (data.length > VISIBLE_BARS) {
        chart.timeScale().setVisibleLogicalRange({
          from: data.length - VISIBLE_BARS,
          to: data.length + 10,
        });
      } else {
        chart.timeScale().fitContent();
      }
    }
  }, [chartType]);

  const setData = useCallback(
    (
      data: CandlestickData[],
      volumeData?: { time: CandlestickData['time']; value: number; color: string }[],
      shouldFitContent = true
    ) => {
      // Store data for re-application on chart type change
      pendingDataRef.current = { data, volumeData };

      if (seriesRef.current) {
        setSeriesData(seriesRef.current, data, chartTypeRef.current);
      }
      if (volumeData) {
        volumeRef.current?.setData(volumeData);
      }
      if (shouldFitContent && chartRef.current) {
        const timeScale = chartRef.current.timeScale();
        // Show last ~200 bars for a good default zoom level (like TradingView)
        const VISIBLE_BARS = 200;
        const totalBars = data.length;
        if (totalBars > VISIBLE_BARS) {
          timeScale.setVisibleLogicalRange({
            from: totalBars - VISIBLE_BARS,
            to: totalBars + 10, // Small right margin
          });
        } else {
          timeScale.fitContent();
        }
      }
    },
    []
  );

  const updateData = useCallback((bar: CandlestickData) => {
    if (!seriesRef.current) return;
    const ct = chartTypeRef.current;
    if (ct === 'candle' || ct === 'bar') {
      (seriesRef.current as ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'>).update(bar);
    } else {
      (seriesRef.current as ISeriesApi<'Line'> | ISeriesApi<'Area'>).update({
        time: bar.time,
        value: bar.close,
      });
    }
  }, []);

  const setOverlaySeries = useCallback(
    (
      id: string,
      data: { time: number; value: number }[],
      color: string = '#f59e0b',
      lineWidth: number = 1
    ) => {
      if (!chartRef.current) return;

      let series = overlaySeriesRef.current.get(id);
      if (!series) {
        series = chartRef.current.addSeries(LineSeries, {
          color,
          lineWidth: lineWidth as LineWidth,
          crosshairMarkerVisible: false,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        overlaySeriesRef.current.set(id, series);
      }

      series.setData(
        data.map((d) => ({
          time: d.time as CandlestickData['time'],
          value: d.value,
        }))
      );
    },
    []
  );

  const removeOverlaySeries = useCallback((id: string) => {
    const series = overlaySeriesRef.current.get(id);
    if (series && chartRef.current) {
      chartRef.current.removeSeries(series);
      overlaySeriesRef.current.delete(id);
    }
  }, []);

  const clearOverlays = useCallback(() => {
    if (!chartRef.current) return;
    for (const [, series] of overlaySeriesRef.current) {
      chartRef.current.removeSeries(series);
    }
    overlaySeriesRef.current.clear();
  }, []);

  const setPriceScaleMode = useCallback((mode: 0 | 1 | 2) => {
    chartRef.current?.priceScale('right').applyOptions({ mode });
  }, []);

  const fitContent = useCallback(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const totalBars = pendingDataRef.current?.data.length ?? 0;
    const VISIBLE_BARS = 200;
    if (totalBars > VISIBLE_BARS) {
      timeScale.setVisibleLogicalRange({
        from: totalBars - VISIBLE_BARS,
        to: totalBars + 10,
      });
    } else {
      timeScale.fitContent();
    }
  }, []);

  const zoomIn = useCallback(() => {
    const timeScale = chartRef.current?.timeScale();
    if (!timeScale) return;
    const visibleRange = timeScale.getVisibleLogicalRange();
    if (visibleRange) {
      const rangeSize = visibleRange.to - visibleRange.from;
      const center = (visibleRange.from + visibleRange.to) / 2;
      const newSize = rangeSize * 0.7;
      timeScale.setVisibleLogicalRange({
        from: center - newSize / 2,
        to: center + newSize / 2,
      });
    }
  }, []);

  const zoomOut = useCallback(() => {
    const timeScale = chartRef.current?.timeScale();
    if (!timeScale) return;
    const visibleRange = timeScale.getVisibleLogicalRange();
    if (visibleRange) {
      const rangeSize = visibleRange.to - visibleRange.from;
      const center = (visibleRange.from + visibleRange.to) / 2;
      const newSize = rangeSize * 1.4;
      timeScale.setVisibleLogicalRange({
        from: center - newSize / 2,
        to: center + newSize / 2,
      });
    }
  }, []);

  // Crosshair sync: emit crosshair time to store
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const handler = (param: MouseEventParams<Time>) => {
      if (param.time) {
        isSyncSourceRef.current = true;
        useCrosshairStore.getState().setSyncTime(param.time as number, MAIN_CHART_ID);
        requestAnimationFrame(() => {
          isSyncSourceRef.current = false;
        });
      } else {
        isSyncSourceRef.current = true;
        useCrosshairStore.getState().setSyncTime(null, MAIN_CHART_ID);
        requestAnimationFrame(() => {
          isSyncSourceRef.current = false;
        });
      }
    };

    chart.subscribeCrosshairMove(handler);
    return () => {
      chart.unsubscribeCrosshairMove(handler);
    };
  }, [containerRef, theme, timezone]);

  // Crosshair sync: receive crosshair time from other charts
  useEffect(() => {
    const unsub = useCrosshairStore.subscribe((state) => {
      const chart = chartRef.current;
      const series = seriesRef.current;
      if (!chart || !series) return;

      // Don't apply sync if this chart is the source
      if (isSyncSourceRef.current || state.sourceChartId === MAIN_CHART_ID) return;

      if (state.syncTime !== null) {
        try {
          chart.setCrosshairPosition(NaN, state.syncTime as UTCTimestamp, series);
        } catch {
          // Time might not exist on this chart's data range; ignore
        }
      } else {
        chart.clearCrosshairPosition();
      }
    });
    return unsub;
  }, [containerRef, theme, timezone]);

  return {
    chart: chartRef,
    series: seriesRef,
    setData,
    updateData,
    setOverlaySeries,
    removeOverlaySeries,
    clearOverlays,
    setPriceScaleMode,
    fitContent,
    zoomIn,
    zoomOut,
  };
}

/** Helper to set data on the main series based on chart type */
function setSeriesData(
  series: MainSeriesApi,
  data: CandlestickData[],
  chartType: ChartType
) {
  if (chartType === 'candle' || chartType === 'bar') {
    (series as ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'>).setData(data);
  } else {
    // Line and Area use close price only
    (series as ISeriesApi<'Line'> | ISeriesApi<'Area'>).setData(
      data.map((d) => ({ time: d.time, value: d.close }))
    );
  }
}

/**
 * Format a UTC timestamp for display in the given timezone.
 * Lightweight Charts stores time as UTC seconds; this converts to a
 * human-readable string in the target timezone using Intl.DateTimeFormat.
 */
const TIMEZONE_SHORT: Record<TimezoneId, string> = {
  UTC: 'UTC',
  Local: '',
  'Asia/Bangkok': 'ICT',
  'Asia/Tokyo': 'JST',
  'America/New_York': 'ET',
  'Europe/London': 'GMT',
  'Australia/Sydney': 'AEST',
  'Asia/Hong_Kong': 'HKT',
  'Asia/Singapore': 'SGT',
};

function formatTimeForTimezone(utcSeconds: number, tz: TimezoneId): string {
  const date = new Date(utcSeconds * 1000);

  const timeZone = tz === 'Local' ? undefined : tz === 'UTC' ? 'UTC' : tz;

  const dateStr = date.toLocaleDateString('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const timeStr = date.toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false });

  const tzLabel = tz === 'Local'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : TIMEZONE_SHORT[tz] || tz;

  return `${dateStr} ${timeStr} (${tzLabel})`;
}
