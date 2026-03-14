# Trading Kan — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a free, open-source TradingView-like charting platform supporting multiple markets (Crypto, Stocks, Forex) with real-time data, technical indicators, drawing tools, and multi-chart layouts.

**Architecture:** React + TypeScript SPA with Vite. Lightweight Charts v5 (Apache 2.0) as the charting engine. Zustand for state management. TailwindCSS for UI. Backend with Node.js + Express for auth, user data, and data proxying. PostgreSQL via Supabase free tier.

**Tech Stack:** React 18, TypeScript, Vite, Lightweight Charts v5, Zustand, TailwindCSS, react-grid-layout, Node.js, Express, PostgreSQL, JWT, WebSocket

---

## Phase 1: MVP

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`
- Create: `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Create: `.gitignore`, `CLAUDE.md`

**Step 1: Initialize Vite project with React + TypeScript**

```bash
cd "/c/Users/bodin_zcnq0ko/_Cowork/Personal/Trading Kan"
npm create vite@latest . -- --template react-ts
```

**Step 2: Install core dependencies**

```bash
npm install lightweight-charts zustand react-grid-layout
npm install -D tailwindcss @tailwindcss/vite @types/react-grid-layout
```

**Step 3: Configure TailwindCSS**

Replace `src/index.css` with:
```css
@import "tailwindcss";
```

Update `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

**Step 4: Create base App component**

Replace `src/App.tsx`:
```tsx
function App() {
  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4">
        <h1 className="text-lg font-bold">Trading Kan</h1>
      </header>
      <main className="flex-1 flex">
        <div className="flex-1 p-2">
          {/* Chart will go here */}
          <div className="h-full bg-gray-900 rounded border border-gray-800 flex items-center justify-center text-gray-500">
            Chart Area
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
```

**Step 5: Verify dev server runs**

```bash
npm run dev
```

Expected: App runs at localhost:5173 showing dark themed shell with "Trading Kan" header.

**Step 6: Create CLAUDE.md**

Create `CLAUDE.md` with project conventions:
```markdown
# Trading Kan

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — lint code

## Stack
- React 18 + TypeScript + Vite
- Lightweight Charts v5 (charting engine)
- Zustand (state management)
- TailwindCSS (styling)
- react-grid-layout (multi-chart layout)

## Conventions
- Use functional components with hooks
- Use TypeScript strict mode
- File naming: PascalCase for components, camelCase for utilities
- Store files: `src/stores/`
- Component files: `src/components/`
- Hook files: `src/hooks/`
- Type files: `src/types/`
- API/data files: `src/services/`
```

**Step 7: Initialize git and commit**

```bash
git init
git add .
git commit -m "feat: scaffold Trading Kan project with React + TS + Vite + TailwindCSS"
```

---

### Task 2: Chart Component with Candlestick Data

**Files:**
- Create: `src/components/Chart/ChartContainer.tsx`
- Create: `src/components/Chart/useChart.ts`
- Create: `src/types/chart.ts`
- Modify: `src/App.tsx`

**Step 1: Create chart types**

Create `src/types/chart.ts`:
```typescript
export interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type TimeframeKey = '1m' | '5m' | '15m' | '1h' | '4h' | '1D' | '1W';

export interface Timeframe {
  key: TimeframeKey;
  label: string;
  seconds: number;
}

export const TIMEFRAMES: Timeframe[] = [
  { key: '1m', label: '1m', seconds: 60 },
  { key: '5m', label: '5m', seconds: 300 },
  { key: '15m', label: '15m', seconds: 900 },
  { key: '1h', label: '1H', seconds: 3600 },
  { key: '4h', label: '4H', seconds: 14400 },
  { key: '1D', label: '1D', seconds: 86400 },
  { key: '1W', label: '1W', seconds: 604800 },
];
```

**Step 2: Create useChart hook**

Create `src/components/Chart/useChart.ts`:
```typescript
import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, type ISeriesApi, CandlestickSeries, type CandlestickData } from 'lightweight-charts';

