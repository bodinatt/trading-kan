import { useSidePanelStore, type PanelId } from '../../stores/sidePanelStore';
import { useThemeStore } from '../../stores/themeStore';
import { useTranslation } from '../../i18n';
import { useNotificationStore } from '../../stores/notificationStore';

const icons: { id: PanelId; path: string }[] = [
  {
    id: 'watchlist',
    path: 'M3 6h18M3 10h18M3 14h18M3 18h18',
  },
  {
    id: 'alerts',
    path: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9',
  },
  {
    id: 'dataWindow',
    path: 'M3 3h18v18H3V3zm6 0v18m6-18v18M3 9h18M3 15h18',
  },
  {
    id: 'news',
    path: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V9a2 2 0 012-2h2a2 2 0 012 2v9a2 2 0 01-2 2h-2zM7 8h6M7 12h6M7 16h4',
  },
  {
    id: 'screener',
    path: 'M3 17l6-6 4 4 8-8M14 7h7v7',
  },
  {
    id: 'calendar',
    path: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'notifications',
    path: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9M3 3l2 2m16-2l-2 2',
  },
  {
    id: 'help',
    path: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-6v.01M12 8a2 2 0 011.74 2.987L12 13',
  },
];

const panelTranslationKey: Record<PanelId, string> = {
  watchlist: 'panelWatchlist',
  alerts: 'panelAlerts',
  dataWindow: 'panelDataWindow',
  news: 'panelNews',
  screener: 'panelScreener',
  calendar: 'panelCalendar',
  notifications: 'panelNotifications',
  help: 'panelHelp',
};

export function IconBar() {
  const activePanel = useSidePanelStore((s) => s.activePanel);
  const togglePanel = useSidePanelStore((s) => s.togglePanel);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const tx = useTranslation();
  const hasUnread = useNotificationStore((s) => s.notifications.some((n) => !n.read));

  return (
    <div
      className={`flex flex-col w-10 h-full ${
        isDark ? 'bg-gray-950 border-l border-gray-800' : 'bg-white border-l border-gray-200'
      }`}
    >
      {icons.map(({ id, path }) => {
        const isActive = activePanel === id;
        const label = tx[panelTranslationKey[id] as keyof typeof tx] as string;

        let btnClass = 'w-10 h-10 flex items-center justify-center transition-colors';
        if (isActive) {
          btnClass += ' bg-blue-500/20 text-blue-400';
        } else if (isDark) {
          btnClass += ' text-gray-400 hover:bg-gray-800 hover:text-gray-200';
        } else {
          btnClass += ' text-gray-500 hover:bg-gray-100 hover:text-gray-700';
        }

        return (
          <button
            key={id}
            className={`${btnClass} relative`}
            title={label}
            onClick={() => togglePanel(id)}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={path} />
            </svg>
            {id === 'notifications' && hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
