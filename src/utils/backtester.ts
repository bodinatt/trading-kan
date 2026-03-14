import type { OHLCData } from '../types/chart';
import {
  calcSMA,
  calcEMA,
  calcRSI,
  calcMACD,
  calcBollingerBands,
  calcStochastic,
  calcSupertrend,
} from './indicators';

// ── Types ────────────────────────────────────────────────────────────

export type StrategyType =
  | 'ma_crossover'
  | 'rsi'
  | 'macd'
  | 'bollinger'
  | 'supertrend'
  | 'stochastic'
  | 'combined';

export type TradeDirection = 'long' | 'short';
export type DirectionMode = 'long' | 'short' | 'both';

export interface MACrossoverParams {
  fastPeriod: number;
  slowPeriod: number;
  maType: 'sma' | 'ema';
}

export interface RSIParams {
  period: number;
  oversold: number;
  overbought: number;
}

export interface MACDParams {
  fast: number;
  slow: number;
  signal: number;
}

export interface BollingerParams {
  period: number;
  stdDev: number;
}

export interface SupertrendParams {
  period: number;
  multiplier: number;
}

export interface StochasticParams {
  kPeriod: number;
  kSmooth: number;
  dPeriod: number;
  oversold: number;
  overbought: number;
}

export interface CombinedCondition {
  strategy: Exclude<StrategyType, 'combined'>;
  params: StrategyParams;
}

export interface CombinedParams {
  conditions: CombinedCondition[];
  logic: 'and' | 'or';
}

export type StrategyParams =
  | MACrossoverParams
  | RSIParams
  | MACDParams
  | BollingerParams
  | SupertrendParams
  | StochasticParams
  | CombinedParams;

export interface StrategyConfig {
  type: StrategyType;
  params: StrategyParams;
}

export interface BacktestSettings {
  initialCapital: number;
  positionSizePct: number; // % of capital per trade
  stopLossPct: number;     // 0 = disabled
  takeProfitPct: number;   // 0 = disabled
  direction: DirectionMode;
}

export interface Trade {
  id: number;
  direction: TradeDirection;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  positionSize: number; // number of units
  pnl: number;
  pnlPct: number;
  capitalAtEntry: number;
  durationBars: number;
}

export interface EquityPoint {
  time: number;
  equity: number;
  drawdownPct: number;
}

export interface BacktestResult {
  trades: Trade[];
  equityCurve: EquityPoint[];
  metrics: BacktestMetrics;
  strategyConfig: StrategyConfig;
  settings: BacktestSettings;
}

export interface BacktestMetrics {
  totalReturn: number;
  totalReturnPct: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  avgWinPct: number;
  avgLossPct: number;
  bestTrade: number;
  bestTradePct: number;
  worstTrade: number;
  worstTradePct: number;
  avgHoldingBars: number;
}

// ── Default parameters ───────────────────────────────────────────────

export function getDefaultParams(type: StrategyType): StrategyParams {
  switch (type) {
    case 'ma_crossover':
      return { fastPeriod: 10, slowPeriod: 30, maType: 'ema' } as MACrossoverParams;
    case 'rsi':
      return { period: 14, oversold: 30, overbought: 70 } as RSIParams;
    case 'macd':
      return { fast: 12, slow: 26, signal: 9 } as MACDParams;
    case 'bollinger':
      return { period: 20, stdDev: 2 } as BollingerParams;
    case 'supertrend':
      return { period: 10, multiplier: 3 } as SupertrendParams;
    case 'stochastic':
      return { kPeriod: 14, kSmooth: 3, dPeriod: 3, oversold: 20, overbought: 80 } as StochasticParams;
    case 'combined':
      return {
        conditions: [
          { strategy: 'rsi', params: { period: 14, oversold: 30, overbought: 70 } as RSIParams },
          { strategy: 'ma_crossover', params: { fastPeriod: 10, slowPeriod: 30, maType: 'ema' } as MACrossoverParams },
        ],
        logic: 'and',
      } as CombinedParams;
  }
}

export const DEFAULT_SETTINGS: BacktestSettings = {
  initialCapital: 10000,
  positionSizePct: 100,
  stopLossPct: 0,
  takeProfitPct: 0,
  direction: 'both',
};

// ── Signal generation ────────────────────────────────────────────────

// Signal: 1 = buy, -1 = sell, 0 = no signal
type SignalArray = Int8Array;

