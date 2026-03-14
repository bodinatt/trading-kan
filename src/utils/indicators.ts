import type { OHLCData } from '../types/chart';

export function calcSMA(
  data: OHLCData[],
  period: number
): { time: number; value: number }[] {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

export function calcEMA(
  data: OHLCData[],
  period: number
): { time: number; value: number }[] {
  if (data.length < period) return [];
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

export function calcRSI(
  data: OHLCData[],
  period: number = 14
): { time: number; value: number }[] {
  if (data.length < period + 1) return [];
  const result = [];
  const changes = [];

  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }

  let avgGain = 0,
    avgLoss = 0;
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
      macdLine.push({
        time: emaSlow[i].time,
        value: fastVal.value - emaSlow[i].value,
      });
    }
  }

  // Signal line (EMA of MACD)
  const signalLine: { time: number; value: number }[] = [];
  const k = 2 / (signal + 1);
  if (macdLine.length >= signal) {
    let ema =
      macdLine.slice(0, signal).reduce((s, d) => s + d.value, 0) / signal;
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

export function calcStochastic(
  data: OHLCData[],
  period = 14,
  smoothK = 3,
  smoothD = 3
): {
  k: { time: number; value: number }[];
  d: { time: number; value: number }[];
} {
  if (data.length < period) return { k: [], d: [] };

  const rawK: { time: number; value: number }[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let lowestLow = Infinity;
    let highestHigh = -Infinity;
    for (let j = 0; j < period; j++) {
      if (data[i - j].low < lowestLow) lowestLow = data[i - j].low;
      if (data[i - j].high > highestHigh) highestHigh = data[i - j].high;
    }
    const range = highestHigh - lowestLow;
    const kVal = range === 0 ? 50 : (100 * (data[i].close - lowestLow)) / range;
    rawK.push({ time: data[i].time, value: kVal });
  }

  // Smooth %K with SMA(smoothK)
  const k: { time: number; value: number }[] = [];
  for (let i = smoothK - 1; i < rawK.length; i++) {
    let sum = 0;
    for (let j = 0; j < smoothK; j++) sum += rawK[i - j].value;
    k.push({ time: rawK[i].time, value: sum / smoothK });
  }

  // %D = SMA(%K, smoothD)
  const d: { time: number; value: number }[] = [];
  for (let i = smoothD - 1; i < k.length; i++) {
    let sum = 0;
    for (let j = 0; j < smoothD; j++) sum += k[i - j].value;
    d.push({ time: k[i].time, value: sum / smoothD });
  }

  return { k, d };
}

export function calcATR(
  data: OHLCData[],
  period = 14
): { time: number; value: number }[] {
  if (data.length < 2) return [];

  const trValues: number[] = [];
  // First TR uses high - low only
  trValues.push(data[0].high - data[0].low);

  for (let i = 1; i < data.length; i++) {
    const prevClose = data[i - 1].close;
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - prevClose),
      Math.abs(data[i].low - prevClose)
    );
    trValues.push(tr);
  }

  if (trValues.length < period) return [];

  const result: { time: number; value: number }[] = [];

  // Initial ATR = SMA of first `period` TRs
  let atr = 0;
  for (let i = 0; i < period; i++) atr += trValues[i];
  atr /= period;
  result.push({ time: data[period - 1].time, value: atr });

  // Wilder's smoothing
  for (let i = period; i < trValues.length; i++) {
    atr = (atr * (period - 1) + trValues[i]) / period;
    result.push({ time: data[i].time, value: atr });
  }

  return result;
}

export function calcVWAP(
  data: OHLCData[]
): { time: number; value: number }[] {
  if (data.length === 0) return [];

  const result: { time: number; value: number }[] = [];
  let cumTPV = 0;
  let cumVol = 0;

  for (let i = 0; i < data.length; i++) {
    const tp = (data[i].high + data[i].low + data[i].close) / 3;
    const vol = data[i].volume ?? 0;
    cumTPV += tp * vol;
    cumVol += vol;
    if (cumVol > 0) {
      result.push({ time: data[i].time, value: cumTPV / cumVol });
    }
  }

  return result;
}

