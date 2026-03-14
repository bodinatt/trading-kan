import { useState } from 'react';
import {
  useAlertStore,
  type AlertCondition,
  type AlertCategory,
  type IndicatorType,
  type IndicatorCondition,
  type PriceCondition,
} from '../../stores/alertStore';
import { useChartStore } from '../../stores/chartStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';

const PRICE_CONDITIONS: PriceCondition[] = ['above', 'below', 'cross_above', 'cross_below'];

const INDICATOR_CONDITIONS: Record<IndicatorType, { condition: IndicatorCondition; labelKey: string }[]> = {
  RSI: [
    { condition: 'rsiAbove', labelKey: 'alertRsiAbove' },
    { condition: 'rsiBelow', labelKey: 'alertRsiBelow' },
  ],
  MACD: [
    { condition: 'macdCross', labelKey: 'alertMacdCrossUp' },
    { condition: 'macdCrossDown', labelKey: 'alertMacdCrossDown' },
    { condition: 'macdAbove', labelKey: 'alertMacdAbove' },
    { condition: 'macdBelow', labelKey: 'alertMacdBelow' },
  ],
  BB: [
    { condition: 'bbUpperBreak', labelKey: 'alertBbUpperBreak' },
    { condition: 'bbLowerBreak', labelKey: 'alertBbLowerBreak' },
  ],
};

// Conditions that require a threshold value input
const THRESHOLD_CONDITIONS: IndicatorCondition[] = ['rsiAbove', 'rsiBelow'];

const DEFAULT_THRESHOLDS: Record<string, number> = {
  rsiAbove: 70,
  rsiBelow: 30,
};

// Condition display labels for the alert list
function getConditionDisplay(
  alert: { condition: AlertCondition; category: AlertCategory; indicatorType?: IndicatorType; indicatorValue?: number; price: number },
  t: Record<string, string>
): string {
  if (alert.category === 'price') {
    return `${alert.condition.replace('_', ' ')} ${alert.price}`;
  }
  // Indicator alert
  const labelMap: Record<string, string> = {
    rsiAbove: t.alertRsiAbove,
    rsiBelow: t.alertRsiBelow,
    macdCross: t.alertMacdCrossUp,
    macdCrossDown: t.alertMacdCrossDown,
    macdAbove: t.alertMacdAbove,
    macdBelow: t.alertMacdBelow,
    bbUpperBreak: t.alertBbUpperBreak,
    bbLowerBreak: t.alertBbLowerBreak,
  };
  const label = labelMap[alert.condition] || alert.condition;
  if (alert.indicatorValue != null && THRESHOLD_CONDITIONS.includes(alert.condition as IndicatorCondition)) {
    return `${label} ${alert.indicatorValue}`;
  }
  return label;
}