function buildTimeMap(data: OHLCData[]): Map<number, number> {
  const map = new Map<number, number>();
  for (let i = 0; i < data.length; i++) map.set(data[i].time, i);
  return map;
}

function generateMACrossoverSignals(data: OHLCData[], params: MACrossoverParams): SignalArray {
  const signals = new Int8Array(data.length);
  const calcFn = params.maType === 'sma' ? calcSMA : calcEMA;
  const fast = calcFn(data, params.fastPeriod);
  const slow = calcFn(data, params.slowPeriod);
  if (fast.length === 0 || slow.length === 0) return signals;

  const timeMap = buildTimeMap(data);
  // Align fast and slow by time
  const fastMap = new Map<number, number>();
  for (const f of fast) fastMap.set(f.time, f.value);

  let prevFast = 0, prevSlow = 0;
  let initialized = false;

  for (const s of slow) {
    const fv = fastMap.get(s.time);
    if (fv === undefined) continue;
    const idx = timeMap.get(s.time);
    if (idx === undefined) continue;

    if (initialized) {
      // Cross up
      if (prevFast <= prevSlow && fv > s.value) signals[idx] = 1;
      // Cross down
      else if (prevFast >= prevSlow && fv < s.value) signals[idx] = -1;
    }
    prevFast = fv;
    prevSlow = s.value;
    initialized = true;
  }
  return signals;
}

function generateRSISignals(data: OHLCData[], params: RSIParams): SignalArray {
  const signals = new Int8Array(data.length);
  const rsi = calcRSI(data, params.period);
  if (rsi.length === 0) return signals;

  const timeMap = buildTimeMap(data);
  let prevVal = 50;

  for (const r of rsi) {
    const idx = timeMap.get(r.time);
    if (idx === undefined) continue;
    // Buy when crossing above oversold from below
    if (prevVal <= params.oversold && r.value > params.oversold) signals[idx] = 1;
    // Sell when crossing below overbought from above
    else if (prevVal >= params.overbought && r.value < params.overbought) signals[idx] = -1;
    prevVal = r.value;
  }
  return signals;
}

function generateMACDSignals(data: OHLCData[], params: MACDParams): SignalArray {
  const signals = new Int8Array(data.length);
  const result = calcMACD(data, params.fast, params.slow, params.signal);
  if (result.macd.length === 0 || result.signal.length === 0) return signals;

  const timeMap = buildTimeMap(data);
  const macdMap = new Map<number, number>();
  for (const m of result.macd) macdMap.set(m.time, m.value);

  let prevMacd = 0, prevSig = 0;
  let initialized = false;

  for (const s of result.signal) {
    const mv = macdMap.get(s.time);
    if (mv === undefined) continue;
    const idx = timeMap.get(s.time);
    if (idx === undefined) continue;

    if (initialized) {
      if (prevMacd <= prevSig && mv > s.value) signals[idx] = 1;
      else if (prevMacd >= prevSig && mv < s.value) signals[idx] = -1;
    }
    prevMacd = mv;
    prevSig = s.value;
    initialized = true;
  }
  return signals;
}

function generateBollingerSignals(data: OHLCData[], params: BollingerParams): SignalArray {
  const signals = new Int8Array(data.length);
  const bb = calcBollingerBands(data, params.period, params.stdDev);
  if (bb.upper.length === 0) return signals;

  const timeMap = buildTimeMap(data);

  for (let i = 0; i < bb.upper.length; i++) {
    const idx = timeMap.get(bb.upper[i].time);
    if (idx === undefined) continue;
    const close = data[idx].close;
    // Buy when price touches/crosses below lower band
    if (close <= bb.lower[i].value) signals[idx] = 1;
    // Sell when price touches/crosses above upper band
    else if (close >= bb.upper[i].value) signals[idx] = -1;
  }
  return signals;
}

function generateSupertrendSignals(data: OHLCData[], params: SupertrendParams): SignalArray {
  const signals = new Int8Array(data.length);
  const st = calcSupertrend(data, params.period, params.multiplier);
  if (st.length === 0) return signals;

  const timeMap = buildTimeMap(data);
  let prevDir = 0;

  for (const s of st) {
    const idx = timeMap.get(s.time);
    if (idx === undefined) continue;
    if (prevDir !== 0) {
      if (prevDir === -1 && s.direction === 1) signals[idx] = 1;
      else if (prevDir === 1 && s.direction === -1) signals[idx] = -1;
    }
    prevDir = s.direction;
  }
  return signals;
}

