import { ClipboardCheck, FilePlus2, Star, type LucideIcon } from 'lucide-react';

import type { AdminNotificationRow, AdminNotificationType } from './admin-notifications';

export const NOTIFICATION_TYPE_META: Record<
  AdminNotificationType,
  { label: string; icon: LucideIcon; bg: string; fg: string }
> = {
  new_report: { label: 'New Report', icon: FilePlus2, bg: 'bg-blue-50 dark:bg-blue-500/10', fg: 'text-blue-500' },
  submitted_for_review: {
    label: 'Submitted for Review',
    icon: ClipboardCheck,
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    fg: 'text-violet-500',
  },
  feedback: { label: 'Citizen Feedback', icon: Star, bg: 'bg-amber-50 dark:bg-amber-500/10', fg: 'text-amber-500' },
};

// Where clicking a notification should take the admin. New reports and
// citizen feedback are best acted on from the specific complaint (Complaints
// already knows how to open one via ?id=); a submitted-for-review
// notification is best acted on from Teams & Assignments' "Pending Review"
// tab and its Review button — Complaints has no approve/request-changes
// action — so that one goes to the team instead (selecting it via ?id=, same
// deep-link mechanism, when we know which team submitted it).
export function notificationLinkPath(notification: AdminNotificationRow): string | null {
  if (notification.type === 'submitted_for_review') {
    return notification.team_id ? `/teams?id=${notification.team_id}` : '/teams';
  }
  return notification.report_id ? `/complaints?id=${notification.report_id}` : null;
}
