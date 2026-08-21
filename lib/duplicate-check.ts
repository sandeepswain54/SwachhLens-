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