export function calcIchimoku(
  data: OHLCData[],
  tenkan = 9,
  kijun = 26,
  senkou = 52
): {
  tenkanSen: { time: number; value: number }[];
  kijunSen: { time: number; value: number }[];
  senkouA: { time: number; value: number }[];
  senkouB: { time: number; value: number }[];
  chikouSpan: { time: number; value: number }[];
} {
  function periodHighLow(end: number, period: number): { high: number; low: number } | null {
    if (end - period + 1 < 0) return null;
    let high = -Infinity;
    let low = Infinity;
    for (let i = end - period + 1; i <= end; i++) {
      if (data[i].high > high) high = data[i].high;
      if (data[i].low < low) low = data[i].low;
    }
    return { high, low };
  }

  const tenkanSen: { time: number; value: number }[] = [];
  const kijunSen: { time: number; value: number }[] = [];
  const senkouA: { time: number; value: number }[] = [];
  const senkouB: { time: number; value: number }[] = [];
  const chikouSpan: { time: number; value: number }[] = [];

  for (let i = 0; i < data.length; i++) {
    // Tenkan-sen
    const tenkanHL = periodHighLow(i, tenkan);
    if (tenkanHL) {
      tenkanSen.push({ time: data[i].time, value: (tenkanHL.high + tenkanHL.low) / 2 });
    }

    // Kijun-sen
    const kijunHL = periodHighLow(i, kijun);
    if (kijunHL) {
      kijunSen.push({ time: data[i].time, value: (kijunHL.high + kijunHL.low) / 2 });
    }

    // Senkou Span A = (Tenkan + Kijun) / 2, displaced forward by kijun periods
    // We store it at current time; the displacement is handled by using future time if available
    if (tenkanHL && kijunHL) {
      const tenkanVal = (tenkanHL.high + tenkanHL.low) / 2;
      const kijunVal = (kijunHL.high + kijunHL.low) / 2;
      const futureIdx = i + kijun;
      // Use future bar time if available, otherwise estimate
      const futureTime = futureIdx < data.length
        ? data[futureIdx].time
        : data[data.length - 1].time + (futureIdx - data.length + 1) * (data.length > 1 ? data[1].time - data[0].time : 86400);
      senkouA.push({ time: futureTime, value: (tenkanVal + kijunVal) / 2 });
    }

    // Senkou Span B = (highest high + lowest low over senkou period) / 2, displaced forward
    const senkouHL = periodHighLow(i, senkou);
    if (senkouHL) {
      const futureIdx = i + kijun;
      const futureTime = futureIdx < data.length
        ? data[futureIdx].time
        : data[data.length - 1].time + (futureIdx - data.length + 1) * (data.length > 1 ? data[1].time - data[0].time : 86400);
      senkouB.push({ time: futureTime, value: (senkouHL.high + senkouHL.low) / 2 });
    }

    // Chikou Span = close displaced backward by kijun periods
    const pastIdx = i - kijun;
    if (pastIdx >= 0) {
      chikouSpan.push({ time: data[pastIdx].time, value: data[i].close });
    }
  }

  return { tenkanSen, kijunSen, senkouA, senkouB, chikouSpan };
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
    upper.push({
      time: middle[i].time,
      value: middle[i].value + stdDev * std,
    });
    lower.push({
      time: middle[i].time,
      value: middle[i].value - stdDev * std,
    });
  }

  return { upper, middle, lower };
}

// ── Williams %R ──────────────────────────────────────────────────────
export function calcWilliamsR(
  data: OHLCData[],
  period: number = 14
): { time: number; value: number }[] {
  if (data.length < period) return [];
  const result: { time: number; value: number }[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = 0; j < period; j++) {
      if (data[i - j].high > highestHigh) highestHigh = data[i - j].high;
      if (data[i - j].low < lowestLow) lowestLow = data[i - j].low;
    }
    const range = highestHigh - lowestLow;
    const wr = range === 0 ? -50 : ((highestHigh - data[i].close) / range) * -100;
    result.push({ time: data[i].time, value: wr });
  }
  return result;
}

