import { supabase, uniqueChannel } from '@/lib/supabase';

export type SubmitFeedbackParams = {
  reportId: string;
  assignmentId: string | null;
  teamId: string | null;
  rating: number;
  comment: string;
};

// Inserting triggers notify_team_on_feedback() (see
// admin_panel/supabase/007_task_review_feedback.sql), which puts a "New
// review" row in the field team's notifications bell, and the row itself is
// immediately visible on the admin Feedback page via realtime.
export async function submitFeedback(params: SubmitFeedbackParams): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You need to be signed in to leave a review.');

  const { error } = await supabase.from('feedback').insert({
    report_id: params.reportId,
    assignment_id: params.assignmentId,
    team_id: params.teamId,
    user_id: user.id,
    rating: params.rating,
    comment: params.comment.trim() || null,
  });
  if (error) throw new Error(error.message);
}

// Lets report-status.tsx hide the "Rate this cleanup" prompt once already
// submitted (the feedback_report_id_key unique index enforces one per
// report server-side; this is just for the UI to know up front).
export async function getMyFeedbackForReport(reportId: string): Promise<boolean> {
  const { data } = await supabase.from('feedback').select('id').eq('report_id', reportId).maybeSingle();
  return !!data;
}

// Which assignment/team a report's feedback should be attributed to, so the
// team gets the "New review" notification and the admin Feedback page can
// show which team it was for.
export async function getAssignmentRefForReport(
  reportId: string
): Promise<{ assignmentId: string; teamId: string | null } | null> {
  const { data } = await supabase.from('assignments').select('id, team_id').eq('report_id', reportId).maybeSingle();
  if (!data) return null;
  return { assignmentId: data.id, teamId: data.team_id };
}

export type TeamRatingStats = { average: number | null; count: number };

// Powers the field app's Profile screen "Rating" tile — a real average over
// every citizen review this team has received, not a placeholder.
export async function getTeamRatingStats(teamId: string): Promise<TeamRatingStats> {
  const { data, error } = await supabase.from('feedback').select('rating').eq('team_id', teamId);
  if (error || !data || data.length === 0) return { average: null, count: 0 };
  const average = data.reduce((sum, row) => sum + row.rating, 0) / data.length;
  return { average, count: data.length };
}

// Fires the moment a citizen leaves a new review for this team, so the
// Profile screen's Rating tile updates live without a refresh.
export function subscribeToTeamFeedback(teamId: string, onInsert: () => void) {
  const channel = supabase
    .channel(uniqueChannel(`team-feedback-${teamId}`))
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'feedback', filter: `team_id=eq.${teamId}` },
      onInsert
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
