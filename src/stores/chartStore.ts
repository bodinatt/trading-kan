import { create } from 'zustand';
import type { OHLCData, TimeframeKey } from '../types/chart';
import type { SymbolInfo } from '../services/types';
import { dataManager } from '../services/dataManager';
import { useLayoutStore } from './layoutStore';

export type ChartType = 'candle' | 'line' | 'area' | 'bar';

export type PriceScaleMode = 0 | 1 | 2; // 0=Normal, 1=Logarithmic, 2=Percentage

export type TimezoneId =
  | 'UTC'
  | 'Local'
  | 'Asia/Bangkok'
  | 'Asia/Tokyo'
  | 'America/New_York'
  | 'Europe/London'
  | 'Australia/Sydney'
  | 'Asia/Hong_Kong'
  | 'Asia/Singapore';

interface ChartState {
  symbol: string;
  symbolInfo: SymbolInfo | null;
  timeframe: TimeframeKey;
  chartType: ChartType;
  timezone: TimezoneId;
  data: OHLCData[];
  lastUpdatedAt: number | null;
  isLoading: boolean;
  error: string | null;
  logScale: boolean;
  percentageScale: boolean;

  setSymbol: (symbol: string) => void;
  setTimeframe: (tf: TimeframeKey) => void;
  setChartType: (ct: ChartType) => void;
  setTimezone: (tz: TimezoneId) => void;
  toggleLogScale: () => void;
  togglePercentageScale: () => void;
  getPriceScaleMode: () => PriceScaleMode;
  loadData: () => Promise<void>;
  updateBar: (bar: OHLCData) => void;
}

export const useChartStore = create<ChartState>((set, get) => ({
  symbol: 'BTCUSDT',
  symbolInfo: {
    symbol: 'BTCUSDT',
    name: 'Bitcoin',
    exchange: 'Binance',
    type: 'crypto',
  },
  timeframe: '1h',
  chartType: 'candle',
  timezone: 'Local' as TimezoneId,
  data: [],
  lastUpdatedAt: null,
  isLoading: false,
  error: null,
  logScale: false,
  percentageScale: false,

  setSymbol: (symbol) => {
    set({ symbol });
    // Sync to the active panel in multi-chart layout so MiniChart picks up the change
    const { activePanel, updatePanel, preset } = useLayoutStore.getState();
    if (preset !== '1x1') {
      updatePanel(activePanel, { symbol });
    }
  },
  setTimeframe: (timeframe) => {
    set({ timeframe });
    // Sync to the active panel in multi-chart layout so MiniChart picks up the change
    const { activePanel, updatePanel, preset } = useLayoutStore.getState();
    if (preset !== '1x1') {
      updatePanel(activePanel, { timeframe });
    }
  },
  setChartType: (chartType) => {
    set({ chartType });
    const { activePanel, updatePanel, preset } = useLayoutStore.getState();
    if (preset !== '1x1') {
      updatePanel(activePanel, { chartType });
    }
  },
  setTimezone: (timezone) => set({ timezone }),

  toggleLogScale: () =>
    set((state) => ({
      logScale: !state.logScale,
      percentageScale: !state.logScale ? false : state.percentageScale,
    })),

  togglePercentageScale: () =>
    set((state) => ({
      percentageScale: !state.percentageScale,
      logScale: !state.percentageScale ? false : state.logScale,
    })),

  getPriceScaleMode: () => {
    const { logScale, percentageScale } = get();
    if (logScale) return 1;
    if (percentageScale) return 2;
    return 0;
  },

  loadData: async () => {
    const { symbol, timeframe } = get();
    set({ isLoading: true, error: null });
    try {
      const data = await dataManager.fetchHistorical(symbol, timeframe, 5000);
      set({ data, isLoading: false, lastUpdatedAt: Date.now() });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  updateBar: (bar) => {
    set((state) => {
      const newData = [...state.data];
      const lastIdx = newData.length - 1;
      if (lastIdx >= 0 && newData[lastIdx].time === bar.time) {
        newData[lastIdx] = bar;
      } else {
        newData.push(bar);
      }
      return { data: newData, lastUpdatedAt: Date.now() };
    });
  },
}));
