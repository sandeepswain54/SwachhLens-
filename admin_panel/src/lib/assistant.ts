// Data + Gemini layer behind the Reports & Insights "AI Assistant" chat.
// Same Gemini endpoint/model the AI Analytics report generator uses (see
// lib/ai-report.ts) — kept as its own digest+prompt pair because this one
// answers a free-form question instead of writing a fixed set of report
// sections.

import { hasModernAnalysis } from './analysis';
import { buildHotspotClusters } from './hotspots';
import { computeWasteCollectedWeekOverWeek, teamEfficiencyPercent } from './ops-insights';
import type { ReportRow } from './reports';
import { computeAvgResolutionDays, computeCategoryBreakdown, computeSeverityBreakdown, computeWeekOverWeek } from './stats';
import { TEAM_STATUS_LABEL, type AssignmentRow, type TeamRow } from './teams';
import { VEHICLE_STATUS_LABEL, type VehicleRow } from './vehicles';

const GEMINI_API_KEY = import.meta.env.VITE_PUBLIC_GEMINI_API_KEY as string | undefined;
const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type ChatRole = 'bot' | 'user';
export type ChatMessage = { id: string; role: ChatRole; text: string; at: string };

// Everything the assistant is allowed to know, computed fresh from the live
// reports/teams/vehicles/assignments contexts on every question — real
// counts, not a cached or simulated snapshot, so "how many vehicles are
// available today" reflects what's actually in the database right now.
export function buildAssistantDigest(
  reports: ReportRow[],
  teams: TeamRow[],
  assignments: AssignmentRow[],
  vehicles: VehicleRow[],
  dateRangeLabel: string,
  locationLabel: string
) {
  const weekDelta = computeWeekOverWeek(reports);
  const category = computeCategoryBreakdown(reports);
  const severity = computeSeverityBreakdown(reports);
  const wasteCollected = computeWasteCollectedWeekOverWeek(reports);
  const avgResolutionDays = computeAvgResolutionDays(reports);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentReports = reports.filter((r) => new Date(r.created_at).getTime() >= weekAgo);
  const topHotspots = buildHotspotClusters(recentReports)
    .slice(0, 5)
    .map((h) => ({
      area: h.locality,
      category: h.category,
      totalComplaintsThisWeek: h.totalComplaints,
      intensity: h.intensity,
      trendPercentVsLastWeek: h.trendPercent,
    }));

  const vehiclesByStatus: Record<string, number> = { on_duty: 0, assigned: 0, maintenance: 0, idle: 0 };
  for (const v of vehicles) vehiclesByStatus[v.status] += 1;

  const teamsByStatus: Record<string, number> = { on_duty: 0, available: 0, maintenance: 0 };
  for (const t of teams) teamsByStatus[t.status] += 1;

  return {
    asOf: new Date().toISOString(),
    selectedDateRange: dateRangeLabel,
    selectedLocation: locationLabel,
    complaints: {
      total: weekDelta.total.value,
      totalChangePercentVsLastWeek: weekDelta.total.deltaPercent,
      resolved: weekDelta.resolved.value,
      resolvedChangePercentVsLastWeek: weekDelta.resolved.deltaPercent,
      pending: weekDelta.active.value,
      pendingChangePercentVsLastWeek: weekDelta.active.deltaPercent,
      criticalOrHigh: weekDelta.critical.value,
      avgResolutionDays: avgResolutionDays === null ? null : Math.round(avgResolutionDays * 10) / 10,
      byCategory: category.map((c) => ({ category: c.name, count: c.count, percent: Math.round(c.percent * 10) / 10 })),
      bySeverity: severity.map((s) => ({ level: s.label, count: s.count, percent: Math.round(s.percent * 10) / 10 })),
    },
    topHotspotsThisWeek: topHotspots,
    teams: {
      total: teams.length,
      byStatus: {
        onDuty: teamsByStatus.on_duty,
        available: teamsByStatus.available,
        maintenance: teamsByStatus.maintenance,
      },
      roster: teams.map((t) => ({
        teamCode: t.team_code,
        teamName: t.team_name,
        zone: t.zone,
        status: TEAM_STATUS_LABEL[t.status],
        memberCount: t.member_count,
        activeAssignments: assignments.filter((a) => a.team_id === t.id && a.status !== 'completed').length,
        completedAssignmentsAllTime: assignments.filter((a) => a.team_id === t.id && a.status === 'completed').length,
        efficiencyPercent: teamEfficiencyPercent(t, assignments),
      })),
    },
    vehicles: {
      total: vehicles.length,
      availableToday: vehiclesByStatus.idle, // "idle" = not currently on a job — the closest real signal to "available"
      byStatus: {
        onDuty: vehiclesByStatus.on_duty,
        assigned: vehiclesByStatus.assigned,
        maintenance: vehiclesByStatus.maintenance,
        idle: vehiclesByStatus.idle,
      },
      roster: vehicles.map((v) => ({
        vehicleNo: v.vehicle_no,
        type: v.vehicle_type,
        status: VEHICLE_STATUS_LABEL[v.status],
        driverName: v.driver_name,
        locationLabel: v.location_label,
        fuelLevelPercent: v.fuel_level,
      })),
    },
    wasteCollected: {
      tonsThisWeek: wasteCollected.value,
      changePercentVsLastWeek: wasteCollected.deltaPercent,
      note: 'AI-estimated from each resolved report\'s volume analysis — an approximation, not a weighbridge measurement.',
    },
    // Reports whose analysis blob predates the current AI pipeline (no
    // wasteType/volume fields) are excluded from any category/volume math
    // above the same way the AI Analytics page excludes them.
    reportsWithoutModernAnalysis: reports.filter((r) => r.analysis !== null && !hasModernAnalysis(r.analysis)).length,
  };
}

function buildPrompt(question: string, digest: unknown, history: ChatMessage[]): string {
  const recentTurns = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Admin' : 'Assistant'}: ${m.text}`)
    .join('\n');

  return `You are the AI Assistant embedded in SwachhLens's admin "Reports & Insights" page — a civic waste-management operations dashboard. An admin is asking you questions in a chat panel. Below is a JSON data digest computed just now, directly from the platform's live database (real reports, teams, vehicles, assignments — not samples).

Answer the admin's question using ONLY the facts in this digest. Never invent a number, area name, team, or vehicle that isn't in it. If the digest genuinely doesn't contain what's needed to answer, say so plainly in one sentence rather than guessing.

Style: 1-3 short sentences, conversational but factual, like a helpful ops assistant — lead with the direct answer and the concrete number(s)/percentage(s), then at most one sentence of context. No markdown, no bullet lists, no headers — plain chat text only.

DATA DIGEST (as of ${new Date().toISOString()}):
${JSON.stringify(digest)}

${recentTurns ? `RECENT CONVERSATION (for context only):\n${recentTurns}\n` : ''}
Admin's question: "${question}"

Your reply:`;
}

export async function askAssistant(question: string, digest: unknown, history: ChatMessage[]): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing VITE_PUBLIC_GEMINI_API_KEY. Check admin_panel/.env.');
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(question, digest, history) }] }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`AI Assistant request failed (${response.status}). ${errorBody || 'Please try again.'}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('The assistant returned no answer. Please try again.');
  }
  return text.trim();
}