// ── CCI (Commodity Channel Index) ────────────────────────────────────
export function calcCCI(
  data: OHLCData[],
  period: number = 20
): { time: number; value: number }[] {
  if (data.length < period) return [];
  const result: { time: number; value: number }[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let sumTP = 0;
    const tps: number[] = [];
    for (let j = 0; j < period; j++) {
      const tp = (data[i - j].high + data[i - j].low + data[i - j].close) / 3;
      tps.push(tp);
      sumTP += tp;
    }
    const meanTP = sumTP / period;
    let meanDev = 0;
    for (const tp of tps) meanDev += Math.abs(tp - meanTP);
    meanDev /= period;
    const cci = meanDev === 0 ? 0 : (tps[0] - meanTP) / (0.015 * meanDev);
    result.push({ time: data[i].time, value: cci });
  }
  return result;
}

// ── OBV (On Balance Volume) ──────────────────────────────────────────
export function calcOBV(
  data: OHLCData[]
): { time: number; value: number }[] {
  if (data.length === 0) return [];
  const result: { time: number; value: number }[] = [];
  let obv = 0;
  result.push({ time: data[0].time, value: obv });

  for (let i = 1; i < data.length; i++) {
    const vol = data[i].volume ?? 0;
    if (data[i].close > data[i - 1].close) obv += vol;
    else if (data[i].close < data[i - 1].close) obv -= vol;
    result.push({ time: data[i].time, value: obv });
  }
  return result;
}

// ── ADX (Average Directional Index) ──────────────────────────────────
export function calcADX(
  data: OHLCData[],
  period: number = 14
): {
  adx: { time: number; value: number }[];
  plusDI: { time: number; value: number }[];
  minusDI: { time: number; value: number }[];
} {
  if (data.length < period + 1)
    return { adx: [], plusDI: [], minusDI: [] };

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trArr: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const upMove = data[i].high - data[i - 1].high;
    const downMove = data[i - 1].low - data[i].low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
    trArr.push(tr);
  }

  // Wilder's smoothing
  let smoothPlusDM = 0, smoothMinusDM = 0, smoothTR = 0;
  for (let i = 0; i < period; i++) {
    smoothPlusDM += plusDM[i];
    smoothMinusDM += minusDM[i];
    smoothTR += trArr[i];
  }

  const plusDIArr: { time: number; value: number }[] = [];
  const minusDIArr: { time: number; value: number }[] = [];
  const dxArr: number[] = [];

  const pdi = smoothTR === 0 ? 0 : (smoothPlusDM / smoothTR) * 100;
  const mdi = smoothTR === 0 ? 0 : (smoothMinusDM / smoothTR) * 100;
  plusDIArr.push({ time: data[period].time, value: pdi });
  minusDIArr.push({ time: data[period].time, value: mdi });
  const diSum = pdi + mdi;
  dxArr.push(diSum === 0 ? 0 : (Math.abs(pdi - mdi) / diSum) * 100);

  for (let i = period; i < trArr.length; i++) {
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];
    smoothTR = smoothTR - smoothTR / period + trArr[i];
    const p = smoothTR === 0 ? 0 : (smoothPlusDM / smoothTR) * 100;
    const m = smoothTR === 0 ? 0 : (smoothMinusDM / smoothTR) * 100;
    plusDIArr.push({ time: data[i + 1].time, value: p });
    minusDIArr.push({ time: data[i + 1].time, value: m });
    const s = p + m;
    dxArr.push(s === 0 ? 0 : (Math.abs(p - m) / s) * 100);
  }

  // ADX = smoothed DX over period
  const adxArr: { time: number; value: number }[] = [];
  if (dxArr.length >= period) {
    let adx = 0;
    for (let i = 0; i < period; i++) adx += dxArr[i];
    adx /= period;
    adxArr.push({ time: plusDIArr[period - 1].time, value: adx });
    for (let i = period; i < dxArr.length; i++) {
      adx = (adx * (period - 1) + dxArr[i]) / period;
      adxArr.push({ time: plusDIArr[i].time, value: adx });
    }
  }

  return { adx: adxArr, plusDI: plusDIArr, minusDI: minusDIArr };
}

