import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TIMEFRAMES } from '../../types/chart';
import { useChartStore } from '../../stores/chartStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';
import type { Translations } from '../../i18n';

const GROUP_KEYS: Record<string, keyof Translations> = {
  'Minutes': 'minutes',
  'Hours': 'hours',
  'Days+': 'daysPlus',
};

const GROUPS = ['Minutes', 'Hours', 'Days+'] as const;

export function TimeframeSelector() {
  const { timeframe, setTimeframe } = useChartStore();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) updatePos();
  }, [open, updatePos]);

  const currentLabel = TIMEFRAMES.find((tf) => tf.key === timeframe)?.label ?? timeframe;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
      >
        <span>{currentLabel}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && createPortal(
        <div ref={dropdownRef} style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }} className={`rounded shadow-xl min-w-[200px] border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
          {GROUPS.map((group) => (
            <div key={group}>
              <div className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {t[GROUP_KEYS[group]]}
              </div>
              <div className="flex flex-wrap gap-0.5 px-2 pb-2">
                {TIMEFRAMES.filter((tf) => tf.group === group).map((tf) => (
                  <button
                    key={tf.key}
                    onClick={() => {
                      setTimeframe(tf.key);
                      setOpen(false);
                    }}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      timeframe === tf.key
                        ? 'bg-blue-600 text-white'
                        : isDark
                          ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
