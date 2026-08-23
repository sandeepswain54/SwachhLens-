import { CATEGORY_ORDER, SEVERITY_ORDER, type ReportRow, type SeverityLabel } from './reports';

export type StatusCounts = {
  total: number;
  active: number;
  resolved: number;
  inProgress: number;
  critical: number;
};

export function computeStatusCounts(reports: ReportRow[]): StatusCounts {
  let resolved = 0;
  let inProgress = 0;
  let critical = 0;

  for (const r of reports) {
    if (r.status === 'resolved') resolved += 1;
    if (r.status === 'in_progress') inProgress += 1;
    if (r.severity_label === 'Critical' || r.severity_label === 'High') critical += 1;
  }

  return {
    total: reports.length,
    active: reports.length - resolved,
    resolved,
    inProgress,
    critical,
  };
}

export type CategorySlice = { name: string; count: number; percent: number };

export function computeCategoryBreakdown(reports: ReportRow[]): CategorySlice[] {
  const total = reports.length;
  const counts = new Map<string, number>();
  for (const r of reports) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);

  const known = CATEGORY_ORDER.map((name) => ({ name, count: counts.get(name) ?? 0 }));
  const otherCount = [...counts.entries()]
    .filter(([name]) => !(CATEGORY_ORDER as readonly string[]).includes(name))
    .reduce((sum, [, count]) => sum + count, 0);

  return [...known, { name: 'Others', count: otherCount }].map((slice) => ({
    ...slice,
    percent: total > 0 ? (slice.count / total) * 100 : 0,
  }));
}

export type SeveritySlice = { label: SeverityLabel; count: number; percent: number };

export function computeSeverityBreakdown(reports: ReportRow[]): SeveritySlice[] {
  const total = reports.length;
  const counts = new Map<SeverityLabel, number>();
  for (const r of reports) counts.set(r.severity_label, (counts.get(r.severity_label) ?? 0) + 1);

  return SEVERITY_ORDER.map((label) => {
    const count = counts.get(label) ?? 0;
    return { label, count, percent: total > 0 ? (count / total) * 100 : 0 };
  });
}

export type TrendPoint = { date: string; label: string; total: number; resolved: number; active: number };

// Cumulative counts as-of each of the last `days` days — this is what makes
// "Total" and "Resolved" trend upward together while "Active" is the gap
// between them, matching a running operations view rather than a per-day
// tally.
export function computeTrend(reports: ReportRow[], days = 7): TrendPoint[] {
  const points: TrendPoint[] = [];
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  for (let i = days - 1; i >= 0; i -= 1) {
    const dayEnd = new Date(now);
    dayEnd.setDate(dayEnd.getDate() - i);

    let total = 0;
    let resolved = 0;
    for (const r of reports) {
      if (new Date(r.created_at).getTime() > dayEnd.getTime()) continue;
      total += 1;
      if (r.resolved_at && new Date(r.resolved_at).getTime() <= dayEnd.getTime()) resolved += 1;
      else if (!r.resolved_at && r.status === 'resolved') resolved += 1;
    }

    const dayStart = new Date(dayEnd);
    dayStart.setHours(0, 0, 0, 0);

    points.push({
      date: dayStart.toISOString(),
      label: dayStart.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
      total,
      resolved,
      active: total - resolved,
    });
  }

  return points;
}

// Same cumulative-total logic as computeTrend, but walks an explicit
// [start, end] window instead of "the last N days from now" so it can back
// the Dashboard's date-range picker. Capped at 60 points so a multi-year
// custom range doesn't render an unreadable chart.
export function computeTrendRange(reports: ReportRow[], start: Date, end: Date): TrendPoint[] {
  const rangeStart = new Date(start);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(end);
  rangeEnd.setHours(23, 59, 59, 999);

  const totalDays = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const days = Math.min(Math.max(totalDays, 1), 60);

  const points: TrendPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const dayEnd = new Date(rangeStart);
    dayEnd.setDate(dayEnd.getDate() + i);
    dayEnd.setHours(23, 59, 59, 999);

    let total = 0;
    let resolved = 0;
    for (const r of reports) {
      if (new Date(r.created_at).getTime() > dayEnd.getTime()) continue;
      total += 1;
      if (r.resolved_at && new Date(r.resolved_at).getTime() <= dayEnd.getTime()) resolved += 1;
      else if (!r.resolved_at && r.status === 'resolved') resolved += 1;
    }

    const dayStart = new Date(dayEnd);
    dayStart.setHours(0, 0, 0, 0);

    points.push({
      date: dayStart.toISOString(),
      label: dayStart.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
      total,
      resolved,
      active: total - resolved,
    });
  }

  return points;
}

