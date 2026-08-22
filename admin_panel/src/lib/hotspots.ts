import { deriveLocality } from './complaints';
import { SEVERITY_ORDER, type ReportRow, type SeverityLabel } from './reports';

// A "hotspot" isn't a table in the database — it's reports.ts rows grouped by
// where they happened. Intensity reuses SeverityLabel's exact band names
// (Critical/High/Medium/Low) because that's what the Waste Hotspots page's
// legend calls them; it's a different axis than an individual report's own
// severity_label (a hotspot can be Critical from *volume* of Low-severity
// reports piling up in one place).
export type HotspotIntensity = SeverityLabel;
export const INTENSITY_ORDER: HotspotIntensity[] = SEVERITY_ORDER;

// Matches the 0-100 score legend on the reference design. The score itself
// (see buildHotspotClusters) is always scaled relative to the worst hotspot
// in the current dataset, so these bands are about relative ranking, not an
// absolute "80 = this many complaints" reading.
export const INTENSITY_SCORE_RANGE: Record<HotspotIntensity, string> = {
  Critical: '80-100',
  High: '50-79',
  Medium: '20-49',
  Low: '1-19',
};

// ~650m at Bhubaneswar's latitude — fine enough to keep separate roads/areas
// apart, coarse enough that repeat reports against the same dump site land
// in one hotspot instead of scattering into one-report "hotspots".
const GRID_STEP = 0.006;

function cellKeyFor(lat: number, lng: number): string {
  return `${Math.round(lat / GRID_STEP)}:${Math.round(lng / GRID_STEP)}`;
}

const SEVERITY_WEIGHT: Record<SeverityLabel, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

function topEntry<K>(counts: Map<K, number>): K | null {
  let best: K | null = null;
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

function bandForScore(score: number): HotspotIntensity {
  if (score >= 80) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 20) return 'Medium';
  return 'Low';
}

// Same shape/convention as computeWeekOverWeek in stats.ts, just rounded to
// a whole percent to match the table's "+12%" / "-5%" trend column.
function weekDeltaPercent(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? null : 100;
  return Math.round(((curr - prev) / prev) * 100);
}

export type HotspotCluster = {
  id: string;
  cellKey: string;
  lat: number;
  lng: number;
  address: string;
  locality: string;
  category: string;
  reports: ReportRow[];
  totalComplaints: number;
  intensityScore: number;
  intensity: HotspotIntensity;
  trendPercent: number | null;
  lastReportedAt: string;
  imageUrl: string;
};

