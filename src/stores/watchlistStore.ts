import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WatchlistItem {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
  sparklineData?: number[];
}

export type SortOption = 'none' | 'name' | 'price' | 'change';

interface WatchlistState {
  items: WatchlistItem[];
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
}

const DEFAULT_ITEMS: WatchlistItem[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin' },
  { symbol: 'ETHUSDT', name: 'Ethereum' },
  { symbol: 'BNBUSDT', name: 'BNB' },
  { symbol: 'SOLUSDT', name: 'Solana' },
  { symbol: 'XRPUSDT', name: 'XRP' },
  { symbol: 'PAXGUSDT', name: 'Gold (PAX Gold)' },
  { symbol: 'USO', name: 'Oil Fund (USO)' },
];

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      items: DEFAULT_ITEMS,
      sortBy: 'none' as SortOption,

      addItem: (symbol, name) =>
        set((state) => {
          if (state.items.find((i) => i.symbol === symbol)) return state;
          return { items: [...state.items, { symbol, name }] };
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
    }),
    {
      name: 'trading-kan-watchlist',
      version: 1,
      partialize: (state) => ({
        items: state.items.map(({ symbol, name }) => ({ symbol, name })),
        sortBy: state.sortBy,
      }),
      migrate: (persisted, version) => {
        const state = persisted as { items: WatchlistItem[]; sortBy: SortOption };
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
        return state;
      },
    }
  )
);
