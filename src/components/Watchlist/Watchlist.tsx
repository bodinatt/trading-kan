import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useWatchlistStore, type SortOption, type WatchlistItem } from '../../stores/watchlistStore';
import { useChartStore } from '../../stores/chartStore';
import { dataManager } from '../../services/dataManager';
import type { SymbolInfo } from '../../services/types';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';

/* ---------- Mini sparkline component ---------- */
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 48;
  const h = 18;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#22c55e' : '#ef4444'}
        strokeWidth={1.2}
      />
    </svg>
  );
}

/* ---------- Search dropdown ---------- */
function WatchlistSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolInfo[]>([]);
  const [open, setOpen] = useState(false);
  const addItem = useWatchlistStore((s) => s.addItem);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (val: string) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    if (val.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const res = await dataManager.searchSymbols(val.trim());
      setResults(res);
      setOpen(true);
    }, 300);
  };

  const handleSelect = (info: SymbolInfo) => {
    addItem(info.symbol, info.name);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative px-2 pt-1 pb-1">
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={t.addSymbol}
        className={`w-full text-xs px-2 py-1 rounded border focus:border-blue-500 focus:outline-none ${isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
      />
      {open && results.length > 0 && (
        <div className={`absolute left-2 right-2 top-full mt-0.5 rounded shadow-lg z-50 max-h-48 overflow-y-auto border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {results.map((r) => (
            <button
              key={`${r.symbol}-${r.exchange}`}
              onClick={() => handleSelect(r)}
              className={`w-full text-left px-2 py-1.5 flex items-center gap-2 text-xs ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{r.symbol}</span>
              <span className={`truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{r.name}</span>
              <span className="ml-auto text-gray-500 text-[10px]">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Sort selector ---------- */
function SortSelector() {
  const sortBy = useWatchlistStore((s) => s.sortBy);
  const setSortBy = useWatchlistStore((s) => s.setSortBy);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  return (
    <select
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value as SortOption)}
      className={`text-[10px] border rounded px-1 py-0.5 focus:outline-none cursor-pointer ${isDark ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-600 border-gray-300'}`}
    >
      <option value="none">{t.custom}</option>
      <option value="name">{t.name}</option>
      <option value="price">{t.price}</option>
      <option value="change">{t.change24h}</option>
    </select>
  );
}

/* ---------- Apply sort ---------- */
function applySortToItems(items: WatchlistItem[], sortBy: SortOption): WatchlistItem[] {
  if (sortBy === 'none') return items;
  const sorted = [...items];
  switch (sortBy) {
    case 'name':
      sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
      break;
    case 'price':
      sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      break;
    case 'change':
      sorted.sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
      break;
  }
  return sorted;
}

/* ---------- Main Watchlist component ---------- */
export function Watchlist() {
  const items = useWatchlistStore((s) => s.items);
  const updatePrice = useWatchlistStore((s) => s.updatePrice);
  const removeItem = useWatchlistStore((s) => s.removeItem);
  const moveItem = useWatchlistStore((s) => s.moveItem);
  const setSparklineData = useWatchlistStore((s) => s.setSparklineData);
  const sortBy = useWatchlistStore((s) => s.sortBy);
  const setSymbol = useChartStore((s) => s.setSymbol);
  const currentSymbol = useChartStore((s) => s.symbol);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const sortedItems = useMemo(() => applySortToItems(items, sortBy), [items, sortBy]);

  // Subscribe to mini tickers for all watchlist symbols
  useEffect(() => {
    if (items.length === 0) return;
    const ws = new WebSocket(
      'wss://stream.binance.com:9443/ws/!miniTicker@arr'
    );
    const symbolSet = new Set(items.map((i) => i.symbol));

    ws.onmessage = (event) => {
      const tickers = JSON.parse(event.data);
      for (const ticker of tickers) {
        if (!symbolSet.has(ticker.s)) continue;
        const price = Number(ticker.c);
        const open = Number(ticker.o);
        const change = price - open;
        const changePercent = open > 0 ? (change / open) * 100 : 0;
        updatePrice(ticker.s, price, change, changePercent);
      }
    };

    ws.onerror = () => {};

    return () => ws.close();
  }, [items, updatePrice]);

  // Fetch sparkline data for each symbol
  const sparklineLoaded = useRef(new Set<string>());
  useEffect(() => {
    for (const item of items) {
      if (sparklineLoaded.current.has(item.symbol)) continue;
      sparklineLoaded.current.add(item.symbol);
      dataManager
        .fetchHistorical(item.symbol, '1h', 48)
        .then((bars) => {
          const closes = bars.slice(-24).map((b) => b.close);
          setSparklineData(item.symbol, closes);
        })
        .catch(() => {});
    }
  }, [items, setSparklineData]);

  // Drag handlers (only active when sortBy === 'none')
  const handleDragStart = useCallback(
    (e: React.DragEvent, idx: number) => {
      if (sortBy !== 'none') return;
      setDragIndex(idx);
      e.dataTransfer.effectAllowed = 'move';
    },
    [sortBy]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      if (sortBy !== 'none') return;
      setDragOverIndex(idx);
    },
    [sortBy]
  );

  const handleDrop = useCallback(
    (_e: React.DragEvent, idx: number) => {
      if (dragIndex != null && dragIndex !== idx && sortBy === 'none') {
        moveItem(dragIndex, idx);
      }
      setDragIndex(null);
      setDragOverIndex(null);
    },
    [dragIndex, moveItem, sortBy]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  // Move up/down helpers
  const handleMoveUp = useCallback(
    (idx: number) => {
      if (idx > 0) moveItem(idx, idx - 1);
    },
    [moveItem]
  );
  const handleMoveDown = useCallback(
    (idx: number) => {
      if (idx < items.length - 1) moveItem(idx, idx + 1);
    },
    [moveItem, items.length]
  );

  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  return (
    <div className={`w-60 flex flex-col ${
      isDark ? 'bg-gray-900 border-l border-gray-800' : 'bg-white border-l border-gray-200'
    }`}>
      {/* Header */}
      <div className={`p-2 flex items-center justify-between ${
        isDark ? 'border-b border-gray-800' : 'border-b border-gray-200'
      }`}>
        <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {t.watchlist}
        </span>
        <SortSelector />
      </div>

      {/* Search */}
      <WatchlistSearch />

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {sortedItems.map((item) => {
          // For drag, we need original index
          const origIdx = items.findIndex((i) => i.symbol === item.symbol);
          const isPositive = (item.changePercent ?? 0) >= 0;
          const bgGradient = item.price != null
            ? isPositive
              ? 'linear-gradient(90deg, rgba(34,197,94,0.08) 0%, transparent 100%)'
              : 'linear-gradient(90deg, rgba(239,68,68,0.08) 0%, transparent 100%)'
            : undefined;

          return (
            <div
              key={item.symbol}
              draggable={sortBy === 'none'}
              onDragStart={(e) => handleDragStart(e, origIdx)}
              onDragOver={(e) => handleDragOver(e, origIdx)}
              onDrop={(e) => handleDrop(e, origIdx)}
              onDragEnd={handleDragEnd}
              onClick={() => setSymbol(item.symbol)}
              role="button"
              className={`w-full text-left px-3 py-2 transition-colors group flex items-center cursor-pointer ${
                isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              } ${
                currentSymbol === item.symbol ? (isDark ? 'bg-gray-800/50' : 'bg-blue-50') : ''
              } ${dragOverIndex === origIdx && dragIndex !== origIdx ? 'border-t-2 border-blue-500' : ''}`}
              style={{ background: bgGradient }}
            >
              {/* Reorder buttons (only in custom order) */}
              {sortBy === 'none' && (
                <div className={`flex flex-col mr-1 opacity-0 group-hover:opacity-100 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveUp(origIdx);
                    }}
                    className={`text-[8px] leading-none ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`}
                    title={t.moveUp}
                  >
                    ▲
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveDown(origIdx);
                    }}
                    className={`text-[8px] leading-none ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`}
                    title={t.moveDown}
                  >
                    ▼
                  </button>
                </div>
              )}

              {/* Symbol info */}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate">{item.symbol}</div>
                <div className="text-[10px] text-gray-500">{item.name}</div>
              </div>

              {/* Sparkline */}
              {item.sparklineData && item.sparklineData.length > 1 && (
                <Sparkline data={item.sparklineData} positive={isPositive} />
              )}

              {/* Price / change */}
              <div className="text-right flex-shrink-0 ml-2">
                {item.price != null && (
                  <>
                    <div className="text-xs font-mono">
                      {item.price < 1
                        ? item.price.toFixed(6)
                        : item.price < 100
                          ? item.price.toFixed(4)
                          : item.price.toFixed(2)}
                    </div>
                    <div
                      className={`text-[10px] font-mono ${
                        isPositive ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {(item.changePercent ?? 0).toFixed(2)}%
                    </div>
                  </>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(item.symbol);
                }}
                className="ml-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 text-xs flex-shrink-0"
              >
                x
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
