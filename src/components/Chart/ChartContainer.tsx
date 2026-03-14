import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useChart } from './useChart';
import { ChartLegend } from './ChartLegend';
import { ChartToolstrip } from './ChartToolstrip';
import { DrawingOverlay } from './DrawingOverlay';
import { VolumeProfile } from './VolumeProfile';
import { ContextMenu } from './ContextMenu';
import { useChartStore } from '../../stores/chartStore';
import { useIndicatorStore } from '../../stores/indicatorStore';
import { useComparisonStore } from '../../stores/comparisonStore';
import { useThemeStore } from '../../stores/themeStore';
import { useReplayStore } from '../../stores/replayStore';
import { dataManager } from '../../services/dataManager';
import { useTranslation } from '../../i18n';
import {
  calcSMA,
  calcEMA,
  calcBollingerBands,
  calcVWAP,
  calcIchimoku,
  calcDEMA,
  calcTEMA,
  calcWMA,
  calcHMA,
  calcKeltnerChannels,
  calcParabolicSAR,
  calcSupertrend,
} from '../../utils/indicators';
import { checkAlerts, checkIndicatorAlerts } from '../../stores/alertStore';
import type { CandlestickData, UTCTimestamp } from 'lightweight-charts';
import type { OHLCData } from '../../types/chart';

function toChartData(data: OHLCData[]): CandlestickData[] {
  return data.map((d) => ({
    time: d.time as UTCTimestamp,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
  }));
}

function toVolumeData(data: OHLCData[]) {
  return data.map((d) => ({
    time: d.time as UTCTimestamp,
    value: d.volume ?? 0,
    color: d.close >= d.open ? '#22c55e40' : '#ef444440',
  }));
}