// ── Parabolic SAR ────────────────────────────────────────────────────
export function calcParabolicSAR(
  data: OHLCData[],
  step: number = 0.02,
  max: number = 0.2
): { time: number; value: number }[] {
  if (data.length < 2) return [];
  const result: { time: number; value: number }[] = [];

  let isUpTrend = data[1].close > data[0].close;
  let af = step;
  let ep = isUpTrend ? data[0].high : data[0].low;
  let sar = isUpTrend ? data[0].low : data[0].high;

  result.push({ time: data[0].time, value: sar });

  for (let i = 1; i < data.length; i++) {
    const prevSar = sar;
    sar = prevSar + af * (ep - prevSar);

    if (isUpTrend) {
      // Ensure SAR is not above the prior two lows
      if (i >= 2) sar = Math.min(sar, data[i - 1].low, data[i - 2].low);
      else sar = Math.min(sar, data[i - 1].low);

      if (data[i].low < sar) {
        // Reversal
        isUpTrend = false;
        sar = ep;
        ep = data[i].low;
        af = step;
      } else {
        if (data[i].high > ep) {
          ep = data[i].high;
          af = Math.min(af + step, max);
        }
      }
    } else {
      // Ensure SAR is not below the prior two highs
      if (i >= 2) sar = Math.max(sar, data[i - 1].high, data[i - 2].high);
      else sar = Math.max(sar, data[i - 1].high);

      if (data[i].high > sar) {
        // Reversal
        isUpTrend = true;
        sar = ep;
        ep = data[i].high;
        af = step;
      } else {
        if (data[i].low < ep) {
          ep = data[i].low;
          af = Math.min(af + step, max);
        }
      }
    }

    result.push({ time: data[i].time, value: sar });
  }
  return result;
}

// ── Supertrend ───────────────────────────────────────────────────────
export function calcSupertrend(
  data: OHLCData[],
  period: number = 10,
  multiplier: number = 3
): { time: number; value: number; direction: number }[] {
  const atrData = calcATR(data, period);
  if (atrData.length === 0) return [];

  const result: { time: number; value: number; direction: number }[] = [];
  const offset = data.length - atrData.length;

  let prevUpperBand = 0, prevLowerBand = 0;
  let prevSupertrend = 0;
  // direction is computed per-bar based on prevSupertrend

  for (let i = 0; i < atrData.length; i++) {
    const di = i + offset;
    const hl2 = (data[di].high + data[di].low) / 2;
    const atr = atrData[i].value;

    let upperBand = hl2 + multiplier * atr;
    let lowerBand = hl2 - multiplier * atr;

    if (i > 0) {
      upperBand = upperBand < prevUpperBand || data[di - 1].close > prevUpperBand ? upperBand : prevUpperBand;
      lowerBand = lowerBand > prevLowerBand || data[di - 1].close < prevLowerBand ? lowerBand : prevLowerBand;
    }

    let direction: number;
    let supertrendVal: number;

    if (i === 0) {
      direction = 1;
      supertrendVal = lowerBand;
    } else {
      if (prevSupertrend === prevUpperBand) {
        direction = data[di].close > upperBand ? 1 : -1;
      } else {
        direction = data[di].close < lowerBand ? -1 : 1;
      }
      supertrendVal = direction === 1 ? lowerBand : upperBand;
    }

    prevUpperBand = upperBand;
    prevLowerBand = lowerBand;
    prevSupertrend = supertrendVal;

    result.push({ time: data[di].time, value: supertrendVal, direction });
  }
  return result;
}

