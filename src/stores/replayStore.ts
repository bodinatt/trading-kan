import { create } from 'zustand';
import type { OHLCData } from '../types/chart';

export interface ReplayState {
  isReplaying: boolean;
  isPlaying: boolean; // auto-advancing
  replayIndex: number; // current bar index (number of bars shown)
  replaySpeed: number; // ms per bar (100, 250, 500, 1000)
  fullData: OHLCData[]; // complete historical data

  startReplay: (data: OHLCData[], startIndex?: number) => void;
  stopReplay: () => void;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  setIndex: (index: number) => void;
}

export const useReplayStore = create<ReplayState>((set, get) => ({
  isReplaying: false,
  isPlaying: false,
  replayIndex: 0,
  replaySpeed: 500,
  fullData: [],

  startReplay: (data, startIndex) => {
    const idx = startIndex ?? Math.max(1, Math.floor(data.length * 0.2));
    set({
      isReplaying: true,
      isPlaying: false,
      fullData: data,
      replayIndex: Math.min(idx, data.length),
    });
  },

  stopReplay: () => {
    set({
      isReplaying: false,
      isPlaying: false,
      replayIndex: 0,
      fullData: [],
    });
  },

  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  setSpeed: (speed) => set({ replaySpeed: speed }),

  stepForward: () => {
    const { replayIndex, fullData } = get();
    if (replayIndex < fullData.length) {
      set({ replayIndex: replayIndex + 1 });
    }
  },

  stepBackward: () => {
    const { replayIndex } = get();
    if (replayIndex > 1) {
      set({ replayIndex: replayIndex - 1 });
    }
  },

  setIndex: (index) => {
    const { fullData } = get();
    if (index >= 1 && index <= fullData.length) {
      set({ replayIndex: index });
    }
  },
}));
