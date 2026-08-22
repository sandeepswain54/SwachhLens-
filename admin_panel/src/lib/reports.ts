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
  analysis: unknown;
  created_at: string;
  resolved_at: string | null;
  user_id: string;
};

const REPORT_COLUMNS =
  'id, report_code, media_url, media_type, latitude, longitude, address, comments, category, category_confidence, severity_label, severity_score, urgency_label, status, created_at, resolved_at, user_id';

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
