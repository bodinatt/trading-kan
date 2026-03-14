import type { TimeframeKey } from '../types/chart';
import type { DataProvider, SymbolInfo } from './types';

// Use our Cloudflare Pages Function proxy to bypass CORS
const PROXY = '/api/yahoo';

const INTERVAL_MAP: Record<TimeframeKey, string> = {
  '1m': '1m',
  '2m': '2m',
  '3m': '5m',   // Yahoo doesn't have 3m, use 5m
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '2h': '1h',   // Yahoo doesn't have 2h, use 1h
  '4h': '1h',   // Yahoo doesn't have 4h, use 1h
  '6h': '1d',   // Fallback
  '8h': '1d',   // Fallback
  '12h': '1d',  // Fallback
  '1D': '1d',
  '3D': '1wk',  // Yahoo doesn't have 3d, use 1wk
  '1W': '1wk',
  '1M': '1mo',
};

// Yahoo requires a range that matches the interval
function getRange(timeframe: TimeframeKey, limit: number): string {
  const interval = INTERVAL_MAP[timeframe];
  if (interval === '1m') return '7d';
  if (interval === '2m') return '60d';
  if (interval === '5m' || interval === '15m' || interval === '30m') return '60d';
  if (interval === '1h') return '730d';
  if (interval === '1d') {
    if (limit > 1000) return 'max';
    return '5y';
  }
  if (interval === '1wk' || interval === '1mo') return 'max';
  return '5y';
}

export const yahooProvider: DataProvider = {
  async fetchHistorical(symbol, timeframe, limit = 5000) {
    const interval = INTERVAL_MAP[timeframe];
    const range = getRange(timeframe, limit);

    const endpoint = `/v8/finance/chart/${encodeURIComponent(symbol)}`;
    const url = `${PROXY}?endpoint=${encodeURIComponent(endpoint)}&interval=${interval}&range=${range}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Yahoo Finance API error: ${res.status}`);
      const json = await res.json();

      const result = json.chart?.result?.[0];
      if (!result) throw new Error('No data returned from Yahoo Finance');

      const timestamps = result.timestamp || [];
      const quote = result.indicators?.quote?.[0];
      if (!quote) throw new Error('No quote data from Yahoo Finance');

      const bars = [];
      for (let i = 0; i < timestamps.length; i++) {
        const o = quote.open?.[i];
        const h = quote.high?.[i];
        const l = quote.low?.[i];
        const c = quote.close?.[i];
        const v = quote.volume?.[i];
        // Skip bars with null values
        if (o == null || h == null || l == null || c == null) continue;
        bars.push({
          time: timestamps[i] as number,
          open: o,
          high: h,
          low: l,
          close: c,
          volume: v ?? 0,
        });
      }

      return bars;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  subscribeRealtime(symbol, timeframe, onUpdate) {
    // Yahoo doesn't have WebSocket — use REST polling every 10s
    let destroyed = false;
    const interval = INTERVAL_MAP[timeframe];

    const poll = async () => {
      if (destroyed) return;
      try {
        const endpoint = `/v8/finance/chart/${encodeURIComponent(symbol)}`;
        const url = `${PROXY}?endpoint=${encodeURIComponent(endpoint)}&interval=${interval}&range=1d`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        const result = json.chart?.result?.[0];
        if (!result) return;

        const timestamps = result.timestamp || [];
        const quote = result.indicators?.quote?.[0];
        if (!quote || timestamps.length === 0) return;

        // Get the last bar
        const i = timestamps.length - 1;
        const o = quote.open?.[i];
        const h = quote.high?.[i];
        const l = quote.low?.[i];
        const c = quote.close?.[i];
        const v = quote.volume?.[i];
        if (o != null && h != null && l != null && c != null) {
          onUpdate({
            time: timestamps[i],
            open: o,
            high: h,
            low: l,
            close: c,
            volume: v ?? 0,
          });
        }
      } catch {
        // Polling failed, skip
      }
    };

    // Initial poll
    poll();
    const timer = setInterval(poll, 10000);

    return () => {
      destroyed = true;
      clearInterval(timer);
    };
  },

  async searchSymbols(query): Promise<SymbolInfo[]> {
    try {
      const endpoint = `/v1/finance/search`;
      const url = `${PROXY}?endpoint=${encodeURIComponent(endpoint)}&q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();

      return (json.quotes || [])
        .filter((q: { quoteType?: string }) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'INDEX')
        .map((q: { symbol: string; shortname?: string; longname?: string; exchange?: string; quoteType?: string }) => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          exchange: q.exchange || 'US',
          type: 'stock' as const,
        }));
    } catch {
      return [];
    }
  },
};
