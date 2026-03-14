import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChartType } from './chartStore';

export interface ChartPanelConfig {
  id: string;
  symbol: string;
  timeframe: string;
  chartType: ChartType;
}

export type LayoutPreset = '1x1' | '1x2' | '2x1' | '2x2' | '3x1' | '1+2';

interface LayoutState {
  preset: LayoutPreset;
  panels: ChartPanelConfig[];
  activePanel: string;
  setPreset: (preset: LayoutPreset) => void;
  setActivePanel: (id: string) => void;
  updatePanel: (id: string, updates: Partial<ChartPanelConfig>) => void;
}

function createPanels(preset: LayoutPreset): ChartPanelConfig[] {
  const count = {
    '1x1': 1,
    '1x2': 2,
    '2x1': 2,
    '2x2': 4,
    '3x1': 3,
    '1+2': 3,
  }[preset];

  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];
  return Array.from({ length: count }, (_, i) => ({
    id: `panel-${i}`,
    symbol: symbols[i] || 'BTCUSDT',
    timeframe: '1h',
    chartType: 'candle' as ChartType,
  }));
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      preset: '1x1',
      panels: createPanels('1x1'),
      activePanel: 'panel-0',

      setPreset: (preset) =>
        set({ preset, panels: createPanels(preset), activePanel: 'panel-0' }),

      setActivePanel: (id) => set({ activePanel: id }),

      updatePanel: (id, updates) =>
        set((state) => ({
          panels: state.panels.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
    }),
    { name: 'trading-kan-layout' }
  )
);
