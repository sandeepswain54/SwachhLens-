import { supabase, uniqueChannel } from '@/lib/supabase';

export type CitizenNotification = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  report_id: string | null;
};

const NOTIFICATION_COLUMNS = 'id, title, body, is_read, created_at, report_id';

export async function getMyNotifications(userId: string): Promise<CitizenNotification[]> {
  const { data, error } = await supabase
    .from('citizen_notifications')
    .select(NOTIFICATION_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as CitizenNotification[];
}

// Fires the moment one of this citizen's reports is marked resolved — see
// the trg_notify_citizen_on_report_resolved trigger in
// admin_panel/supabase/008_citizen_notifications.sql.
export function subscribeToMyNotifications(
  userId: string,
  onInsert: (row: CitizenNotification) => void
) {
  const channel = supabase
    .channel(uniqueChannel(`citizen-notifications-${userId}`))
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'citizen_notifications', filter: `user_id=eq.${userId}` },
      (payload) => onInsert(payload.new as CitizenNotification)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('citizen_notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('citizen_notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw new Error(error.message);
}
