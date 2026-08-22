import { supabase } from '@/lib/supabase';
import type { ReportRow } from '@/lib/reports';

export type FieldTaskStatus = 'pending' | 'in_progress' | 'completed';

export type FieldTask = {
  id: string;
  assignment_code: string;
  status: FieldTaskStatus;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  report: ReportRow;
};

const REPORT_COLUMNS =
  'id, report_code, media_url, media_type, latitude, longitude, address, comments, category, category_confidence, severity_label, severity_score, urgency_label, status, analysis, created_at';

// Every task this team has ever been given, newest first — fetched as two
// queries and joined client-side (assignments -> reports), matching the
// pattern the admin panel already uses (see ActiveAssignmentsTable) rather
// than an embedded PostgREST select.
export async function getMyTasks(teamId: string): Promise<FieldTask[]> {
  const { data: assignmentRows, error: assignmentError } = await supabase
    .from('assignments')
    .select('id, assignment_code, status, assigned_at, started_at, completed_at, created_at, report_id')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (assignmentError) throw new Error(assignmentError.message);
  if (!assignmentRows || assignmentRows.length === 0) return [];

  const reportIds = assignmentRows.map((row) => row.report_id);
  const { data: reportRows, error: reportError } = await supabase
    .from('reports')
    .select(REPORT_COLUMNS)
    .in('id', reportIds);

  if (reportError) throw new Error(reportError.message);

  const reportsById = new Map((reportRows ?? []).map((row) => [row.id, row as ReportRow]));

  return assignmentRows.reduce<FieldTask[]>((tasks, row) => {
    const report = reportsById.get(row.report_id);
    if (report) tasks.push({ ...row, report });
    return tasks;
  }, []);
}

// Fires on any insert/update to this team's assignments (a brand new task,
// or a status change made from the admin panel) — the caller just refetches
// getMyTasks(), which is simple and cheap enough for a single team's task
// list.
export function subscribeToMyTasks(teamId: string, onChange: () => void) {
  const channel = supabase
    .channel(`field-tasks-${teamId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'assignments', filter: `team_id=eq.${teamId}` },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function startFieldTask(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from('assignments')
    .update({ status: 'in_progress' })
    .eq('id', assignmentId);
  if (error) throw new Error(error.message);
}

export async function completeFieldTask(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from('assignments')
    .update({ status: 'completed' })
    .eq('id', assignmentId);
  if (error) throw new Error(error.message);
}
