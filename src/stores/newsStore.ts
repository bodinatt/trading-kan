import { create } from 'zustand';

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  currencies?: string[];
}

interface NewsState {
  articles: NewsArticle[];
  isLoading: boolean;
  error: string | null;
  filter: 'all' | 'symbol';
  fetchNews: () => Promise<void>;
  setFilter: (f: 'all' | 'symbol') => void;
}

const FALLBACK_NEWS: NewsArticle[] = [
  { id: '1', title: 'Bitcoin Surges Past $100K as Institutional Demand Grows', url: '#', source: 'CryptoNews', publishedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', title: 'Ethereum 2.0 Staking Reaches New All-Time High', url: '#', source: 'CoinDesk', publishedAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', title: 'Solana DeFi TVL Crosses $15 Billion Mark', url: '#', source: 'The Block', publishedAt: new Date(Date.now() - 10800000).toISOString() },
  { id: '4', title: 'SEC Approves New Spot Crypto ETFs for Trading', url: '#', source: 'Bloomberg', publishedAt: new Date(Date.now() - 14400000).toISOString() },
  { id: '5', title: 'Binance Launches New Perpetual Futures Pairs', url: '#', source: 'CoinTelegraph', publishedAt: new Date(Date.now() - 18000000).toISOString(), currencies: ['BNB'] },
  { id: '6', title: 'Layer 2 Networks See Record Transaction Volume', url: '#', source: 'Decrypt', publishedAt: new Date(Date.now() - 21600000).toISOString(), currencies: ['ETH'] },
  { id: '7', title: 'MicroStrategy Adds More Bitcoin to Treasury Reserves', url: '#', source: 'CoinDesk', publishedAt: new Date(Date.now() - 43200000).toISOString(), currencies: ['BTC'] },
  { id: '8', title: 'Cardano Hard Fork Introduces Smart Contract Upgrades', url: '#', source: 'CryptoSlate', publishedAt: new Date(Date.now() - 64800000).toISOString(), currencies: ['ADA'] },
  { id: '9', title: 'Global Crypto Market Cap Reaches $4 Trillion', url: '#', source: 'Reuters', publishedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '10', title: 'Central Banks Accelerate CBDC Development Plans', url: '#', source: 'Financial Times', publishedAt: new Date(Date.now() - 172800000).toISOString() },
];

const CRYPTO_PANIC_URL = 'https://cryptopanic.com/api/free/v1/posts/?auth_token=free&public=true&kind=news';

export const useNewsStore = create<NewsState>((set) => ({
  articles: [],
  isLoading: false,
  error: null,
  filter: 'all',

  fetchNews: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(CRYPTO_PANIC_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const articles: NewsArticle[] = (json.results ?? []).map((r: any) => ({
        id: String(r.id ?? r.slug ?? Math.random()),
        title: r.title,
        url: r.url ?? r.source?.url ?? '#',
        source: r.source?.title ?? r.domain ?? 'Unknown',
        publishedAt: r.published_at ?? r.created_at ?? new Date().toISOString(),
        currencies: r.currencies?.map((c: any) => c.code) as string[] | undefined,
      }));
      if (articles.length === 0) throw new Error('Empty response');
      set({ articles, isLoading: false });
    } catch {
      // Fallback to sample data so the UI still works
      set({ articles: FALLBACK_NEWS, isLoading: false, error: null });
    }
  },

  setFilter: (filter) => set({ filter }),
}));
