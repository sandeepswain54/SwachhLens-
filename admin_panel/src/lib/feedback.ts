import { supabase } from './supabase';

export type FeedbackRow = {
  id: string;
  report_id: string;
  assignment_id: string | null;
  team_id: string | null;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

const FEEDBACK_COLUMNS = 'id, report_id, assignment_id, team_id, user_id, rating, comment, created_at';

// Citizen star-ratings, submitted from app/report-feedback.tsx once a report
// is resolved — see admin_panel/supabase/007_task_review_feedback.sql for
// the table + the trigger that also notifies the field team.
export async function getAllFeedback(): Promise<FeedbackRow[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select(FEEDBACK_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []) as FeedbackRow[];
}

export function subscribeToFeedbackChanges(onInsert: (row: FeedbackRow) => void) {
  const channel = supabase
    .channel('admin-feedback-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'feedback' },
      (payload) => onInsert(payload.new as FeedbackRow)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
