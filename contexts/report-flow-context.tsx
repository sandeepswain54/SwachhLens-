import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import type { DuplicateCheck } from '@/lib/duplicate-check';
import type { WasteAnalysis } from '@/lib/gemini';

export type ReportMedia = {
  uri: string;
  mimeType: string;
  kind: 'image' | 'video';
};

export type ReportLocation = {
  latitude: number;
  longitude: number;
  address: string;
};

type ReportFlowState = {
  media: ReportMedia | null;
  analysis: WasteAnalysis | null;
  duplicate: DuplicateCheck | null;
  location: ReportLocation | null;
  comments: string;
  reportId: string | null;
  submittedAt: string | null;
  // Whether the just-submitted report was linked to an existing ticket
  // (20m geo-deduplication) instead of creating a new one, and whether this
  // user had already reported/confirmed it before (anti-spam) — see
  // submitReport() in lib/reports.ts.
  merged: boolean;
  alreadyReported: boolean;
  setMedia: (media: ReportMedia | null) => void;
  setAnalysis: (analysis: WasteAnalysis | null) => void;
  setDuplicate: (duplicate: DuplicateCheck | null) => void;
  setLocation: (location: ReportLocation | null) => void;
  setComments: (comments: string) => void;
  applySubmission: (result: {
    reportId: string;
    submittedAt: string;
    merged: boolean;
    alreadyReported: boolean;
  }) => void;
  reset: () => void;
};

const ReportFlowContext = createContext<ReportFlowState | null>(null);

export function ReportFlowProvider({ children }: PropsWithChildren) {
  const [media, setMedia] = useState<ReportMedia | null>(null);
  const [analysis, setAnalysis] = useState<WasteAnalysis | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateCheck | null>(null);
  const [location, setLocation] = useState<ReportLocation | null>(null);
  const [comments, setComments] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [merged, setMerged] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  const value = useMemo<ReportFlowState>(
    () => ({
      media,
      analysis,
      duplicate,
      location,
      comments,
      reportId,
      submittedAt,
      merged,
      alreadyReported,
      setMedia,
      setAnalysis,
      setDuplicate,
      setLocation,
      setComments,
      applySubmission: (result) => {
        setReportId(result.reportId);
        setSubmittedAt(result.submittedAt);
        setMerged(result.merged);
        setAlreadyReported(result.alreadyReported);
      },
      reset: () => {
        setMedia(null);
        setAnalysis(null);
        setDuplicate(null);
        setLocation(null);
        setComments('');
        setReportId(null);
        setSubmittedAt(null);
        setMerged(false);
        setAlreadyReported(false);
      },
    }),
    [media, analysis, duplicate, location, comments, reportId, submittedAt, merged, alreadyReported]
  );

  return <ReportFlowContext.Provider value={value}>{children}</ReportFlowContext.Provider>;
}

export function useReportFlow() {
  const ctx = useContext(ReportFlowContext);
  if (!ctx) {
    throw new Error('useReportFlow must be used within a ReportFlowProvider');
  }
  return ctx;
}
