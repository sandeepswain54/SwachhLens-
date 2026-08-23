import { supabase } from './supabase';

export type AdminNotificationType = 'new_report' | 'submitted_for_review' | 'feedback';

export type AdminNotificationRow = {
  id: string;
  type: AdminNotificationType;
  report_id: string | null;
  assignment_id: string | null;
  team_id: string | null;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

const ADMIN_NOTIFICATION_COLUMNS =
  'id, type, report_id, assignment_id, team_id, title, body, is_read, created_at';

// Shared admin/ops feed — see admin_panel/supabase/009_admin_notifications.sql
// for the triggers that populate this from new complaints, field-team review
// submissions, and citizen feedback.
export async function getAllAdminNotifications(): Promise<AdminNotificationRow[]> {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select(ADMIN_NOTIFICATION_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminNotificationRow[];
}

export async function markAdminNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('admin_notifications').update({ is_read: true }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function markAllAdminNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ is_read: true })
    .eq('is_read', false);
  if (error) throw new Error(error.message);
}

export function subscribeToAdminNotificationChanges(handlers: {
  onInsert: (row: AdminNotificationRow) => void;
  onUpdate: (row: AdminNotificationRow) => void;
}) {
  const channel = supabase
    .channel('admin-notification-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
      (payload) => handlers.onInsert(payload.new as AdminNotificationRow)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'admin_notifications' },
      (payload) => handlers.onUpdate(payload.new as AdminNotificationRow)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
