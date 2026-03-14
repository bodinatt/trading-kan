import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OHLCData } from '../types/chart';
import { calcRSI, calcMACD, calcBollingerBands } from '../utils/indicators';

// Price-based conditions
export type PriceCondition = 'above' | 'below' | 'cross_above' | 'cross_below';

// Indicator-based conditions
export type IndicatorCondition =
  | 'rsiAbove'
  | 'rsiBelow'
  | 'macdCross'       // MACD line crosses signal line (up)
  | 'macdCrossDown'   // MACD line crosses signal line (down)
  | 'macdAbove'       // MACD histogram above zero
  | 'macdBelow'       // MACD histogram below zero
  | 'bbUpperBreak'    // price breaks above upper Bollinger Band
  | 'bbLowerBreak';   // price breaks below lower Bollinger Band

export type AlertCondition = PriceCondition | IndicatorCondition;

export type AlertCategory = 'price' | 'indicator';

export type IndicatorType = 'RSI' | 'MACD' | 'BB';

export interface PriceAlert {
  id: string;
  symbol: string;
  price: number;
  condition: AlertCondition;
  category: AlertCategory;
  indicatorType?: IndicatorType;
  indicatorValue?: number;  // threshold for RSI, etc.
  message: string;
  triggered: boolean;
  createdAt: number;
}

interface AlertState {
  alerts: PriceAlert[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'triggered' | 'createdAt'>) => void;
  removeAlert: (id: string) => void;
  triggerAlert: (id: string) => void;
  clearTriggered: () => void;
}

let alertId = 0;

export const useAlertStore = create<AlertState>()(
  persist(
    (set) => ({
      alerts: [],

      addAlert: (alert) =>
        set((state) => ({
          alerts: [
            ...state.alerts,
            {
              ...alert,
              id: `alert-${Date.now()}-${alertId++}`,
              triggered: false,
              createdAt: Date.now(),
            },
          ],
        })),

      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),

      triggerAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, triggered: true } : a
          ),
        })),

      clearTriggered: () =>
        set((state) => ({
          alerts: state.alerts.filter((a) => !a.triggered),
        })),
    }),
    { name: 'trading-kan-alerts' }
  )
);

// Alert checker - call this with current prices
export function checkAlerts(symbol: string, currentPrice: number, previousPrice: number) {
  const { alerts, triggerAlert } = useAlertStore.getState();

  for (const alert of alerts) {
    if (alert.symbol !== symbol || alert.triggered) continue;
    if (alert.category === 'indicator') continue; // indicator alerts handled separately

    let shouldTrigger = false;

    switch (alert.condition) {
      case 'above':
        shouldTrigger = currentPrice >= alert.price;
        break;
      case 'below':
        shouldTrigger = currentPrice <= alert.price;
        break;
      case 'cross_above':
        shouldTrigger = previousPrice < alert.price && currentPrice >= alert.price;
        break;
      case 'cross_below':
        shouldTrigger = previousPrice > alert.price && currentPrice <= alert.price;
        break;
    }

    if (shouldTrigger) {
      triggerAlert(alert.id);
      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(`Trading Kan Alert`, {
          body: `${symbol}: ${alert.message || `Price ${alert.condition.replace('_', ' ')} ${alert.price}`}`,
          icon: '/vite.svg',
        });
      }
    }
  }
}

