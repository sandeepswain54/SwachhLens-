import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useNotifications } from '@/contexts/NotificationsContext';
import { NOTIFICATION_TYPE_META, notificationLinkPath } from '@/lib/admin-notification-display';
import { formatRelativeTime } from '@/lib/reports';

export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const recent = notifications.slice(0, 6);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-96 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#161f1a]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-white/10">
            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:text-brand-700">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {recent.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-slate-400">You're all caught up.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {recent.map((n) => {
                const meta = NOTIFICATION_TYPE_META[n.type];
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      markRead(n.id);
                      setOpen(false);
                      const path = notificationLinkPath(n);
                      if (path) navigate(path);
                    }}
                    className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5 ${
                      n.is_read ? '' : 'bg-brand-50/40 dark:bg-brand-500/5'
                    }`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.bg}`}>
                      <Icon size={15} className={meta.fg} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
                          {n.title}
                        </span>
                        {!n.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
                      </span>
                      <span className="line-clamp-2 block text-[12px] text-slate-400">{n.body}</span>
                      <span className="text-[11px] text-slate-400">{formatRelativeTime(n.created_at)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
            className="block w-full border-t border-slate-100 px-4 py-2.5 text-center text-[12.5px] font-medium text-brand-600 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