// Groups reports into location-based clusters and ranks them. Runs entirely
// off whatever `reports` it's given (no fetch/subscription of its own), so
// feeding it the live ReportsContext array is what makes every hotspot here
// realtime: a new INSERT re-runs this on the next render.
export function buildHotspotClusters(reports: ReportRow[]): HotspotCluster[] {
  const groups = new Map<string, ReportRow[]>();
  for (const r of reports) {
    const key = cellKeyFor(r.latitude, r.longitude);
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const raw = [...groups.entries()].map(([cellKey, members]) => {
    const sorted = [...members].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latest = sorted[0];

    const lat = members.reduce((sum, r) => sum + r.latitude, 0) / members.length;
    const lng = members.reduce((sum, r) => sum + r.longitude, 0) / members.length;

    const categoryCounts = new Map<string, number>();
    const localityCounts = new Map<string, number>();
    let weighted = 0;
    let currentWeek = 0;
    let previousWeek = 0;

    for (const r of members) {
      categoryCounts.set(r.category, (categoryCounts.get(r.category) ?? 0) + 1);
      const locality = deriveLocality(r.address);
      localityCounts.set(locality, (localityCounts.get(locality) ?? 0) + 1);
      weighted += SEVERITY_WEIGHT[r.severity_label];

      const age = now - new Date(r.created_at).getTime();
      if (age <= weekMs) currentWeek += 1;
      else if (age <= weekMs * 2) previousWeek += 1;
    }

    return {
      cellKey,
      lat,
      lng,
      address: latest.address,
      locality: topEntry(localityCounts) ?? deriveLocality(latest.address),
      category: topEntry(categoryCounts) ?? latest.category,
      reports: sorted,
      totalComplaints: members.length,
      weighted,
      currentWeek,
      previousWeek,
      lastReportedAt: latest.created_at,
      imageUrl: latest.media_url,
    };
  });

  const maxWeighted = raw.reduce((max, c) => Math.max(max, c.weighted), 0);

  const scored = raw.map((c) => {
    const intensityScore = maxWeighted > 0 ? Math.round((c.weighted / maxWeighted) * 100) : 0;
    return {
      ...c,
      intensityScore,
      intensity: bandForScore(intensityScore),
      trendPercent: weekDeltaPercent(c.currentWeek, c.previousWeek),
    };
  });

  // Busiest hotspot first — this is what makes "Top Hotspots" and the
  // overview table reorder live as new complaints land on top of an
  // existing hotspot.
  scored.sort((a, b) => b.totalComplaints - a.totalComplaints || b.intensityScore - a.intensityScore);

  return scored.map((c, i) => ({
    id: `HS-${1001 + i}`,
    cellKey: c.cellKey,
    lat: c.lat,
    lng: c.lng,
    address: c.address,
    locality: c.locality,
    category: c.category,
    reports: c.reports,
    totalComplaints: c.totalComplaints,
    intensityScore: c.intensityScore,
    intensity: c.intensity,
    trendPercent: c.trendPercent,
    lastReportedAt: c.lastReportedAt,
    imageUrl: c.imageUrl,
  }));
}

export type HotspotBandCounts = Record<HotspotIntensity, number> & { total: number };

export function computeHotspotBandCounts(reports: ReportRow[]): HotspotBandCounts {
  const clusters = buildHotspotClusters(reports);
  const counts: HotspotBandCounts = { Critical: 0, High: 0, Medium: 0, Low: 0, total: clusters.length };
  for (const c of clusters) counts[c.intensity] += 1;
  return counts;
}

export type HotspotBandDelta = { value: number; deltaCount: number };

// Raw count deltas (not percent) — the reference design's five stat cards
// read "18, down 5 from last week", not a percentage.
export function computeHotspotWeekOverWeek(
  reports: ReportRow[]
): Record<HotspotIntensity | 'total', HotspotBandDelta> {
  const nowCounts = computeHotspotBandCounts(reports);
  const weekAgoCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const priorReports = reports.filter((r) => new Date(r.created_at).getTime() <= weekAgoCutoff);
  const priorCounts = computeHotspotBandCounts(priorReports);

  const bands: (HotspotIntensity | 'total')[] = ['Critical', 'High', 'Medium', 'Low', 'total'];
  const result = {} as Record<HotspotIntensity | 'total', HotspotBandDelta>;
  for (const b of bands) {
    result[b] = { value: nowCounts[b], deltaCount: nowCounts[b] - priorCounts[b] };
  }
  return result;
}

function parseVolumeLitersMidpoint(range: string | undefined): number | null {
  if (!range) return null;
  const numbers = range.match(/\d+(\.\d+)?/g);
  if (!numbers || numbers.length === 0) return null;
  const values = numbers.map(Number);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Rough municipal-solid-waste density used only to turn the AI's per-report
// liter estimate into a tonnage figure for the insights tile — uncompacted
// mixed waste is commonly cited around 250-350 kg/m^3 (0.25-0.35 kg/L); 0.3
// is the midpoint. This is an approximation, not a measured weight.
const MSW_KG_PER_LITER = 0.3;

export type HotspotInsights = {
  mostCommonCategory: string | null;
  peakTimeLabel: string | null;
  affectedAreas: number;
  estimatedVolumeTons: number | null;
  volumeSampleCount: number;
};

function formatHour(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;
  return `${displayHour}${period}`;
}

export function computeHotspotInsights(reports: ReportRow[]): HotspotInsights {
  if (reports.length === 0) {
    return {
      mostCommonCategory: null,
      peakTimeLabel: null,
      affectedAreas: 0,
      estimatedVolumeTons: null,
      volumeSampleCount: 0,
    };
  }

  const categoryCounts = new Map<string, number>();
  const hourCounts = new Map<number, number>();
  let volumeLitersSum = 0;
  let volumeSampleCount = 0;

  for (const r of reports) {
    categoryCounts.set(r.category, (categoryCounts.get(r.category) ?? 0) + 1);
    const hour = new Date(r.created_at).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);

    const liters = parseVolumeLitersMidpoint(r.analysis?.volume?.estimatedVolumeLiters);
    if (liters !== null) {
      volumeLitersSum += liters;
      volumeSampleCount += 1;
    }
  }

  const peakHour = topEntry(hourCounts);

  return {
    mostCommonCategory: topEntry(categoryCounts),
    peakTimeLabel: peakHour === null ? null : `${formatHour(peakHour)} - ${formatHour((peakHour + 3) % 24)}`,
    affectedAreas: buildHotspotClusters(reports).length,
    estimatedVolumeTons: volumeSampleCount > 0 ? (volumeLitersSum * MSW_KG_PER_LITER) / 1000 : null,
    volumeSampleCount,
  };
}
