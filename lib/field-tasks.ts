import { supabase, uniqueChannel } from '@/lib/supabase';
import type { ReportRow } from '@/lib/reports';

// pending -> on_the_way -> in_progress -> pending_review -> completed.
// on_the_way = field team tapped "Start Task", travelling to the site (live
// map). pending_review = evidence photos submitted, awaiting admin approval
// (see admin_panel/supabase/007_task_review_feedback.sql).
export type FieldTaskStatus = 'pending' | 'on_the_way' | 'in_progress' | 'pending_review' | 'completed';

export const FIELD_TASK_STATUS_LABEL: Record<FieldTaskStatus, string> = {
  pending: 'New',
  on_the_way: 'On the Way',
  in_progress: 'In Progress',
  pending_review: 'Pending Review',
  completed: 'Completed',
};

export const FIELD_TASK_STATUS_BADGE: Record<FieldTaskStatus, { bg: string; text: string }> = {
  pending: { bg: '#e3f3ea', text: '#1B6B3A' },
  on_the_way: { bg: '#e6eefd', text: '#2563eb' },
  in_progress: { bg: '#fdecd2', text: '#b9770e' },
  pending_review: { bg: '#ede6fb', text: '#7c3aed' },
  completed: { bg: '#e3f3ea', text: '#1B6B3A' },
};

export type FieldTaskRoute = '/field-task-detail' | '/field-task-on-the-way' | '/field-task-progress';

// Where tapping a task from Home (or reopening Task Details) should land,
// based on its current status — lets both screens share one "resume where
// you left off" rule instead of each hardcoding the flow order.
export function routeForTaskStatus(status: FieldTaskStatus): FieldTaskRoute {
  switch (status) {
    case 'on_the_way':
      return '/field-task-on-the-way';
    case 'in_progress':
      return '/field-task-progress';
    case 'pending_review':
    case 'completed':
    case 'pending':
    default:
      return '/field-task-detail';
  }
}

export type FieldTask = {
  id: string;
  assignment_code: string;
  status: FieldTaskStatus;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  submitted_for_review_at: string | null;
  progress_photos: string[];
  progress_notes: string | null;
  review_note: string | null;
  created_at: string;
  report: ReportRow;
};

const ASSIGNMENT_COLUMNS =
  'id, assignment_code, status, assigned_at, started_at, completed_at, submitted_for_review_at, progress_photos, progress_notes, review_note, created_at, report_id';

const REPORT_COLUMNS =
  'id, report_code, media_url, media_type, latitude, longitude, address, comments, category, category_confidence, severity_label, severity_score, urgency_label, status, analysis, created_at';

// Every task this team has ever been given, newest first — fetched as two
// queries and joined client-side (assignments -> reports), matching the
// pattern the admin panel already uses (see ActiveAssignmentsTable) rather
// than an embedded PostgREST select.
export async function getMyTasks(teamId: string): Promise<FieldTask[]> {
  const { data: assignmentRows, error: assignmentError } = await supabase
    .from('assignments')
    .select(ASSIGNMENT_COLUMNS)
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

export async function getTaskById(assignmentId: string): Promise<FieldTask | null> {
  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .select(ASSIGNMENT_COLUMNS)
    .eq('id', assignmentId)
    .maybeSingle();

  if (assignmentError || !assignment) return null;

  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select(REPORT_COLUMNS)
    .eq('id', assignment.report_id)
    .maybeSingle();

  if (reportError || !report) return null;

  return { ...assignment, report: report as ReportRow };
}

// Fires on any insert/update to this team's assignments (a brand new task,
// or a status change made from the admin panel) — the caller just refetches
// getMyTasks(), which is simple and cheap enough for a single team's task
// list.
export function subscribeToMyTasks(teamId: string, onChange: () => void) {
  const channel = supabase
    .channel(uniqueChannel(`field-tasks-${teamId}`))
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

// Fires on any update to one specific assignment — used by the task-detail
// screens so an admin approving/rejecting a review (or the team's own next
// step) reflects live without polling.
export function subscribeToTask(assignmentId: string, onUpdate: () => void) {
  const channel = supabase
    .channel(uniqueChannel(`field-task-${assignmentId}`))
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'assignments', filter: `id=eq.${assignmentId}` },
      onUpdate
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Task Details screen's "Start Task" — begins the live "On the Way" map.
export async function startOnTheWay(assignmentId: string): Promise<void> {
  const { error } = await supabase.from('assignments').update({ status: 'on_the_way' }).eq('id', assignmentId);
  if (error) throw new Error(error.message);
}

// "On the Way" screen's "I Have Reached" — moves into Work in Progress.
export async function arriveAtTask(assignmentId: string): Promise<void> {
  const { error } = await supabase.from('assignments').update({ status: 'in_progress' }).eq('id', assignmentId);
  if (error) throw new Error(error.message);
}

// Work in Progress screen's "Submit for Review" — photos must already be
// uploaded to Storage (see lib/field-media.ts's uploadProgressPhotos); this
// just records the resulting URLs and flips status to pending_review, which
// puts it in front of the admin's new Pending Review queue.
export async function submitTaskForReview(
  assignmentId: string,
  params: { photoUrls: string[]; notes: string }
): Promise<void> {
  const { error } = await supabase
    .from('assignments')
    .update({
      status: 'pending_review',
      progress_photos: params.photoUrls,
      progress_notes: params.notes.trim() || null,
    })
    .eq('id', assignmentId);
  if (error) throw new Error(error.message);
}

// Work in Progress screen's "Cancel Task" — hands the task back to "not yet
// started" rather than unassigning the team, so they can pick it up again.
export async function cancelTask(assignmentId: string): Promise<void> {
  const { error } = await supabase.from('assignments').update({ status: 'pending' }).eq('id', assignmentId);
  if (error) throw new Error(error.message);
}
