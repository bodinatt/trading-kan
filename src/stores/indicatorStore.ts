import { create } from 'zustand';

export type IndicatorType =
  | 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB' | 'STOCH' | 'ATR' | 'VWAP' | 'ICHIMOKU'
  | 'WILLR' | 'CCI' | 'OBV' | 'ADX' | 'PSAR' | 'SUPERTREND'
  | 'DEMA' | 'TEMA' | 'WMA' | 'HMA' | 'MFI' | 'ROC' | 'CMF' | 'DPO' | 'KELTNER'
  | 'VPVR';

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  params: Record<string, number>;
  color?: string;
  visible: boolean;
}

const DEFAULT_PARAMS: Record<IndicatorType, Record<string, number>> = {
  SMA: { period: 20 },
  EMA: { period: 20 },
  RSI: { period: 14 },
  MACD: { fast: 12, slow: 26, signal: 9 },
  BB: { period: 20, stdDev: 2 },
  STOCH: { period: 14, smoothK: 3, smoothD: 3 },
  ATR: { period: 14 },
  VWAP: {},
  ICHIMOKU: { tenkan: 9, kijun: 26, senkou: 52 },
  WILLR: { period: 14 },
  CCI: { period: 20 },
  OBV: {},
  ADX: { period: 14 },
  PSAR: { step: 0.02, max: 0.2 },
  SUPERTREND: { period: 10, multiplier: 3 },
  DEMA: { period: 21 },
  TEMA: { period: 21 },
  WMA: { period: 20 },
  HMA: { period: 20 },
  MFI: { period: 14 },
  ROC: { period: 12 },
  CMF: { period: 20 },
  DPO: { period: 20 },
  KELTNER: { emaPeriod: 20, atrPeriod: 10, multiplier: 1.5 },
  VPVR: { bins: 50 },
};

const INDICATOR_COLORS = ['#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];

interface IndicatorState {
  indicators: IndicatorConfig[];
  addIndicator: (type: IndicatorType) => void;
  removeIndicator: (id: string) => void;
  toggleIndicator: (id: string) => void;
  updateIndicatorParams: (id: string, params: Record<string, number>) => void;
  updateIndicatorColor: (id: string, color: string) => void;
  getDefaultParams: (type: IndicatorType) => Record<string, number>;
}

let nextId = 0;

export const useIndicatorStore = create<IndicatorState>((set) => ({
  indicators: [],

  addIndicator: (type) => {
    const id = `${type}-${nextId++}`;
    const color = INDICATOR_COLORS[nextId % INDICATOR_COLORS.length];
    set((state) => ({
      indicators: [
        ...state.indicators,
        { id, type, params: { ...DEFAULT_PARAMS[type] }, color, visible: true },
      ],
    }));
  },

  removeIndicator: (id) =>
    set((state) => ({
      indicators: state.indicators.filter((i) => i.id !== id),
    })),

  toggleIndicator: (id) =>
    set((state) => ({
      indicators: state.indicators.map((i) =>
        i.id === id ? { ...i, visible: !i.visible } : i
      ),
    })),

  updateIndicatorParams: (id, params) =>
    set((state) => ({
      indicators: state.indicators.map((i) =>
        i.id === id ? { ...i, params: { ...i.params, ...params } } : i
      ),
    })),

  updateIndicatorColor: (id, color) =>
    set((state) => ({
      indicators: state.indicators.map((i) =>
        i.id === id ? { ...i, color } : i
      ),
    })),

  getDefaultParams: (type) => ({ ...DEFAULT_PARAMS[type] }),
}));
