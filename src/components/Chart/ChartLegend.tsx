import { useEffect, useState, useRef, type RefObject } from 'react';
import type { IChartApi } from 'lightweight-charts';
import { useThemeStore } from '../../stores/themeStore';
import { useChartStore, type TimezoneId } from '../../stores/chartStore';
import { useTranslation } from '../../i18n';

interface LegendData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartLegendProps {
  chartRef: RefObject<IChartApi | null>;
  symbol: string;
  latestData?: LegendData | null;
}

function formatPrice(value: number): string {
  if (value === 0) return '0.00';
  // Use 6 decimals for small values (small-cap crypto), 2 otherwise
  const decimals = Math.abs(value) < 1 ? 6 : 2;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatVolume(value: number): string {
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(2) + 'M';
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(2) + 'K';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ChartLegend({ chartRef, symbol, latestData }: ChartLegendProps) {
  const [legend, setLegend] = useState<LegendData | null>(null);
  const [isCrosshairActive, setIsCrosshairActive] = useState(false);
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const handler = (param: Parameters<Parameters<IChartApi['subscribeCrosshairMove']>[0]>[0]) => {
      if (!param || !param.seriesData || param.seriesData.size === 0) {
        setIsCrosshairActive(false);
        return;
      }

      // Get data from the first (main) series
      for (const [, data] of param.seriesData) {
        const d = data as unknown as Record<string, number>;
        if ('open' in d && 'close' in d) {
          setLegend({
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: 0,
          });
          setIsCrosshairActive(true);
        } else if ('value' in d) {
          if (d.value > 0) {
            setLegend({
              open: d.value,
              high: d.value,
              low: d.value,
              close: d.value,
              volume: 0,
            });
            setIsCrosshairActive(true);
          }
        }
        break;
      }

      let idx = 0;
      for (const [, data] of param.seriesData) {
        if (idx === 1) {
          const d = data as unknown as Record<string, number>;
          if ('value' in d) {
            setLegend((prev) =>
              prev ? { ...prev, volume: d.value } : prev
            );
          }
        }
        idx++;
      }
    };

    chart.subscribeCrosshairMove(handler);
    return () => {
      chart.unsubscribeCrosshairMove(handler);
    };
  }, [chartRef]);

  const displayData = isCrosshairActive ? legend : latestData;
  const lastUpdatedAt = useChartStore((s) => s.lastUpdatedAt);
  const timezone = useChartStore((s) => s.timezone);
  if (!displayData) return null;

  const isUp = displayData.close >= displayData.open;
  const valueColor = isUp ? '#22c55e' : '#ef4444';

  return (
    <div
      className="absolute top-2 left-2 z-10 flex flex-col gap-0.5 px-2 py-1 rounded text-xs font-mono"
      style={{ backgroundColor: colors.legendBg }}
    >
      <div className="flex items-center gap-2">
        <SymbolWithTooltip symbol={symbol} displayData={displayData} />
        <span className={`pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.legendOpen}</span>
        <span className="pointer-events-none" style={{ color: valueColor }}>{formatPrice(displayData.open)}</span>
        <span className={`pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.legendHigh}</span>
        <span className="pointer-events-none" style={{ color: valueColor }}>{formatPrice(displayData.high)}</span>
        <span className={`pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.legendLow}</span>
        <span className="pointer-events-none" style={{ color: valueColor }}>{formatPrice(displayData.low)}</span>
        <span className={`pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.legendClose}</span>
        <span className="pointer-events-none" style={{ color: valueColor }}>{formatPrice(displayData.close)}</span>
        <span className={`pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t.legendVolume}</span>
        <span className="pointer-events-none" style={{ color: valueColor }}>{formatVolume(displayData.volume)}</span>
      </div>
      {lastUpdatedAt && (
        <div className={`pointer-events-none text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {t.lastUpdated}: {formatLastUpdated(lastUpdatedAt, timezone)}
        </div>
      )}
    </div>
  );
}

/* ---------- Last updated formatter ---------- */
const TIMEZONE_LABELS: Record<TimezoneId, string> = {
  UTC: 'UTC',
  Local: '',
  'Asia/Bangkok': 'ICT',
  'Asia/Tokyo': 'JST',
  'America/New_York': 'ET',
  'Europe/London': 'GMT',
  'Australia/Sydney': 'AEST',
  'Asia/Hong_Kong': 'HKT',
  'Asia/Singapore': 'SGT',
};

function formatLastUpdated(timestamp: number, tz: TimezoneId): string {
  const date = new Date(timestamp);
  const timeZone = tz === 'Local' ? undefined : tz === 'UTC' ? 'UTC' : tz;

  const dateStr = date.toLocaleDateString('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeStr = date.toLocaleTimeString('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const tzLabel = tz === 'Local'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : TIMEZONE_LABELS[tz] || tz;

  return `${dateStr} ${timeStr} (${tzLabel})`;
}

/* ---------- Symbol tooltip on hover ---------- */
function SymbolWithTooltip({
  symbol,
  displayData,
}: {
  symbol: string;
  displayData: LegendData;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const symbolInfo = useChartStore((s) => s.symbolInfo);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const tooltipRef = useRef<HTMLDivElement>(null);

  const change24h = displayData.close - displayData.open;
  const changePct =
    displayData.open > 0 ? (change24h / displayData.open) * 100 : 0;
  const isUp = change24h >= 0;

  const marketTypeLabel =
    symbolInfo?.type === 'crypto'
      ? 'Crypto'
      : symbolInfo?.type === 'forex'
        ? 'Forex'
        : 'Stock';

  return (
    <span
      className="relative cursor-pointer"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className={`font-semibold hover:text-blue-400 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {symbol}
      </span>
      {showTooltip && (
        <div
          ref={tooltipRef}
          className={`absolute top-full left-0 mt-1 w-56 border rounded-lg shadow-xl p-3 text-xs font-sans z-50 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
        >
          <div className={`font-semibold text-sm mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {symbolInfo?.name ?? symbol}
          </div>
          <div className={`mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {symbolInfo?.exchange ?? 'Unknown'} &middot; {marketTypeLabel}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Price</span>
              <span className={`font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {formatPrice(displayData.close)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>24h Change</span>
              <span
                className="font-mono"
                style={{ color: isUp ? '#22c55e' : '#ef4444' }}
              >
                {isUp ? '+' : ''}
                {changePct.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Volume</span>
              <span className={`font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {formatVolume(displayData.volume)}
              </span>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
