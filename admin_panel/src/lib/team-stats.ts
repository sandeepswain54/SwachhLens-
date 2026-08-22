import type { ReportRow, SeverityLabel } from './reports';
import type { AssignmentRow, AssignmentStatus, TeamRow } from './teams';

export type Priority = 'High' | 'Medium' | 'Low';

export function priorityForSeverity(severity: SeverityLabel): Priority {
  if (severity === 'Critical' || severity === 'High') return 'High';
  if (severity === 'Medium') return 'Medium';
  return 'Low';
}

// Static fallback map center per zone (a grid around Bhubaneswar) — used only
// until a team has an active assignment of its own to derive a real
// location from, or if a mobile-app location ping ever gets added.
const ZONE_CENTER: Record<string, [number, number]> = {
  'Zone-1': [20.2961, 85.8245],
  'Zone-2': [20.34, 85.79],
  'Zone-3': [20.25, 85.8],
  'Zone-4': [20.31, 85.87],
  'Zone-5': [20.27, 85.86],
  'Zone-6': [20.35, 85.86],
  'Zone-7': [20.24, 85.76],
  'Zone-8': [20.29, 85.76],
};

export function zoneCenter(zone: string): [number, number] {
  return ZONE_CENTER[zone] ?? ZONE_CENTER['Zone-1'];
}

export type WeekDelta = { value: number; deltaPercent: number | null };

function delta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? null : 100;
  return ((curr - prev) / prev) * 100;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // days since Monday
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export type TeamStatCounts = {
  totalTeams: number;
  onDuty: number;
  activeAssignments: number;
  completedThisWeek: number;
  avgResponseHrs: number | null;
};

export function computeTeamStatCounts(teams: TeamRow[], assignments: AssignmentRow[]): TeamStatCounts {
  const now = new Date();
  const weekStart = startOfWeek(now);

  const activeAssignments = assignments.filter((a) => a.status !== 'completed').length;
  const completedThisWeek = assignments.filter(
    (a) => a.status === 'completed' && a.completed_at && new Date(a.completed_at) >= weekStart
  ).length;

  return {
    totalTeams: teams.length,
    onDuty: teams.filter((t) => t.status === 'on_duty').length,
    activeAssignments,
    completedThisWeek,
    avgResponseHrs: null, // filled in by computeAvgResponseHrs once reports are joined in
  };
}

// Average time from a complaint being submitted to a team being assigned to
// it, for assignments created this week — a real "how fast do we react"
// number, not a placeholder.
export function computeAvgResponseHrs(assignments: AssignmentRow[], reports: ReportRow[]): number | null {
  const reportById = new Map(reports.map((r) => [r.id, r]));
  const now = new Date();
  const weekStart = startOfWeek(now);

  const hours = assignments
    .filter((a) => a.assigned_at && new Date(a.created_at) >= weekStart)
    .map((a) => {
      const report = reportById.get(a.report_id);
      if (!report || !a.assigned_at) return null;
      const ms = new Date(a.assigned_at).getTime() - new Date(report.created_at).getTime();
      return ms >= 0 ? ms / (1000 * 60 * 60) : null;
    })
    .filter((v): v is number => v !== null);

  if (hours.length === 0) return null;
  return hours.reduce((sum, h) => sum + h, 0) / hours.length;
}

export type TeamWeekDeltas = {
  activeAssignments: WeekDelta;
  completedThisWeek: WeekDelta;
  onDuty: WeekDelta;
};

// Reconstructs "as of a week ago" from immutable facts (created_at/
// completed_at never change after the fact) for the stat-card deltas.
export function computeTeamWeekOverWeek(teams: TeamRow[], assignments: AssignmentRow[]): TeamWeekDeltas {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 14);

  const activeNow = assignments.filter((a) => a.status !== 'completed').length;
  const activeWeekAgo = assignments.filter(
    (a) => new Date(a.created_at) <= weekAgo && !(a.completed_at && new Date(a.completed_at) <= weekAgo)
  ).length;

  const completedThisWeek = assignments.filter(
    (a) => a.status === 'completed' && a.completed_at && new Date(a.completed_at) >= weekAgo
  ).length;
  const completedPriorWeek = assignments.filter(
    (a) =>
      a.status === 'completed' &&
      a.completed_at &&
      new Date(a.completed_at) >= twoWeeksAgo &&
      new Date(a.completed_at) < weekAgo
  ).length;

  const onDutyNow = teams.filter((t) => t.status === 'on_duty').length;
  const teamsWeekAgo = teams.filter((t) => new Date(t.created_at) <= weekAgo).length;

  return {
    activeAssignments: { value: activeNow, deltaPercent: delta(activeNow, activeWeekAgo) },
    completedThisWeek: { value: completedThisWeek, deltaPercent: delta(completedThisWeek, completedPriorWeek) },
    onDuty: { value: onDutyNow, deltaPercent: delta(onDutyNow, Math.min(onDutyNow, teamsWeekAgo)) },
  };
}

