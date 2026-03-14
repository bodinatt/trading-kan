import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useChartStore, type TimezoneId } from '../../stores/chartStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';
import type { Translations } from '../../i18n';

const TIMEZONE_OPTIONS: { id: TimezoneId; labelKey: keyof Translations }[] = [
  { id: 'UTC', labelKey: 'tzUTC' },
  { id: 'Local', labelKey: 'tzLocal' },
  { id: 'Asia/Bangkok', labelKey: 'tzBangkok' },
  { id: 'Asia/Tokyo', labelKey: 'tzTokyo' },
  { id: 'America/New_York', labelKey: 'tzNewYork' },
  { id: 'Europe/London', labelKey: 'tzLondon' },
  { id: 'Australia/Sydney', labelKey: 'tzSydney' },
  { id: 'Asia/Hong_Kong', labelKey: 'tzHongKong' },
  { id: 'Asia/Singapore', labelKey: 'tzSingapore' },
];

export function TimezoneSelector() {
  const { timezone, setTimezone } = useChartStore();
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

  const currentOption = TIMEZONE_OPTIONS.find((tz) => tz.id === timezone);
  const currentLabel = currentOption ? t[currentOption.labelKey] : timezone;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        title={t.timezone}
        className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
          isDark
            ? 'bg-gray-800 text-white hover:bg-gray-700'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        }`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          <path strokeLinecap="round" d="M2 12h20" />
        </svg>
        <span>{currentLabel}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
            className={`rounded shadow-xl min-w-[160px] border py-1 ${
              isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div
              className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`}
            >
              {t.timezone}
            </div>
            {TIMEZONE_OPTIONS.map((tz) => (
              <button
                key={tz.id}
                onClick={() => {
                  setTimezone(tz.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  timezone === tz.id
                    ? 'bg-blue-600 text-white'
                    : isDark
                      ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {t[tz.labelKey]}
                {tz.id !== 'UTC' && tz.id !== 'Local' && (
                  <span className={`ml-1 ${timezone === tz.id ? 'text-blue-200' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    ({tz.id})
                  </span>
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
