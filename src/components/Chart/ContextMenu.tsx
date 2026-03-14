import { useEffect, useRef, useState } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { useChartStore } from '../../stores/chartStore';
import { useDrawingStore } from '../../stores/drawingStore';
import { useIndicatorStore } from '../../stores/indicatorStore';
import { useAlertStore } from '../../stores/alertStore';
import { useTemplateStore } from '../../stores/templateStore';
import { useTranslation } from '../../i18n';
import { exportToCSV } from '../../utils/exportData';

interface ContextMenuProps {
  x: number;
  y: number;
  price: number | null;
  onClose: () => void;
  onFitContent: () => void;
  onSetPriceScaleMode: (mode: 0 | 1 | 2) => void;
  onScreenshot: () => void;
}

export function ContextMenu({
  x,
  y,
  price,
  onClose,
  onFitContent,
  onSetPriceScaleMode,
  onScreenshot,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();
  const symbol = useChartStore((s) => s.symbol);
  const timeframe = useChartStore((s) => s.timeframe);
  const chartType = useChartStore((s) => s.chartType);
  const data = useChartStore((s) => s.data);
  const clearDrawings = useDrawingStore((s) => s.clearDrawings);
  const indicators = useIndicatorStore((s) => s.indicators);
  const addAlert = useAlertStore((s) => s.addAlert);
  const saveTemplate = useTemplateStore((s) => s.saveTemplate);

  const [logScale, setLogScale] = useState(false);
  const [percentMode, setPercentMode] = useState(false);

  // Close on click outside
  useEffect(() => {
    const handleClick = () => onClose();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Delay to avoid the same right-click closing the menu
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick);
      document.addEventListener('contextmenu', handleClick);
      document.addEventListener('keydown', handleEsc);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menuRef.current.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menuRef.current.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  const handleItem = (action: () => void) => {
    action();
    onClose();
  };

  const itemClass = `w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${
    isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
  }`;

  const separatorClass = `my-1 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`;

  return (
    <div
      ref={menuRef}
      className={`fixed z-50 rounded shadow-xl py-1 min-w-48 ${
        isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button className={itemClass} onClick={() => handleItem(onFitContent)}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
        {t.resetChart}
      </button>
      <button
        className={itemClass}
        onClick={() => handleItem(() => {
          const next = !logScale;
          setLogScale(next);
          onSetPriceScaleMode(next ? 1 : 0);
        })}
      >
        <span className="w-3.5 text-center text-[10px]">{logScale ? '\u2713' : ''}</span>
        {t.logScale}
      </button>
      <button
        className={itemClass}
        onClick={() => handleItem(() => {
          const next = !percentMode;
          setPercentMode(next);
          onSetPriceScaleMode(next ? 2 : 0);
        })}
      >
        <span className="w-3.5 text-center text-[10px]">{percentMode ? '\u2713' : ''}</span>
        {t.percentScale}
      </button>

      <div className={separatorClass} />

      {price !== null && (
        <button
          className={itemClass}
          onClick={() => handleItem(() => {
            addAlert({
              symbol,
              price,
              condition: 'cross_above',
              message: `${symbol} alert at ${price.toFixed(2)}`,
            });
          })}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {t.addAlertAtPrice} {price.toFixed(2)}
        </button>
      )}

      <div className={separatorClass} />

      <button
        className={itemClass}
        onClick={() => handleItem(() => clearDrawings(symbol))}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        {t.removeAllDrawings}
      </button>
      <button
        className={itemClass}
        onClick={() => handleItem(() => {
          const store = useIndicatorStore.getState();
          for (const ind of store.indicators) {
            store.removeIndicator(ind.id);
          }
        })}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        {t.removeAllIndicators}
      </button>

      <div className={separatorClass} />

      <button
        className={itemClass}
        onClick={() => handleItem(() => {
          const name = prompt(t.templateNamePrompt);
          if (!name) return;
          saveTemplate({
            name,
            indicators: [...indicators],
            chartType,
            timeframe,
          });
        })}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        {t.saveAsTemplate}
      </button>
      <button
        className={itemClass}
        onClick={() => handleItem(() => exportToCSV(data, symbol, timeframe))}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {t.exportData}
      </button>
      <button
        className={itemClass}
        onClick={() => handleItem(onScreenshot)}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {t.screenshot}
      </button>
    </div>
  );
}
