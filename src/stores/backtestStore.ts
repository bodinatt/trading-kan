import { create } from 'zustand';
import type {
  StrategyConfig,
  BacktestSettings,
  BacktestResult,
  StrategyType,
} from '../utils/backtester';
import { getDefaultParams, DEFAULT_SETTINGS, runBacktest } from '../utils/backtester';
import type { OHLCData, TimeframeKey } from '../types/chart';
import { dataManager } from '../services/dataManager';

export interface BacktestHistoryEntry {
  id: string;
  symbol: string;
  timeframe: TimeframeKey;
  timestamp: number;
  result: BacktestResult;
}

interface BacktestState {
  // UI state
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;

  // Strategy configuration
  strategyConfig: StrategyConfig;
  setStrategyType: (type: StrategyType) => void;
  setStrategyParams: (params: StrategyConfig['params']) => void;

  // Settings
  settings: BacktestSettings;
  updateSettings: (partial: Partial<BacktestSettings>) => void;

  // Period
  periodBars: number;
  setPeriodBars: (bars: number) => void;

  // Execution
  isRunning: boolean;
  result: BacktestResult | null;
  error: string | null;
  runBacktest: (symbol: string, timeframe: TimeframeKey) => Promise<void>;

  // History
  history: BacktestHistoryEntry[];
  clearHistory: () => void;
}

let historyId = 0;

export const useBacktestStore = create<BacktestState>((set, get) => ({
  isOpen: false,
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),

  strategyConfig: {
    type: 'ma_crossover',
    params: getDefaultParams('ma_crossover'),
  },

  setStrategyType: (type) =>
    set({
      strategyConfig: { type, params: getDefaultParams(type) },
    }),

  setStrategyParams: (params) =>
    set((state) => ({
      strategyConfig: { ...state.strategyConfig, params },
    })),

  settings: { ...DEFAULT_SETTINGS },
  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),

  periodBars: 500,
  setPeriodBars: (bars) => set({ periodBars: bars }),

  isRunning: false,
  result: null,
  error: null,

  runBacktest: async (symbol, timeframe) => {
    const { strategyConfig, settings, periodBars } = get();
    set({ isRunning: true, error: null, result: null });

    try {
      const data: OHLCData[] = await dataManager.fetchHistorical(symbol, timeframe, periodBars);

      if (data.length < 50) {
        set({ error: 'Not enough data for backtesting (need at least 50 bars)', isRunning: false });
        return;
      }

      const result = runBacktest(data, strategyConfig, settings);
      const entry: BacktestHistoryEntry = {
        id: `bt-${++historyId}-${Date.now()}`,
        symbol,
        timeframe,
        timestamp: Date.now(),
        result,
      };

      set((state) => ({
        result,
        isRunning: false,
        history: [entry, ...state.history].slice(0, 20), // Keep last 20
      }));
    } catch (err) {
      set({ error: (err as Error).message, isRunning: false });
    }
  },

  history: [],
  clearHistory: () => set({ history: [] }),
}));
