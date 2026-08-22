import { hasModernAnalysis } from './analysis';
import { deriveLocality, duplicateFlagged } from './complaints';
import { MSW_KG_PER_LITER, parseVolumeLitersMidpoint } from './hotspots';
import type { ReportRow } from './reports';

// Everything here is derived straight from `reports` rows the AI pipeline
// already wrote at submission time (category_confidence, analysis.volume,
// severity_score, analysis.duplicate — see lib/gemini.ts and
// lib/duplicate-check.ts at the repo root). Nothing on this page is
// simulated: a metric that has no real backing field (e.g. there is no
// stored "processing time" for an analysis run) is simply left off rather
// than invented.

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? null : 100;
  return ((curr - prev) / prev) * 100;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export type MetricDelta = { value: number; deltaPercent: number | null };

export type AIOverviewStats = {
  totalPredictions: MetricDelta;
  classificationAccuracy: MetricDelta;
  volumeAccuracy: MetricDelta;
  duplicateDetectionRate: MetricDelta;
  needsReview: MetricDelta;
};

// Snapshot of the five headline metrics "as of" a cutoff timestamp, built
// only from immutable per-report fields (category_confidence, analysis,
// severity_score never change after submission) — same technique as
// stats.ts's snapshotAt, so week-over-week deltas are real history.
function snapshotAt(reports: ReportRow[], cutoffMs: number) {
  const existing = reports.filter((r) => new Date(r.created_at).getTime() <= cutoffMs);
  // `hasModernAnalysis` (not a bare `!== null` check) — some early reports
  // carry an older, differently-shaped analysis blob (see lib/analysis.ts).
  const analyzed = existing.filter((r) => hasModernAnalysis(r.analysis));

  const classificationScores = analyzed
    .map((r) => r.category_confidence)
    .filter((v): v is number => v !== null);

  const volumeScores = analyzed
    .map((r) => r.analysis?.volume?.confidencePercent)
    .filter((v): v is number => v !== undefined && v !== null);

  const duplicateChecked = analyzed.filter((r) => r.analysis?.duplicate && r.analysis.duplicate.status !== 'not_available');
  const duplicatesFound = duplicateChecked.filter((r) => duplicateFlagged(r));

  const needsReview = analyzed.filter((r) => r.category_confidence !== null && r.category_confidence < 70);

  return {
    totalPredictions: analyzed.length,
    classificationAccuracy: avg(classificationScores) ?? 0,
    volumeAccuracy: avg(volumeScores) ?? 0,
    duplicateDetectionRate: duplicateChecked.length > 0 ? (duplicatesFound.length / duplicateChecked.length) * 100 : 0,
    needsReview: needsReview.length,
  };
}

// Stat cards read off *all* reports regardless of the page's date/location
// filters, each carrying its own week-over-week delta — same convention as
// Dashboard's top stat row and Waste Hotspots' band tiles.
export function computeAIOverviewStats(reports: ReportRow[]): AIOverviewStats {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const current = snapshotAt(reports, now);
  const previous = snapshotAt(reports, weekAgo);

  return {
    totalPredictions: {
      value: current.totalPredictions,
      deltaPercent: pctDelta(current.totalPredictions, previous.totalPredictions),
    },
    classificationAccuracy: {
      value: current.classificationAccuracy,
      deltaPercent: pctDelta(current.classificationAccuracy, previous.classificationAccuracy),
    },
    volumeAccuracy: {
      value: current.volumeAccuracy,
      deltaPercent: pctDelta(current.volumeAccuracy, previous.volumeAccuracy),
    },
    duplicateDetectionRate: {
      value: current.duplicateDetectionRate,
      deltaPercent: pctDelta(current.duplicateDetectionRate, previous.duplicateDetectionRate),
    },
    needsReview: {
      value: current.needsReview,
      deltaPercent: pctDelta(current.needsReview, previous.needsReview),
    },
  };
}

export type VolumeBucket = { label: string; rangeLabel: string; tons: number; reportCount: number };

const VOLUME_BUCKETS: Array<{ size: string; label: string; rangeLabel: string }> = [
  { size: 'Small', label: 'Small', rangeLabel: '(0-0.5)' },
  { size: 'Medium', label: 'Medium', rangeLabel: '(0.5-2)' },
  { size: 'Large', label: 'Large', rangeLabel: '(2-10)' },
  { size: 'Very Large', label: 'Very Large', rangeLabel: '(>10)' },
];

