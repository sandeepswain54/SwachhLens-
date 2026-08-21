import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

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
  location: ReportLocation | null;
  comments: string;
  reportId: string | null;
  submittedAt: string | null;
  setMedia: (media: ReportMedia | null) => void;
  setAnalysis: (analysis: WasteAnalysis | null) => void;
  setLocation: (location: ReportLocation | null) => void;
  setComments: (comments: string) => void;
  applySubmission: (result: { reportId: string; submittedAt: string }) => void;
  reset: () => void;
};

const ReportFlowContext = createContext<ReportFlowState | null>(null);

export function ReportFlowProvider({ children }: PropsWithChildren) {
  const [media, setMedia] = useState<ReportMedia | null>(null);
  const [analysis, setAnalysis] = useState<WasteAnalysis | null>(null);
  const [location, setLocation] = useState<ReportLocation | null>(null);
  const [comments, setComments] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const value = useMemo<ReportFlowState>(
    () => ({
      media,
      analysis,
      location,
      comments,
      reportId,
      submittedAt,
      setMedia,
      setAnalysis,
      setLocation,
      setComments,
      applySubmission: (result) => {
        setReportId(result.reportId);
        setSubmittedAt(result.submittedAt);
      },
      reset: () => {
        setMedia(null);
        setAnalysis(null);
        setLocation(null);
        setComments('');
        setReportId(null);
        setSubmittedAt(null);
      },
    }),
    [media, analysis, location, comments, reportId, submittedAt]
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
