import { useState, useEffect } from 'react';
import { useNotificationStore, type AppNotification } from '../../../stores/notificationStore';
import { useThemeStore } from '../../../stores/themeStore';
import { useTranslation } from '../../../i18n';

type TabFilter = 'all' | 'alert' | 'system';

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotificationIcon({ type, isDark }: { type: AppNotification['type']; isDark: boolean }) {
  const colorClass = isDark ? 'text-gray-400' : 'text-gray-500';
  if (type === 'alert') {
    return (
      <svg className={`w-4 h-4 flex-shrink-0 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
      </svg>
    );
  }
  if (type === 'system') {
    return (
      <svg className={`w-4 h-4 flex-shrink-0 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    );
  }
  // info
  return (
    <svg className={`w-4 h-4 flex-shrink-0 ${colorClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4m0-4h.01" />
    </svg>
  );
}

function NotificationItem({
  notification,
  isDark,
  onDismiss,
  onMarkRead,
}: {
  notification: AppNotification;
  isDark: boolean;
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
}) {
  // Auto mark as read after 2 seconds
  useEffect(() => {
    if (notification.read) return;
    const timer = setTimeout(() => {
      onMarkRead(notification.id);
    }, 2000);
    return () => clearTimeout(timer);
  }, [notification.id, notification.read, onMarkRead]);

  const unreadBg = !notification.read
    ? isDark
      ? 'bg-blue-500/5'
      : 'bg-blue-50/50'
    : '';

  return (
    <div
      className={`group flex items-start gap-2 px-3 py-2 text-xs border-b transition-colors ${
        isDark ? 'border-gray-800/50' : 'border-gray-100'
      } ${unreadBg}`}
    >
      <div className="mt-0.5">
        <NotificationIcon type={notification.type} isDark={isDark} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          {notification.title}
        </div>
        <div className={`mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {notification.message}
        </div>
        <div className={`mt-1 text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          {relativeTime(notification.timestamp)}
        </div>
      </div>
      <button
        onClick={() => onDismiss(notification.id)}
        className={`flex-shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
          isDark
            ? 'text-gray-600 hover:text-red-400 hover:bg-gray-800'
            : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'
        }`}
        title="Dismiss"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function NotificationsPanel() {
  const [tab, setTab] = useState<TabFilter>('all');
  const notifications = useNotificationStore((s) => s.notifications);
  const dismissOne = useNotificationStore((s) => s.dismissOne);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const tx = useTranslation();

  const filtered = tab === 'all'
    ? notifications
    : notifications.filter((n) => n.type === tab);

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: tx.allNotifications },
    { key: 'alert', label: tx.alertNotifications },
    { key: 'system', label: tx.systemNotifications },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className={`flex border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
              tab === key
                ? isDark
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : isDark
                ? 'text-gray-400 hover:text-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sub-header with actions */}
      {notifications.length > 0 && (
        <div className={`flex items-center justify-end gap-2 px-3 py-1.5 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <button
            onClick={markAllRead}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            Mark all read
          </button>
          <button
            onClick={clearAll}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-red-400 hover:bg-gray-800'
                : 'text-gray-500 hover:text-red-500 hover:bg-gray-100'
            }`}
          >
            {tx.clearAll}
          </button>
        </div>
      )}

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <svg
              className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-700' : 'text-gray-300'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
              />
            </svg>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {tx.noNotifications}
            </p>
          </div>
        ) : (
          filtered.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              isDark={isDark}
              onDismiss={dismissOne}
              onMarkRead={markRead}
            />
          ))
        )}
      </div>
    </div>
  );
}