// Icon for indicator type
function IndicatorIcon({ type, isDark }: { type?: IndicatorType; isDark: boolean }) {
  if (!type) return null;
  const color = isDark ? 'text-blue-400' : 'text-blue-600';
  const labels: Record<IndicatorType, string> = { RSI: 'RSI', MACD: 'MACD', BB: 'BB' };
  return (
    <span className={`text-[9px] font-bold px-1 rounded ${color} ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
      {labels[type]}
    </span>
  );
}

export function AlertPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<AlertCategory>('price');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<AlertCondition>('above');
  const [indicatorType, setIndicatorType] = useState<IndicatorType>('RSI');
  const [indicatorCondition, setIndicatorCondition] = useState<IndicatorCondition>('rsiAbove');
  const [indicatorValue, setIndicatorValue] = useState('70');
  const [message, setMessage] = useState('');
  const { alerts, addAlert, removeAlert, clearTriggered } = useAlertStore();
  const symbol = useChartStore((s) => s.symbol);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  const handleCategoryChange = (newCategory: AlertCategory) => {
    setCategory(newCategory);
    if (newCategory === 'price') {
      setCondition('above');
    } else {
      setIndicatorType('RSI');
      setIndicatorCondition('rsiAbove');
      setIndicatorValue(String(DEFAULT_THRESHOLDS['rsiAbove'] ?? ''));
    }
  };

  const handleIndicatorTypeChange = (newType: IndicatorType) => {
    setIndicatorType(newType);
    const firstCond = INDICATOR_CONDITIONS[newType][0];
    setIndicatorCondition(firstCond.condition);
    setIndicatorValue(String(DEFAULT_THRESHOLDS[firstCond.condition] ?? ''));
  };

  const handleAdd = () => {
    if (category === 'price') {
      if (!price) return;
      addAlert({
        symbol,
        price: Number(price),
        condition,
        category: 'price',
        message: message || `${symbol} ${condition} ${price}`,
      });
      setPrice('');
    } else {
      const threshold = THRESHOLD_CONDITIONS.includes(indicatorCondition)
        ? Number(indicatorValue)
        : undefined;
      addAlert({
        symbol,
        price: 0, // not used for indicator alerts
        condition: indicatorCondition,
        category: 'indicator',
        indicatorType,
        indicatorValue: threshold,
        message: message || '',
      });
      setIndicatorValue(String(DEFAULT_THRESHOLDS[indicatorCondition] ?? ''));
    }
    setMessage('');
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const symbolAlerts = alerts.filter((a) => a.symbol === symbol);
  const triggeredCount = alerts.filter((a) => a.triggered).length;

  const selectClass = `rounded px-2 py-1 text-xs outline-none border ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`;
  const inputClass = `flex-1 rounded px-2 py-1 text-xs outline-none border ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {t.alerts}
        {triggeredCount > 0 && (
          <span className="bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
            {triggeredCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute top-full right-0 mt-1 w-80 rounded-lg shadow-xl z-50 border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`p-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="text-xs text-gray-500 uppercase mb-2">
              {t.newAlert} — {symbol}
            </div>

            {/* Category selector: Price or Indicator */}
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => handleCategoryChange('price')}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  category === 'price'
                    ? 'bg-blue-600 text-white'
                    : isDark
                    ? 'bg-gray-800 text-gray-400 hover:text-white'
                    : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.alertPrice}
              </button>
              <button
                onClick={() => handleCategoryChange('indicator')}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  category === 'indicator'
                    ? 'bg-blue-600 text-white'
                    : isDark
                    ? 'bg-gray-800 text-gray-400 hover:text-white'
                    : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.alertIndicator}
              </button>
            </div>

            {category === 'price' ? (
              /* Price condition UI */
              <div className="flex gap-1 mb-2">
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as AlertCondition)}
                  className={selectClass}
                >
                  {PRICE_CONDITIONS.map((c) => {
                    const labels: Record<PriceCondition, string> = {
                      above: t.priceAbove,
                      below: t.priceBelow,
                      cross_above: t.crossesAbove,
                      cross_below: t.crossesBelow,
                    };
                    return (
                      <option key={c} value={c}>{labels[c]}</option>
                    );
                  })}
                </select>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Price"
                  className={inputClass}
                />
              </div>
            ) : (
              /* Indicator condition UI */
              <div className="space-y-1 mb-2">
                <div className="flex gap-1">
                  <select
                    value={indicatorType}
                    onChange={(e) => handleIndicatorTypeChange(e.target.value as IndicatorType)}
                    className={selectClass}
                  >
                    <option value="RSI">RSI</option>
                    <option value="MACD">MACD</option>
                    <option value="BB">Bollinger Bands</option>
                  </select>
                  <select
                    value={indicatorCondition}
                    onChange={(e) => {
                      const cond = e.target.value as IndicatorCondition;
                      setIndicatorCondition(cond);
                      setIndicatorValue(String(DEFAULT_THRESHOLDS[cond] ?? ''));
                    }}
                    className={`${selectClass} flex-1`}
                  >
                    {INDICATOR_CONDITIONS[indicatorType].map(({ condition: c, labelKey }) => (
                      <option key={c} value={c}>
                        {(t as unknown as Record<string, string>)[labelKey] || c}
                      </option>
                    ))}
                  </select>
                </div>
                {THRESHOLD_CONDITIONS.includes(indicatorCondition) && (
                  <input
                    type="number"
                    value={indicatorValue}
                    onChange={(e) => setIndicatorValue(e.target.value)}
                    placeholder="Threshold"
                    className={inputClass}
                  />
                )}
              </div>
            )}

            <div className="flex gap-1">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.alertMessage}
                className={inputClass}
              />
              <button
                onClick={handleAdd}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-500"
              >
                {t.add}
              </button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {symbolAlerts.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-gray-500">
                {t.noAlerts} {symbol}
              </div>
            )}
            {symbolAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between px-3 py-2 text-xs border-b ${isDark ? 'border-gray-800' : 'border-gray-100'} ${
                  alert.triggered ? (isDark ? 'bg-yellow-900/20' : 'bg-yellow-50') : ''
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {alert.category === 'indicator' && (
                    <IndicatorIcon type={alert.indicatorType} isDark={isDark} />
                  )}
                  <div className="min-w-0">
                    <span
                      className={
                        alert.triggered ? 'text-yellow-400' : isDark ? 'text-gray-300' : 'text-gray-700'
                      }
                    >
                      {getConditionDisplay(alert, t as unknown as Record<string, string>)}
                    </span>
                    {alert.triggered && (
                      <span className="ml-1 text-yellow-500">{t.triggered}</span>
                    )}
                    {alert.message && (
                      <div className="text-gray-500 truncate max-w-48">
                        {alert.message}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="text-gray-600 hover:text-red-400 ml-2 flex-shrink-0"
                >
                  x
                </button>
              </div>
            ))}
          </div>

          {triggeredCount > 0 && (
            <div className={`p-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={clearTriggered}
                className={`w-full text-xs py-1 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {t.clearTriggered}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
