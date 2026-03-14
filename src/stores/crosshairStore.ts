import { create } from 'zustand';

interface CrosshairState {
  /** UTC timestamp (seconds) currently synced across charts, or null when no crosshair active */
  syncTime: number | null;
  /** ID of the chart that triggered the last sync (used to prevent infinite loops) */
  sourceChartId: string | null;
  setSyncTime: (time: number | null, sourceId: string | null) => void;
}

export const useCrosshairStore = create<CrosshairState>((set) => ({
  syncTime: null,
  sourceChartId: null,
  setSyncTime: (syncTime, sourceChartId) => set({ syncTime, sourceChartId }),
}));
