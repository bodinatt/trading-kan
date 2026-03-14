import type { TimeframeKey } from '../types/chart';
import type { DataProvider } from './types';

const TD_REST = 'https://api.twelvedata.com';

// Free tier: 8 symbols WebSocket, 800 API calls/day
const DEFAULT_API_KEY = '3b2f905f36c04b2686dd7b2be5daa9b6';
let API_KEY = localStorage.getItem('td-api-key') || DEFAULT_API_KEY;

export function setTwelveDataApiKey(key: string) {
  API_KEY = key;
  localStorage.setItem('td-api-key', key);
}

export function getTwelveDataApiKey(): string {
  return API_KEY;
}

/** Validate a TwelveData API key by making a lightweight test request */
export async function validateTwelveDataApiKey(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(`${TD_REST}/time_series?symbol=AAPL&interval=1day&outputsize=1&apikey=${key}`);
    if (!res.ok) return { valid: false, error: `HTTP ${res.status}` };
    const json = await res.json();
    if (json.status === 'error') {
      return { valid: false, error: json.message || 'Invalid API key' };
    }
    if (json.values && json.values.length > 0) {
      return { valid: true };
    }
    return { valid: false, error: 'Unexpected response' };
  } catch (err) {
    return { valid: false, error: String(err) };
  }
}

const TIMEFRAME_MAP: Record<TimeframeKey, string> = {
  '1m': '1min',
  '2m': '2min',
  '3m': '3min',  // Note: Twelve Data may not support 3min; falls back to closest
  '5m': '5min',
  '15m': '15min',
  '30m': '30min',
  '1h': '1h',
  '2h': '2h',
  '4h': '4h',
  '6h': '6h',   // Note: Twelve Data may not support 6h natively
  '8h': '8h',   // Note: Twelve Data may not support 8h natively
  '12h': '12h', // Note: Twelve Data may not support 12h natively
  '1D': '1day',
  '3D': '3day', // Note: Twelve Data may not support 3day natively
  '1W': '1week',
  '1M': '1month',
};

export const twelveDataProvider: DataProvider = {
  async fetchHistorical(symbol, timeframe, limit = 5000) {
    if (!API_KEY) throw new Error('Twelve Data API key not set. Go to Settings to add your free API key.');

    const interval = TIMEFRAME_MAP[timeframe];
    const url = `${TD_REST}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${limit}&apikey=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Twelve Data API error: ${res.status}`);
    const json = await res.json();

    if (json.status === 'error') {
      throw new Error(json.message || 'Twelve Data API error');
    }

    const values = json.values || [];
    return values
      .map((v: { datetime: string; open: string; high: string; low: string; close: string; volume: string }) => ({
        time: Math.floor(new Date(v.datetime).getTime() / 1000),
        open: Number(v.open),
        high: Number(v.high),
        low: Number(v.low),
        close: Number(v.close),
        volume: Number(v.volume),
      }))
      .reverse(); // Twelve Data returns newest first
  },

  subscribeRealtime(symbol, _timeframe, onUpdate) {
    if (!API_KEY) return () => {};

    const ws = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${API_KEY}`);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          action: 'subscribe',
          params: { symbols: symbol },
        })
      );
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.event === 'price') {
        const price = Number(msg.price);
        const ts = Math.floor(msg.timestamp);
        onUpdate({
          time: ts,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 0,
        });
      }
    };

    ws.onerror = (err) => console.error('TwelveData WS error:', err);

    return () => ws.close();
  },

  async searchSymbols(query) {
    if (!API_KEY) return [];

    const url = `${TD_REST}/symbol_search?symbol=${encodeURIComponent(query)}&outputsize=20&apikey=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();

    return (json.data || []).map(
      (s: { symbol: string; instrument_name: string; exchange: string; instrument_type: string }) => ({
        symbol: s.symbol,
        name: s.instrument_name,
        exchange: s.exchange,
        type: mapType(s.instrument_type),
      })
    );
  },
};

function mapType(instrumentType: string): 'crypto' | 'stock' | 'forex' {
  if (instrumentType === 'Digital Currency') return 'crypto';
  if (instrumentType === 'Physical Currency') return 'forex';
  return 'stock';
}