// ── Helper: EMA on raw values ────────────────────────────────────────
function emaOnValues(
  values: { time: number; value: number }[],
  period: number
): { time: number; value: number }[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  let ema = 0;
  for (let i = 0; i < period; i++) ema += values[i].value;
  ema /= period;
  const result = [{ time: values[period - 1].time, value: ema }];
  for (let i = period; i < values.length; i++) {
    ema = values[i].value * k + ema * (1 - k);
    result.push({ time: values[i].time, value: ema });
  }
  return result;
}

// ── DEMA (Double EMA) ────────────────────────────────────────────────
export function calcDEMA(
  data: OHLCData[],
  period: number = 21
): { time: number; value: number }[] {
  const ema1 = calcEMA(data, period);
  const ema2 = emaOnValues(ema1, period);
  if (ema2.length === 0) return [];

  const result: { time: number; value: number }[] = [];
  const offset = ema1.length - ema2.length;
  for (let i = 0; i < ema2.length; i++) {
    result.push({
      time: ema2[i].time,
      value: 2 * ema1[i + offset].value - ema2[i].value,
    });
  }
  return result;
}

// ── TEMA (Triple EMA) ────────────────────────────────────────────────
export function calcTEMA(
  data: OHLCData[],
  period: number = 21
): { time: number; value: number }[] {
  const ema1 = calcEMA(data, period);
  const ema2 = emaOnValues(ema1, period);
  const ema3 = emaOnValues(ema2, period);
  if (ema3.length === 0) return [];

  const result: { time: number; value: number }[] = [];
  const offset2 = ema2.length - ema3.length;
  const offset1 = ema1.length - ema2.length;
  for (let i = 0; i < ema3.length; i++) {
    const e1 = ema1[i + offset1 + offset2].value;
    const e2 = ema2[i + offset2].value;
    const e3 = ema3[i].value;
    result.push({ time: ema3[i].time, value: 3 * e1 - 3 * e2 + e3 });
  }
  return result;
}

// ── WMA (Weighted Moving Average) ────────────────────────────────────
export function calcWMA(
  data: OHLCData[],
  period: number = 20
): { time: number; value: number }[] {
  if (data.length < period) return [];
  const result: { time: number; value: number }[] = [];
  const denom = (period * (period + 1)) / 2;

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - period + 1 + j].close * (j + 1);
    }
    result.push({ time: data[i].time, value: sum / denom });
  }
  return result;
}

// ── Helper: WMA on raw values ────────────────────────────────────────
function wmaOnValues(
  values: { time: number; value: number }[],
  period: number
): { time: number; value: number }[] {
  if (values.length < period) return [];
  const result: { time: number; value: number }[] = [];
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += values[i - period + 1 + j].value * (j + 1);
    }
    result.push({ time: values[i].time, value: sum / denom });
  }
  return result;
}

// ── HMA (Hull Moving Average) ────────────────────────────────────────
export function calcHMA(
  data: OHLCData[],
  period: number = 20
): { time: number; value: number }[] {
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.floor(Math.sqrt(period));

  const wmaFull = calcWMA(data, period);
  const wmaHalf = calcWMA(data, halfPeriod);
  if (wmaFull.length === 0 || wmaHalf.length === 0) return [];

  // Align: 2*WMA(half) - WMA(full)
  const offset = wmaHalf.length - wmaFull.length;
  const diff: { time: number; value: number }[] = [];
  for (let i = 0; i < wmaFull.length; i++) {
    diff.push({
      time: wmaFull[i].time,
      value: 2 * wmaHalf[i + offset].value - wmaFull[i].value,
    });
  }

  return wmaOnValues(diff, sqrtPeriod);
}

// ── MFI (Money Flow Index) ───────────────────────────────────────────
export function calcMFI(
  data: OHLCData[],
  period: number = 14
): { time: number; value: number }[] {
  if (data.length < period + 1) return [];
  const result: { time: number; value: number }[] = [];

  const tp: number[] = [];
  const mf: number[] = [];
  for (let i = 0; i < data.length; i++) {
    tp.push((data[i].high + data[i].low + data[i].close) / 3);
    mf.push(tp[i] * (data[i].volume ?? 0));
  }

  for (let i = period; i < data.length; i++) {
    let posMF = 0, negMF = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) posMF += mf[j];
      else if (tp[j] < tp[j - 1]) negMF += mf[j];
    }
    const mfi = negMF === 0 ? 100 : 100 - 100 / (1 + posMF / negMF);
    result.push({ time: data[i].time, value: mfi });
  }
  return result;
}

