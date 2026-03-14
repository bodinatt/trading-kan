import { useEffect, useRef } from 'react';
import {
  createChart,
  type IChartApi,
  LineSeries,
  HistogramSeries,
  type UTCTimestamp,
  type ISeriesApi,
} from 'lightweight-charts';
import { useChartStore } from '../../stores/chartStore';
import {
  calcRSI,
  calcMACD,
  calcStochastic,
  calcATR,
  calcWilliamsR,
  calcCCI,
  calcOBV,
  calcADX,
  calcMFI,
  calcROC,
  calcCMF,
  calcDPO,
} from '../../utils/indicators';
import type { IndicatorConfig } from '../../stores/indicatorStore';
import { useThemeStore, getPaneOptions } from '../../stores/themeStore';

interface IndicatorPaneProps {
  indicator: IndicatorConfig;
  onRemove: () => void;
}

export function IndicatorPane({ indicator, onRemove }: IndicatorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<ISeriesApi<'Line' | 'Histogram'>[]>([]);
  const data = useChartStore((s) => s.data);
  const theme = useThemeStore((s) => s.theme);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      ...getPaneOptions(theme),
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
      seriesRefs.current = [];
    };
  }, [theme]);

  // Update data when it changes
  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = chartRef.current;

    // Remove old series
    for (const s of seriesRefs.current) {
      try {
        chart.removeSeries(s);
      } catch {
        // ignore if already removed
      }
    }
    seriesRefs.current = [];

    if (indicator.type === 'RSI') {
      const rsiData = calcRSI(data, indicator.params.period);
      const series = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      series.setData(
        rsiData.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );

      series.createPriceLine({
        price: 70,
        color: '#ef444460',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      });
      series.createPriceLine({
        price: 30,
        color: '#22c55e60',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      });

      seriesRefs.current.push(series);
    }

    if (indicator.type === 'STOCH') {
      const stochData = calcStochastic(
        data,
        indicator.params.period,
        indicator.params.smoothK,
        indicator.params.smoothD
      );

      const kSeries = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      kSeries.setData(
        stochData.k.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );

      kSeries.createPriceLine({
        price: 80,
        color: '#ef444460',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      });
      kSeries.createPriceLine({
        price: 20,
        color: '#22c55e60',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      });

      seriesRefs.current.push(kSeries);

      const dSeries = chart.addSeries(LineSeries, {
        color: '#ef4444',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      dSeries.setData(
        stochData.d.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
      seriesRefs.current.push(dSeries);
    }

    if (indicator.type === 'ATR') {
      const atrData = calcATR(data, indicator.params.period);
      const series = chart.addSeries(LineSeries, {
        color: '#14b8a6',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      series.setData(
        atrData.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
      seriesRefs.current.push(series);
    }

    if (indicator.type === 'MACD') {
      const macdData = calcMACD(
        data,
        indicator.params.fast,
        indicator.params.slow,
        indicator.params.signal
      );

      const histSeries = chart.addSeries(HistogramSeries, {
        priceLineVisible: false,
        lastValueVisible: false,
      });
      histSeries.setData(
        macdData.histogram.map((d) => ({
          time: d.time as UTCTimestamp,
          value: d.value,
          color: d.color,
        }))
      );
      seriesRefs.current.push(histSeries);

      const macdSeries = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      macdSeries.setData(
        macdData.macd.map((d) => ({
          time: d.time as UTCTimestamp,
          value: d.value,
        }))
      );
      seriesRefs.current.push(macdSeries);

      const signalSeries = chart.addSeries(LineSeries, {
        color: '#ef4444',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      signalSeries.setData(
        macdData.signal.map((d) => ({
          time: d.time as UTCTimestamp,
          value: d.value,
        }))
      );
      seriesRefs.current.push(signalSeries);
    }

    if (indicator.type === 'WILLR') {
      const wrData = calcWilliamsR(data, indicator.params.period);
      const series = chart.addSeries(LineSeries, {
        color: '#a855f7',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      series.setData(
        wrData.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
      series.createPriceLine({
        price: -20,
        color: '#ef444460',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      });
      series.createPriceLine({
        price: -80,
        color: '#22c55e60',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      });
      seriesRefs.current.push(series);
    }

    if (indicator.type === 'CCI') {
      const cciData = calcCCI(data, indicator.params.period);
      const series = chart.addSeries(LineSeries, {
        color: '#06b6d4',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      series.setData(
        cciData.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
      series.createPriceLine({
        price: 100,
        color: '#ef444460',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      });
      series.createPriceLine({
        price: -100,
        color: '#22c55e60',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      });
      seriesRefs.current.push(series);
    }

    if (indicator.type === 'OBV') {
      const obvData = calcOBV(data);
      const series = chart.addSeries(LineSeries, {
        color: '#22c55e',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      series.setData(
        obvData.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
      seriesRefs.current.push(series);
    }

    if (indicator.type === 'ADX') {
      const adxData = calcADX(data, indicator.params.period);

      const adxSeries = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      adxSeries.setData(
        adxData.adx.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
      adxSeries.createPriceLine({
        price: 25,
        color: '#6b728060',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      });
      seriesRefs.current.push(adxSeries);

      const plusDISeries = chart.addSeries(LineSeries, {
        color: '#22c55e',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      plusDISeries.setData(
        adxData.plusDI.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
      seriesRefs.current.push(plusDISeries);

      const minusDISeries = chart.addSeries(LineSeries, {
        color: '#ef4444',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      minusDISeries.setData(
        adxData.minusDI.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
      seriesRefs.current.push(minusDISeries);
    }

    if (indicator.type === 'MFI') {
      const mfiData = calcMFI(data, indicator.params.period);
      const series = chart.addSeries(LineSeries, {
        color: '#ec4899',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      series.setData(
        mfiData.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
      series.createPriceLine({
        price: 80,
        color: '#ef444460',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      });
      series.createPriceLine({
        price: 20,
        color: '#22c55e60',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      });
      seriesRefs.current.push(series);
    }

    if (indicator.type === 'ROC') {
      const rocData = calcROC(data, indicator.params.period);
      const series = chart.addSeries(LineSeries, {
        color: '#f97316',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      series.setData(
        rocData.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
      series.createPriceLine({
        price: 0,
        color: '#6b728060',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      });
      seriesRefs.current.push(series);
    }

    if (indicator.type === 'CMF') {
      const cmfData = calcCMF(data, indicator.params.period);
      const series = chart.addSeries(LineSeries, {
        color: '#8b5cf6',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      series.setData(
        cmfData.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
      series.createPriceLine({
        price: 0,
        color: '#6b728060',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      });
      seriesRefs.current.push(series);
    }

    if (indicator.type === 'DPO') {
      const dpoData = calcDPO(data, indicator.params.period);
      const series = chart.addSeries(LineSeries, {
        color: '#14b8a6',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      series.setData(
        dpoData.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
      series.createPriceLine({
        price: 0,
        color: '#6b728060',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '',
      });
      seriesRefs.current.push(series);
    }

    chart.timeScale().fitContent();
  }, [data, indicator]);

  if (!indicator.visible) return null;

  return (
    <div className={`h-32 rounded border overflow-hidden relative ${
      theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
    }`}>
      <div className="absolute top-1 left-2 z-10 flex items-center gap-2">
        <span className="text-xs text-gray-500">
          {indicator.type} ({Object.values(indicator.params).join(', ')})
        </span>
        <button
          onClick={onRemove}
          className="text-xs text-gray-600 hover:text-red-400"
        >
          x
        </button>
      </div>
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
