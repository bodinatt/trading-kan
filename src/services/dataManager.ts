import type { TimeframeKey } from '../types/chart';
import type { DataProvider, SymbolInfo } from './types';
import { binanceProvider } from './binance';
import { twelveDataProvider, getTwelveDataApiKey } from './twelvedata';

export type MarketType = 'crypto' | 'stock' | 'forex' | 'auto';

function detectMarket(symbol: string): MarketType {
  // Common forex pairs
  const forexPairs = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'USD', 'THB'];
  const upperSymbol = symbol.toUpperCase();

  // If it contains USDT/BUSD/BTC suffix, it's crypto on Binance
  if (upperSymbol.endsWith('USDT') || upperSymbol.endsWith('BUSD') || upperSymbol.endsWith('BTC')) {
    return 'crypto';
  }

  // If it contains "/" it's likely forex (EUR/USD) or stock via TwelveData
  if (symbol.includes('/')) {
    const parts = symbol.split('/');
    if (forexPairs.includes(parts[0]) && forexPairs.includes(parts[1])) {
      return 'forex';
    }
  }

  // Default to stock
  return 'stock';
}

function getProvider(market: MarketType): DataProvider {
  if (market === 'crypto') return binanceProvider;
  // For stocks and forex, use TwelveData if API key is available
  if (getTwelveDataApiKey()) return twelveDataProvider;
  // Fallback to Binance for crypto
  return binanceProvider;
}

export const dataManager = {
  async fetchHistorical(symbol: string, timeframe: TimeframeKey, limit?: number) {
    const market = detectMarket(symbol);
    const provider = getProvider(market);
    return provider.fetchHistorical(symbol, timeframe, limit);
  },

  subscribeRealtime(symbol: string, timeframe: TimeframeKey, onUpdate: (bar: import('../types/chart').OHLCData) => void) {
    const market = detectMarket(symbol);
    const provider = getProvider(market);
    return provider.subscribeRealtime(symbol, timeframe, onUpdate);
  },

  async searchSymbols(query: string): Promise<SymbolInfo[]> {
    // Search from both providers in parallel
    const results: SymbolInfo[] = [];

    const promises: Promise<SymbolInfo[]>[] = [
      binanceProvider.searchSymbols(query).catch(() => []),
    ];

    if (getTwelveDataApiKey()) {
      promises.push(twelveDataProvider.searchSymbols(query).catch(() => []));
    }

    const allResults = await Promise.all(promises);
    for (const r of allResults) {
      results.push(...r);
    }

    // Deduplicate by symbol
    const seen = new Set<string>();
    return results.filter((s) => {
      const key = `${s.symbol}-${s.exchange}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 30);
  },
};