// Sums the AI's per-report liter estimate (converted to tons via the same
// rough MSW density used on Waste Hotspots) grouped by the AI's own size
// bucket — real per-report data, just aggregated.
export function computeVolumeBySizeBucket(reports: ReportRow[]): VolumeBucket[] {
  const tonsBySize = new Map<string, number>();
  const countBySize = new Map<string, number>();

  for (const r of reports) {
    const size = r.analysis?.volume?.size;
    if (!size) continue;
    const liters = parseVolumeLitersMidpoint(r.analysis?.volume?.estimatedVolumeLiters);
    if (liters === null) continue;
    const tons = (liters * MSW_KG_PER_LITER) / 1000;
    tonsBySize.set(size, (tonsBySize.get(size) ?? 0) + tons);
    countBySize.set(size, (countBySize.get(size) ?? 0) + 1);
  }

  return VOLUME_BUCKETS.map((b) => ({
    label: b.label,
    rangeLabel: b.rangeLabel,
    tons: Math.round((tonsBySize.get(b.size) ?? 0) * 10) / 10,
    reportCount: countBySize.get(b.size) ?? 0,
  }));
}

export type PriorityBand = 'Very High' | 'High' | 'Medium' | 'Low' | 'Very Low';

export const PRIORITY_BAND_ORDER: PriorityBand[] = ['Very High', 'High', 'Medium', 'Low', 'Very Low'];

export const PRIORITY_BAND_COLOR: Record<PriorityBand, string> = {
  'Very High': '#d03b3b',
  High: '#eb6834',
  Medium: '#fab219',
  Low: '#0ca30c',
  'Very Low': '#1baf7a',
};

export const PRIORITY_BAND_RANGE: Record<PriorityBand, string> = {
  'Very High': '80-100',
  High: '60-79',
  Medium: '40-59',
  Low: '20-39',
  'Very Low': '0-19',
};

function bandForScore(score: number): PriorityBand {
  if (score >= 80) return 'Very High';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  if (score >= 20) return 'Low';
  return 'Very Low';
}

export type PrioritySlice = { name: PriorityBand; count: number; percent: number; color: string };

// `severity_score` *is* the AI's 0-100 priority score persisted at
// submission (see analysis.severity.score in lib/gemini.ts) — the same
// number the Recent AI Analysis Results table shows as "Priority Score".
export function computePriorityScoreDistribution(reports: ReportRow[]): PrioritySlice[] {
  const total = reports.length;
  const counts = new Map<PriorityBand, number>();
  for (const r of reports) {
    const band = bandForScore(r.severity_score);
    counts.set(band, (counts.get(band) ?? 0) + 1);
  }

  return PRIORITY_BAND_ORDER.map((band) => {
    const count = counts.get(band) ?? 0;
    return { name: band, count, percent: total > 0 ? (count / total) * 100 : 0, color: PRIORITY_BAND_COLOR[band] };
  });
}

export type DuplicateOverview = { potentialDuplicates: number; detectionRate: number; deltaPercent: number | null };

export function computeDuplicateOverview(reports: ReportRow[]): DuplicateOverview {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const current = snapshotAt(reports, now);
  const previous = snapshotAt(reports, weekAgo);

  const potentialDuplicates = reports.filter((r) => duplicateFlagged(r)).length;

  return {
    potentialDuplicates,
    detectionRate: current.duplicateDetectionRate,
    deltaPercent: pctDelta(current.duplicateDetectionRate, previous.duplicateDetectionRate),
  };
}

export type DuplicateCluster = { id: string; locality: string; count: number };

