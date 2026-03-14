import { useMemo } from 'react';
import { useCrosshairStore } from '../../../stores/crosshairStore';
import { useChartStore } from '../../../stores/chartStore';
import { useIndicatorStore } from '../../../stores/indicatorStore';
import { useThemeStore } from '../../../stores/themeStore';
import { useTranslation } from '../../../i18n';

function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'B';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(2) + 'K';
  return v.toFixed(2);
}

function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Determine decimal precision based on price magnitude */
function getPriceDecimals(price: number): number {
  if (price >= 1000) return 2;
  if (price >= 1) return 4;
  return 6;
}

function Row({
  label,
  value,
  color,
  isDark,
  mono = true,
}: {
  label: string;
  value: string;
  color?: string;
  isDark: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
      <span
        className={`text-xs ${mono ? 'font-mono' : ''}`}
        style={{ color: color ?? (isDark ? '#e5e7eb' : '#1f2937') }}
      >
        {value}
      </span>
    </div>
  );
}

export function DataWindowPanel() {
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const tx = useTranslation();

  const syncTime = useCrosshairStore((s) => s.syncTime);
  const data = useChartStore((s) => s.data);
  const symbol = useChartStore((s) => s.symbol);
  const timeframe = useChartStore((s) => s.timeframe);
  const indicators = useIndicatorStore((s) => s.indicators);

  const bar = useMemo(() => {
    if (data.length === 0) return null;

    if (syncTime == null) {
      return data[data.length - 1];
    }

    // Binary search for closest bar
    let lo = 0;
    let hi = data.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (data[mid].time < syncTime) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    // Check if lo-1 is closer
    if (lo > 0) {
      const diffLo = Math.abs(data[lo].time - syncTime);
      const diffPrev = Math.abs(data[lo - 1].time - syncTime);
      if (diffPrev < diffLo) return data[lo - 1];
    }
    return data[lo];
  }, [data, syncTime]);

  if (!bar) {
    return (
      <div className={`text-sm text-center py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {tx.noData}
      </div>
    );
  }

  const isBullish = bar.close >= bar.open;
  const priceColor = isBullish ? '#22c55e' : '#ef4444';
  const decimals = getPriceDecimals(bar.close);
  const change = bar.close - bar.open;
  const changePct = bar.open !== 0 ? (change / bar.open) * 100 : 0;
  const changeColor = change >= 0 ? '#22c55e' : '#ef4444';

  const dividerClass = `my-1.5 border-t ${isDark ? 'border-gray-700/60' : 'border-gray-200'}`;

  const activeIndicators = indicators.filter((i) => i.visible);

  return (
    <div className="space-y-1">
      {/* Header info */}
      <div className="flex items-center justify-between pb-1">
        <span className={`text-xs font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          {symbol}
        </span>
        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {timeframe}
        </span>
      </div>

      <div className={dividerClass} />

      {/* Date / Time */}
      <Row label="Date" value={formatDateTime(bar.time)} isDark={isDark} />

      <div className={dividerClass} />

      {/* OHLCV */}
      <Row label={tx.legendOpen} value={formatNumber(bar.open, decimals)} color={priceColor} isDark={isDark} />
      <Row label={tx.legendHigh} value={formatNumber(bar.high, decimals)} color={priceColor} isDark={isDark} />
      <Row label={tx.legendLow} value={formatNumber(bar.low, decimals)} color={priceColor} isDark={isDark} />
      <Row label={tx.legendClose} value={formatNumber(bar.close, decimals)} color={priceColor} isDark={isDark} />
      <Row
        label={tx.legendVolume}
        value={formatVolume(bar.volume ?? 0)}
        isDark={isDark}
      />

      <div className={dividerClass} />

      {/* Change */}
      <Row
        label="Change"
        value={`${change >= 0 ? '+' : ''}${formatNumber(change, decimals)}`}
        color={changeColor}
        isDark={isDark}
      />
      <Row
        label="Change%"
        value={`${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`}
        color={changeColor}
        isDark={isDark}
      />

      {/* Indicators section */}
      {activeIndicators.length > 0 && (
        <>
          <div className={dividerClass} />
          <div className={`text-xs font-semibold pt-0.5 pb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {tx.indicators}
          </div>
          {activeIndicators.map((ind) => {
            const paramStr = Object.entries(ind.params)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ');
            return (
              <div key={ind.id} className="flex items-center justify-between py-0.5">
                <span className="text-xs font-mono" style={{ color: ind.color ?? (isDark ? '#e5e7eb' : '#1f2937') }}>
                  {ind.type}
                </span>
                <span className={`text-xs font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {paramStr || '-'}
                </span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
