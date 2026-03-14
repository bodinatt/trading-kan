import type { OHLCData, TimeframeKey } from '../types/chart';

export interface DataProvider {
  fetchHistorical(symbol: string, timeframe: TimeframeKey, limit?: number): Promise<OHLCData[]>;
  subscribeRealtime(symbol: string, timeframe: TimeframeKey, onUpdate: (bar: OHLCData) => void): () => void;
  searchSymbols(query: string): Promise<SymbolInfo[]>;
}

export interface SymbolInfo {
  symbol: string;
  name: string;
  exchange: string;
  type: 'crypto' | 'stock' | 'forex';
}
