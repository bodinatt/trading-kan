import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useComparisonStore } from '../../stores/comparisonStore';
import { useThemeStore } from '../../stores/themeStore';
import { dataManager } from '../../services/dataManager';
import type { SymbolInfo } from '../../services/types';
import { useTranslation } from '../../i18n';

export function CompareButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolInfo[]>([]);
  const symbols = useComparisonStore((s) => s.symbols);
  const addSymbol = useComparisonStore((s) => s.addSymbol);
  const removeSymbol = useComparisonStore((s) => s.removeSymbol);
  const toggleSymbol = useComparisonStore((s) => s.toggleSymbol);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
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
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (isOpen) updatePos();
  }, [isOpen, updatePos]);

  const handleSearch = (val: string) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    if (val.trim().length < 1) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const res = await dataManager.searchSymbols(val.trim());
      setResults(res);
    }, 300);
  };

  const handleAdd = (info: SymbolInfo) => {
    addSymbol(info.symbol);
    setQuery('');
    setResults([]);
  };

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
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
          />
        </svg>
        {t.compare}
        {symbols.length > 0 && (
          <span className="bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {symbols.length}
          </span>
        )}
      </button>

      {isOpen && createPortal(
        <div ref={dropdownRef} style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }} className={`w-64 rounded-lg shadow-xl border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Search */}
          <div className={`p-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t.searchToCompare}
              className={`w-full text-xs px-2 py-1.5 rounded border focus:border-blue-500 focus:outline-none ${isDark ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
              autoFocus
            />
          </div>

          {/* Search results */}
          {results.length > 0 && (
            <div className={`max-h-40 overflow-y-auto border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              {results.map((r) => (
                <button
                  key={`${r.symbol}-${r.exchange}`}
                  onClick={() => handleAdd(r)}
                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                >
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{r.symbol}</span>
                  <span className={`truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{r.name}</span>
                  <span className="ml-auto text-gray-500 text-[10px]">
                    {r.exchange}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Active comparisons */}
          {symbols.length > 0 ? (
            <div className="p-2">
              <div className="text-[10px] text-gray-500 uppercase mb-1">
                {t.comparing}
              </div>
              {symbols.map((s) => (
                <div
                  key={s.symbol}
                  className="flex items-center justify-between py-1 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <button
                      onClick={() => toggleSymbol(s.symbol)}
                      className={`${s.visible ? (isDark ? 'text-white' : 'text-gray-900') : 'text-gray-500 line-through'}`}
                    >
                      {s.symbol}
                    </button>
                  </div>
                  <button
                    onClick={() => removeSymbol(s.symbol)}
                    className="text-gray-500 hover:text-red-400"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 text-xs text-gray-500 text-center">
              {t.searchAndAddSymbols}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
