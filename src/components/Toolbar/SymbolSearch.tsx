import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { dataManager } from '../../services/dataManager';
import { useChartStore } from '../../stores/chartStore';
import { useThemeStore } from '../../stores/themeStore';
import type { SymbolInfo } from '../../services/types';
import { useTranslation } from '../../i18n';

export function SymbolSearch() {
  const { symbol, setSymbol } = useChartStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
    if (query.length < 1) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const symbols = await dataManager.searchSymbols(query);
      setResults(symbols);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

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

  const handleSelect = (sym: SymbolInfo) => {
    setSymbol(sym.symbol, sym);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
      >
        <span className="text-sm font-semibold">{symbol}</span>
        <svg
          className={`w-3 h-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>

      {isOpen && createPortal(
        <div ref={dropdownRef} style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }} className={`w-72 rounded-lg shadow-xl border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchSymbol}
            className={`w-full px-3 py-2 bg-transparent text-sm outline-none border-b ${isDark ? 'text-white border-gray-700' : 'text-gray-900 border-gray-200'}`}
          />
          <div className="max-h-64 overflow-y-auto">
            {results.map((sym) => (
              <button
                key={sym.symbol}
                onClick={() => handleSelect(sym)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors flex justify-between ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              >
                <span className="font-medium">{sym.symbol}</span>
                <span className="text-gray-500 text-xs">{sym.exchange}</span>
              </button>
            ))}
            {query && results.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                {t.noResults}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