// Groups flagged-duplicate reports by locality (same heuristic the
// Complaints/Waste Hotspots pages use for their Location filter) so the
// biggest real clusters of repeat reports surface first.
export function computeDuplicateClusters(reports: ReportRow[], limit = 4): DuplicateCluster[] {
  const counts = new Map<string, number>();
  for (const r of reports) {
    if (!duplicateFlagged(r)) continue;
    const locality = deriveLocality(r.address);
    counts.set(locality, (counts.get(locality) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([locality, count], i) => ({ id: `Cluster #${i + 1}`, locality, count }));
}

export type ConfidenceTrendPoint = {
  date: string;
  label: string;
  classification: number;
  volume: number;
  severity: number;
};

// Daily average of the AI's own confidence/score fields over the trailing
// window — a genuine, derivable stand-in for "model performance over time"
// that doesn't require ground-truth labels we don't have (there is no
// human-verified correct answer stored per report, so real
// precision/recall/F1 can't be computed here).
export function computeConfidenceTrend(reports: ReportRow[], days = 7): ConfidenceTrendPoint[] {
  const points: ConfidenceTrendPoint[] = [];
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  let lastClassification = 0;
  let lastVolume = 0;
  let lastSeverity = 0;

  for (let i = days - 1; i >= 0; i -= 1) {
    const dayEnd = new Date(now);
    dayEnd.setDate(dayEnd.getDate() - i);
    const dayStart = new Date(dayEnd);
    dayStart.setHours(0, 0, 0, 0);

    const dayReports = reports.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= dayStart.getTime() && t <= dayEnd.getTime() && hasModernAnalysis(r.analysis);
    });

    const classification = avg(
      dayReports.map((r) => r.category_confidence).filter((v): v is number => v !== null)
    );
    const volume = avg(
      dayReports.map((r) => r.analysis?.volume?.confidencePercent).filter((v): v is number => v !== undefined && v !== null)
    );
    const severity = avg(dayReports.map((r) => r.severity_score));

    // Carry the last known value forward on quiet days so the line stays
    // continuous instead of dropping to zero when nothing was reported.
    lastClassification = classification ?? lastClassification;
    lastVolume = volume ?? lastVolume;
    lastSeverity = severity ?? lastSeverity;

    points.push({
      date: dayStart.toISOString(),
      label: dayStart.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
      classification: Math.round(lastClassification * 10) / 10,
      volume: Math.round(lastVolume * 10) / 10,
      severity: Math.round(lastSeverity * 10) / 10,
    });
  }

  return points;
}

export type AIInsight = {
  id: string;
  tone: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  subtitle: string;
};

// Reuses the same "as of a cutoff" snapshot technique to compare this week
// against last week per category, so the "increased by X%" insight is real
// history rather than a guess.
function categoryCountsAt(reports: ReportRow[], cutoffMs: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of reports) {
    if (new Date(r.created_at).getTime() > cutoffMs) continue;
    counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  }
  return counts;
}

export function computeAIInsights(reports: ReportRow[]): AIInsight[] {
  const insights: AIInsight[] = [];
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const criticalThisWeek = reports.filter(
    (r) => new Date(r.created_at).getTime() >= weekAgo && r.severity_label === 'Critical'
  ).length;
  if (criticalThisWeek > 0) {
    insights.push({
      id: 'critical-this-week',
      tone: 'critical',
      title: `${criticalThisWeek} critical severity report${criticalThisWeek === 1 ? '' : 's'} detected this week`,
      subtitle: 'Require immediate attention',
    });
  }

  const nowCounts = categoryCountsAt(reports, now);
  const priorCounts = categoryCountsAt(reports, weekAgo);
  let topCategory: { name: string; deltaPercent: number } | null = null;
  for (const [name, count] of nowCounts) {
    const prior = priorCounts.get(name) ?? 0;
    const weeklyCount = count - prior;
    if (weeklyCount <= 0) continue;
    const d = pctDelta(count, prior);
    if (d !== null && (topCategory === null || d > topCategory.deltaPercent)) {
      topCategory = { name, deltaPercent: d };
    }
  }
  if (topCategory && topCategory.deltaPercent > 0) {
    insights.push({
      id: 'category-trend',
      tone: 'warning',
      title: `${topCategory.name} waste reports increased by ${Math.round(topCategory.deltaPercent)}%`,
      subtitle: 'Compared to last week',
    });
  }

  const clusters = computeDuplicateClusters(reports, 1);
  if (clusters.length > 0 && clusters[0].count >= 3) {
    insights.push({
      id: 'duplicate-cluster',
      tone: 'info',
      title: `${clusters[0].locality} has high duplicate reports (${clusters[0].count})`,
      subtitle: 'Enable alert for field verification',
    });
  }

  const currentAcc = snapshotAt(reports, now).classificationAccuracy;
  const priorAcc = snapshotAt(reports, weekAgo).classificationAccuracy;
  if (currentAcc > 0 && priorAcc > 0) {
    const d = currentAcc - priorAcc;
    insights.push({
      id: 'model-confidence',
      tone: d >= 0 ? 'success' : 'warning',
      title: `Classification confidence ${d >= 0 ? 'improved' : 'dropped'} by ${Math.abs(d).toFixed(1)}pts this week`,
      subtitle: d >= 0 ? 'Overall performance is good' : 'Review recent low-confidence reports',
    });
  }

  return insights;
}
