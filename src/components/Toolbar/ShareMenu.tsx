import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useThemeStore } from '../../stores/themeStore';
import { useChartStore } from '../../stores/chartStore';
import { useIndicatorStore } from '../../stores/indicatorStore';
import { useTranslation } from '../../i18n';
import {
  captureChartImage,
  copyImageToClipboard,
  downloadBlob,
  generateShareUrl,
} from '../../utils/shareChart';
import type { ShareableChartState } from '../../utils/shareChart';

export function ShareMenu() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = useTranslation();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  const getChartElement = useCallback(() => document.getElementById('chart-area'), []);

  const buildShareState = useCallback((): ShareableChartState => {
    const { symbol, timeframe, chartType, timezone } = useChartStore.getState();
    const indicators = useIndicatorStore
      .getState()
      .indicators.filter((ind) => ind.visible)
      .map((ind) => ({ type: ind.type, params: ind.params }));
    return { symbol, timeframe, chartType, timezone, indicators };
  }, []);

  const handleCopyImage = useCallback(async () => {
    const el = getChartElement();
    if (!el) return;
    try {
      const blob = await captureChartImage(el, isDark);
      await copyImageToClipboard(blob);
      setToast(t.imageCopied);
    } catch {
      // silently fail
    }
    setOpen(false);
  }, [isDark, t, getChartElement]);

  const handleDownloadPNG = useCallback(async () => {
    const el = getChartElement();
    if (!el) return;
    try {
      const blob = await captureChartImage(el, isDark);
      downloadBlob(blob, `trading-kan-${Date.now()}.png`);
    } catch {
      // silently fail
    }
    setOpen(false);
  }, [isDark, getChartElement]);

  const handleShareLink = useCallback(async () => {
    const state = buildShareState();
    const url = generateShareUrl(state);
    try {
      await navigator.clipboard.writeText(url);
      setToast(t.linkCopied);
    } catch {
      // fallback
      window.prompt('Copy this link:', url);
    }
    setOpen(false);
  }, [buildShareState, t]);

  // Menu position
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left });
  }, [open]);

  const menuItems: { label: string; icon: React.ReactNode; action: () => void }[] = [
    {
      label: t.copyChartImage,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
      ),
      action: handleCopyImage,
    },
    {
      label: t.downloadPNG,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      action: handleDownloadPNG,
    },
    {
      label: t.shareLink,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      action: handleShareLink,
    },
  ];

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          isDark
            ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
        title={t.share}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        {t.share}
      </button>

      {/* Dropdown portal */}
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
            className={`min-w-[180px] rounded-lg shadow-xl border py-1 ${
              isDark
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            }`}
          >
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                  isDark
                    ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}

      {/* Toast notification */}
      {toast &&
        createPortal(
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2 rounded-lg shadow-lg text-sm font-medium bg-green-600 text-white animate-fade-in">
            {toast}
          </div>,
          document.body
        )}
    </>
  );
}
