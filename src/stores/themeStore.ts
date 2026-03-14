import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';

export interface ThemeColors {
  bg: string;
  chartBg: string;
  text: string;
  gridColor: string;
  borderColor: string;
  panelBg: string;
  legendBg: string;
}

const THEME_COLORS: Record<Theme, ThemeColors> = {
  dark: {
    bg: '#030712',       // gray-950
    chartBg: '#111827',  // gray-900
    text: '#9ca3af',     // gray-400
    gridColor: '#1f293780',
    borderColor: '#374151',
    panelBg: '#111827',
    legendBg: 'rgba(17, 24, 39, 0.75)',
  },
  light: {
    bg: '#ffffff',
    chartBg: '#ffffff',
    text: '#374151',     // gray-700
    gridColor: '#e5e7eb80',
    borderColor: '#d1d5db',
    panelBg: '#f9fafb',
    legendBg: 'rgba(255, 255, 255, 0.85)',
  },
};

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  colors: ThemeColors;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      colors: THEME_COLORS.dark,

      setTheme: (t: Theme) => {
        set({ theme: t, colors: THEME_COLORS[t] });
      },

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: next, colors: THEME_COLORS[next] });
      },
    }),
    {
      name: 'trading-kan-theme',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.colors = THEME_COLORS[state.theme];
        }
      },
    }
  )
);

export function getChartOptions(theme: Theme) {
  const c = THEME_COLORS[theme];
  return {
    layout: {
      background: { color: c.chartBg },
      textColor: c.text,
    },
    grid: {
      vertLines: { color: c.gridColor },
      horzLines: { color: c.gridColor },
    },
    crosshair: {
      mode: 0 as const,
    },
    rightPriceScale: {
      borderColor: c.borderColor,
    },
    timeScale: {
      borderColor: c.borderColor,
      timeVisible: true,
      secondsVisible: false,
    },
  };
}

export function getPaneOptions(theme: Theme) {
  const c = THEME_COLORS[theme];
  return {
    layout: {
      background: { color: c.chartBg },
      textColor: c.text,
    },
    grid: {
      vertLines: { color: c.gridColor },
      horzLines: { color: c.gridColor },
    },
    rightPriceScale: {
      borderColor: c.borderColor,
    },
    timeScale: {
      borderColor: c.borderColor,
      timeVisible: true,
      secondsVisible: false,
      visible: false,
    },
    crosshair: {
      mode: 0 as const,
    },
  };
}
