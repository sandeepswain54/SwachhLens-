import type { ReportAnalysis } from './analysis';
import { supabase } from './supabase';

export type ReportStatus = 'submitted' | 'team_assigned' | 'in_progress' | 'resolved';
export type SeverityLabel = 'Low' | 'Medium' | 'High' | 'Critical';

export const STATUS_LABEL: Record<ReportStatus, string> = {
  submitted: 'New',
  team_assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

// Fixed display order for the category donut — deliberately NOT re-sorted by
// live count. Resorting slices as counts change would make the donut jitter
// in realtime, and it's what keeps the assigned colors validated for CVD
// adjacency (see admin_panel/DASHBOARD.md).
export const CATEGORY_ORDER = [
  'Garbage Dump',
  'Overflowing Bin',
  'Plastic Waste',
  'Construction Debris',
  'Drain Blockage',
] as const;

export const SEVERITY_ORDER: SeverityLabel[] = ['Critical', 'High', 'Medium', 'Low'];

export type ReportRow = {
  id: string;
  report_code: string;
  media_url: string;
  media_type: 'image' | 'video';
  latitude: number;
  longitude: number;
  address: string;
  comments: string | null;
  category: string;
  category_confidence: number | null;
  severity_label: SeverityLabel;
  severity_score: number;
  urgency_label: string;
  status: ReportStatus;
  analysis: ReportAnalysis | null;
  created_at: string;
  resolved_at: string | null;
  user_id: string;
  // Added by 003_complaints_page.sql for the Complaints page's Escalate
  // action / Escalated tab & badge — there was no escalation concept before.
  escalated: boolean;
  escalated_at: string | null;
  escalated_by: string | null;
};

const REPORT_COLUMNS =
  'id, report_code, media_url, media_type, latitude, longitude, address, comments, category, category_confidence, severity_label, severity_score, urgency_label, status, analysis, created_at, resolved_at, user_id, escalated, escalated_at, escalated_by';

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

// Full date/time for the Complaint Details panel, where "Reported At" needs
// to read as an absolute timestamp rather than the relative time used in
// tables (formatRelativeTime above).
export function formatAbsoluteDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Same as formatAbsoluteDateTime but without the year — for feeds like
// Reports & Insights' "Recent Insights" list, where every item is recent
// enough that the year would just be noise.
export function formatShortDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Pulls everything the dashboard needs. Reports come in steadily rather than
// in bulk, so a single bounded fetch (most recent 2000) comfortably covers
// the dashboard's trend window and tables without pagination.
export async function getAllReports(): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) throw new Error(error.message);
  return (data ?? []) as ReportRow[];
}

// Fires on every new report (INSERT) and every status change (UPDATE), which
// is exactly what a live citizen submission or a team updating status looks
// like at the database level.
export function subscribeToReportChanges(handlers: {
  onInsert: (row: ReportRow) => void;
  onUpdate: (row: ReportRow) => void;
}) {
  const channel = supabase
    .channel('admin-reports-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reports' },
      (payload) => handlers.onInsert(payload.new as ReportRow)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'reports' },
      (payload) => handlers.onUpdate(payload.new as ReportRow)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Both call the SECURITY DEFINER functions from 003_complaints_page.sql
// rather than updating `reports` directly — there's no general "authenticated
// users can update reports" policy (see that migration's comments), so an RPC
// call is the only way the Complaints page can escalate or resolve a report.
export async function setReportEscalated(reportId: string, escalated: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_report_escalated', {
    p_report_id: reportId,
    p_escalated: escalated,
  });
  if (error) throw new Error(error.message);
}

export async function markReportResolved(reportId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_report_resolved', { p_report_id: reportId });
  if (error) throw new Error(error.message);
}
