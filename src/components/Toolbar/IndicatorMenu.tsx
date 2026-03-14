import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  useIndicatorStore,
  type IndicatorType,
  type IndicatorConfig,
} from '../../stores/indicatorStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';
import type { Translations } from '../../i18n';

interface IndicatorItem {
  type: IndicatorType;
  labelKey: keyof Translations;
  descKey: keyof Translations;
  helpKey?: keyof Translations;
}

interface IndicatorCategory {
  categoryKey: keyof Translations;
  items: IndicatorItem[];
}

const INDICATOR_CATEGORIES: IndicatorCategory[] = [
  {
    categoryKey: 'catMovingAverages',
    items: [
      { type: 'SMA', labelKey: 'sma', descKey: 'smaDesc', helpKey: 'helpSMA' },
      { type: 'EMA', labelKey: 'ema', descKey: 'emaDesc', helpKey: 'helpEMA' },
      { type: 'DEMA', labelKey: 'dema', descKey: 'demaDesc', helpKey: 'helpDEMA' },
      { type: 'TEMA', labelKey: 'tema', descKey: 'temaDesc', helpKey: 'helpTEMA' },
      { type: 'WMA', labelKey: 'wma', descKey: 'wmaDesc', helpKey: 'helpWMA' },
      { type: 'HMA', labelKey: 'hma', descKey: 'hmaDesc', helpKey: 'helpHMA' },
    ],
  },
  {
    categoryKey: 'catOscillators',
    items: [
      { type: 'RSI', labelKey: 'rsi', descKey: 'rsiDesc', helpKey: 'helpRSI' },
      { type: 'MACD', labelKey: 'macd', descKey: 'macdDesc', helpKey: 'helpMACD' },
      { type: 'STOCH', labelKey: 'stochastic', descKey: 'stochasticDesc', helpKey: 'helpStochastic' },
      { type: 'WILLR', labelKey: 'williamsR', descKey: 'williamsRDesc', helpKey: 'helpWilliamsR' },
      { type: 'CCI', labelKey: 'cci', descKey: 'cciDesc', helpKey: 'helpCCI' },
      { type: 'MFI', labelKey: 'mfi', descKey: 'mfiDesc', helpKey: 'helpMFI' },
      { type: 'ROC', labelKey: 'roc', descKey: 'rocDesc', helpKey: 'helpROC' },
      { type: 'DPO', labelKey: 'dpo', descKey: 'dpoDesc', helpKey: 'helpDPO' },
    ],
  },
  {
    categoryKey: 'catTrend',
    items: [
      { type: 'ADX', labelKey: 'adx', descKey: 'adxDesc', helpKey: 'helpADX' },
      { type: 'PSAR', labelKey: 'parabolicSar', descKey: 'parabolicSarDesc', helpKey: 'helpParabolicSAR' },
      { type: 'SUPERTREND', labelKey: 'supertrend', descKey: 'supertrendDesc', helpKey: 'helpSupertrend' },
      { type: 'ICHIMOKU', labelKey: 'ichimoku', descKey: 'ichimokuDesc', helpKey: 'helpIchimoku' },
    ],
  },
  {
    categoryKey: 'catVolatility',
    items: [
      { type: 'BB', labelKey: 'bollingerBands', descKey: 'bollingerBandsDesc', helpKey: 'helpBollinger' },
      { type: 'ATR', labelKey: 'atr', descKey: 'atrDesc', helpKey: 'helpATR' },
      { type: 'KELTNER', labelKey: 'keltnerChannels', descKey: 'keltnerChannelsDesc', helpKey: 'helpKeltner' },
    ],
  },
  {
    categoryKey: 'catVolume',
    items: [
      { type: 'OBV', labelKey: 'obv', descKey: 'obvDesc', helpKey: 'helpOBV' },
      { type: 'VWAP', labelKey: 'vwap', descKey: 'vwapDesc', helpKey: 'helpVWAP' },
      { type: 'CMF', labelKey: 'cmf', descKey: 'cmfDesc', helpKey: 'helpCMF' },
      { type: 'VPVR', labelKey: 'volumeProfile', descKey: 'volumeProfileDesc', helpKey: 'helpVolumeProfile' },
    ],
  },
];

