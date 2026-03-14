import { create } from 'zustand';

const COMPARISON_COLORS = [
  '#f59e0b',
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#a855f7',
  '#ec4899',
];

export interface ComparisonSymbol {
  symbol: string;
  color: string;
  visible: boolean;
}

interface ComparisonState {
  symbols: ComparisonSymbol[];
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  toggleSymbol: (symbol: string) => void;
  clearAll: () => void;
}

export const useComparisonStore = create<ComparisonState>((set) => ({
  symbols: [],

  addSymbol: (symbol) =>
    set((state) => {
      if (state.symbols.find((s) => s.symbol === symbol)) return state;
      if (state.symbols.length >= COMPARISON_COLORS.length) return state;
      const usedColors = new Set(state.symbols.map((s) => s.color));
      const color =
        COMPARISON_COLORS.find((c) => !usedColors.has(c)) ?? COMPARISON_COLORS[0];
      return {
        symbols: [...state.symbols, { symbol, color, visible: true }],
      };
    }),

  removeSymbol: (symbol) =>
    set((state) => ({
      symbols: state.symbols.filter((s) => s.symbol !== symbol),
    })),

  toggleSymbol: (symbol) =>
    set((state) => ({
      symbols: state.symbols.map((s) =>
        s.symbol === symbol ? { ...s, visible: !s.visible } : s
      ),
    })),

  clearAll: () => set({ symbols: [] }),
}));
