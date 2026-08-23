import { Bell, CheckCheck, ClipboardCheck, FilePlus2, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card } from '@/components/dashboard/Card';
import { StatCard } from '@/components/dashboard/StatCard';
import { Topbar } from '@/components/layout/Topbar';
import { useNotifications } from '@/contexts/NotificationsContext';
import { NOTIFICATION_TYPE_META, notificationLinkPath } from '@/lib/admin-notification-display';
import type { AdminNotificationType } from '@/lib/admin-notifications';
import { formatRelativeTime } from '@/lib/reports';

type Filter = 'all' | 'unread' | AdminNotificationType;

const FILTERS: Array<{ label: string; value: Filter }> = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'New Reports', value: 'new_report' },
  { label: 'Submitted for Review', value: 'submitted_for_review' },
  { label: 'Citizen Feedback', value: 'feedback' },
];

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, error, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(
    () => ({
      total: notifications.length,
      unread: unreadCount,
      new_report: notifications.filter((n) => n.type === 'new_report').length,
      submitted_for_review: notifications.filter((n) => n.type === 'submitted_for_review').length,
      feedback: notifications.filter((n) => n.type === 'feedback').length,
    }),
    [notifications, unreadCount]
  );

  const visible = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n) => !n.is_read);
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  return (
    <div className="flex min-h-full flex-col">
      <Topbar
        title="Notifications"
        breadcrumb={['Dashboard', 'Notifications']}
        action={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
              <CheckCheck size={15} /> Mark all read
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 space-y-4 p-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            Couldn't load notifications: {error}.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Notifications"
            value={counts.total}
            icon={Bell}
            iconBg="#eaf6ef"
            iconColor="#1B6B3A"
            deltaCaption="all time"
          />
          <StatCard
            label="Unread"
            value={counts.unread}
            icon={Bell}
            iconBg="#fde8e8"
            iconColor="#dc2626"
            deltaCaption="needs attention"
          />
          <StatCard
            label="New Reports"
            value={counts.new_report}
            icon={FilePlus2}
            iconBg="#e8f0fe"
            iconColor="#2563eb"
            deltaCaption="citizen complaints"
          />
          <StatCard
            label="Submitted for Review"
            value={counts.submitted_for_review}
            icon={ClipboardCheck}
            iconBg="#f1ecfd"
            iconColor="#7c3aed"
            deltaCaption="field team work"
          />
          <StatCard
            label="Citizen Feedback"
            value={counts.feedback}
            icon={Star}
            iconBg="#fef3e2"
            iconColor="#d97706"
            deltaCaption="new reviews"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                filter === f.value
                  ? 'bg-brand-500 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        <Card title="All Notifications">
          {visible.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-slate-400">
              {notifications.length === 0 ? 'No notifications yet.' : 'Nothing matches this filter.'}
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
              {visible.map((n) => {
                const meta = NOTIFICATION_TYPE_META[n.type];
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      markRead(n.id);
                      const path = notificationLinkPath(n);
                      if (path) navigate(path);
                    }}
                    className={`flex w-full items-start gap-3.5 px-2 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 ${
                      n.is_read ? '' : 'bg-brand-50/40 dark:bg-brand-500/5'
                    }`}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.bg}`}>
                      <Icon size={17} className={meta.fg} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                          {n.title}
                        </span>
                        {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                        <span className="ml-auto shrink-0 text-[11.5px] text-slate-400">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[13px] text-slate-500 dark:text-slate-400">{n.body}</span>
                      <span className="mt-1 inline-block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        {meta.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {loading && <p className="text-center text-[12px] text-slate-400">Loading notifications…</p>}
      </div>
    </div>
  );
}
