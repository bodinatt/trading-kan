import { useEffect } from 'react';
import { useScreenerStore, getSortedTickers, type TickerData } from '../../../stores/screenerStore';
import { useChartStore } from '../../../stores/chartStore';
import { useThemeStore } from '../../../stores/themeStore';
import { useTranslation } from '../../../i18n';

function formatPrice(price: number): string {
  if (price >= 1) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(8);
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return (vol / 1_000_000_000).toFixed(1) + 'B';
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + 'M';
  if (vol >= 1_000) return (vol / 1_000).toFixed(1) + 'K';
  return vol.toFixed(0);
}

function formatChange(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function ScreenerPanel() {
  const tx = useTranslation();
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const tickers = useScreenerStore((s) => s.tickers);
  const isLoading = useScreenerStore((s) => s.isLoading);
  const tab = useScreenerStore((s) => s.tab);
  const setTab = useScreenerStore((s) => s.setTab);
  const fetchTickers = useScreenerStore((s) => s.fetchTickers);

  // Fetch on mount + auto-refresh every 30s
  useEffect(() => {
    fetchTickers();
    const interval = setInterval(fetchTickers, 30_000);
    return () => clearInterval(interval);
  }, [fetchTickers]);

  const sorted = getSortedTickers(tickers, tab);

  const tabs: Array<{ key: 'gainers' | 'losers' | 'volume'; label: string }> = [
    { key: 'gainers', label: tx.topGainers },
    { key: 'losers', label: tx.topLosers },
    { key: 'volume', label: tx.volumeLeaders },
  ];

  const handleRowClick = (ticker: TickerData) => {
    useChartStore.getState().setSymbol(ticker.symbol);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div
        className={`flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 text-xs py-2 px-1 font-medium transition-colors ${
              tab === t.key
                ? isDark
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : isDark
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div
        className={`flex items-center text-[10px] uppercase tracking-wider px-2 py-1.5 ${
          isDark ? 'text-gray-500 border-b border-gray-800' : 'text-gray-400 border-b border-gray-200'
        }`}
      >
        <span className="w-6 text-center">#</span>
        <span className="flex-1">{tx.name}</span>
        <span className="w-20 text-right">{tx.price}</span>
        <span className="w-16 text-right">
          {tab === 'volume' ? tx.volume : tx.change24h}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && tickers.length === 0 ? (
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`h-8 rounded animate-pulse ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        ) : (
          sorted.map((ticker, idx) => {
            const displaySymbol = ticker.symbol.replace(/USDT$/, '');
            const isPositive = ticker.changePercent >= 0;

            return (
              <button
                key={ticker.symbol}
                onClick={() => handleRowClick(ticker)}
                className={`w-full flex items-center px-2 py-1.5 text-xs transition-colors ${
                  isDark
                    ? 'hover:bg-gray-800 active:bg-gray-750'
                    : 'hover:bg-gray-100 active:bg-gray-200'
                }`}
              >
                <span
                  className={`w-6 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                >
                  {idx + 1}
                </span>
                <span
                  className={`flex-1 text-left font-medium ${
                    isDark ? 'text-gray-200' : 'text-gray-800'
                  }`}
                >
                  {displaySymbol}
                </span>
                <span
                  className={`w-20 text-right tabular-nums ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  {formatPrice(ticker.price)}
                </span>
                <span
                  className={`w-16 text-right tabular-nums font-medium ${
                    tab === 'volume'
                      ? isDark
                        ? 'text-gray-300'
                        : 'text-gray-700'
                      : isPositive
                        ? 'text-green-500'
                        : 'text-red-500'
                  }`}
                >
                  {tab === 'volume'
                    ? formatVolume(ticker.volume)
                    : formatChange(ticker.changePercent)}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div
        className={`text-center text-[10px] py-1 ${
          isDark ? 'text-gray-600 border-t border-gray-800' : 'text-gray-400 border-t border-gray-200'
        }`}
      >
        {tx.autoRefresh} 30s
      </div>
    </div>
  );
}
