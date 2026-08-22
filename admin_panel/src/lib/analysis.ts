// Mirrors the AI analysis shape the mobile app writes to `reports.analysis`
// (see lib/gemini.ts and lib/duplicate-check.ts at the repo root) — kept as a
// separate copy because the admin panel is its own Vite project and can't
// import across the Expo app's package boundary. If those shapes change,
// update both.

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type RiskItem = {
  level: RiskLevel;
  percent: number;
  explanation: string;
};

export type WasteTypeDetection = {
  primaryType: string;
  secondaryType: string;
  confidencePercent: number;
  detectedObjects: string[];
  visualEvidence: string;
  explanation: string;
  typeComparison: { type: string; percent: number }[];
};

export type VolumeEstimation = {
  size: 'Small' | 'Medium' | 'Large' | 'Very Large';
  estimatedVolumeLiters: string;
  coveragePercent: number;
  scaleReference: string;
  confidencePercent: number;
  explanation: string;
};

export type SeverityAnalysis = {
  level: RiskLevel;
  score: number;
  priority: 'Normal' | 'High' | 'Urgent';
  risks: {
    wasteVolume: RiskItem;
    location: RiskItem;
    drainage: RiskItem;
    hazard: RiskItem;
    spreadRoadBlocking: RiskItem;
  };
  reason: string;
};

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

export type ReportAnalysis = {
  wasteType: WasteTypeDetection;
  volume: VolumeEstimation;
  severity: SeverityAnalysis;
  duplicate: DuplicateCheck | null;
};

// Some early reports were written by an older analysis pipeline whose JSON
// shape doesn't match ReportAnalysis at all (no `wasteType`/`volume` keys —
// different fields entirely, e.g. `category`/`urgency`/`spread`). The `analysis`
// column's `ReportAnalysis | null` type only promises "null or the current
// shape", which isn't true for those legacy rows, so anything reading
// `analysis.volume`/`analysis.wasteType` must go through this guard rather
// than trusting `analysis !== null` — that's what was crashing the AI
// Analytics page (and would crash the Complaints AI tab) on old data.
export function hasModernAnalysis(analysis: ReportAnalysis | null): analysis is ReportAnalysis {
  return !!analysis && 'wasteType' in analysis && 'volume' in analysis;
}
