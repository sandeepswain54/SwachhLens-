import type { ReportRow, ReportStatus } from './reports';

// A report's status as the Complaints page displays it: escalation is a flag
// layered on top of the normal submitted -> team_assigned -> in_progress ->
// resolved lifecycle (see 003_complaints_page.sql), not a lifecycle state of
// its own, so it takes over the badge/tab except once a report is resolved
// (a resolved complaint stops being "urgent" regardless of the flag).
export type ComplaintStatus = ReportStatus | 'escalated';

export function complaintStatus(report: ReportRow): ComplaintStatus {
  return report.escalated && report.status !== 'resolved' ? 'escalated' : report.status;
}

export const COMPLAINT_STATUS_LABEL: Record<ComplaintStatus, string> = {
  submitted: 'New',
  team_assigned: 'Pending',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  escalated: 'Escalated',
};

export type ComplaintTab = 'all' | ComplaintStatus | 'duplicates';

export function duplicateFlagged(report: ReportRow): boolean {
  const dup = report.analysis?.duplicate;
  return dup?.status === 'yes' || dup?.status === 'possible';
}

// Best-effort "locality" grouping out of a free-text reverse-geocoded address
// (see lib/geocoding.ts — Nominatim's `display_name`, finest-to-coarsest:
// "Road, Suburb, City, District, State, Postcode, Country"). Reports have no
// dedicated zone/area column, so this is a heuristic for the Location filter
// dropdown, not an authoritative field.
export function deriveLocality(address: string): string {
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return address;
  if (parts.length === 1) return parts[0];

  // Walk from the coarsest end inward, skipping postcodes and (when there's
  // enough segments to spare) the trailing country name.
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    if (/^\d+$/.test(parts[i])) continue;
    if (i === parts.length - 1 && parts.length > 3) continue;
    return parts[i];
  }
  return parts[0];
}

export function buildLocalityOptions(reports: ReportRow[]): string[] {
  const set = new Set(reports.map((r) => deriveLocality(r.address)));
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function buildCategoryOptions(reports: ReportRow[]): string[] {
  const set = new Set(reports.map((r) => r.category));
  return [...set].sort((a, b) => a.localeCompare(b));
}