const PARAM_LABELS: Record<string, keyof Translations> = {
  period: 'period',
  fast: 'fast',
  slow: 'slow',
  signal: 'signal',
  stdDev: 'stdDev',
  multiplier: 'multiplier',
  step: 'step',
  max: 'max',
  smoothK: 'smoothK',
  smoothD: 'smoothD',
  tenkan: 'tenkan',
  kijun: 'kijun',
  senkou: 'senkou',
  emaPeriod: 'emaPeriod',
  atrPeriod: 'atrPeriod',
  bins: 'vpBins',
};

const INDICATOR_COLORS = [
  '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6',
  '#ef4444', '#22c55e', '#06b6d4', '#f97316', '#a855f7',
  '#64748b', '#eab308',
];

function HelpBubble({ text, isDark }: { text: string; isDark: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex ml-auto flex-shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center transition-colors ${
          show
            ? 'bg-blue-600 text-white'
            : isDark
              ? 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
              : 'bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-700'
        }`}
        title="Help"
      >
        i
      </button>
      {show && (
        <div className={`absolute right-0 top-6 w-56 p-2 rounded-lg shadow-lg z-50 text-[11px] leading-relaxed border ${
          isDark ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-600'
        }`}>
          {text}
        </div>
      )}
    </span>
  );
}

function IndicatorSettingsRow({
  indicator,
  isDark,
}: {
  indicator: IndicatorConfig;
  isDark: boolean;
}) {
  const { removeIndicator, toggleIndicator, updateIndicatorParams, updateIndicatorColor, addIndicator, getDefaultParams } = useIndicatorStore();
  const t = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [editParams, setEditParams] = useState<Record<string, number>>({ ...indicator.params });
  const [showColorPicker, setShowColorPicker] = useState(false);

  const hasParams = Object.keys(indicator.params).length > 0;
  const paramsChanged = hasParams && JSON.stringify(editParams) !== JSON.stringify(indicator.params);

  const handleApply = () => {
    updateIndicatorParams(indicator.id, editParams);
  };

  const handleReset = () => {
    const defaults = getDefaultParams(indicator.type);
    setEditParams({ ...defaults });
    updateIndicatorParams(indicator.id, defaults);
  };

  return (
    <div className={`border-b last:border-b-0 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
      {/* Header row */}
      <div
        className={`flex items-center px-3 py-2 text-sm cursor-pointer transition-colors ${
          isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
        }`}
        onClick={() => hasParams && setExpanded(!expanded)}
      >
        {/* Color dot */}
        <button
          className="relative mr-2 flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
        >
          <span
            className={`w-3 h-3 rounded-full block border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
            style={{ backgroundColor: indicator.color }}
          />
          {showColorPicker && (
            <div
              className={`absolute left-0 top-5 z-50 p-1.5 rounded-lg shadow-xl border grid grid-cols-6 gap-1 ${
                isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {INDICATOR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { updateIndicatorColor(indicator.id, c); setShowColorPicker(false); }}
                  className={`w-5 h-5 rounded-sm border transition-transform hover:scale-110 ${
                    indicator.color === c ? 'border-white scale-110 ring-1 ring-blue-500' : isDark ? 'border-gray-600' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </button>

        {/* Name + params summary */}
        <div className="flex-1 min-w-0">
          <span className={`font-medium ${!indicator.visible ? 'opacity-40' : ''}`}>
            {indicator.type}
          </span>
          {hasParams && (
            <span className={`ml-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              ({Object.values(indicator.params).join(', ')})
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 ml-2">
          {/* Expand arrow */}
          {hasParams && (
            <span className={`text-[10px] transition-transform ${expanded ? 'rotate-180' : ''} ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              ▼
            </span>
          )}

          {/* Visibility toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleIndicator(indicator.id); }}
            className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            title={indicator.visible ? t.visible : t.hidden}
          >
            {indicator.visible ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>

          {/* Duplicate */}
          <button
            onClick={(e) => { e.stopPropagation(); addIndicator(indicator.type); }}
            className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-500' : 'hover:bg-gray-200 text-gray-400'}`}
            title={t.duplicate}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="8" y="8" width="12" height="12" rx="2" />
              <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
            </svg>
          </button>

          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); removeIndicator(indicator.id); }}
            className={`p-1 rounded transition-colors text-red-400 ${isDark ? 'hover:bg-gray-700 hover:text-red-300' : 'hover:bg-gray-200 hover:text-red-500'}`}
            title={t.remove}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded parameter editor */}
      {expanded && hasParams && (
        <div className={`px-3 pb-3 pt-1 ${isDark ? 'bg-gray-800/30' : 'bg-gray-50/50'}`}>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(editParams).map(([key, value]) => {
              const labelKey = PARAM_LABELS[key] ?? key;
              const label = typeof labelKey === 'string' && labelKey in t
                ? t[labelKey as keyof Translations]
                : key;

              // Determine step based on value range
              const isDecimal = value < 1 || key === 'step' || key === 'stdDev' || key === 'multiplier';
              const inputStep = isDecimal ? 0.01 : 1;
              const inputMin = isDecimal ? 0.01 : 1;

              return (
                <div key={key}>
                  <label className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {label}
                  </label>
                  <input
                    type="number"
                    value={value}
                    min={inputMin}
                    step={inputStep}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v > 0) {
                        setEditParams((p) => ({ ...p, [key]: v }));
                      }
                    }}
                    className={`w-full mt-0.5 px-2 py-1 text-xs rounded border outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Apply / Reset buttons */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleApply}
              disabled={!paramsChanged}
              className={`flex-1 px-2 py-1 text-xs rounded font-medium transition-colors ${
                paramsChanged
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : isDark
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {t.apply}
            </button>
            <button
              onClick={handleReset}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                isDark
                  ? 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                  : 'bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-700'
              }`}
            >
              {t.resetDefaults}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function IndicatorMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { addIndicator, indicators } = useIndicatorStore();
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      )
        setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePos();
      setSearchQuery('');
    }
  }, [isOpen, updatePos]);

  // Filter indicators by search query
  const filteredCategories = searchQuery.trim()
    ? INDICATOR_CATEGORIES.map((cat) => ({
        ...cat,
        items: cat.items.filter((ind) => {
          const q = searchQuery.toLowerCase();
          return (
            ind.type.toLowerCase().includes(q) ||
            t[ind.labelKey].toLowerCase().includes(q) ||
            t[ind.descKey].toLowerCase().includes(q)
          );
        }),
      })).filter((cat) => cat.items.length > 0)
    : INDICATOR_CATEGORIES;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        {t.indicators}
        {indicators.length > 0 && (
          <span className="bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {indicators.length}
          </span>
        )}
      </button>

      {isOpen && createPortal(
        <div ref={dropdownRef} style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }} className={`w-80 rounded-lg shadow-xl max-h-[75vh] overflow-y-auto border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Active indicators section - shown first when there are active ones */}
          {indicators.length > 0 && (
            <>
              <div className={`p-2 border-b text-xs font-medium uppercase tracking-wide ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                {t.active} ({indicators.length})
              </div>
              {indicators.map((ind) => (
                <IndicatorSettingsRow key={ind.id} indicator={ind} isDark={isDark} />
              ))}
            </>
          )}

          {/* Search bar */}
          <div className={`p-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="relative">
              <svg className={`absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.addIndicator + '...'}
                className={`w-full pl-7 pr-2 py-1.5 text-xs rounded border outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
                autoFocus
              />
            </div>
          </div>

          {/* Indicator catalog */}
          {filteredCategories.map((cat) => (
            <div key={cat.categoryKey}>
              <div className={`px-3 py-1.5 text-[10px] uppercase tracking-wider sticky top-0 ${isDark ? 'text-gray-600 bg-gray-900/90' : 'text-gray-400 bg-gray-50'}`}>
                {t[cat.categoryKey]}
              </div>
              {cat.items.map((ind) => (
                <div
                  key={ind.type}
                  className={`flex items-start px-3 py-1.5 text-sm transition-colors cursor-pointer ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                  onClick={() => {
                    addIndicator(ind.type);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{t[ind.labelKey]}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t[ind.descKey]}</div>
                  </div>
                  {ind.helpKey && t[ind.helpKey] && (
                    <HelpBubble text={t[ind.helpKey]} isDark={isDark} />
                  )}
                </div>
              ))}
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className={`p-4 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {t.noResults}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