export function ChartContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { symbol, timeframe, chartType, data, loadData, isLoading } = useChartStore();
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();
  const {
    chart, series, setData, updateData, setOverlaySeries, clearOverlays,
    removeOverlaySeries, setPriceScaleMode, fitContent, zoomIn, zoomOut,
  } = useChart(containerRef, chartType);
  const indicators = useIndicatorStore((s) => s.indicators);
  const comparisonSymbols = useComparisonStore((s) => s.symbols);

  // Replay state
  const isReplaying = useReplayStore((s) => s.isReplaying);
  const replayIndex = useReplayStore((s) => s.replayIndex);
  const fullReplayData = useReplayStore((s) => s.fullData);

  // Effective data: when replaying, use sliced replay data; otherwise use live data
  const effectiveData = useMemo(() => {
    if (isReplaying && fullReplayData.length > 0) {
      return fullReplayData.slice(0, replayIndex);
    }
    return data;
  }, [isReplaying, fullReplayData, replayIndex, data]);

  // Track comparison unsubscribe callbacks
  const comparisonUnsubsRef = useRef<Map<string, () => void>>(new Map());

  // Compute latest bar data for legend fallback (when crosshair not active)
  const latestData = useMemo(() => {
    if (effectiveData.length === 0) return null;
    const last = effectiveData[effectiveData.length - 1];
    return {
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      volume: last.volume ?? 0,
    };
  }, [effectiveData]);

  // Load historical data on symbol/timeframe change
  useEffect(() => {
    loadData();
  }, [symbol, timeframe, loadData]);

  // Push data to chart when it changes
  useEffect(() => {
    if (effectiveData.length > 0) {
      setData(toChartData(effectiveData), toVolumeData(effectiveData));
    }
  }, [effectiveData, setData]);

  // Calculate and render overlay indicators
  const renderIndicators = useCallback(() => {
    if (effectiveData.length === 0) return;

    clearOverlays();

    for (const ind of indicators) {
      if (!ind.visible) continue;

      switch (ind.type) {
        case 'SMA': {
          const result = calcSMA(effectiveData, ind.params.period);
          setOverlaySeries(ind.id, result, ind.color ?? '#f59e0b', 1);
          break;
        }
        case 'EMA': {
          const result = calcEMA(effectiveData, ind.params.period);
          setOverlaySeries(ind.id, result, ind.color ?? '#3b82f6', 1);
          break;
        }
        case 'BB': {
          const bb = calcBollingerBands(effectiveData, ind.params.period, ind.params.stdDev);
          setOverlaySeries(`${ind.id}-upper`, bb.upper, '#8b5cf680', 1);
          setOverlaySeries(`${ind.id}-middle`, bb.middle, '#8b5cf6', 1);
          setOverlaySeries(`${ind.id}-lower`, bb.lower, '#8b5cf680', 1);
          break;
        }
        case 'VWAP': {
          const vwapResult = calcVWAP(effectiveData);
          setOverlaySeries(ind.id, vwapResult, '#ff6d00', 2);
          break;
        }
        case 'ICHIMOKU': {
          const ichi = calcIchimoku(
            effectiveData,
            ind.params.tenkan,
            ind.params.kijun,
            ind.params.senkou
          );
          setOverlaySeries(`${ind.id}-tenkan`, ichi.tenkanSen, '#0891b2', 1);
          setOverlaySeries(`${ind.id}-kijun`, ichi.kijunSen, '#dc2626', 1);
          setOverlaySeries(`${ind.id}-senkouA`, ichi.senkouA, '#22c55e80', 1);
          setOverlaySeries(`${ind.id}-senkouB`, ichi.senkouB, '#ef444480', 1);
          setOverlaySeries(`${ind.id}-chikou`, ichi.chikouSpan, '#8b5cf680', 1);
          break;
        }
        case 'DEMA': {
          const result = calcDEMA(effectiveData, ind.params.period);
          setOverlaySeries(ind.id, result, ind.color ?? '#06b6d4', 1);
          break;
        }
        case 'TEMA': {
          const result = calcTEMA(effectiveData, ind.params.period);
          setOverlaySeries(ind.id, result, ind.color ?? '#a855f7', 1);
          break;
        }
        case 'WMA': {
          const result = calcWMA(effectiveData, ind.params.period);
          setOverlaySeries(ind.id, result, ind.color ?? '#f97316', 1);
          break;
        }
        case 'HMA': {
          const result = calcHMA(effectiveData, ind.params.period);
          setOverlaySeries(ind.id, result, ind.color ?? '#22d3ee', 1);
          break;
        }
        case 'KELTNER': {
          const kc = calcKeltnerChannels(
            effectiveData,
            ind.params.emaPeriod,
            ind.params.atrPeriod,
            ind.params.multiplier
          );
          setOverlaySeries(`${ind.id}-upper`, kc.upper, '#06b6d480', 1);
          setOverlaySeries(`${ind.id}-middle`, kc.middle, '#06b6d4', 1);
          setOverlaySeries(`${ind.id}-lower`, kc.lower, '#06b6d480', 1);
          break;
        }
        case 'PSAR': {
          const psarResult = calcParabolicSAR(effectiveData, ind.params.step, ind.params.max);
          setOverlaySeries(ind.id, psarResult, '#fbbf24', 1);
          break;
        }
        case 'SUPERTREND': {
          const st = calcSupertrend(effectiveData, ind.params.period, ind.params.multiplier);
          // Split into bullish and bearish segments for coloring
          const bullish = st.map((d) => ({
            time: d.time,
            value: d.direction === 1 ? d.value : NaN,
          }));
          const bearish = st.map((d) => ({
            time: d.time,
            value: d.direction === -1 ? d.value : NaN,
          }));
          setOverlaySeries(`${ind.id}-bull`, bullish, '#22c55e', 2);
          setOverlaySeries(`${ind.id}-bear`, bearish, '#ef4444', 2);
          break;
        }
        // RSI, MACD, STOCH, ATR and other pane indicators are rendered in IndicatorPane
      }
    }
  }, [effectiveData, indicators, setOverlaySeries, clearOverlays]);

  useEffect(() => {
    renderIndicators();
  }, [renderIndicators]);

  // Handle comparison symbol overlays
  useEffect(() => {
    if (data.length === 0) return;

    const mainStartPrice = data[0].close;
    if (mainStartPrice === 0) return;

    // Clean up removed symbols
    const activeSymbols = new Set(comparisonSymbols.map((s) => s.symbol));
    for (const [sym, unsub] of comparisonUnsubsRef.current) {
      if (!activeSymbols.has(sym)) {
        unsub();
        comparisonUnsubsRef.current.delete(sym);
        removeOverlaySeries(`cmp-${sym}`);
      }
    }

    // Remove hidden symbols' series
    for (const cmpSym of comparisonSymbols) {
      const seriesId = `cmp-${cmpSym.symbol}`;
      if (!cmpSym.visible) {
        removeOverlaySeries(seriesId);
        continue;
      }

      // Fetch and normalize comparison data
      dataManager
        .fetchHistorical(cmpSym.symbol, timeframe, 5000)
        .then((cmpData) => {
          if (cmpData.length === 0) return;
          const cmpStartPrice = cmpData[0].close;
          if (cmpStartPrice === 0) return;

          // Normalize: show price as if it started at mainStartPrice
          const normalizedData = cmpData.map((bar) => ({
            time: bar.time,
            value: (bar.close / cmpStartPrice) * mainStartPrice,
          }));

          setOverlaySeries(seriesId, normalizedData, cmpSym.color, 2);
        })
        .catch(() => {});

      // Subscribe to real-time updates if not already subscribed
      if (!comparisonUnsubsRef.current.has(cmpSym.symbol)) {
        const unsub = dataManager.subscribeRealtime(
          cmpSym.symbol,
          timeframe,
          () => {
            // Real-time bar received; initial fetch handles overlay display
          }
        );
        comparisonUnsubsRef.current.set(cmpSym.symbol, unsub);
      }
    }

    return () => {
      for (const [, unsub] of comparisonUnsubsRef.current) {
        unsub();
      }
      comparisonUnsubsRef.current.clear();
    };
  }, [comparisonSymbols, data, timeframe, setOverlaySeries, removeOverlaySeries]);

  // Subscribe to real-time updates (skip during replay)
  useEffect(() => {
    if (isReplaying) return;

    const updateBar = useChartStore.getState().updateBar;
    let previousPrice = data.length > 0 ? data[data.length - 1].close : 0;
    const unsub = dataManager.subscribeRealtime(
      symbol,
      timeframe,
      (bar) => {
        updateBar(bar);
        updateData({
          time: bar.time as UTCTimestamp,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        });

        // Check price alerts
        checkAlerts(symbol, bar.close, previousPrice);

        // Check indicator alerts using the full data from the store
        const currentData = useChartStore.getState().data;
        checkIndicatorAlerts(symbol, currentData);

        previousPrice = bar.close;
      }
    );

    return unsub;
  }, [symbol, timeframe, updateData, data.length, isReplaying]);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; price: number | null } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const chartApi = chart.current;
    const seriesApi = series.current;
    let price: number | null = null;
    if (chartApi && seriesApi && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      price = seriesApi.coordinateToPrice(y) ?? null;
    }
    setCtxMenu({ x: e.clientX, y: e.clientY, price });
  }, [chart, series]);

  const handleScreenshot = useCallback(() => {
    const chartEl = containerRef.current;
    if (!chartEl) return;
    const canvas = chartEl.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${symbol}-${timeframe}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [symbol, timeframe]);

  return (
    <div className="h-full w-full relative" onContextMenu={handleContextMenu}>
      <div ref={containerRef} className="absolute inset-0" />
      <VolumeProfile chartRef={chart} seriesRef={series} />
      <DrawingOverlay chartRef={chart} seriesRef={series} />
      <ChartLegend chartRef={chart} symbol={symbol} latestData={latestData} />
      <ChartToolstrip
        onSetPriceScaleMode={setPriceScaleMode}
        onFitContent={fitContent}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          price={ctxMenu.price}
          onClose={() => setCtxMenu(null)}
          onFitContent={fitContent}
          onSetPriceScaleMode={setPriceScaleMode}
          onScreenshot={handleScreenshot}
        />
      )}
      {isLoading && (
        <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'bg-gray-900/50' : 'bg-white/50'}`}>
          <div className={`text-sm animate-pulse ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.loading}</div>
        </div>
      )}
    </div>
  );
}
