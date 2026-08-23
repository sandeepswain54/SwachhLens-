import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  getAllAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  subscribeToAdminNotificationChanges,
  type AdminNotificationRow,
} from '@/lib/admin-notifications';

// Wraps AppLayout (see App.tsx) alongside Reports/Teams/Vehicles — the bell
// icon in Topbar and the Sidebar's "Notifications" row both need the unread
// count on every page, not just the /notifications page itself.
type NotificationsContextValue = {
  notifications: AdminNotificationRow[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  connected: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AdminNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getAllAdminNotifications()
      .then((rows) => {
        if (cancelled) return;
        setNotifications(rows);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    const unsubscribe = subscribeToAdminNotificationChanges({
      onInsert: (row) => {
        setNotifications((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev]));
      },
      onUpdate: (row) => {
        setNotifications((prev) => prev.map((n) => (n.id === row.id ? row : n)));
      },
    });
    setConnected(true);

    return () => {
      cancelled = true;
      setConnected(false);
      unsubscribe();
    };
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    markAdminNotificationRead(id).catch(() => {
      // Realtime UPDATE echo will reconcile on next fetch; nothing else to
      // do client-side if this silently fails.
    });
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    markAllAdminNotificationsRead().catch(() => {});
  }

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, loading, error, connected, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
