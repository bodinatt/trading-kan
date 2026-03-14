import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PanelId = 'watchlist' | 'alerts' | 'dataWindow' | 'news'
                    | 'screener' | 'calendar' | 'notifications' | 'help';

interface SidePanelState {
  activePanel: PanelId | null;
  panelWidth: number;
  togglePanel: (id: PanelId) => void;
  setPanelWidth: (w: number) => void;
  closePanel: () => void;
}

export const useSidePanelStore = create<SidePanelState>()(
  persist(
    (set, get) => ({
      activePanel: 'watchlist' as PanelId | null,
      panelWidth: 280,
      togglePanel: (id) => set({ activePanel: get().activePanel === id ? null : id }),
      setPanelWidth: (w) => set({ panelWidth: Math.max(240, Math.min(w, window.innerWidth * 0.5)) }),
      closePanel: () => set({ activePanel: null }),
    }),
    {
      name: 'trading-kan-side-panel',
      partialize: (s) => ({ activePanel: s.activePanel, panelWidth: s.panelWidth }),
    }
  )
);
