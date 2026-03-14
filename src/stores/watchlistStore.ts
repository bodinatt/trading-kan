import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WatchlistItem {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
  sparklineData?: number[];
  groupId?: string | null;
}

export interface WatchlistGroup {
  id: string;
  name: string;
  collapsed: boolean;
}

export type SortOption = 'none' | 'name' | 'price' | 'change';

interface WatchlistState {
  items: WatchlistItem[];
  groups: WatchlistGroup[];
  sortBy: SortOption;
  addItem: (symbol: string, name: string) => void;
  removeItem: (symbol: string) => void;
  updatePrice: (
    symbol: string,
    price: number,
    change: number,
    changePercent: number
  ) => void;
  setSparklineData: (symbol: string, data: number[]) => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  setSortBy: (sort: SortOption) => void;
  addGroup: (name: string) => void;
  removeGroup: (id: string) => void;
  renameGroup: (id: string, name: string) => void;
  toggleGroupCollapse: (id: string) => void;
  moveItemToGroup: (symbol: string, groupId: string | null) => void;
}

const DEFAULT_GROUPS: WatchlistGroup[] = [
  { id: 'default', name: 'Watchlist', collapsed: false },
];

const DEFAULT_ITEMS: WatchlistItem[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', groupId: 'default' },
  { symbol: 'ETHUSDT', name: 'Ethereum', groupId: 'default' },
  { symbol: 'BNBUSDT', name: 'BNB', groupId: 'default' },
  { symbol: 'SOLUSDT', name: 'Solana', groupId: 'default' },
  { symbol: 'XRPUSDT', name: 'XRP', groupId: 'default' },
  { symbol: 'PAXGUSDT', name: 'Gold (PAX Gold)', groupId: 'default' },
  { symbol: 'USO', name: 'Oil Fund (USO)', groupId: 'default' },
];

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      items: DEFAULT_ITEMS,
      groups: DEFAULT_GROUPS,
      sortBy: 'none' as SortOption,

      addItem: (symbol, name) =>
        set((state) => {
          if (state.items.find((i) => i.symbol === symbol)) return state;
          return { items: [...state.items, { symbol, name, groupId: 'default' }] };
        }),

      removeItem: (symbol) =>
        set((state) => ({
          items: state.items.filter((i) => i.symbol !== symbol),
        })),

      updatePrice: (symbol, price, change, changePercent) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.symbol === symbol ? { ...i, price, change, changePercent } : i
          ),
        })),

      setSparklineData: (symbol, data) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.symbol === symbol ? { ...i, sparklineData: data } : i
          ),
        })),

      moveItem: (fromIndex, toIndex) =>
        set((state) => {
          const newItems = [...state.items];
          const [moved] = newItems.splice(fromIndex, 1);
          newItems.splice(toIndex, 0, moved);
          return { items: newItems };
        }),

      setSortBy: (sortBy) => set({ sortBy }),

      addGroup: (name) =>
        set((state) => ({
          groups: [...state.groups, { id: Date.now().toString(36), name, collapsed: false }],
        })),

      removeGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== id),
          items: state.items.map((i) =>
            i.groupId === id ? { ...i, groupId: null } : i
          ),
        })),

      renameGroup: (id, name) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id ? { ...g, name } : g
          ),
        })),

      toggleGroupCollapse: (id) =>
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === id ? { ...g, collapsed: !g.collapsed } : g
          ),
        })),

      moveItemToGroup: (symbol, groupId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.symbol === symbol ? { ...i, groupId } : i
          ),
        })),
    }),
    {
      name: 'trading-kan-watchlist',
      version: 2,
      partialize: (state) => ({
        items: state.items.map(({ symbol, name, groupId }) => ({ symbol, name, groupId })),
        groups: state.groups,
        sortBy: state.sortBy,
      }),
      migrate: (persisted, version) => {
        const state = persisted as { items: WatchlistItem[]; sortBy: SortOption; groups?: WatchlistGroup[] };
        if (version === 0) {
          // v1: add gold and oil if missing
          const symbols = new Set(state.items.map((i) => i.symbol));
          if (!symbols.has('PAXGUSDT')) {
            state.items.push({ symbol: 'PAXGUSDT', name: 'Gold (PAX Gold)' });
          }
          if (!symbols.has('USO')) {
            state.items.push({ symbol: 'USO', name: 'Oil Fund (USO)' });
          }
        }
        if (version < 2) {
          // v2: add groups and assign all items to default group
          state.items = state.items.map((i) => ({ ...i, groupId: i.groupId ?? 'default' }));
          if (!state.groups || state.groups.length === 0) {
            state.groups = [{ id: 'default', name: 'Watchlist', collapsed: false }];
          }
        }
        return state;
      },
    }
  )
);