// Indicator alert checker - call with OHLC data array for a symbol
export function checkIndicatorAlerts(symbol: string, data: OHLCData[]) {
  if (data.length < 30) return; // need enough data for indicators

  const { alerts, triggerAlert } = useAlertStore.getState();
  const indicatorAlerts = alerts.filter(
    (a) => a.symbol === symbol && !a.triggered && a.category === 'indicator'
  );
  if (indicatorAlerts.length === 0) return;

  // Pre-compute indicator values only if needed
  let rsiValues: { time: number; value: number }[] | null = null;
  let macdResult: ReturnType<typeof calcMACD> | null = null;
  let bbResult: ReturnType<typeof calcBollingerBands> | null = null;

  const needsRSI = indicatorAlerts.some(
    (a) => a.condition === 'rsiAbove' || a.condition === 'rsiBelow'
  );
  const needsMACD = indicatorAlerts.some(
    (a) =>
      a.condition === 'macdCross' ||
      a.condition === 'macdCrossDown' ||
      a.condition === 'macdAbove' ||
      a.condition === 'macdBelow'
  );
  const needsBB = indicatorAlerts.some(
    (a) => a.condition === 'bbUpperBreak' || a.condition === 'bbLowerBreak'
  );

  if (needsRSI) rsiValues = calcRSI(data, 14);
  if (needsMACD) macdResult = calcMACD(data, 12, 26, 9);
  if (needsBB) bbResult = calcBollingerBands(data, 20, 2);

  for (const alert of indicatorAlerts) {
    let shouldTrigger = false;

    switch (alert.condition) {
      case 'rsiAbove': {
        if (rsiValues && rsiValues.length >= 1) {
          const latestRSI = rsiValues[rsiValues.length - 1].value;
          shouldTrigger = latestRSI >= (alert.indicatorValue ?? 70);
        }
        break;
      }
      case 'rsiBelow': {
        if (rsiValues && rsiValues.length >= 1) {
          const latestRSI = rsiValues[rsiValues.length - 1].value;
          shouldTrigger = latestRSI <= (alert.indicatorValue ?? 30);
        }
        break;
      }
      case 'macdCross': {
        // MACD line crosses above signal line
        if (macdResult && macdResult.histogram.length >= 2) {
          const prev = macdResult.histogram[macdResult.histogram.length - 2].value;
          const curr = macdResult.histogram[macdResult.histogram.length - 1].value;
          shouldTrigger = prev <= 0 && curr > 0;
        }
        break;
      }
      case 'macdCrossDown': {
        // MACD line crosses below signal line
        if (macdResult && macdResult.histogram.length >= 2) {
          const prev = macdResult.histogram[macdResult.histogram.length - 2].value;
          const curr = macdResult.histogram[macdResult.histogram.length - 1].value;
          shouldTrigger = prev >= 0 && curr < 0;
        }
        break;
      }
      case 'macdAbove': {
        if (macdResult && macdResult.histogram.length >= 1) {
          const curr = macdResult.histogram[macdResult.histogram.length - 1].value;
          shouldTrigger = curr > 0;
        }
        break;
      }
      case 'macdBelow': {
        if (macdResult && macdResult.histogram.length >= 1) {
          const curr = macdResult.histogram[macdResult.histogram.length - 1].value;
          shouldTrigger = curr < 0;
        }
        break;
      }
      case 'bbUpperBreak': {
        if (bbResult && bbResult.upper.length >= 1 && data.length >= 1) {
          const latestPrice = data[data.length - 1].close;
          const latestUpper = bbResult.upper[bbResult.upper.length - 1].value;
          shouldTrigger = latestPrice > latestUpper;
        }
        break;
      }
      case 'bbLowerBreak': {
        if (bbResult && bbResult.lower.length >= 1 && data.length >= 1) {
          const latestPrice = data[data.length - 1].close;
          const latestLower = bbResult.lower[bbResult.lower.length - 1].value;
          shouldTrigger = latestPrice < latestLower;
        }
        break;
      }
    }

    if (shouldTrigger) {
      triggerAlert(alert.id);
      if (Notification.permission === 'granted') {
        const conditionLabel = alert.condition.replace(/([A-Z])/g, ' $1').trim();
        new Notification(`Trading Kan Alert`, {
          body: `${symbol}: ${alert.message || `${conditionLabel}${alert.indicatorValue != null ? ` ${alert.indicatorValue}` : ''}`}`,
          icon: '/vite.svg',
        });
      }
    }
  }
}