function generateStochasticSignals(data: OHLCData[], params: StochasticParams): SignalArray {
  const signals = new Int8Array(data.length);
  const stoch = calcStochastic(data, params.kPeriod, params.kSmooth, params.dPeriod);
  if (stoch.k.length === 0 || stoch.d.length === 0) return signals;

  const timeMap = buildTimeMap(data);
  const kMap = new Map<number, number>();
  for (const k of stoch.k) kMap.set(k.time, k.value);

  let prevK = 50, prevD = 50;
  let initialized = false;

  for (const d of stoch.d) {
    const kv = kMap.get(d.time);
    if (kv === undefined) continue;
    const idx = timeMap.get(d.time);
    if (idx === undefined) continue;

    if (initialized) {
      // Buy: %K crosses above %D in oversold zone
      if (prevK <= prevD && kv > d.value && kv < params.oversold) signals[idx] = 1;
      // Sell: %K crosses below %D in overbought zone
      else if (prevK >= prevD && kv < d.value && kv > params.overbought) signals[idx] = -1;
    }
    prevK = kv;
    prevD = d.value;
    initialized = true;
  }
  return signals;
}

function generateSignals(data: OHLCData[], config: StrategyConfig): SignalArray {
  switch (config.type) {
    case 'ma_crossover':
      return generateMACrossoverSignals(data, config.params as MACrossoverParams);
    case 'rsi':
      return generateRSISignals(data, config.params as RSIParams);
    case 'macd':
      return generateMACDSignals(data, config.params as MACDParams);
    case 'bollinger':
      return generateBollingerSignals(data, config.params as BollingerParams);
    case 'supertrend':
      return generateSupertrendSignals(data, config.params as SupertrendParams);
    case 'stochastic':
      return generateStochasticSignals(data, config.params as StochasticParams);
    case 'combined':
      return generateCombinedSignals(data, config.params as CombinedParams);
  }
}

function generateCombinedSignals(data: OHLCData[], params: CombinedParams): SignalArray {
  const signals = new Int8Array(data.length);
  if (params.conditions.length === 0) return signals;

  const subSignals = params.conditions.map((c) =>
    generateSignals(data, { type: c.strategy, params: c.params })
  );

  for (let i = 0; i < data.length; i++) {
    const buys = subSignals.map((s) => s[i] === 1);
    const sells = subSignals.map((s) => s[i] === -1);

    if (params.logic === 'and') {
      if (buys.every(Boolean)) signals[i] = 1;
      else if (sells.every(Boolean)) signals[i] = -1;
    } else {
      // 'or'
      if (buys.some(Boolean)) signals[i] = 1;
      else if (sells.some(Boolean)) signals[i] = -1;
    }
  }
  return signals;
}

// ── Backtesting engine ───────────────────────────────────────────────

