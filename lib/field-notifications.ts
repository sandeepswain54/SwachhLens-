import { supabase } from '@/lib/supabase';

export type FieldNotification = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  assignment_id: string | null;
  report_id: string | null;
};

const NOTIFICATION_COLUMNS = 'id, title, body, is_read, created_at, assignment_id, report_id';

export async function getMyNotifications(teamId: string): Promise<FieldNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as FieldNotification[];
}

// Fires the moment an admin assigns (or reassigns) a task to this team —
// see the trg_notify_team_on_assignment trigger in
// admin_panel/supabase/006_field_team_notifications.sql.
export function subscribeToMyNotifications(
  teamId: string,
  onInsert: (row: FieldNotification) => void
) {
  const channel = supabase
    .channel(`field-notifications-${teamId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `team_id=eq.${teamId}` },
      (payload) => onInsert(payload.new as FieldNotification)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(teamId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('team_id', teamId)
    .eq('is_read', false);
  if (error) throw new Error(error.message);
}
