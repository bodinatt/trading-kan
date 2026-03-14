import { create } from 'zustand';

interface TimeScaleSyncState {
  /** Logical range from the main chart's time scale */
  visibleLogicalRange: { from: number; to: number } | null;
  setVisibleLogicalRange: (range: { from: number; to: number } | null) => void;
}

export const useTimeScaleSyncStore = create<TimeScaleSyncState>((set) => ({
  visibleLogicalRange: null,
  setVisibleLogicalRange: (visibleLogicalRange) => set({ visibleLogicalRange }),
}));