const CHART_OPTIONS = {
  layout: {
    background: { color: '#0a0a0f' },
    textColor: '#9ca3af',
  },
  grid: {
    vertLines: { color: '#1f2937' },
    horzLines: { color: '#1f2937' },
  },
  crosshair: {
    mode: 0,
  },
  rightPriceScale: {
    borderColor: '#374151',
  },
  timeScale: {
    borderColor: '#374151',
    timeVisible: true,
    secondsVisible: false,
  },
};

export function useChart(containerRef: React.RefObject<HTMLDivElement | null>) {
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      ...CHART_OPTIONS,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [containerRef]);

  const setData = (data: CandlestickData[]) => {
    seriesRef.current?.setData(data);
    chartRef.current?.timeScale().fitContent();
  };

  const updateData = (bar: CandlestickData) => {
    seriesRef.current?.update(bar);
  };

  return { chart: chartRef, series: seriesRef, setData, updateData };
}
```

**Step 3: Create ChartContainer component**

Create `src/components/Chart/ChartContainer.tsx`:
```tsx
import { useRef } from 'react';
import { useChart } from './useChart';
import { useEffect } from 'react';

// Demo data for initial testing
function generateDemoData(count: number) {
  const data = [];
  let time = Math.floor(Date.now() / 1000) - count * 86400;
  let close = 100;

  for (let i = 0; i < count; i++) {
    const open = close + (Math.random() - 0.5) * 5;
    const high = Math.max(open, close) + Math.random() * 3;
    const low = Math.min(open, close) - Math.random() * 3;
    close = open + (Math.random() - 0.5) * 8;

    data.push({
      time: time as import('lightweight-charts').UTCTimestamp,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
    });

    time += 86400;
  }

  return data;
}

export function ChartContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setData } = useChart(containerRef);

  useEffect(() => {
    const demoData = generateDemoData(200);
    setData(demoData);
  }, [setData]);

  return (
    <div className="h-full w-full relative">
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
```

**Step 4: Wire ChartContainer into App**

Update `src/App.tsx`:
```tsx
import { ChartContainer } from './components/Chart/ChartContainer';

function App() {
  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4">
        <h1 className="text-lg font-bold">Trading Kan</h1>
      </header>
      <main className="flex-1 p-2">
        <div className="h-full bg-gray-900 rounded border border-gray-800 overflow-hidden">
          <ChartContainer />
        </div>
      </main>
    </div>
  );
}

export default App;
```

**Step 5: Verify chart renders**

```bash
npm run dev
```

Expected: Candlestick chart with 200 demo bars renders in the dark-themed container. Chart is responsive to window resizing.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add candlestick chart component with Lightweight Charts v5"
```

---

### Task 3: Binance Data Service (Crypto Real-time)

**Files:**
- Create: `src/services/binance.ts`
- Create: `src/services/types.ts`
- Create: `src/stores/chartStore.ts`
- Modify: `src/components/Chart/ChartContainer.tsx`

**Step 1: Create service types**

Create `src/services/types.ts`:
```typescript
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
```

**Step 2: Create Binance data service**

