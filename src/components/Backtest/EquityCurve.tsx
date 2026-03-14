import { useMemo } from 'react';
import type { EquityPoint, Trade } from '../../utils/backtester';
import { useThemeStore } from '../../stores/themeStore';

interface EquityCurveProps {
  equityCurve: EquityPoint[];
  trades: Trade[];
  initialCapital: number;
}

export function EquityCurve({ equityCurve, trades, initialCapital }: EquityCurveProps) {
  const isDark = useThemeStore((s) => s.theme) === 'dark';

  const { width, height, padding } = { width: 700, height: 260, padding: { top: 16, right: 60, bottom: 28, left: 12 } };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const { equityPath, drawdownPath, yMin, yMax, ddMax, xScale, yScale, yScaleDD, gridLines } = useMemo(() => {
    if (equityCurve.length === 0) {
      return { equityPath: '', drawdownPath: '', yMin: 0, yMax: 0, ddMax: 0, xScale: () => 0, yScale: () => 0, yScaleDD: () => 0, gridLines: [] as number[] };
    }

    const equities = equityCurve.map((p) => p.equity);
    const yMin = Math.min(...equities) * 0.98;
    const yMax = Math.max(...equities) * 1.02;
    const ddMax = Math.max(...equityCurve.map((p) => p.drawdownPct), 1);

    const xScale = (i: number) => padding.left + (i / (equityCurve.length - 1)) * plotW;
    const yScale = (v: number) => padding.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
    const yScaleDD = (v: number) => padding.top + (v / ddMax) * (plotH * 0.25);

    const equityPts = equityCurve.map((p, i) => `${xScale(i).toFixed(1)},${yScale(p.equity).toFixed(1)}`);
    const equityPath = `M${equityPts.join('L')}`;

    // Drawdown area
    const ddPts = equityCurve.map((p, i) => `${xScale(i).toFixed(1)},${yScaleDD(p.drawdownPct).toFixed(1)}`);
    const drawdownPath = `M${xScale(0).toFixed(1)},${yScaleDD(0).toFixed(1)}L${ddPts.join('L')}L${xScale(equityCurve.length - 1).toFixed(1)},${yScaleDD(0).toFixed(1)}Z`;

    // Grid lines (5 horizontal)
    const gridLines: number[] = [];
    for (let i = 0; i <= 4; i++) {
      gridLines.push(yMin + ((yMax - yMin) * i) / 4);
    }

    return { equityPath, drawdownPath, yMin, yMax, ddMax, xScale, yScale, yScaleDD, gridLines };
  }, [equityCurve, plotW, plotH, padding.left, padding.top]);

  // Buy/sell markers from trades
  const markers = useMemo(() => {
    if (equityCurve.length === 0) return [];
    const timeToIdx = new Map<number, number>();
    equityCurve.forEach((p, i) => timeToIdx.set(p.time, i));

    const result: { x: number; y: number; type: 'buy' | 'sell' }[] = [];
    for (const trade of trades) {
      const entryIdx = timeToIdx.get(trade.entryTime);
      const exitIdx = timeToIdx.get(trade.exitTime);
      if (entryIdx !== undefined) {
        result.push({ x: xScale(entryIdx), y: yScale(equityCurve[entryIdx].equity), type: 'buy' });
      }
      if (exitIdx !== undefined) {
        result.push({ x: xScale(exitIdx), y: yScale(equityCurve[exitIdx].equity), type: 'sell' });
      }
    }
    return result;
  }, [trades, equityCurve, xScale, yScale]);

  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const equityColor = '#3b82f6';
  const profitColor = equityCurve.length > 0 && equityCurve[equityCurve.length - 1].equity >= initialCapital ? '#22c55e' : '#ef4444';

  const formatNum = (n: number) => {
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toFixed(0);
  };

  if (equityCurve.length === 0) {
    return (
      <div className={`flex items-center justify-center h-40 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>No data</span>
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 280 }}>
      {/* Grid */}
      {gridLines.map((val, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={yScale(val)}
            x2={width - padding.right}
            y2={yScale(val)}
            stroke={gridColor}
            strokeWidth={0.5}
            strokeDasharray="4,3"
          />
          <text
            x={width - padding.right + 4}
            y={yScale(val) + 3}
            fill={textColor}
            fontSize={9}
            fontFamily="monospace"
          >
            {formatNum(val)}
          </text>
        </g>
      ))}

      {/* Initial capital reference line */}
      <line
        x1={padding.left}
        y1={yScale(initialCapital)}
        x2={width - padding.right}
        y2={yScale(initialCapital)}
        stroke={textColor}
        strokeWidth={0.5}
        strokeDasharray="2,4"
        opacity={0.5}
      />

      {/* Drawdown area */}
      <path d={drawdownPath} fill="#ef4444" opacity={0.12} />

      {/* Equity line */}
      <path d={equityPath} fill="none" stroke={equityColor} strokeWidth={1.5} />

      {/* Gradient fill under equity */}
      <defs>
        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={profitColor} stopOpacity={0.2} />
          <stop offset="100%" stopColor={profitColor} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path
        d={`${equityPath}L${xScale(equityCurve.length - 1).toFixed(1)},${yScale(yMin).toFixed(1)}L${xScale(0).toFixed(1)},${yScale(yMin).toFixed(1)}Z`}
        fill="url(#equityGrad)"
      />

      {/* Buy/Sell markers */}
      {markers.map((m, i) => (
        <circle
          key={i}
          cx={m.x}
          cy={m.y}
          r={2.5}
          fill={m.type === 'buy' ? '#22c55e' : '#ef4444'}
          stroke={isDark ? '#111827' : '#ffffff'}
          strokeWidth={0.5}
        />
      ))}

      {/* Time labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
        const idx = Math.min(Math.floor(pct * (equityCurve.length - 1)), equityCurve.length - 1);
        const t = new Date(equityCurve[idx].time * 1000);
        const label = `${t.getMonth() + 1}/${t.getDate()}`;
        return (
          <text
            key={i}
            x={xScale(idx)}
            y={height - 4}
            fill={textColor}
            fontSize={8}
            fontFamily="monospace"
            textAnchor="middle"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