export function computeAvgResolutionDays(reports: ReportRow[]): number | null {
  const durations = reports
    .filter((r) => r.resolved_at)
    .map((r) => new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime())
    .filter((ms) => ms >= 0);

  if (durations.length === 0) return null;
  const avgMs = durations.reduce((sum, ms) => sum + ms, 0) / durations.length;
  return avgMs / (1000 * 60 * 60 * 24);
}

// Reconstructs status counts "as of" a cutoff date from immutable facts only
// (created_at, resolved_at, severity_label never change after submission),
// so week-over-week deltas are real history, not a guess.
function snapshotAt(reports: ReportRow[], cutoff: Date) {
  const cutoffMs = cutoff.getTime();
  const existing = reports.filter((r) => new Date(r.created_at).getTime() <= cutoffMs);
  const resolvedByCutoff = existing.filter(
    (r) => r.resolved_at && new Date(r.resolved_at).getTime() <= cutoffMs
  ).length;
  const criticalByCutoff = existing.filter(
    (r) => r.severity_label === 'Critical' || r.severity_label === 'High'
  ).length;

  return {
    total: existing.length,
    resolved: resolvedByCutoff,
    active: existing.length - resolvedByCutoff,
    critical: criticalByCutoff,
  };
}

export type WeekDelta = { value: number; deltaPercent: number | null };

function delta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? null : 100;
  return ((curr - prev) / prev) * 100;
}

export function computeWeekOverWeek(reports: ReportRow[]): Record<
  'total' | 'active' | 'resolved' | 'critical',
  WeekDelta
> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const current = snapshotAt(reports, now);
  const previous = snapshotAt(reports, weekAgo);

  return {
    total: { value: current.total, deltaPercent: delta(current.total, previous.total) },
    active: { value: current.active, deltaPercent: delta(current.active, previous.active) },
    resolved: { value: current.resolved, deltaPercent: delta(current.resolved, previous.resolved) },
    critical: { value: current.critical, deltaPercent: delta(current.critical, previous.critical) },
  };
}

// Generalizes computeWeekOverWeek to an arbitrary [start, end] window,
// comparing it against the immediately preceding window of the same length —
// this is what lets the Dashboard's stat card deltas track whatever range the
// date picker has selected, not just a fixed trailing week.
export function computeRangeDelta(
  reports: ReportRow[],
  start: Date,
  end: Date
): Record<'total' | 'active' | 'resolved' | 'critical', WeekDelta> {
  const spanMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - spanMs);

  const inRange = (r: ReportRow, from: Date, to: Date) => {
    const t = new Date(r.created_at).getTime();
    return t >= from.getTime() && t <= to.getTime();
  };

  const current = computeStatusCounts(reports.filter((r) => inRange(r, start, end)));
  const previous = computeStatusCounts(reports.filter((r) => inRange(r, prevStart, prevEnd)));

  return {
    total: { value: current.total, deltaPercent: delta(current.total, previous.total) },
    active: { value: current.active, deltaPercent: delta(current.active, previous.active) },
    resolved: { value: current.resolved, deltaPercent: delta(current.resolved, previous.resolved) },
    critical: { value: current.critical, deltaPercent: delta(current.critical, previous.critical) },
  };
}

export type AlertItem = {
  id: string;
  tone: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  subtitle: string;
  at: string;
};

export function computeRecentAlerts(reports: ReportRow[], limit = 5): AlertItem[] {
  const items: AlertItem[] = [];

  for (const r of reports.slice(0, 60)) {
    if (r.status === 'resolved' && r.resolved_at) {
      items.push({
        id: `resolved-${r.id}`,
        tone: 'success',
        title: `Complaint ${r.report_code} resolved`,
        subtitle: r.category,
        at: r.resolved_at,
      });
    } else if (r.severity_label === 'Critical' || r.severity_label === 'High') {
      items.push({
        id: `alert-${r.id}`,
        tone: r.severity_label === 'Critical' ? 'critical' : 'warning',
        title: `${r.severity_label} priority ${r.category.toLowerCase()}`,
        subtitle: r.address,
        at: r.created_at,
      });
    }
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}
