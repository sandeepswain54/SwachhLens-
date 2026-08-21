import { decode as decodeBase64 } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

import type { ReportLocation, ReportMedia } from '@/contexts/report-flow-context';
import type { WasteAnalysis } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';

const REPORT_MEDIA_BUCKET = 'report-media';

export type SubmitReportParams = {
  media: ReportMedia;
  analysis: WasteAnalysis;
  location: ReportLocation;
  comments: string;
};

export type SubmittedReport = {
  reportCode: string;
  createdAt: string;
};

function extensionFor(media: ReportMedia) {
  const fromMime = media.mimeType.split('/')[1]?.split('+')[0];
  if (fromMime) return fromMime;
  return media.kind === 'image' ? 'jpg' : 'mp4';
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
      category: params.analysis.category.label,
      category_confidence: params.analysis.category.confidencePercent,
      severity_label: params.analysis.severity.label,
      severity_score: params.analysis.severity.score,
      urgency_label: params.analysis.urgency.label,
      analysis: params.analysis,
    })
    .select('report_code, created_at')
    .single();

  if (insertError) {
    throw new Error(`Could not save report: ${insertError.message}`);
  }

  return { reportCode: `#${data.report_code}`, createdAt: data.created_at };
}
