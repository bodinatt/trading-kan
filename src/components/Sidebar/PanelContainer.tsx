import { useSidePanelStore, type PanelId } from '../../stores/sidePanelStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation, type Translations } from '../../i18n';
import { AlertsPanel } from './panels/AlertsPanel';
import { DataWindowPanel } from './panels/DataWindowPanel';
import { HelpPanel } from './panels/HelpPanel';
import { ScreenerPanel } from './panels/ScreenerPanel';
import { NewsPanel } from './panels/NewsPanel';
import { CalendarPanel } from './panels/CalendarPanel';
import { WatchlistPanel } from './panels/WatchlistPanel';

const panelTranslationKey: Record<PanelId, keyof Translations> = {
  watchlist: 'panelWatchlist',
  alerts: 'panelAlerts',
  dataWindow: 'panelDataWindow',
  news: 'panelNews',
  screener: 'panelScreener',
  calendar: 'panelCalendar',
  notifications: 'panelNotifications',
  help: 'panelHelp',
};

export function PanelContainer() {
  const activePanel = useSidePanelStore((s) => s.activePanel);
  const panelWidth = useSidePanelStore((s) => s.panelWidth);
  const closePanel = useSidePanelStore((s) => s.closePanel);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const tx = useTranslation();

  if (!activePanel) return null;

  const title = tx[panelTranslationKey[activePanel]];

  return (
    <div
      className={`h-full flex flex-col ${
        isDark ? 'bg-gray-900 border-l border-gray-800' : 'bg-gray-50 border-l border-gray-200'
      }`}
      style={{ width: panelWidth }}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b ${
          isDark ? 'border-gray-800' : 'border-gray-200'
        }`}
      >
        <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          {title}
        </span>
        <button
          onClick={closePanel}
          className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
            isDark
              ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
          }`}
          title="Close"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      {activePanel === 'watchlist' ? (
        <WatchlistPanel />
      ) : activePanel === 'alerts' ? (
        <AlertsPanel />
      ) : activePanel === 'dataWindow' ? (
        <div className="flex-1 overflow-y-auto p-3">
          <DataWindowPanel />
        </div>
      ) : activePanel === 'screener' ? (
        <ScreenerPanel />
      ) : activePanel === 'news' ? (
        <NewsPanel />
      ) : activePanel === 'calendar' ? (
        <CalendarPanel />
      ) : activePanel === 'help' ? (
        <HelpPanel />
      ) : (
        <div className="flex-1 overflow-y-auto p-3">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {title} Panel
          </p>
        </div>
      )}
    </div>
  );
}
