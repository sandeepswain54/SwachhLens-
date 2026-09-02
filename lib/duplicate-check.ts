import { supabase } from '@/lib/supabase';

// Duplicate detection is computed here from real data in our own `reports`
// table — never invented or asked of the AI, since Gemini has no visibility
// into our database. See the README note in report-scan.tsx for the current
// scope limitation (RLS currently only lets a user see their own reports).
export type DuplicateCheck =
  | { status: 'not_available' }
  | { status: 'none' }
  | {
      status: 'possible' | 'yes';
      similarComplaintId: string;
      locationDistanceMeters: number;
      timeDescription: string;
      wasteTypeMatch: true;
      existingComplaintStatus: string;
      duplicateConfidencePercent: number;
      recommendedAction: string;
    };

const NEARBY_METERS = 300;
const RECENT_HOURS = 72;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function describeTimeAgo(hoursAgo: number) {
  if (hoursAgo < 1) return 'Just now';
  if (hoursAgo < 24) return `${Math.round(hoursAgo)}h ago`;
  return `${Math.round(hoursAgo / 24)}d ago`;
}

export async function checkForDuplicate(params: {
  category: string;
  latitude: number;
  longitude: number;
}): Promise<DuplicateCheck> {
  const { data, error } = await supabase
    .from('reports')
    .select('report_code, latitude, longitude, created_at, status')
    .eq('category', params.category)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error || !data) {
    return { status: 'not_available' };
  }

  const cutoffMs = Date.now() - RECENT_HOURS * 60 * 60 * 1000;
  let best: { report: (typeof data)[number]; distance: number } | null = null;

  for (const report of data) {
    const createdAtMs = new Date(report.created_at).getTime();
    if (Number.isNaN(createdAtMs) || createdAtMs < cutoffMs) continue;

    const distance = haversineMeters(
      params.latitude,
      params.longitude,
      report.latitude,
      report.longitude
    );
    if (distance <= NEARBY_METERS && (!best || distance < best.distance)) {
      best = { report, distance };
    }
  }

  if (!best) {
    return { status: 'none' };
  }

  const hoursAgo = (Date.now() - new Date(best.report.created_at).getTime()) / (60 * 60 * 1000);
  const confidence = Math.max(
    0,
    Math.min(100, Math.round(100 - (best.distance / NEARBY_METERS) * 60 - (hoursAgo / RECENT_HOURS) * 20))
  );

  return {
    status: confidence >= 80 ? 'yes' : 'possible',
    similarComplaintId: `#${best.report.report_code}`,
    locationDistanceMeters: Math.round(best.distance),
    timeDescription: describeTimeAgo(hoursAgo),
    wasteTypeMatch: true,
    existingComplaintStatus: best.report.status,
    duplicateConfidencePercent: confidence,
    recommendedAction:
      confidence >= 80 ? 'Link to existing complaint' : 'Review before creating a new complaint',
  };
}

// ---- 20-meter active-report merge check (geo-deduplication) ----
//
// Distinct from checkForDuplicate() above, which only powers the
// informational "possible duplicate" hint shown to the user before they
// submit (up to 300m / 72h, any confidence — unchanged). This is the strict
// rule submitReport() (lib/reports.ts) uses to actually decide whether a
// submission gets its own new ticket or gets merged into an existing one as
// a community confirmation: same waste category, status not yet resolved,
// and within 20 meters (Haversine distance — see the Example in the task
// spec). See confirm_existing_report() in
// admin_panel/supabase/010_privacy_geo_dedup.sql for the anti-spam /
// unique-reporter enforcement that happens once a match is found here.
export const MERGE_RADIUS_METERS = 20;

export type ActiveDuplicateMatch = {
  id: string;
  reportCode: string;
  status: string;
  distanceMeters: number;
} | null;

export async function findActiveDuplicateWithin20m(params: {
  category: string;
  latitude: number;
  longitude: number;
}): Promise<ActiveDuplicateMatch> {
  const { data, error } = await supabase
    .from('reports')
    .select('id, report_code, latitude, longitude, status')
    .eq('category', params.category)
    .neq('status', 'resolved')
    .order('created_at', { ascending: false })
    .limit(200);

  // Fail safe: if we can't reliably check, don't merge — create a normal
  // new report rather than risking an incorrect confirmation-count bump.
  // ("If duplicate detection fails technically... log the error safely.")
  if (error || !data) {
    if (error) console.warn('findActiveDuplicateWithin20m: lookup failed —', error.message);
    return null;
  }

  let best: { report: (typeof data)[number]; distance: number } | null = null;
  for (const report of data) {
    const distance = haversineMeters(
      params.latitude,
      params.longitude,
      report.latitude,
      report.longitude
    );
    if (distance <= MERGE_RADIUS_METERS && (!best || distance < best.distance)) {
      best = { report, distance };
    }
  }

  if (!best) return null;
  return {
    id: best.report.id,
    reportCode: best.report.report_code,
    status: best.report.status,
    distanceMeters: Math.round(best.distance),
  };
}
