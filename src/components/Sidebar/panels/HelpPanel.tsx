import { useState } from 'react';
import { useThemeStore } from '../../../stores/themeStore';
import { useTranslation } from '../../../i18n';

function CollapsibleSection({
  title,
  isDark,
  defaultOpen = false,
  children,
}: {
  title: string;
  isDark: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={`border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
          isDark ? 'text-gray-300 hover:bg-gray-800/50' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
        {title}
      </button>
      {isOpen && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function SubSection({
  title,
  isDark,
  children,
}: {
  title: string;
  isDark: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`border rounded mb-1.5 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors ${
          isDark ? 'text-gray-300 hover:bg-gray-800/50' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <svg
          className={`w-2.5 h-2.5 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
        {title}
      </button>
      {isOpen && (
        <div className={`px-2.5 pb-2 text-xs leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

const SHORTCUTS = [
  { shortcut: 'Scroll wheel', action: 'Zoom time axis' },
  { shortcut: 'Drag \u2194', action: 'Pan horizontally' },
  { shortcut: 'Drag \u2195', action: 'Pan price axis vertically' },
  { shortcut: 'Double-click price axis', action: 'Reset price scale' },
  { shortcut: '+ / -', action: 'Zoom in / out' },
  { shortcut: 'R', action: 'Reset chart' },
  { shortcut: 'Right-click', action: 'Context menu' },
];

export function HelpPanel() {
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const tx = useTranslation();

  const cellBorder = isDark ? 'border-gray-700' : 'border-gray-200';
  const headerBg = isDark ? 'bg-gray-800/50' : 'bg-gray-100';

  return (
    <div className="flex flex-col h-full">
      {/* Section 1: Keyboard Shortcuts */}
      <CollapsibleSection title={tx.keyboardShortcuts} isDark={isDark} defaultOpen>
        <table className={`w-full text-xs border-collapse border rounded ${cellBorder}`}>
          <thead>
            <tr className={headerBg}>
              <th className={`text-left px-2 py-1.5 border ${cellBorder} font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Shortcut
              </th>
              <th className={`text-left px-2 py-1.5 border ${cellBorder} font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((row) => (
              <tr key={row.shortcut}>
                <td className={`px-2 py-1 border ${cellBorder}`}>
                  <kbd
                    className={`text-[10px] px-1 py-0.5 rounded ${
                      isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {row.shortcut}
                  </kbd>
                </td>
                <td className={`px-2 py-1 border ${cellBorder} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {row.action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CollapsibleSection>

      {/* Section 2: Quick Guide */}
      <CollapsibleSection title={tx.quickGuide} isDark={isDark}>
        <SubSection title={tx.howToIndicators} isDark={isDark}>
          Click the Indicators button in the toolbar. Search for an indicator by name, then click to
          add it. Active indicators appear as overlays on the chart or in separate panes below.
        </SubSection>
        <SubSection title={tx.howToDrawings} isDark={isDark}>
          Click the Drawing Tools button or use the vertical toolbar on the left. Select a tool, then
          click on the chart to start drawing. Right-click to delete or modify drawings.
        </SubSection>
        <SubSection title={tx.howToAlerts} isDark={isDark}>
          Right-click on the chart to add a price alert, or open the Alerts panel from the right
          sidebar. You can set price alerts and indicator-based alerts.
        </SubSection>
        <SubSection title={tx.howToBacktest} isDark={isDark}>
          Click the Backtest button in the header. Choose a strategy, configure parameters, and click
          Run Backtest to see historical performance results.
        </SubSection>
      </CollapsibleSection>

      {/* Section 3: App Info */}
      <CollapsibleSection title={tx.appInfo} isDark={isDark}>
        <div className={`text-xs space-y-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <div>
            <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>App:</span>{' '}
            Trading Kan
          </div>
          <div>
            <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Version:</span>{' '}
            1.0.0
          </div>
          <div>
            <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Built with:</span>{' '}
            lightweight-charts, React, Zustand
          </div>
          <div className="pt-2 text-center text-[11px] opacity-75">
            Made with ❤️ in Thailand
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
