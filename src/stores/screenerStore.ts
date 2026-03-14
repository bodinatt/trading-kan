import { create } from 'zustand';

export interface TickerData {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
}

interface ScreenerState {
  tickers: TickerData[];
  isLoading: boolean;
  error: string | null;
  tab: 'gainers' | 'losers' | 'volume';
  fetchTickers: () => Promise<void>;
  setTab: (t: 'gainers' | 'losers' | 'volume') => void;
}

export const useScreenerStore = create<ScreenerState>((set) => ({
  tickers: [],
  isLoading: false,
  error: null,
  tab: 'gainers',

  setTab: (tab) => set({ tab }),

  fetchTickers: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const usdtPairs: TickerData[] = (data as Array<Record<string, string>>)
        .filter((t) => t.symbol.endsWith('USDT'))
        .map((t) => ({
          symbol: t.symbol,
          price: parseFloat(t.lastPrice),
          changePercent: parseFloat(t.priceChangePercent),
          volume: parseFloat(t.quoteVolume),
        }));

      set({ tickers: usdtPairs, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },
}));

/** Return top 20 tickers sorted by current tab */
export function getSortedTickers(
  tickers: TickerData[],
  tab: 'gainers' | 'losers' | 'volume'
): TickerData[] {
  const sorted = [...tickers].sort((a, b) => {
    if (tab === 'gainers') return b.changePercent - a.changePercent;
    if (tab === 'losers') return a.changePercent - b.changePercent;
    return b.volume - a.volume;
  });
  return sorted.slice(0, 20);
}
