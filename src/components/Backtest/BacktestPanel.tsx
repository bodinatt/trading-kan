import { useCallback, useState } from 'react';
import { useBacktestStore } from '../../stores/backtestStore';
import { useChartStore } from '../../stores/chartStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';
import { EquityCurve } from './EquityCurve';
import {
  getDefaultParams,
  type StrategyType,
  type MACrossoverParams,
  type RSIParams,
  type MACDParams,
  type BollingerParams,
  type SupertrendParams,
  type StochasticParams,
  type CombinedParams,
  type DirectionMode,
  type Trade,
} from '../../utils/backtester';

const STRATEGY_OPTIONS: StrategyType[] = [
  'ma_crossover', 'rsi', 'macd', 'bollinger', 'supertrend', 'stochastic', 'combined',
];

const PERIOD_OPTIONS = [
  { label: '1M', bars: 30 },
  { label: '3M', bars: 90 },
  { label: '6M', bars: 180 },
  { label: '1Y', bars: 365 },
  { label: '2Y', bars: 730 },
  { label: '5Y', bars: 1825 },
  { label: 'Max', bars: 5000 },
];

function strategyLabel(type: StrategyType, t: ReturnType<typeof useTranslation>): string {
  switch (type) {
    case 'ma_crossover': return t.btMaCrossover;
    case 'rsi': return t.btRsiStrategy;
    case 'macd': return t.btMacdStrategy;
    case 'bollinger': return t.btBollingerStrategy;
    case 'supertrend': return t.btSupertrendStrategy;
    case 'stochastic': return t.btStochasticStrategy;
    case 'combined': return t.btCombinedStrategy;
  }
}

