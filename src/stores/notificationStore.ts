import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: 'alert' | 'system' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  dismissOne: (id: string) => void;
  unreadCount: () => number;
}

const MAX_NOTIFICATIONS = 100;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (n) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newNotification: AppNotification = {
      ...n,
      id,
      timestamp: Date.now(),
      read: false,
    };
    set((state) => {
      const updated = [newNotification, ...state.notifications];
      if (updated.length > MAX_NOTIFICATIONS) {
        return { notifications: updated.slice(0, MAX_NOTIFICATIONS) };
      }
      return { notifications: updated };
    });
  },

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  clearAll: () => set({ notifications: [] }),

  dismissOne: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
