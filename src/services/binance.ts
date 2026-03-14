import type { TimeframeKey } from '../types/chart';
import type { DataProvider } from './types';

const BINANCE_REST = 'https://api.binance.com/api/v3';
const BINANCE_WS = 'wss://stream.binance.com:9443/ws';

const TIMEFRAME_MAP: Record<TimeframeKey, string> = {
  '1m': '1m',
  '2m': '2m',  // Note: Binance does not support 2m natively; falls back to closest
  '3m': '3m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '2h': '2h',
  '4h': '4h',
  '6h': '6h',
  '8h': '8h',
  '12h': '12h',
  '1D': '1d',
  '3D': '3d',
  '1W': '1w',
  '1M': '1M',
};

function mapKline(k: (string | number)[]) {
  return {
    time: Math.floor(Number(k[0]) / 1000),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  };
}

export const binanceProvider: DataProvider = {
  async fetchHistorical(symbol, timeframe, limit = 5000) {
    const interval = TIMEFRAME_MAP[timeframe];
    const sym = symbol.toUpperCase();
    const MAX_PER_REQUEST = 1000;

    if (limit <= MAX_PER_REQUEST) {
      const url = `${BINANCE_REST}/klines?symbol=${sym}&interval=${interval}&limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
      const data = await res.json();
      return data.map(mapKline);
    }

    // Paginate backwards to fetch more than 1000 bars
    const allBars: ReturnType<typeof mapKline>[] = [];
    let endTime: number | undefined;
    let remaining = limit;

    while (remaining > 0) {
      const batchSize = Math.min(remaining, MAX_PER_REQUEST);
      let url = `${BINANCE_REST}/klines?symbol=${sym}&interval=${interval}&limit=${batchSize}`;
      if (endTime !== undefined) url += `&endTime=${endTime}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
      const data = await res.json();
      if (data.length === 0) break;
      const bars = data.map(mapKline);
      allBars.unshift(...bars);
      // Set endTime to 1ms before the earliest bar's open time
      endTime = Number(data[0][0]) - 1;
      remaining -= data.length;
      if (data.length < batchSize) break; // No more data available
    }

    return allBars;
  },

  subscribeRealtime(symbol, timeframe, onUpdate) {
    const interval = TIMEFRAME_MAP[timeframe];
    const sym = symbol.toUpperCase();
    let destroyed = false;

    // --- REST polling fallback ---
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (pollTimer || destroyed) return;
      console.log(`[Binance] WS unavailable, falling back to REST polling for ${sym}`);
      pollTimer = setInterval(async () => {
        if (destroyed) return;
        try {
          const url = `${BINANCE_REST}/klines?symbol=${sym}&interval=${interval}&limit=1`;
          const res = await fetch(url);
          if (!res.ok) return;
          const data = await res.json();
          if (data.length > 0) {
            const bar = mapKline(data[0]);
            onUpdate(bar);
          }
        } catch {
          // REST fetch failed too, skip this tick
        }
      }, 3000);
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    // --- WebSocket with reconnection ---
    let ws: WebSocket | null = null;
    let reconnectDelay = 1000;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const MAX_RECONNECT_DELAY = 30000;

    const connect = () => {
      if (destroyed) return;
      const wsUrl = `${BINANCE_WS}/${symbol.toLowerCase()}@kline_${interval}`;
      ws = new WebSocket(wsUrl);

      // Timeout: if WS doesn't open within 5s, force close to trigger fallback
      const connectTimeout = setTimeout(() => {
        if (ws && ws.readyState !== WebSocket.OPEN) {
          console.log(`[Binance] WS connection timeout for ${sym}`);
          ws.close();
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(connectTimeout);
        console.log(`[Binance] WS connected for ${sym}`);
        reconnectDelay = 1000; // Reset backoff on successful connection
        stopPolling(); // WS is working, stop polling
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.k) {
          const k = msg.k;
          onUpdate({
            time: Math.floor(k.t / 1000),
            open: Number(k.o),
            high: Number(k.h),
            low: Number(k.l),
            close: Number(k.c),
            volume: Number(k.v),
          });
        }
      };

      ws.onerror = () => {
        // Will trigger onclose, handled there
      };

      ws.onclose = () => {
        if (destroyed) return;
        startPolling(); // Start polling as fallback
        // Schedule reconnect with exponential backoff
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
          connect();
        }, reconnectDelay);
      };
    };

    connect();

    return () => {
      destroyed = true;
      stopPolling();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  },

  async searchSymbols(query) {
    const res = await fetch(`${BINANCE_REST}/exchangeInfo`);
    if (!res.ok) return [];
    const data = await res.json();
    const q = query.toUpperCase();
    return data.symbols
      .filter(
        (s: { symbol: string; status: string }) =>
          s.status === 'TRADING' && s.symbol.includes(q)
      )
      .slice(0, 20)
      .map((s: { symbol: string; baseAsset: string }) => ({
        symbol: s.symbol,
        name: s.baseAsset,
        exchange: 'Binance',
        type: 'crypto' as const,
      }));
  },
};