export function BacktestPanel() {
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  const isOpen = useBacktestStore((s) => s.isOpen);
  const closePanel = useBacktestStore((s) => s.closePanel);
  const strategyConfig = useBacktestStore((s) => s.strategyConfig);
  const setStrategyType = useBacktestStore((s) => s.setStrategyType);
  const setStrategyParams = useBacktestStore((s) => s.setStrategyParams);
  const settings = useBacktestStore((s) => s.settings);
  const updateSettings = useBacktestStore((s) => s.updateSettings);
  const periodBars = useBacktestStore((s) => s.periodBars);
  const setPeriodBars = useBacktestStore((s) => s.setPeriodBars);
  const isRunning = useBacktestStore((s) => s.isRunning);
  const result = useBacktestStore((s) => s.result);
  const error = useBacktestStore((s) => s.error);
  const run = useBacktestStore((s) => s.runBacktest);

  const symbol = useChartStore((s) => s.symbol);
  const timeframe = useChartStore((s) => s.timeframe);

  const [activeTab, setActiveTab] = useState<'config' | 'results' | 'trades'>('config');
  const [tradeSortKey, setTradeSortKey] = useState<keyof Trade>('id');
  const [tradeSortDir, setTradeSortDir] = useState<'asc' | 'desc'>('desc');

  const handleRun = useCallback(() => {
    run(symbol, timeframe);
    setActiveTab('results');
  }, [run, symbol, timeframe]);

  const handleTradeSort = (key: keyof Trade) => {
    if (tradeSortKey === key) setTradeSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setTradeSortKey(key); setTradeSortDir('desc'); }
  };

  if (!isOpen) return null;

  const bg = isDark ? 'bg-gray-900' : 'bg-white';
  const border = isDark ? 'border-gray-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900';
  const cardBg = isDark ? 'bg-gray-800/50' : 'bg-gray-50';
  const hoverBg = isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50';

  const sortedTrades = result ? [...result.trades].sort((a, b) => {
    const av = a[tradeSortKey] as number;
    const bv = b[tradeSortKey] as number;
    return tradeSortDir === 'asc' ? av - bv : bv - av;
  }) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={closePanel} />

      {/* Panel */}
      <div className={`relative ${bg} border ${border} rounded-lg shadow-2xl flex flex-col max-h-[90vh] w-full max-w-4xl mx-4`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${border}`}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className={`text-base font-semibold ${textPrimary}`}>{t.btBacktest}</h2>
            <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
              {symbol} / {timeframe}
            </span>
          </div>
          <button onClick={closePanel} className={`p-1 rounded ${hoverBg} ${textSecondary}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${border} px-4`}>
          {(['config', 'results', 'trades'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-500'
                  : `border-transparent ${textSecondary} ${hoverBg}`
              }`}
            >
              {tab === 'config' ? t.btStrategy : tab === 'results' ? t.btResults : t.btTradeList}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'config' && (
            <ConfigTab
              isDark={isDark}
              inputBg={inputBg}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              border={border}
              t={t}
              strategyConfig={strategyConfig}
              setStrategyType={setStrategyType}
              setStrategyParams={setStrategyParams}
              settings={settings}
              updateSettings={updateSettings}
              periodBars={periodBars}
              setPeriodBars={setPeriodBars}
            />
          )}

          {activeTab === 'results' && (
            <ResultsTab
              isDark={isDark}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              t={t}
              result={result}
              isRunning={isRunning}
              error={error}
            />
          )}

          {activeTab === 'trades' && (
            <TradesTab
              isDark={isDark}
              cardBg={cardBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              border={border}
              hoverBg={hoverBg}
              t={t}
              trades={sortedTrades}
              tradeSortKey={tradeSortKey}
              tradeSortDir={tradeSortDir}
              onSort={handleTradeSort}
              hasResult={!!result}
            />
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-4 py-3 border-t ${border}`}>
          {error && <span className="text-xs text-red-500">{error}</span>}
          {!error && <span />}
          <div className="flex gap-2">
            <button
              onClick={closePanel}
              className={`px-3 py-1.5 text-sm rounded border ${border} ${textSecondary} ${hoverBg}`}
            >
              {t.cancel}
            </button>
            <button
              onClick={handleRun}
              disabled={isRunning}
              className={`px-4 py-1.5 text-sm rounded font-medium text-white ${
                isRunning ? 'bg-blue-500/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isRunning ? t.loading : t.btRunBacktest}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Config Tab ─────────────────────────────────────────────────────

interface ConfigTabProps {
  isDark: boolean;
  inputBg: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  t: ReturnType<typeof useTranslation>;
  strategyConfig: ReturnType<typeof useBacktestStore>['strategyConfig'];
  setStrategyType: (t: StrategyType) => void;
  setStrategyParams: (p: ReturnType<typeof useBacktestStore>['strategyConfig']['params']) => void;
  settings: ReturnType<typeof useBacktestStore>['settings'];
  updateSettings: (p: Partial<ReturnType<typeof useBacktestStore>['settings']>) => void;
  periodBars: number;
  setPeriodBars: (b: number) => void;
}

function ConfigTab({ isDark, inputBg, cardBg, textPrimary, textSecondary, border, t, strategyConfig, setStrategyType, setStrategyParams, settings, updateSettings, periodBars, setPeriodBars }: ConfigTabProps) {
  return (
    <div className="space-y-4">
      {/* Strategy Selection */}
      <div className={`rounded-lg p-3 ${cardBg}`}>
        <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>{t.btStrategy}</label>
        <select
          value={strategyConfig.type}
          onChange={(e) => setStrategyType(e.target.value as StrategyType)}
          className={`w-full text-sm rounded px-2 py-1.5 border ${inputBg}`}
        >
          {STRATEGY_OPTIONS.map((s) => (
            <option key={s} value={s}>{strategyLabel(s, t)}</option>
          ))}
        </select>
      </div>

      {/* Strategy Parameters */}
      <div className={`rounded-lg p-3 ${cardBg}`}>
        <label className={`block text-xs font-medium mb-2 ${textSecondary}`}>{t.btParameters}</label>
        <StrategyParamsEditor
          type={strategyConfig.type}
          params={strategyConfig.params}
          onChange={setStrategyParams}
          inputBg={inputBg}
          textSecondary={textSecondary}
          t={t}
        />
      </div>

      {/* Period */}
      <div className={`rounded-lg p-3 ${cardBg}`}>
        <label className={`block text-xs font-medium mb-1.5 ${textSecondary}`}>{t.btPeriod}</label>
        <div className="flex gap-1 flex-wrap">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setPeriodBars(opt.bars)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                periodBars === opt.bars
                  ? 'bg-blue-600 text-white'
                  : isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Position Settings */}
      <div className={`rounded-lg p-3 ${cardBg}`}>
        <label className={`block text-xs font-medium mb-2 ${textSecondary}`}>{t.btPositionSettings}</label>
        <div className="grid grid-cols-2 gap-3">
          <NumInput label={t.btInitialCapital} value={settings.initialCapital} onChange={(v) => updateSettings({ initialCapital: v })} inputBg={inputBg} textSecondary={textSecondary} min={100} step={1000} />
          <NumInput label={t.btPositionSize + ' (%)'} value={settings.positionSizePct} onChange={(v) => updateSettings({ positionSizePct: v })} inputBg={inputBg} textSecondary={textSecondary} min={1} max={100} step={5} />
          <NumInput label={t.btStopLoss + ' (%)'} value={settings.stopLossPct} onChange={(v) => updateSettings({ stopLossPct: v })} inputBg={inputBg} textSecondary={textSecondary} min={0} max={50} step={0.5} />
          <NumInput label={t.btTakeProfit + ' (%)'} value={settings.takeProfitPct} onChange={(v) => updateSettings({ takeProfitPct: v })} inputBg={inputBg} textSecondary={textSecondary} min={0} max={100} step={1} />
        </div>

        {/* Direction */}
        <div className="mt-3">
          <label className={`block text-xs mb-1 ${textSecondary}`}>{t.btDirection}</label>
          <div className="flex gap-1">
            {(['long', 'short', 'both'] as DirectionMode[]).map((d) => (
              <button
                key={d}
                onClick={() => updateSettings({ direction: d })}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  settings.direction === d
                    ? d === 'long' ? 'bg-green-600 text-white'
                      : d === 'short' ? 'bg-red-600 text-white'
                      : 'bg-blue-600 text-white'
                    : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {d === 'long' ? t.btLongOnly : d === 'short' ? t.btShortOnly : t.btBothDirections}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Strategy Parameters Editor ───────────────────────────────────

interface StrategyParamsEditorProps {
  type: StrategyType;
  params: ReturnType<typeof useBacktestStore>['strategyConfig']['params'];
  onChange: (p: ReturnType<typeof useBacktestStore>['strategyConfig']['params']) => void;
  inputBg: string;
  textSecondary: string;
  t: ReturnType<typeof useTranslation>;
}

function StrategyParamsEditor({ type, params, onChange, inputBg, textSecondary, t }: StrategyParamsEditorProps) {
  const update = (key: string, val: number | string) => {
    onChange({ ...params, [key]: val } as typeof params);
  };

  switch (type) {
    case 'ma_crossover': {
      const p = params as MACrossoverParams;
      return (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={`text-xs ${textSecondary}`}>MA Type</label>
            <select value={p.maType} onChange={(e) => update('maType', e.target.value)} className={`w-full text-sm rounded px-2 py-1 border ${inputBg}`}>
              <option value="sma">SMA</option>
              <option value="ema">EMA</option>
            </select>
          </div>
          <NumInput label={t.btFastPeriod} value={p.fastPeriod} onChange={(v) => update('fastPeriod', v)} inputBg={inputBg} textSecondary={textSecondary} min={2} max={200} />
          <NumInput label={t.btSlowPeriod} value={p.slowPeriod} onChange={(v) => update('slowPeriod', v)} inputBg={inputBg} textSecondary={textSecondary} min={5} max={500} />
        </div>
      );
    }
    case 'rsi': {
      const p = params as RSIParams;
      return (
        <div className="grid grid-cols-3 gap-2">
          <NumInput label={t.btPeriodLabel} value={p.period} onChange={(v) => update('period', v)} inputBg={inputBg} textSecondary={textSecondary} min={2} max={100} />
          <NumInput label={t.btOversold} value={p.oversold} onChange={(v) => update('oversold', v)} inputBg={inputBg} textSecondary={textSecondary} min={5} max={45} />
          <NumInput label={t.btOverbought} value={p.overbought} onChange={(v) => update('overbought', v)} inputBg={inputBg} textSecondary={textSecondary} min={55} max={95} />
        </div>
      );
    }
    case 'macd': {
      const p = params as MACDParams;
      return (
        <div className="grid grid-cols-3 gap-2">
          <NumInput label="Fast" value={p.fast} onChange={(v) => update('fast', v)} inputBg={inputBg} textSecondary={textSecondary} min={2} max={50} />
          <NumInput label="Slow" value={p.slow} onChange={(v) => update('slow', v)} inputBg={inputBg} textSecondary={textSecondary} min={10} max={100} />
          <NumInput label="Signal" value={p.signal} onChange={(v) => update('signal', v)} inputBg={inputBg} textSecondary={textSecondary} min={2} max={50} />
        </div>
      );
    }
    case 'bollinger': {
      const p = params as BollingerParams;
      return (
        <div className="grid grid-cols-2 gap-2">
          <NumInput label={t.btPeriodLabel} value={p.period} onChange={(v) => update('period', v)} inputBg={inputBg} textSecondary={textSecondary} min={5} max={100} />
          <NumInput label={t.btStdDev} value={p.stdDev} onChange={(v) => update('stdDev', v)} inputBg={inputBg} textSecondary={textSecondary} min={0.5} max={5} step={0.5} />
        </div>
      );
    }
    case 'supertrend': {
      const p = params as SupertrendParams;
      return (
        <div className="grid grid-cols-2 gap-2">
          <NumInput label={t.btPeriodLabel} value={p.period} onChange={(v) => update('period', v)} inputBg={inputBg} textSecondary={textSecondary} min={5} max={50} />
          <NumInput label={t.btMultiplier} value={p.multiplier} onChange={(v) => update('multiplier', v)} inputBg={inputBg} textSecondary={textSecondary} min={1} max={10} step={0.5} />
        </div>
      );
    }
    case 'stochastic': {
      const p = params as StochasticParams;
      return (
        <div className="grid grid-cols-3 gap-2">
          <NumInput label="%K Period" value={p.kPeriod} onChange={(v) => update('kPeriod', v)} inputBg={inputBg} textSecondary={textSecondary} min={5} max={50} />
          <NumInput label="%K Smooth" value={p.kSmooth} onChange={(v) => update('kSmooth', v)} inputBg={inputBg} textSecondary={textSecondary} min={1} max={10} />
          <NumInput label="%D Period" value={p.dPeriod} onChange={(v) => update('dPeriod', v)} inputBg={inputBg} textSecondary={textSecondary} min={1} max={10} />
          <NumInput label={t.btOversold} value={p.oversold} onChange={(v) => update('oversold', v)} inputBg={inputBg} textSecondary={textSecondary} min={5} max={40} />
          <NumInput label={t.btOverbought} value={p.overbought} onChange={(v) => update('overbought', v)} inputBg={inputBg} textSecondary={textSecondary} min={60} max={95} />
        </div>
      );
    }
    case 'combined': {
      const p = params as CombinedParams;
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className={`text-xs ${textSecondary}`}>{t.btLogic}:</label>
            <select
              value={p.logic}
              onChange={(e) => onChange({ ...p, logic: e.target.value as 'and' | 'or' })}
              className={`text-sm rounded px-2 py-1 border ${inputBg}`}
            >
              <option value="and">AND</option>
              <option value="or">OR</option>
            </select>
          </div>
          {p.conditions.map((cond, idx) => (
            <div key={idx} className={`p-2 rounded border ${inputBg.includes('gray-800') ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium ${textSecondary}`}>#{idx + 1}</span>
                <select
                  value={cond.strategy}
                  onChange={(e) => {
                    const newConds = [...p.conditions];
                    const newType = e.target.value as StrategyType;
                    newConds[idx] = { strategy: newType as Exclude<StrategyType, 'combined'>, params: getDefaultParams(newType) };
                    onChange({ ...p, conditions: newConds });
                  }}
                  className={`text-xs rounded px-1.5 py-0.5 border ${inputBg}`}
                >
                  {STRATEGY_OPTIONS.filter((s) => s !== 'combined').map((s) => (
                    <option key={s} value={s}>{strategyLabel(s, t)}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      );
    }
  }
}

// ── Results Tab ──────────────────────────────────────────────────

interface ResultsTabProps {
  isDark: boolean;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  t: ReturnType<typeof useTranslation>;
  result: ReturnType<typeof useBacktestStore>['result'];
  isRunning: boolean;
  error: string | null;
}

function ResultsTab({ isDark, cardBg, textPrimary, textSecondary, t, result, isRunning, error }: ResultsTabProps) {
  if (isRunning) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-2">
          <svg className="animate-spin w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
          </svg>
          <span className={textSecondary}>{t.loading}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-16 text-red-500 text-sm">{error}</div>;
  }

  if (!result) {
    return (
      <div className={`text-center py-16 ${textSecondary} text-sm`}>
        {t.btNoResults}
      </div>
    );
  }

  const { metrics } = result;
  const isProfit = metrics.totalReturn >= 0;

  const metricItems: { label: string; value: string; color?: string }[] = [
    { label: t.btTotalReturn, value: `${metrics.totalReturn >= 0 ? '+' : ''}${metrics.totalReturn.toFixed(2)} (${metrics.totalReturnPct.toFixed(1)}%)`, color: isProfit ? 'text-green-500' : 'text-red-500' },
    { label: t.btWinRate, value: `${metrics.winRate.toFixed(1)}%`, color: metrics.winRate >= 50 ? 'text-green-500' : 'text-red-500' },
    { label: t.btProfitFactor, value: metrics.profitFactor === Infinity ? '---' : metrics.profitFactor.toFixed(2), color: metrics.profitFactor >= 1 ? 'text-green-500' : 'text-red-500' },
    { label: t.btMaxDrawdown, value: `${metrics.maxDrawdown.toFixed(2)} (${metrics.maxDrawdownPct.toFixed(1)}%)`, color: 'text-red-500' },
    { label: t.btSharpeRatio, value: metrics.sharpeRatio.toFixed(2), color: metrics.sharpeRatio >= 1 ? 'text-green-500' : metrics.sharpeRatio >= 0 ? 'text-yellow-500' : 'text-red-500' },
    { label: t.btTotalTrades, value: `${metrics.totalTrades} (${metrics.winningTrades}W / ${metrics.losingTrades}L)` },
    { label: t.btAvgWin, value: `+${metrics.avgWin.toFixed(2)} (${metrics.avgWinPct.toFixed(1)}%)`, color: 'text-green-500' },
    { label: t.btAvgLoss, value: `${metrics.avgLoss.toFixed(2)} (${metrics.avgLossPct.toFixed(1)}%)`, color: 'text-red-500' },
    { label: t.btBestTrade, value: `+${metrics.bestTrade.toFixed(2)} (${metrics.bestTradePct.toFixed(1)}%)`, color: 'text-green-500' },
    { label: t.btWorstTrade, value: `${metrics.worstTrade.toFixed(2)} (${metrics.worstTradePct.toFixed(1)}%)`, color: 'text-red-500' },
    { label: t.btAvgHoldingPeriod, value: `${metrics.avgHoldingBars.toFixed(1)} bars` },
  ];

  return (
    <div className="space-y-4">
      {/* Equity Curve */}
      <div className={`rounded-lg p-3 ${cardBg}`}>
        <h3 className={`text-xs font-medium mb-2 ${textSecondary}`}>{t.btEquityCurve}</h3>
        <EquityCurve
          equityCurve={result.equityCurve}
          trades={result.trades}
          initialCapital={result.settings.initialCapital}
        />
      </div>

      {/* Metrics Grid */}
      <div className={`rounded-lg p-3 ${cardBg}`}>
        <h3 className={`text-xs font-medium mb-2 ${textSecondary}`}>{t.btResults}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {metricItems.map((item) => (
            <div key={item.label} className={`p-2 rounded ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`text-[10px] ${textSecondary}`}>{item.label}</div>
              <div className={`text-sm font-mono font-medium ${item.color || textPrimary}`}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Trades Tab ───────────────────────────────────────────────────

interface TradesTabProps {
  isDark: boolean;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  hoverBg: string;
  t: ReturnType<typeof useTranslation>;
  trades: Trade[];
  tradeSortKey: keyof Trade;
  tradeSortDir: 'asc' | 'desc';
  onSort: (key: keyof Trade) => void;
  hasResult: boolean;
}

function TradesTab({ isDark, cardBg, textPrimary, textSecondary, border, hoverBg, t, trades, tradeSortKey, tradeSortDir, onSort, hasResult }: TradesTabProps) {
  if (!hasResult) {
    return <div className={`text-center py-16 ${textSecondary} text-sm`}>{t.btNoResults}</div>;
  }

  if (trades.length === 0) {
    return <div className={`text-center py-16 ${textSecondary} text-sm`}>{t.btNoTrades}</div>;
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: keyof Trade }) => (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-2 py-1.5 text-left text-[10px] font-medium ${textSecondary} cursor-pointer ${hoverBg} whitespace-nowrap`}
    >
      {label} {tradeSortKey === sortKey ? (tradeSortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
    </th>
  );

  return (
    <div className={`rounded-lg ${cardBg} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className={`border-b ${border}`}>
              <SortHeader label="#" sortKey="id" />
              <SortHeader label={t.btDirection} sortKey="direction" />
              <SortHeader label={t.btEntryPrice} sortKey="entryPrice" />
              <SortHeader label={t.btExitPrice} sortKey="exitPrice" />
              <SortHeader label={t.btPnl} sortKey="pnl" />
              <SortHeader label="%" sortKey="pnlPct" />
              <SortHeader label={t.btDuration} sortKey="durationBars" />
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className={`border-b ${border} ${hoverBg}`}>
                <td className={`px-2 py-1.5 ${textSecondary}`}>{trade.id + 1}</td>
                <td className="px-2 py-1.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    trade.direction === 'long'
                      ? isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'
                      : isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700'
                  }`}>
                    {trade.direction === 'long' ? 'LONG' : 'SHORT'}
                  </span>
                </td>
                <td className={`px-2 py-1.5 font-mono ${textPrimary}`}>
                  {trade.entryPrice.toFixed(2)}
                  <div className={`text-[9px] ${textSecondary}`}>{formatDate(trade.entryTime)}</div>
                </td>
                <td className={`px-2 py-1.5 font-mono ${textPrimary}`}>
                  {trade.exitPrice.toFixed(2)}
                  <div className={`text-[9px] ${textSecondary}`}>{formatDate(trade.exitTime)}</div>
                </td>
                <td className={`px-2 py-1.5 font-mono font-medium ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                </td>
                <td className={`px-2 py-1.5 font-mono ${trade.pnlPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(1)}%
                </td>
                <td className={`px-2 py-1.5 ${textSecondary}`}>{trade.durationBars}b</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Number Input Helper ──────────────────────────────────────────

function NumInput({ label, value, onChange, inputBg, textSecondary, min, max, step }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  inputBg: string;
  textSecondary: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className={`block text-[10px] mb-0.5 ${textSecondary}`}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step ?? 1}
        className={`w-full text-sm rounded px-2 py-1 border ${inputBg}`}
      />
    </div>
  );
}