export function runBacktest(
  data: OHLCData[],
  config: StrategyConfig,
  settings: BacktestSettings
): BacktestResult {
  const signals = generateSignals(data, config);
  const trades: Trade[] = [];
  let tradeId = 0;
  let capital = settings.initialCapital;
  let position: {
    direction: TradeDirection;
    entryIdx: number;
    entryPrice: number;
    size: number;
    capitalAtEntry: number;
  } | null = null;

  const equityCurve: EquityPoint[] = [];
  let peakEquity = capital;

  function closePosition(exitIdx: number, exitPrice: number) {
    if (!position) return;
    const pnl =
      position.direction === 'long'
        ? (exitPrice - position.entryPrice) * position.size
        : (position.entryPrice - exitPrice) * position.size;
    const pnlPct = (pnl / position.capitalAtEntry) * 100;
    capital += pnl;

    trades.push({
      id: tradeId++,
      direction: position.direction,
      entryTime: data[position.entryIdx].time,
      exitTime: data[exitIdx].time,
      entryPrice: position.entryPrice,
      exitPrice,
      positionSize: position.size,
      pnl,
      pnlPct,
      capitalAtEntry: position.capitalAtEntry,
      durationBars: exitIdx - position.entryIdx,
    });
    position = null;
  }

  function openPosition(idx: number, direction: TradeDirection) {
    if (capital <= 0) return;
    const price = data[idx].close;
    const allocatedCapital = capital * (settings.positionSizePct / 100);
    const size = allocatedCapital / price;
    position = {
      direction,
      entryIdx: idx,
      entryPrice: price,
      size,
      capitalAtEntry: capital,
    };
  }

  for (let i = 0; i < data.length; i++) {
    const sig = signals[i];

    // Check stop loss / take profit for existing position
    if (position) {
      const currentPrice = data[i].close;
      const priceDiff = position.direction === 'long'
        ? currentPrice - position.entryPrice
        : position.entryPrice - currentPrice;
      const pctChange = (priceDiff / position.entryPrice) * 100;

      let shouldClose = false;
      let closePrice = currentPrice;

      if (settings.stopLossPct > 0 && pctChange <= -settings.stopLossPct) {
        shouldClose = true;
        // Approximate the stop price
        closePrice = position.direction === 'long'
          ? position.entryPrice * (1 - settings.stopLossPct / 100)
          : position.entryPrice * (1 + settings.stopLossPct / 100);
      } else if (settings.takeProfitPct > 0 && pctChange >= settings.takeProfitPct) {
        shouldClose = true;
        closePrice = position.direction === 'long'
          ? position.entryPrice * (1 + settings.takeProfitPct / 100)
          : position.entryPrice * (1 - settings.takeProfitPct / 100);
      }

      if (shouldClose) {
        closePosition(i, closePrice);
      }
    }

    // Process signal
    if (sig === 1) {
      // Buy signal
      if (position && position.direction === 'short') {
        closePosition(i, data[i].close);
      }
      if (!position && (settings.direction === 'long' || settings.direction === 'both')) {
        openPosition(i, 'long');
      }
    } else if (sig === -1) {
      // Sell signal
      if (position && position.direction === 'long') {
        closePosition(i, data[i].close);
      }
      if (!position && (settings.direction === 'short' || settings.direction === 'both')) {
        openPosition(i, 'short');
      }
    }

    // Calculate equity
    let equity = capital;
    if (position) {
      const unrealizedPnl =
        position.direction === 'long'
          ? (data[i].close - position.entryPrice) * position.size
          : (position.entryPrice - data[i].close) * position.size;
      equity += unrealizedPnl;
    }

    if (equity > peakEquity) peakEquity = equity;
    const drawdownPct = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;

    equityCurve.push({
      time: data[i].time,
      equity,
      drawdownPct,
    });
  }

  // Close any open position at end
  if (position) {
    closePosition(data.length - 1, data[data.length - 1].close);
  }

  const metrics = calculateMetrics(trades, settings.initialCapital, capital, equityCurve);

  return {
    trades,
    equityCurve,
    metrics,
    strategyConfig: config,
    settings,
  };
}

// ── Metrics calculation ──────────────────────────────────────────────

function calculateMetrics(
  trades: Trade[],
  initialCapital: number,
  finalCapital: number,
  equityCurve: EquityPoint[]
): BacktestMetrics {
  const totalReturn = finalCapital - initialCapital;
  const totalReturnPct = (totalReturn / initialCapital) * 100;

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const maxDrawdownPct = equityCurve.reduce((max, p) => Math.max(max, p.drawdownPct), 0);
  let maxDrawdown = 0;
  let peak = initialCapital;
  for (const p of equityCurve) {
    if (p.equity > peak) peak = p.equity;
    const dd = peak - p.equity;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Sharpe ratio (annualized, assuming daily returns)
  let sharpeRatio = 0;
  if (equityCurve.length > 1) {
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const r = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
      returns.push(r);
    }
    const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0) {
      sharpeRatio = (avgReturn / stdDev) * Math.sqrt(252); // annualize
    }
  }

  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const avgWinPct = wins.length > 0 ? wins.reduce((s, t) => s + t.pnlPct, 0) / wins.length : 0;
  const avgLossPct = losses.length > 0 ? losses.reduce((s, t) => s + t.pnlPct, 0) / losses.length : 0;

  const pnls = trades.map((t) => t.pnl);
  const pnlPcts = trades.map((t) => t.pnlPct);
  const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0;
  const bestTradePct = pnlPcts.length > 0 ? Math.max(...pnlPcts) : 0;
  const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0;
  const worstTradePct = pnlPcts.length > 0 ? Math.min(...pnlPcts) : 0;

  const avgHoldingBars =
    trades.length > 0 ? trades.reduce((s, t) => s + t.durationBars, 0) / trades.length : 0;

  return {
    totalReturn,
    totalReturnPct,
    winRate,
    profitFactor,
    maxDrawdown,
    maxDrawdownPct,
    sharpeRatio,
    totalTrades: trades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    avgWin,
    avgLoss,
    avgWinPct,
    avgLossPct,
    bestTrade,
    bestTradePct,
    worstTrade,
    worstTradePct,
    avgHoldingBars,
  };
}