// ── ROC (Rate of Change) ─────────────────────────────────────────────
export function calcROC(
  data: OHLCData[],
  period: number = 12
): { time: number; value: number }[] {
  if (data.length < period + 1) return [];
  const result: { time: number; value: number }[] = [];

  for (let i = period; i < data.length; i++) {
    const prev = data[i - period].close;
    const roc = prev === 0 ? 0 : ((data[i].close - prev) / prev) * 100;
    result.push({ time: data[i].time, value: roc });
  }
  return result;
}

// ── CMF (Chaikin Money Flow) ─────────────────────────────────────────
export function calcCMF(
  data: OHLCData[],
  period: number = 20
): { time: number; value: number }[] {
  if (data.length < period) return [];
  const result: { time: number; value: number }[] = [];

  const mfv: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const range = data[i].high - data[i].low;
    const clv = range === 0 ? 0 : ((data[i].close - data[i].low) - (data[i].high - data[i].close)) / range;
    mfv.push(clv * (data[i].volume ?? 0));
  }

  for (let i = period - 1; i < data.length; i++) {
    let sumMFV = 0, sumVol = 0;
    for (let j = 0; j < period; j++) {
      sumMFV += mfv[i - j];
      sumVol += data[i - j].volume ?? 0;
    }
    result.push({ time: data[i].time, value: sumVol === 0 ? 0 : sumMFV / sumVol });
  }
  return result;
}

// ── DPO (Detrended Price Oscillator) ─────────────────────────────────
export function calcDPO(
  data: OHLCData[],
  period: number = 20
): { time: number; value: number }[] {
  const sma = calcSMA(data, period);
  if (sma.length === 0) return [];
  const result: { time: number; value: number }[] = [];
  const lookback = Math.floor(period / 2) + 1;

  for (let i = 0; i < sma.length; i++) {
    const dataIdx = i + period - 1;
    const smaIdx = i - lookback;
    if (smaIdx >= 0 && smaIdx < sma.length) {
      result.push({
        time: data[dataIdx].time,
        value: data[dataIdx].close - sma[smaIdx].value,
      });
    }
  }
  return result;
}

// ── Keltner Channels ─────────────────────────────────────────────────
// ── Volume Profile (VPVR) ─────────────────────────────────────────────
export interface VolumeProfileBin {
  price: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
}

export interface VolumeProfileResult {
  bins: VolumeProfileBin[];
  poc: number;           // Point of Control price
  valueAreaHigh: number; // Value Area High
  valueAreaLow: number;  // Value Area Low
}

