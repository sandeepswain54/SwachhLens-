// Compute layer for the Reports & Insights page: the "Quick Stats" column
// and "Recent Insights" feed. Everything here reads off the same live
// contexts (reports/teams/assignments) already powering Dashboard/Teams —
// no separate data source, so it updates in realtime exactly like they do.

import { hasModernAnalysis } from './analysis';
import { buildHotspotClusters } from './hotspots';
import { MSW_KG_PER_LITER, parseVolumeLitersMidpoint } from './hotspots';
import type { ReportRow } from './reports';
import { computeAvgResolutionDays } from './stats';
import type { AssignmentRow, TeamRow } from './teams';

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? null : 100;
  return ((curr - prev) / prev) * 100;
}

export type WeekDelta = { value: number; deltaPercent: number | null };

// Tons of waste the AI estimates were actually cleared — summed only over
// *resolved* reports (a report still open hasn't been collected yet),
// using each report's own volume estimate, same liters -> tons conversion
// Waste Hotspots and AI Analytics already use.
function wasteCollectedTonsAsOf(reports: ReportRow[], cutoffMs: number): number {
  let litersSum = 0;
  for (const r of reports) {
    if (r.status !== 'resolved') continue;
    const resolvedAt = r.resolved_at ? new Date(r.resolved_at).getTime() : null;
    if (resolvedAt === null || resolvedAt > cutoffMs) continue;
    if (!hasModernAnalysis(r.analysis)) continue;
    const liters = parseVolumeLitersMidpoint(r.analysis.volume.estimatedVolumeLiters);
    if (liters !== null) litersSum += liters;
  }
  return (litersSum * MSW_KG_PER_LITER) / 1000;
}

export function computeWasteCollectedWeekOverWeek(reports: ReportRow[]): WeekDelta {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const current = wasteCollectedTonsAsOf(reports, now);
  const previous = wasteCollectedTonsAsOf(reports, weekAgo);
  return { value: Math.round(current * 10) / 10, deltaPercent: pctDelta(current, previous) };
}

export type OperationsInsight = {
  id: string;
  tone: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  subtitle: string;
  at: string;
};

function categoryCountsAt(reports: ReportRow[], cutoffMs: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of reports) {
    if (new Date(r.created_at).getTime() > cutoffMs) continue;
    counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  }
  return counts;
}

// Completed / total assignments ever handed to a team — the plainest real
// "how reliably does this team finish what it's given" number derivable
// from the assignments table (there's no separate QA/rating field).
function teamEfficiencyPercent(team: TeamRow, assignments: AssignmentRow[]): number | null {
  const teamAssignments = assignments.filter((a) => a.team_id === team.id);
  if (teamAssignments.length === 0) return null;
  const completed = teamAssignments.filter((a) => a.status === 'completed').length;
  return Math.round((completed / teamAssignments.length) * 100);
}

// Real, derived talking points for the "Recent Insights" feed — same
// technique as ai-stats.ts's computeAIInsights (as-of snapshots for
// genuine week-over-week deltas), just widened to cover teams/hotspots too
// since this page isn't AI-analysis-specific.
export function computeOperationsInsights(
  reports: ReportRow[],
  teams: TeamRow[],
  assignments: AssignmentRow[]
): OperationsInsight[] {
  const insights: OperationsInsight[] = [];
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const nowIso = new Date(now).toISOString();

  // Category trend: the category with the biggest week-over-week jump.
  const nowCounts = categoryCountsAt(reports, now);
  const priorCounts = categoryCountsAt(reports, weekAgo);
  let topCategory: { name: string; deltaPercent: number } | null = null;
  for (const [name, count] of nowCounts) {
    const prior = priorCounts.get(name) ?? 0;
    if (count - prior <= 0) continue;
    const d = pctDelta(count, prior);
    if (d !== null && (topCategory === null || d > topCategory.deltaPercent)) {
      topCategory = { name, deltaPercent: d };
    }
  }
  if (topCategory && topCategory.deltaPercent > 0) {
    insights.push({
      id: 'category-trend',
      tone: 'warning',
      title: `${topCategory.name} complaints increased by ${Math.round(topCategory.deltaPercent)}%`,
      subtitle: 'Compared to last week',
      at: nowIso,
    });
  }

  // Busiest hotspot this week.
  const recentReports = reports.filter((r) => new Date(r.created_at).getTime() >= weekAgo);
  const hotspots = buildHotspotClusters(recentReports);
  if (hotspots.length > 0) {
    const top = hotspots[0];
    insights.push({
      id: 'top-hotspot',
      tone: 'info',
      title: `${top.locality} is the top hotspot this week`,
      subtitle: `${top.totalComplaints} complaint${top.totalComplaints === 1 ? '' : 's'}`,
      at: top.lastReportedAt,
    });
  }

  // Average resolution time trend (this week's resolved reports vs the
  // rest), reusing stats.ts's computeAvgResolutionDays.
  const resolvedThisWeek = reports.filter(
    (r) => r.resolved_at && new Date(r.resolved_at).getTime() >= weekAgo
  );
  const resolvedBefore = reports.filter(
    (r) => r.resolved_at && new Date(r.resolved_at).getTime() < weekAgo
  );
  const avgNow = computeAvgResolutionDays(resolvedThisWeek);
  const avgBefore = computeAvgResolutionDays(resolvedBefore);
  if (avgNow !== null && avgBefore !== null) {
    const diff = avgBefore - avgNow; // positive = faster (improved)
    insights.push({
      id: 'resolution-time',
      tone: diff >= 0 ? 'success' : 'warning',
      title: `Average resolution time ${diff >= 0 ? 'improved' : 'slowed'} by ${Math.abs(diff).toFixed(1)} day${Math.abs(diff) === 1 ? '' : 's'}`,
      subtitle: diff >= 0 ? 'Good progress' : 'Review team workloads',
      at: nowIso,
    });
  }

  // Best-performing team by completion rate (needs at least a few
  // assignments to be a meaningful number, not a 1-for-1 fluke).
  let bestTeam: { team: TeamRow; efficiency: number } | null = null;
  for (const team of teams) {
    const teamAssignments = assignments.filter((a) => a.team_id === team.id);
    if (teamAssignments.length < 3) continue;
    const efficiency = teamEfficiencyPercent(team, assignments);
    if (efficiency !== null && (bestTeam === null || efficiency > bestTeam.efficiency)) {
      bestTeam = { team, efficiency };
    }
  }
  if (bestTeam) {
    insights.push({
      id: 'top-team',
      tone: 'success',
      title: `${bestTeam.team.team_code} has the highest efficiency (${bestTeam.efficiency}%)`,
      subtitle: 'Great performance!',
      at: nowIso,
    });
  }

  return insights;
}

export { teamEfficiencyPercent };