export type TeamWorkload = { percent: number; deltaPercent: number | null };

// Current workload = active (non-completed) assignments right now, as a
// share of the team's configured daily_capacity.
export function computeTeamWorkload(team: TeamRow, assignments: AssignmentRow[]): TeamWorkload {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const teamAssignments = assignments.filter((a) => a.team_id === team.id);
  const activeNow = teamAssignments.filter((a) => a.status !== 'completed').length;
  const activeWeekAgo = teamAssignments.filter(
    (a) => new Date(a.created_at) <= weekAgo && !(a.completed_at && new Date(a.completed_at) <= weekAgo)
  ).length;

  const percent = Math.min(100, Math.round((activeNow / team.daily_capacity) * 100));
  const priorPercent = Math.min(100, Math.round((activeWeekAgo / team.daily_capacity) * 100));

  return { percent, deltaPercent: delta(percent, priorPercent) };
}

export type DailyWorkload = { label: string; percent: number };

// This week's Mon-Sun workload for one team: how many assignments were
// created on each day, as a share of daily_capacity.
export function computeWeeklyWorkload(team: TeamRow, assignments: AssignmentRow[]): DailyWorkload[] {
  const weekStart = startOfWeek(new Date());
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const teamAssignments = assignments.filter((a) => a.team_id === team.id);

  return labels.map((label, i) => {
    const dayStart = new Date(weekStart);
    dayStart.setDate(weekStart.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const count = teamAssignments.filter((a) => {
      const t = new Date(a.created_at).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    }).length;

    return { label, percent: Math.min(100, Math.round((count / team.daily_capacity) * 100)) };
  });
}

// Derives a team's map location from the average position of its currently
// active assignments — real, realtime-updating signal — falling back to a
// static zone center when it has none yet (no mobile-side GPS ping exists to
// track a team's device location today).
export function computeTeamLocation(
  team: TeamRow,
  assignments: AssignmentRow[],
  reports: ReportRow[]
): { center: [number, number]; source: 'assignments' | 'zone'; points: [number, number][] } {
  const reportById = new Map(reports.map((r) => [r.id, r]));
  const points: [number, number][] = assignments
    .filter((a) => a.team_id === team.id && a.status !== 'completed')
    .map((a) => reportById.get(a.report_id))
    .filter((r): r is ReportRow => !!r)
    .map((r) => [r.latitude, r.longitude]);

  if (points.length === 0) {
    return { center: zoneCenter(team.zone), source: 'zone', points: [] };
  }

  const avgLat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const avgLng = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  return { center: [avgLat, avgLng], source: 'assignments', points };
}

export type AssignmentView = {
  report: ReportRow;
  assignment: AssignmentRow | null;
  team: TeamRow | null;
  status: AssignmentStatus | 'unassigned';
  priority: Priority;
};

// Joins recent reports with their assignment (if any) and team — this is
// what "Active Assignments" is built from, so assigning a team to a brand
// new complaint is just picking one from this list.
export function buildAssignmentViews(
  reports: ReportRow[],
  assignments: AssignmentRow[],
  teams: TeamRow[],
  limit = 60
): AssignmentView[] {
  const assignmentByReport = new Map(assignments.map((a) => [a.report_id, a]));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  return reports.slice(0, limit).map((report) => {
    const assignment = assignmentByReport.get(report.id) ?? null;
    const team = assignment?.team_id ? (teamById.get(assignment.team_id) ?? null) : null;
    return {
      report,
      assignment,
      team,
      status: assignment?.status ?? 'unassigned',
      priority: priorityForSeverity(report.severity_label),
    };
  });
}
