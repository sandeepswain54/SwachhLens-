import { decode as decodeBase64 } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

import type { ReportLocation, ReportMedia } from '@/contexts/report-flow-context';
import type { DuplicateCheck } from '@/lib/duplicate-check';
import type { WasteAnalysis } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';

const REPORT_MEDIA_BUCKET = 'report-media';

export type ReportStatus = 'submitted' | 'team_assigned' | 'in_progress' | 'resolved';

export const STATUS_LABEL: Record<ReportStatus, string> = {
  submitted: 'Submitted',
  team_assigned: 'Team Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export const STATUS_COLOR: Record<ReportStatus, { bg: string; text: string }> = {
  submitted: { bg: '#eaf3ef', text: '#1B6B3A' },
  team_assigned: { bg: '#fdecd2', text: '#b9770e' },
  in_progress: { bg: '#e6eefd', text: '#2563eb' },
  resolved: { bg: '#e3f3ea', text: '#1B6B3A' },
};

export const STATUS_ORDER: ReportStatus[] = [
  'submitted',
  'team_assigned',
  'in_progress',
  'resolved',
];

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
  severity_label: string;
  severity_score: number;
  urgency_label: string;
  status: ReportStatus;
  analysis: (WasteAnalysis & { duplicate: DuplicateCheck | null }) | null;
  created_at: string;
};

export type ReportPin = {
  id: string;
  report_code: string;
  category: string;
  severity_label: string;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  created_at: string;
};

export type ImpactStats = {
  submitted: number;
  resolved: number;
  wasteRemovedKg: number;
};

export type SubmitReportParams = {
  media: ReportMedia;
  analysis: WasteAnalysis;
  duplicate: DuplicateCheck | null;
  location: ReportLocation;
  comments: string;
};

export type SubmittedReport = {
  reportCode: string;
  createdAt: string;
};

// Rough kg estimate per AI-detected size tier, used only to give the "Waste
// Removed" impact stat a live, non-static number. This is explicitly an
// approximation, not a measured weight.
const SIZE_KG_ESTIMATE: Record<string, number> = {
  Small: 15,
  Medium: 50,
  Large: 120,
  'Very Large': 250,
};

function extensionFor(media: ReportMedia) {
  const fromMime = media.mimeType.split('/')[1]?.split('+')[0];
  if (fromMime) return fromMime;
  return media.kind === 'image' ? 'jpg' : 'mp4';
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export async function submitReport(params: SubmitReportParams): Promise<SubmittedReport> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('You need to be signed in to submit a report.');
  }

  const base64 = await FileSystem.readAsStringAsync(params.media.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const path = `${user.id}/${Date.now()}.${extensionFor(params.media)}`;

  const { error: uploadError } = await supabase.storage
    .from(REPORT_MEDIA_BUCKET)
    .upload(path, decodeBase64(base64), {
      contentType: params.media.mimeType,
      upsert: false,
    });
  if (uploadError) {
    throw new Error(`Could not upload media: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from(REPORT_MEDIA_BUCKET).getPublicUrl(path);

  const { data, error: insertError } = await supabase
    .from('reports')
    .insert({
      user_id: user.id,
      media_url: publicUrlData.publicUrl,
      media_type: params.media.kind,
      latitude: params.location.latitude,
      longitude: params.location.longitude,
      address: params.location.address,
      comments: params.comments.trim() || null,
      category: params.analysis.wasteType.primaryType,
      category_confidence: params.analysis.wasteType.confidencePercent,
      severity_label: params.analysis.severity.level,
      severity_score: params.analysis.severity.score,
      urgency_label: params.analysis.severity.priority,
      analysis: { ...params.analysis, duplicate: params.duplicate },
    })
    .select('report_code, created_at')
    .single();

  if (insertError) {
    throw new Error(`Could not save report: ${insertError.message}`);
  }

  return { reportCode: `#${data.report_code}`, createdAt: data.created_at };
}

export async function getMyReports(): Promise<ReportRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ReportRow[];
}

export async function getReportById(id: string): Promise<ReportRow | null> {
  const { data, error } = await supabase.from('reports').select('*').eq('id', id).single();
  if (error) return null;
  return data as ReportRow;
}

export async function getMyImpactStats(): Promise<ImpactStats> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { submitted: 0, resolved: 0, wasteRemovedKg: 0 };

  const { count } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { data: resolvedRows } = await supabase
    .from('reports')
    .select('analysis')
    .eq('user_id', user.id)
    .eq('status', 'resolved');

  const resolved = resolvedRows?.length ?? 0;
  const wasteRemovedKg = (resolvedRows ?? []).reduce((total, row) => {
    const size = (row as { analysis: { volume?: { size?: string } } | null }).analysis?.volume
      ?.size;
    return total + (size ? (SIZE_KG_ESTIMATE[size] ?? 0) : 0);
  }, 0);

  return { submitted: count ?? 0, resolved, wasteRemovedKg };
}

// Requires the "Authenticated users can view all reports for the community
// map" RLS policy — without it this only ever returns the caller's own
// reports.
export async function getCommunityReportPins(): Promise<ReportPin[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('id, report_code, category, severity_label, status, latitude, longitude, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data ?? []) as ReportPin[];
}

// Live-updates the hotspot map as new reports come in from any user.
// Requires `alter publication supabase_realtime add table public.reports;`
export function subscribeToNewReportPins(onInsert: (pin: ReportPin) => void) {
  const channel = supabase
    .channel('report-pins')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reports' },
      (payload) => {
        const row = payload.new as ReportPin;
        onInsert(row);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