Create `src/services/binance.ts`:
```typescript
import type { OHLCData, TimeframeKey } from '../types/chart';
import type { DataProvider, SymbolInfo } from './types';

const BINANCE_REST = 'https://api.binance.com/api/v3';
const BINANCE_WS = 'wss://stream.binance.com:9443/ws';

const TIMEFRAME_MAP: Record<TimeframeKey, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h',
  '4h': '4h', '1D': '1d', '1W': '1w',
};

function parseKline(k: number[]): OHLCData {
  return {
    time: Math.floor(k[0] / 1000),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  };
}

export const binanceProvider: DataProvider = {
  async fetchHistorical(symbol, timeframe, limit = 500) {
    const interval = TIMEFRAME_MAP[timeframe];
    const url = `${BINANCE_REST}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    const data = await res.json();
    return data.map((k: number[]) => parseKline(k));
  },

  subscribeRealtime(symbol, timeframe, onUpdate) {
    const interval = TIMEFRAME_MAP[timeframe];
    const wsUrl = `${BINANCE_WS}/${symbol.toLowerCase()}@kline_${interval}`;
    const ws = new WebSocket(wsUrl);

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

    ws.onerror = (err) => console.error('Binance WS error:', err);

    return () => ws.close();
  },

  async searchSymbols(query) {
    const res = await fetch(`${BINANCE_REST}/exchangeInfo`);
    if (!res.ok) return [];
    const data = await res.json();
    const q = query.toUpperCase();
    return data.symbols
      .filter((s: { symbol: string; status: string }) =>
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
```

**Step 3: Create chart store with Zustand**

Create `src/stores/chartStore.ts`:
```typescript
import { create } from 'zustand';
import type { OHLCData, TimeframeKey } from '../types/chart';
import type { SymbolInfo } from '../services/types';
import { binanceProvider } from '../services/binance';

interface ChartState {
  symbol: string;
  symbolInfo: SymbolInfo | null;
  timeframe: TimeframeKey;
  data: OHLCData[];
  isLoading: boolean;
  error: string | null;

  setSymbol: (symbol: string) => void;
  setTimeframe: (tf: TimeframeKey) => void;
  loadData: () => Promise<void>;
  updateBar: (bar: OHLCData) => void;
}

export const useChartStore = create<ChartState>((set, get) => ({
  symbol: 'BTCUSDT',
  symbolInfo: { symbol: 'BTCUSDT', name: 'Bitcoin', exchange: 'Binance', type: 'crypto' },
  timeframe: '1h',
  data: [],
  isLoading: false,
  error: null,

  setSymbol: (symbol) => set({ symbol }),
  setTimeframe: (timeframe) => set({ timeframe }),

  loadData: async () => {
    const { symbol, timeframe } = get();
    set({ isLoading: true, error: null });
    try {
      const data = await binanceProvider.fetchHistorical(symbol, timeframe);
      set({ data, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  updateBar: (bar) => {
    set((state) => {
      const newData = [...state.data];
      const lastIdx = newData.length - 1;
      if (lastIdx >= 0 && newData[lastIdx].time === bar.time) {
        newData[lastIdx] = bar;
      } else {
        newData.push(bar);
      }
      return { data: newData };
    });
  },
}));
```

**Step 4: Update ChartContainer to use real data**

Update `src/components/Chart/ChartContainer.tsx`:
```tsx
import { useRef, useEffect } from 'react';
import { useChart } from './useChart';
import { useChartStore } from '../../stores/chartStore';
import { binanceProvider } from '../../services/binance';
import type { CandlestickData, UTCTimestamp } from 'lightweight-charts';

function toChartData(data: { time: number; open: number; high: number; low: number; close: number }[]): CandlestickData[] {
  return data.map((d) => ({
    time: d.time as UTCTimestamp,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
  }));
}

export function ChartContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setData, updateData } = useChart(containerRef);
  const { symbol, timeframe, data, loadData } = useChartStore();

  // Load historical data on symbol/timeframe change
  useEffect(() => {
    loadData();
  }, [symbol, timeframe, loadData]);

  // Push data to chart when it changes
  useEffect(() => {
    if (data.length > 0) {
      setData(toChartData(data));
    }
  }, [data, setData]);

  // Subscribe to real-time updates
  useEffect(() => {
    const updateBar = useChartStore.getState().updateBar;
    const unsub = binanceProvider.subscribeRealtime(symbol, timeframe, (bar) => {
      updateBar(bar);
      updateData({
        time: bar.time as UTCTimestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      });
    });

    return unsub;
  }, [symbol, timeframe, updateData]);

  return (
    <div className="h-full w-full relative">
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
```

**Step 5: Verify real-time data**

```bash
npm run dev
```

Expected: Chart loads BTCUSDT 1h candles from Binance and updates in real-time via WebSocket.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Binance data service with real-time WebSocket updates"
```

---

### Task 4: Toolbar — Symbol Search & Timeframe Selector

**Files:**
- Create: `src/components/Toolbar/Toolbar.tsx`
- Create: `src/components/Toolbar/SymbolSearch.tsx`
- Create: `src/components/Toolbar/TimeframeSelector.tsx`
- Modify: `src/App.tsx`

**Step 1: Create TimeframeSelector**

Create `src/components/Toolbar/TimeframeSelector.tsx`:
```tsx
import { TIMEFRAMES, type TimeframeKey } from '../../types/chart';
import { useChartStore } from '../../stores/chartStore';

export function TimeframeSelector() {
  const { timeframe, setTimeframe } = useChartStore();

  return (
    <div className="flex gap-0.5">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.key}
          onClick={() => setTimeframe(tf.key)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            timeframe === tf.key
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Create SymbolSearch**

Create `src/components/Toolbar/SymbolSearch.tsx`:
```tsx
import { useState, useRef, useEffect } from 'react';
import { binanceProvider } from '../../services/binance';
import { useChartStore } from '../../stores/chartStore';
import type { SymbolInfo } from '../../services/types';

export function SymbolSearch() {
  const { symbol, setSymbol } = useChartStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const symbols = await binanceProvider.searchSymbols(query);
      setResults(symbols);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (sym: SymbolInfo) => {
    setSymbol(sym.symbol);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
      >
        <span className="text-sm font-semibold">{symbol}</span>
        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol... (e.g. BTC, ETH)"
            className="w-full px-3 py-2 bg-transparent text-sm text-white outline-none border-b border-gray-700"
          />
          <div className="max-h-64 overflow-y-auto">
            {results.map((sym) => (
              <button
                key={sym.symbol}
                onClick={() => handleSelect(sym)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition-colors flex justify-between"
              >
                <span className="font-medium">{sym.symbol}</span>
                <span className="text-gray-500 text-xs">{sym.exchange}</span>
              </button>
            ))}
            {query && results.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-gray-500">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create Toolbar**

Create `src/components/Toolbar/Toolbar.tsx`:
```tsx
import { SymbolSearch } from './SymbolSearch';
import { TimeframeSelector } from './TimeframeSelector';

export function Toolbar() {
  return (
    <div className="h-10 bg-gray-900 border-b border-gray-800 flex items-center px-2 gap-3">
      <SymbolSearch />
      <div className="w-px h-5 bg-gray-700" />
      <TimeframeSelector />
    </div>
  );
}
```

**Step 4: Update App.tsx**

```tsx
import { ChartContainer } from './components/Chart/ChartContainer';
import { Toolbar } from './components/Toolbar/Toolbar';

function App() {
  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4">
        <h1 className="text-lg font-bold">Trading Kan</h1>
      </header>
      <Toolbar />
      <main className="flex-1 overflow-hidden p-2">
        <div className="h-full bg-gray-900 rounded border border-gray-800 overflow-hidden">
          <ChartContainer />
        </div>
      </main>
    </div>
  );
}

export default App;
```

**Step 5: Verify**

Expected: Symbol search dropdown works, clicking a symbol loads new chart data. Timeframe buttons switch between intervals. Real-time updates continue.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add symbol search and timeframe selector toolbar"
```

---

### Task 5: Technical Indicators (SMA, EMA, RSI, MACD, Bollinger Bands)

**Files:**
- Create: `src/utils/indicators.ts`
- Create: `src/components/Chart/IndicatorPane.tsx`
- Create: `src/stores/indicatorStore.ts`
- Create: `src/components/Toolbar/IndicatorMenu.tsx`
- Modify: `src/components/Chart/useChart.ts`
- Modify: `src/components/Chart/ChartContainer.tsx`
- Modify: `src/components/Toolbar/Toolbar.tsx`

**Step 1: Create indicator calculation utilities**

Create `src/utils/indicators.ts`:
```typescript
import type { OHLCData } from '../types/chart';

export function calcSMA(data: OHLCData[], period: number): { time: number; value: number }[] {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

export function calcEMA(data: OHLCData[], period: number): { time: number; value: number }[] {
  const result = [];
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((s, d) => s + d.close, 0) / period;
  result.push({ time: data[period - 1].time, value: ema });

  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result.push({ time: data[i].time, value: ema });
  }
  return result;
}

export function calcRSI(data: OHLCData[], period: number = 14): { time: number; value: number }[] {
  const result = [];
  const changes = [];

  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }

  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss -= changes[i];
  }
  avgGain /= period;
  avgLoss /= period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({ time: data[period].time, value: 100 - 100 / (1 + rs) });

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? -changes[i] : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ time: data[i + 1].time, value: 100 - 100 / (1 + rs) });
  }

  return result;
}

export function calcMACD(
  data: OHLCData[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): {
  macd: { time: number; value: number }[];
  signal: { time: number; value: number }[];
  histogram: { time: number; value: number; color: string }[];
} {
  const emaFast = calcEMA(data, fast);
  const emaSlow = calcEMA(data, slow);

  const macdLine: { time: number; value: number }[] = [];
  const slowStart = slow - fast;

  for (let i = 0; i < emaSlow.length; i++) {
    const fastVal = emaFast[i + slowStart];
    if (fastVal) {
      macdLine.push({ time: emaSlow[i].time, value: fastVal.value - emaSlow[i].value });
    }
  }

  // Signal line (EMA of MACD)
  const signalLine: { time: number; value: number }[] = [];
  const k = 2 / (signal + 1);
  if (macdLine.length >= signal) {
    let ema = macdLine.slice(0, signal).reduce((s, d) => s + d.value, 0) / signal;
    signalLine.push({ time: macdLine[signal - 1].time, value: ema });
    for (let i = signal; i < macdLine.length; i++) {
      ema = macdLine[i].value * k + ema * (1 - k);
      signalLine.push({ time: macdLine[i].time, value: ema });
    }
  }

  // Histogram
  const histogram: { time: number; value: number; color: string }[] = [];
  const sigStart = macdLine.length - signalLine.length;
  for (let i = 0; i < signalLine.length; i++) {
    const val = macdLine[i + sigStart].value - signalLine[i].value;
    histogram.push({
      time: signalLine[i].time,
      value: val,
      color: val >= 0 ? '#22c55e80' : '#ef444480',
    });
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

export function calcBollingerBands(
  data: OHLCData[],
  period: number = 20,
  stdDev: number = 2
): {
  upper: { time: number; value: number }[];
  middle: { time: number; value: number }[];
  lower: { time: number; value: number }[];
} {
  const middle = calcSMA(data, period);
  const upper: { time: number; value: number }[] = [];
  const lower: { time: number; value: number }[] = [];

  for (let i = 0; i < middle.length; i++) {
    const dataIdx = i + period - 1;
    let variance = 0;
    for (let j = 0; j < period; j++) {
      variance += Math.pow(data[dataIdx - j].close - middle[i].value, 2);
    }
    const std = Math.sqrt(variance / period);
    upper.push({ time: middle[i].time, value: middle[i].value + stdDev * std });
    lower.push({ time: middle[i].time, value: middle[i].value - stdDev * std });
  }

  return { upper, middle, lower };
}
```

**Step 2: Create indicator store**

Create `src/stores/indicatorStore.ts`:
```typescript
import { create } from 'zustand';

export type IndicatorType = 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB';

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  params: Record<string, number>;
  color?: string;
  visible: boolean;
}

const DEFAULT_PARAMS: Record<IndicatorType, Record<string, number>> = {
  SMA: { period: 20 },
  EMA: { period: 20 },
  RSI: { period: 14 },
  MACD: { fast: 12, slow: 26, signal: 9 },
  BB: { period: 20, stdDev: 2 },
};

interface IndicatorState {
  indicators: IndicatorConfig[];
  addIndicator: (type: IndicatorType) => void;
  removeIndicator: (id: string) => void;
  toggleIndicator: (id: string) => void;
}

let nextId = 0;

export const useIndicatorStore = create<IndicatorState>((set) => ({
  indicators: [],

  addIndicator: (type) => {
    const id = `${type}-${nextId++}`;
    set((state) => ({
      indicators: [
        ...state.indicators,
        { id, type, params: { ...DEFAULT_PARAMS[type] }, visible: true },
      ],
    }));
  },

  removeIndicator: (id) =>
    set((state) => ({
      indicators: state.indicators.filter((i) => i.id !== id),
    })),

  toggleIndicator: (id) =>
    set((state) => ({
      indicators: state.indicators.map((i) =>
        i.id === id ? { ...i, visible: !i.visible } : i
      ),
    })),
}));
```

**Step 3: Create IndicatorMenu**

Create `src/components/Toolbar/IndicatorMenu.tsx`:
```tsx
import { useState, useRef, useEffect } from 'react';
import { useIndicatorStore, type IndicatorType } from '../../stores/indicatorStore';

const INDICATORS: { type: IndicatorType; label: string; description: string }[] = [
  { type: 'SMA', label: 'SMA', description: 'Simple Moving Average' },
  { type: 'EMA', label: 'EMA', description: 'Exponential Moving Average' },
  { type: 'RSI', label: 'RSI', description: 'Relative Strength Index' },
  { type: 'MACD', label: 'MACD', description: 'Moving Average Convergence Divergence' },
  { type: 'BB', label: 'Bollinger Bands', description: 'Bollinger Bands (SMA ± 2 Std Dev)' },
];

export function IndicatorMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { addIndicator, indicators, removeIndicator } = useIndicatorStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-white rounded transition-colors"
      >
        Indicators
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-2 border-b border-gray-700 text-xs text-gray-500 uppercase">Add Indicator</div>
          {INDICATORS.map((ind) => (
            <button
              key={ind.type}
              onClick={() => { addIndicator(ind.type); setIsOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-800 transition-colors"
            >
              <div className="font-medium">{ind.label}</div>
              <div className="text-xs text-gray-500">{ind.description}</div>
            </button>
          ))}

          {indicators.length > 0 && (
            <>
              <div className="p-2 border-t border-gray-700 text-xs text-gray-500 uppercase">Active</div>
              {indicators.map((ind) => (
                <div key={ind.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                  <span>{ind.type} ({Object.values(ind.params).join(', ')})</span>
                  <button
                    onClick={() => removeIndicator(ind.id)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Update useChart to support overlay indicators and separate panes**

This step adds indicator line series on the main chart and creates separate chart instances for RSI/MACD. The implementation details will be refined during execution, but the pattern is:
- Overlay indicators (SMA, EMA, BB) → `LineSeries` added to main chart
- Separate pane indicators (RSI, MACD) → new `createChart()` instances stacked below main chart

Update `src/components/Chart/useChart.ts` to export `addLineSeries` and `addHistogramSeries` methods:
```typescript
// Add to the return of useChart:
const addLineSeries = (options: { color: string; lineWidth?: number }) => {
  if (!chartRef.current) return null;
  const series = chartRef.current.addSeries(LineSeries, {
    color: options.color,
    lineWidth: (options.lineWidth ?? 1) as LineWidth,
    crosshairMarkerVisible: false,
    priceLineVisible: false,
    lastValueVisible: false,
  });
  return series;
};

return { chart: chartRef, series: seriesRef, setData, updateData, addLineSeries };
```

**Step 5: Update Toolbar to include IndicatorMenu**

Add `<IndicatorMenu />` to `Toolbar.tsx` after `<TimeframeSelector />`.

**Step 6: Verify indicators render**

Expected: Adding SMA/EMA shows colored lines on the main chart. RSI shows as separate pane with 0-100 scale. MACD shows with histogram and signal line.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands)"
```

---

### Task 6: Watchlist Sidebar

**Files:**
- Create: `src/components/Watchlist/Watchlist.tsx`
- Create: `src/stores/watchlistStore.ts`
- Modify: `src/App.tsx`

**Step 1: Create watchlist store**

Create `src/stores/watchlistStore.ts`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WatchlistItem {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

interface WatchlistState {
  items: WatchlistItem[];
  addItem: (symbol: string, name: string) => void;
  removeItem: (symbol: string) => void;
  updatePrice: (symbol: string, price: number, change: number, changePercent: number) => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      items: [
        { symbol: 'BTCUSDT', name: 'Bitcoin' },
        { symbol: 'ETHUSDT', name: 'Ethereum' },
        { symbol: 'BNBUSDT', name: 'BNB' },
        { symbol: 'SOLUSDT', name: 'Solana' },
      ],

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
    }),
    { name: 'trading-kan-watchlist' }
  )
);
```

**Step 2: Create Watchlist component**

Create `src/components/Watchlist/Watchlist.tsx`:
```tsx
import { useEffect } from 'react';
import { useWatchlistStore } from '../../stores/watchlistStore';
import { useChartStore } from '../../stores/chartStore';

export function Watchlist() {
  const { items, updatePrice, removeItem } = useWatchlistStore();
  const setSymbol = useChartStore((s) => s.setSymbol);

  // Subscribe to mini tickers for all watchlist symbols
  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');

    ws.onmessage = (event) => {
      const tickers = JSON.parse(event.data);
      for (const ticker of tickers) {
        const symbol = ticker.s;
        const price = Number(ticker.c);
        const open = Number(ticker.o);
        const change = price - open;
        const changePercent = open > 0 ? (change / open) * 100 : 0;
        updatePrice(symbol, price, change, changePercent);
      }
    };

    return () => ws.close();
  }, [updatePrice]);

  return (
    <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col">
      <div className="p-2 border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase">
        Watchlist
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.symbol}
            onClick={() => setSymbol(item.symbol)}
            className="w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors group flex justify-between items-center"
          >
            <div>
              <div className="text-sm font-medium">{item.symbol}</div>
              <div className="text-xs text-gray-500">{item.name}</div>
            </div>
            <div className="text-right">
              {item.price != null && (
                <>
                  <div className="text-sm">{item.price.toFixed(2)}</div>
                  <div className={`text-xs ${(item.changePercent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(item.changePercent ?? 0) >= 0 ? '+' : ''}{(item.changePercent ?? 0).toFixed(2)}%
                  </div>
                </>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); removeItem(item.symbol); }}
              className="ml-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 text-xs"
            >
              x
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Update App layout**

```tsx
import { ChartContainer } from './components/Chart/ChartContainer';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Watchlist } from './components/Watchlist/Watchlist';

function App() {
  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4">
        <h1 className="text-lg font-bold">Trading Kan</h1>
      </header>
      <Toolbar />
      <main className="flex-1 overflow-hidden flex">
        <div className="flex-1 p-2">
          <div className="h-full bg-gray-900 rounded border border-gray-800 overflow-hidden">
            <ChartContainer />
          </div>
        </div>
        <Watchlist />
      </main>
    </div>
  );
}

export default App;
```

**Step 4: Verify**

Expected: Watchlist shows real-time prices for BTC, ETH, BNB, SOL. Clicking a symbol loads it in the chart. Price changes flash green/red.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add watchlist sidebar with real-time Binance prices"
```

---

### Task 7: Volume Bars

**Files:**
- Modify: `src/components/Chart/useChart.ts`
- Modify: `src/components/Chart/ChartContainer.tsx`

**Step 1: Add volume histogram to useChart**

Add volume series to the chart with `HistogramSeries` type, pinned to `priceScaleId: 'volume'` with minimal height (~20% of chart).

**Step 2: Pass volume data from ChartContainer**

Map the OHLC data to extract volume values and set them on the volume series.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add volume bars below candlestick chart"
```

---

## Phase 2: Enhanced (Future Tasks)

### Task 8: Drawing Tools (Trendline, Horizontal Line, Fibonacci)
- Use Lightweight Charts v5 plugin/primitive API for custom drawing
- Canvas overlay for interactive drawing
- Store drawings in localStorage per symbol

### Task 9: Multi-Chart Layout
- Use `react-grid-layout` with `ResponsiveGridLayout`
- Each grid cell contains an independent `ChartContainer`
- Preset layouts: 1x1, 2x1, 2x2, 1+2 (one large + two small)
- Save layout to localStorage

### Task 10: User Authentication
- Backend: Node.js + Express with JWT
- Routes: POST /auth/register, POST /auth/login, GET /auth/me
- Frontend: Login/Register modal, auth context
- Database: Supabase PostgreSQL free tier

### Task 11: Additional Data Sources (Stocks, Forex)
- Yahoo Finance proxy (backend) for US stocks
- Twelve Data free tier for forex
- DataProvider interface already supports this
- Symbol search aggregates results from all providers

---

## Summary

| Phase | Tasks | Core Deliverable |
|-------|-------|-----------------|
| Phase 1 | Tasks 1-7 | Working MVP with real-time crypto charts, indicators, watchlist |
| Phase 2 | Tasks 8-11 | Drawing tools, multi-chart, auth, multi-market |
| Phase 3 | Future | Alerts, custom indicators, sharing, mobile |
