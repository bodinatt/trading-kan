import { useEffect, useState } from 'react';
import { useNewsStore, type NewsArticle } from '../../../stores/newsStore';
import { useChartStore } from '../../../stores/chartStore';
import { useThemeStore } from '../../../stores/themeStore';
import { useTranslation } from '../../../i18n';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 10;

function relativeTime(dateStr: string, tx: ReturnType<typeof useTranslation>): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}${tx.minutesAgo}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${tx.hoursAgo}`;
  return `${Math.floor(hours / 24)}${tx.daysAgo}`;
}

export function NewsPanel() {
  const { articles, isLoading, filter, fetchNews, setFilter } = useNewsStore();
  const symbol = useChartStore((s) => s.symbol);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const tx = useTranslation();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    fetchNews();
    const id = setInterval(fetchNews, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchNews]);

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter]);

  // Derive the base currency from the symbol (e.g. BTCUSDT -> BTC)
  const baseCurrency = symbol.replace(/(USDT|BUSD|USD|USDC|BTC|ETH)$/i, '').toUpperCase();

  const filtered: NewsArticle[] =
    filter === 'symbol'
      ? articles.filter(
          (a) =>
            a.currencies?.some((c) => c.toUpperCase() === baseCurrency) ||
            a.title.toUpperCase().includes(baseCurrency)
        )
      : articles;

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div
        className={`flex border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}
      >
        {(['all', 'symbol'] as const).map((tab) => {
          const active = filter === tab;
          const label = tab === 'all' ? tx.allNews : baseCurrency;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 text-xs py-1.5 text-center transition-colors ${
                active
                  ? isDark
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-blue-600 border-b-2 border-blue-600'
                  : isDark
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && articles.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <svg
              className="animate-spin h-5 w-5 text-blue-500"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span
              className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {tx.loading}
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <p
            className={`text-sm text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
          >
            {tx.noData}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-gray-800/30">
              {visible.map((article) => (
                <li key={article.id} className="px-3 py-2">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-sm leading-snug block hover:underline ${
                      isDark ? 'text-gray-200' : 'text-gray-800'
                    }`}
                  >
                    {article.title}
                  </a>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                    >
                      {article.source}
                    </span>
                    <span
                      className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-300'}`}
                    >
                      &middot;
                    </span>
                    <span
                      className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                    >
                      {relativeTime(article.publishedAt, tx)}
                    </span>
                  </div>
                  {article.currencies && article.currencies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {article.currencies.map((c) => (
                        <span
                          key={c}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isDark
                              ? 'bg-gray-800 text-gray-400'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {visibleCount < filtered.length && (
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className={`w-full text-xs py-2 transition-colors ${
                  isDark
                    ? 'text-blue-400 hover:bg-gray-800'
                    : 'text-blue-600 hover:bg-gray-100'
                }`}
              >
                {tx.loadMore}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
