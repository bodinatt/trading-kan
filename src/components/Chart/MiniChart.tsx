import { useRef, useEffect, useCallback } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  type CandlestickData,
  type UTCTimestamp,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts';
import { dataManager } from '../../services/dataManager';
import type { OHLCData, TimeframeKey } from '../../types/chart';
import type { ChartType } from '../../stores/chartStore';
import { useThemeStore, getChartOptions } from '../../stores/themeStore';
import { useCrosshairStore } from '../../stores/crosshairStore';

type MainSeriesApi =
  | ISeriesApi<'Candlestick'>
  | ISeriesApi<'Bar'>
  | ISeriesApi<'Line'>
  | ISeriesApi<'Area'>;

interface MiniChartProps {
  panelId: string;
  symbol: string;
  timeframe: string;
  chartType: ChartType;
  isActive: boolean;
  onActivate: () => void;
}

export function MiniChart({
  panelId,
  symbol,
  timeframe,
  chartType,
  isActive,
  onActivate,
}: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<MainSeriesApi | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const chartTypeRef = useRef<ChartType>(chartType);
  const pendingDataRef = useRef<{
    data: OHLCData[];
  } | null>(null);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const isSyncSourceRef = useRef(false);

  // Create chart once (only on mount)
  useEffect(() => {
    if (!containerRef.current) return;

    const chartOpts = getChartOptions(useThemeStore.getState().theme);
    const chart = createChart(containerRef.current, {
      ...chartOpts,
      layout: { ...chartOpts.layout, fontSize: 10 },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    chartRef.current = chart;

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
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update theme without recreating chart
  useEffect(() => {
    if (!chartRef.current) return;
    const chartOpts = getChartOptions(theme);
    chartRef.current.applyOptions({
      ...chartOpts,
      layout: { ...chartOpts.layout, fontSize: 10 },
    });
  }, [theme]);

  // Create/recreate series when chartType changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chartTypeRef.current = chartType;

    // Remove old series
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }
    if (volumeRef.current) {
      chart.removeSeries(volumeRef.current);
      volumeRef.current = null;
    }

    // Add new main series
    let series: MainSeriesApi;
    switch (chartType) {
      case 'bar':
        series = chart.addSeries(BarSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
        });
        break;
      case 'line':
        series = chart.addSeries(LineSeries, {
          color: '#2962FF',
          lineWidth: 2,
        });
        break;
      case 'area':
        series = chart.addSeries(AreaSeries, {
          lineColor: '#2962FF',
          topColor: 'rgba(41, 98, 255, 0.28)',
          bottomColor: 'rgba(41, 98, 255, 0.02)',
          lineWidth: 2,
        });
        break;
      case 'candle':
      default:
        series = chart.addSeries(CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });
        break;
    }
    seriesRef.current = series;

    // Re-add volume histogram
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeRef.current = volumeSeries;

    // Re-apply pending data if available
    if (pendingDataRef.current) {
      const { data } = pendingDataRef.current;
      applyDataToSeries(series, volumeSeries, data, chartType);
      chart.timeScale().fitContent();
    }
  }, [chartType]);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const data = await dataManager.fetchHistorical(
        symbol,
        timeframe as TimeframeKey
      );
      pendingDataRef.current = { data };

      if (seriesRef.current && volumeRef.current) {
        applyDataToSeries(seriesRef.current, volumeRef.current, data, chartTypeRef.current);
      }
      chartRef.current?.timeScale().fitContent();
    } catch (err) {
      console.error('MiniChart load error:', err);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time updates
  useEffect(() => {
    const unsub = dataManager.subscribeRealtime(
      symbol,
      timeframe as TimeframeKey,
      (bar) => {
        if (!seriesRef.current) return;
        const ct = chartTypeRef.current;
        if (ct === 'line' || ct === 'area') {
          (seriesRef.current as ISeriesApi<'Line'> | ISeriesApi<'Area'>).update({
            time: bar.time as UTCTimestamp,
            value: bar.close,
          });
        } else {
          (seriesRef.current as ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'>).update({
            time: bar.time as UTCTimestamp,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
          });
        }
      }
    );
    return unsub;
  }, [symbol, timeframe]);

  // Crosshair sync: emit crosshair time to store
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const handler = (param: MouseEventParams<Time>) => {
      if (param.time) {
        isSyncSourceRef.current = true;
        useCrosshairStore.getState().setSyncTime(param.time as number, panelId);
        requestAnimationFrame(() => {
          isSyncSourceRef.current = false;
        });
      } else {
        isSyncSourceRef.current = true;
        useCrosshairStore.getState().setSyncTime(null, panelId);
        requestAnimationFrame(() => {
          isSyncSourceRef.current = false;
        });
      }
    };

    chart.subscribeCrosshairMove(handler);
    return () => {
      chart.unsubscribeCrosshairMove(handler);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId]);

  // Crosshair sync: receive crosshair time from other charts
  useEffect(() => {
    const unsub = useCrosshairStore.subscribe((state) => {
      const chart = chartRef.current;
      const series = seriesRef.current;
      if (!chart || !series) return;

      if (isSyncSourceRef.current || state.sourceChartId === panelId) return;

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId]);

  return (
    <div
      className={`relative h-full w-full rounded border overflow-hidden cursor-pointer ${
        isActive
          ? 'border-blue-500'
          : isDark ? 'border-gray-800 hover:border-gray-600' : 'border-gray-200 hover:border-gray-400'
      }`}
      onClick={onActivate}
    >
      {/* Symbol label */}
      <div className="absolute top-1 left-2 z-10 flex items-center gap-2">
        <span className={`text-[10px] font-semibold px-1 rounded ${isDark ? 'text-gray-300 bg-gray-900/80' : 'text-gray-700 bg-white/80'}`}>
          {symbol}
        </span>
        <span className="text-[10px] text-gray-500">{timeframe}</span>
      </div>
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}

/** Apply OHLC data + volume to the appropriate series based on chart type */
function applyDataToSeries(
  series: MainSeriesApi,
  volumeSeries: ISeriesApi<'Histogram'>,
  data: OHLCData[],
  chartType: ChartType
) {
  if (chartType === 'line' || chartType === 'area') {
    (series as ISeriesApi<'Line'> | ISeriesApi<'Area'>).setData(
      data.map((d) => ({
        time: d.time as CandlestickData['time'],
        value: d.close,
      }))
    );
  } else {
    (series as ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'>).setData(
      data.map((d) => ({
        time: d.time as UTCTimestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
    );
  }
  volumeSeries.setData(
    data.map((d) => ({
      time: d.time as UTCTimestamp,
      value: d.volume ?? 0,
      color: d.close >= d.open ? '#22c55e40' : '#ef444440',
    }))
  );
}
