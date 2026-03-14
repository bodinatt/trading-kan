import { create } from 'zustand';
import type { Time } from 'lightweight-charts';

interface TimeScaleSyncState {
  /** Time-based visible range from the main chart */
  visibleTimeRange: { from: Time; to: Time } | null;
  setVisibleTimeRange: (range: { from: Time; to: Time } | null) => void;
}

export const useTimeScaleSyncStore = create<TimeScaleSyncState>((set) => ({
  visibleTimeRange: null,
  setVisibleTimeRange: (visibleTimeRange) => set({ visibleTimeRange }),
}));