export function computeVolumeProfile(
  data: OHLCData[],
  numBins: number = 50
): VolumeProfileResult {
  if (data.length === 0) {
    return { bins: [], poc: 0, valueAreaHigh: 0, valueAreaLow: 0 };
  }

  // Find overall price range
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const bar of data) {
    if (bar.low < minPrice) minPrice = bar.low;
    if (bar.high > maxPrice) maxPrice = bar.high;
  }

  const range = maxPrice - minPrice;
  if (range === 0) {
    return {
      bins: [{ price: minPrice, volume: 0, buyVolume: 0, sellVolume: 0 }],
      poc: minPrice,
      valueAreaHigh: minPrice,
      valueAreaLow: minPrice,
    };
  }

  const binSize = range / numBins;
  const bins: VolumeProfileBin[] = [];
  for (let i = 0; i < numBins; i++) {
    bins.push({
      price: minPrice + (i + 0.5) * binSize,
      volume: 0,
      buyVolume: 0,
      sellVolume: 0,
    });
  }

  // Distribute volume proportionally across bins
  for (const bar of data) {
    const vol = bar.volume ?? 0;
    if (vol === 0) continue;
    const isBuy = bar.close >= bar.open;
    const barRange = bar.high - bar.low;

    if (barRange === 0) {
      // All volume goes to one bin
      const idx = Math.min(Math.floor((bar.close - minPrice) / binSize), numBins - 1);
      bins[idx].volume += vol;
      if (isBuy) bins[idx].buyVolume += vol;
      else bins[idx].sellVolume += vol;
      continue;
    }

    // Find which bins overlap with this bar's high-low range
    const lowBin = Math.max(0, Math.floor((bar.low - minPrice) / binSize));
    const highBin = Math.min(numBins - 1, Math.floor((bar.high - minPrice) / binSize));

    for (let b = lowBin; b <= highBin; b++) {
      const binLow = minPrice + b * binSize;
      const binHigh = binLow + binSize;
      // Overlap between [bar.low, bar.high] and [binLow, binHigh]
      const overlapLow = Math.max(bar.low, binLow);
      const overlapHigh = Math.min(bar.high, binHigh);
      const overlapRatio = (overlapHigh - overlapLow) / barRange;
      const binVol = vol * overlapRatio;
      bins[b].volume += binVol;
      if (isBuy) bins[b].buyVolume += binVol;
      else bins[b].sellVolume += binVol;
    }
  }

  // POC = price level with highest volume
  let pocIdx = 0;
  let maxVol = 0;
  for (let i = 0; i < bins.length; i++) {
    if (bins[i].volume > maxVol) {
      maxVol = bins[i].volume;
      pocIdx = i;
    }
  }
  const poc = bins[pocIdx].price;

  // Value Area = 70% of total volume around POC
  const totalVolume = bins.reduce((s, b) => s + b.volume, 0);
  const valueAreaTarget = totalVolume * 0.7;
  let vaVolume = bins[pocIdx].volume;
  let vaLowIdx = pocIdx;
  let vaHighIdx = pocIdx;

  while (vaVolume < valueAreaTarget && (vaLowIdx > 0 || vaHighIdx < bins.length - 1)) {
    const downVol = vaLowIdx > 0 ? bins[vaLowIdx - 1].volume : 0;
    const upVol = vaHighIdx < bins.length - 1 ? bins[vaHighIdx + 1].volume : 0;
    if (downVol >= upVol && vaLowIdx > 0) {
      vaLowIdx--;
      vaVolume += bins[vaLowIdx].volume;
    } else if (vaHighIdx < bins.length - 1) {
      vaHighIdx++;
      vaVolume += bins[vaHighIdx].volume;
    } else {
      vaLowIdx--;
      vaVolume += bins[vaLowIdx].volume;
    }
  }

  return {
    bins,
    poc,
    valueAreaHigh: bins[vaHighIdx].price,
    valueAreaLow: bins[vaLowIdx].price,
  };
}

export function calcKeltnerChannels(
  data: OHLCData[],
  emaPeriod: number = 20,
  atrPeriod: number = 10,
  multiplier: number = 1.5
): {
  upper: { time: number; value: number }[];
  middle: { time: number; value: number }[];
  lower: { time: number; value: number }[];
} {
  const middle = calcEMA(data, emaPeriod);
  const atr = calcATR(data, atrPeriod);
  if (middle.length === 0 || atr.length === 0)
    return { upper: [], middle: [], lower: [] };

  const upper: { time: number; value: number }[] = [];
  const lower: { time: number; value: number }[] = [];

  // Build time->value maps for alignment
  const atrMap = new Map<number, number>();
  for (const a of atr) atrMap.set(a.time, a.value);

  const alignedMiddle: { time: number; value: number }[] = [];
  for (const m of middle) {
    const atrVal = atrMap.get(m.time);
    if (atrVal !== undefined) {
      alignedMiddle.push(m);
      upper.push({ time: m.time, value: m.value + multiplier * atrVal });
      lower.push({ time: m.time, value: m.value - multiplier * atrVal });
    }
  }

  return { upper, middle: alignedMiddle, lower };
}
