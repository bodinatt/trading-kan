import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLayoutStore, type LayoutPreset } from '../../stores/layoutStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';
import type { Translations } from '../../i18n';

const LAYOUTS: { preset: LayoutPreset; labelKey: keyof Translations | null; labelFallback: string; icon: string }[] = [
  { preset: '1x1', labelKey: 'single', labelFallback: 'Single', icon: '[ ]' },
  { preset: '1x2', labelKey: null, labelFallback: '1 x 2', icon: '[ | ]' },
  { preset: '2x1', labelKey: null, labelFallback: '2 x 1', icon: '[-]' },
  { preset: '2x2', labelKey: null, labelFallback: '2 x 2', icon: '[+]' },
  { preset: '3x1', labelKey: null, labelFallback: '3 x 1', icon: '[|||]' },
  { preset: '1+2', labelKey: null, labelFallback: '1 + 2', icon: '[|=]' },
];

export function LayoutSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { preset, setPreset } = useLayoutStore();
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

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (isOpen) updatePos();
  }, [isOpen, updatePos]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
        title={t.chartLayout}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
        </svg>
        {t.layout}
      </button>

      {isOpen && createPortal(
        <div ref={dropdownRef} style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }} className={`w-40 rounded-lg shadow-xl border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
          {LAYOUTS.map((layout) => (
            <button
              key={layout.preset}
              onClick={() => {
                setPreset(layout.preset);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              } ${
                preset === layout.preset ? 'text-blue-400' : isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              <span className={`font-mono text-[10px] w-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {layout.icon}
              </span>
              <span>{layout.labelKey ? t[layout.labelKey] : layout.labelFallback}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
