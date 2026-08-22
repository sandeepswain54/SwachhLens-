import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

import type {
  AIInsight,
  AIOverviewStats,
  DuplicateCluster,
  DuplicateOverview,
  PrioritySlice,
  VolumeBucket,
} from './ai-stats';
import { formatAbsoluteDateTime } from './reports';
import type { CategorySlice, SeveritySlice } from './stats';

// Same Gemini endpoint/model as the mobile app's analysis engine (see
// lib/gemini.ts at the repo root) — kept as a separate copy for the same
// reason lib/analysis.ts is: the admin panel is its own Vite project. Reads
// the key from admin_panel/.env (VITE_PUBLIC_GEMINI_API_KEY), not the Expo
// app's EXPO_PUBLIC_GEMINI_API_KEY.
const GEMINI_API_KEY = import.meta.env.VITE_PUBLIC_GEMINI_API_KEY as string | undefined;
const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type AIReportInput = {
  dateRangeLabel: string;
  locationLabel: string;
  totalReports: number;
  overview: AIOverviewStats;
  categoryBreakdown: CategorySlice[];
  severityBreakdown: SeveritySlice[];
  volumeBuckets: VolumeBucket[];
  priorityDistribution: PrioritySlice[];
  duplicateOverview: DuplicateOverview;
  duplicateClusters: DuplicateCluster[];
  insights: AIInsight[];
};

type AINarrative = {
  executiveSummary: string;
  keyFindings: string[];
  categoryAnalysis: string;
  severityRiskAnalysis: string;
  volumeAnalysis: string;
  duplicateAnalysis: string;
  modelPerformanceSummary: string;
  recommendations: string[];
};

const NARRATIVE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    executiveSummary: { type: 'STRING' },
    keyFindings: { type: 'ARRAY', items: { type: 'STRING' } },
    categoryAnalysis: { type: 'STRING' },
    severityRiskAnalysis: { type: 'STRING' },
    volumeAnalysis: { type: 'STRING' },
    duplicateAnalysis: { type: 'STRING' },
    modelPerformanceSummary: { type: 'STRING' },
    recommendations: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: [
    'executiveSummary',
    'keyFindings',
    'categoryAnalysis',
    'severityRiskAnalysis',
    'volumeAnalysis',
    'duplicateAnalysis',
    'modelPerformanceSummary',
    'recommendations',
  ],
} as const;

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
  }
  return trimmed;
}

function buildPrompt(input: AIReportInput): string {
  const digest = {
    dateRange: input.dateRangeLabel,
    location: input.locationLabel,
    totalReports: input.totalReports,
    aiPredictions: input.overview.totalPredictions.value,
    classificationAccuracyPercent: Math.round(input.overview.classificationAccuracy.value * 10) / 10,
    volumeEstimationAccuracyPercent: Math.round(input.overview.volumeAccuracy.value * 10) / 10,
    duplicateDetectionRatePercent: Math.round(input.overview.duplicateDetectionRate.value * 10) / 10,
    reportsNeedingReview: input.overview.needsReview.value,
    wasteCategoryBreakdown: input.categoryBreakdown.map((c) => ({
      category: c.name,
      count: c.count,
      percent: Math.round(c.percent * 10) / 10,
    })),
    severityBreakdown: input.severityBreakdown.map((s) => ({
      level: s.label,
      count: s.count,
      percent: Math.round(s.percent * 10) / 10,
    })),
    estimatedVolumeByBucketTons: input.volumeBuckets.map((v) => ({
      bucket: v.label,
      approxTons: v.tons,
      reportCount: v.reportCount,
    })),
    aiPriorityScoreDistribution: input.priorityDistribution.map((p) => ({
      band: p.name,
      count: p.count,
      percent: Math.round(p.percent * 10) / 10,
    })),
    potentialDuplicates: input.duplicateOverview.potentialDuplicates,
    duplicateDetectionRatePercentAgain: Math.round(input.duplicateOverview.detectionRate * 10) / 10,
    topDuplicateClusters: input.duplicateClusters.map((c) => ({ area: c.locality, reportCount: c.count })),
    systemGeneratedInsights: input.insights.map((i) => `${i.title} (${i.subtitle})`),
  };

  return `You are an AI municipal-operations analyst writing a report for SwachhLens, a civic waste-reporting platform. Below is a JSON data digest computed directly from the platform's live database — real counts and percentages, not samples. Write a clear, professional analytics report for city sanitation officials based ONLY on this data. Do not invent numbers that aren't in the digest; when a section has thin data, keep it brief and say so.

DATA DIGEST:
${JSON.stringify(digest, null, 2)}

Write the report with these sections:
- executiveSummary: 3-5 sentences, high-level overview of AI-driven waste detection performance and civic conditions for this period/location.
- keyFindings: 4-6 short bullet-point sentences, the most important takeaways.
- categoryAnalysis: 2-4 sentences on the waste category breakdown and what it implies operationally.
- severityRiskAnalysis: 2-4 sentences on the severity distribution and risk level of the current backlog.
- volumeAnalysis: 2-4 sentences on estimated waste volume by size bucket and what it means for collection capacity planning. Always phrase tonnage as an AI-estimated approximation, never as a precise measurement.
- duplicateAnalysis: 2-4 sentences on duplicate detection rate and which areas show repeat reporting, and what that suggests about response gaps there.
- modelPerformanceSummary: 2-4 sentences on classification/volume confidence trends and what "reports needing review" implies for human-in-the-loop QA.
- recommendations: 4-6 short, concrete, actionable bullet-point sentences for the operations team.

Keep every sentence grounded in the digest above. Write in plain, professional English suitable for a printed government report.`;
}

async function requestNarrative(input: AIReportInput): Promise<AINarrative> {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing VITE_PUBLIC_GEMINI_API_KEY. Check admin_panel/.env.');
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(input) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: NARRATIVE_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`AI report generation failed (${response.status}). ${errorBody || 'Please try again.'}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned no content for the report. Please try again.');
  }

  try {
    return JSON.parse(stripCodeFence(text)) as AINarrative;
  } catch {
    throw new Error('Could not parse the AI report content. Please try again.');
  }
}

const HEADING_COLOR = '1B6B3A';

function h1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 140 },
    children: [new TextRun({ text, bold: true, color: HEADING_COLOR, size: 28 })],
  });
}

function body(text: string): Paragraph {
  return new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text, size: 22 })] });
}

function bullet(text: string): Paragraph {
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text, size: 22 })] });
}

function headerCell(text: string): TableCell {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: { fill: 'EAF3EF' },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20 })] })],
  });
}

function dataCell(text: string): TableCell {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text, size: 20 })] })],
  });
}

function metricsTable(rows: Array<[string, string]>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) => new TableRow({ children: [headerCell(label), dataCell(value)] })),
  });
}

function buildDocument(input: AIReportInput, narrative: AINarrative): Document {
  const generatedAt = formatAbsoluteDateTime(new Date().toISOString());

  return new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: 'SwachhLens AI Analytics Report', bold: true, size: 44, color: HEADING_COLOR })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({ text: `${input.dateRangeLabel}  ·  ${input.locationLabel}`, size: 22, color: '52514E' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 320 },
            children: [new TextRun({ text: `Generated ${generatedAt} · AI narrative by Gemini`, italics: true, size: 18, color: '898781' })],
          }),

          h1('Executive Summary'),
          body(narrative.executiveSummary),

          h1('Key Metrics'),
          metricsTable([
            ['Total Reports (selected range)', input.totalReports.toLocaleString()],
            ['AI Predictions Generated', input.overview.totalPredictions.value.toLocaleString()],
            ['Classification Accuracy', `${input.overview.classificationAccuracy.value.toFixed(1)}%`],
            ['Volume Estimation Accuracy', `${input.overview.volumeAccuracy.value.toFixed(1)}%`],
            ['Duplicate Detection Rate', `${input.overview.duplicateDetectionRate.value.toFixed(1)}%`],
            ['Reports Needing Review (<70% confidence)', input.overview.needsReview.value.toLocaleString()],
          ]),

          h1('Key Findings'),
          ...narrative.keyFindings.map(bullet),

          h1('Waste Category Analysis'),
          body(narrative.categoryAnalysis),
          metricsTable(input.categoryBreakdown.map((c) => [c.name, `${c.count.toLocaleString()} (${c.percent.toFixed(1)}%)`])),

          h1('Severity & Risk Analysis'),
          body(narrative.severityRiskAnalysis),
          metricsTable(input.severityBreakdown.map((s) => [s.label, `${s.count.toLocaleString()} (${s.percent.toFixed(1)}%)`])),

          h1('Volume Estimation (AI Approximate, in Tons)'),
          body(narrative.volumeAnalysis),
          metricsTable(
            input.volumeBuckets.map((v) => [`${v.label} ${v.rangeLabel}`, `${v.tons.toFixed(1)} t · ${v.reportCount} reports`])
          ),

          h1('AI Priority Score Distribution'),
          metricsTable(input.priorityDistribution.map((p) => [p.name, `${p.count.toLocaleString()} (${p.percent.toFixed(1)}%)`])),

          h1('Duplicate Detection'),
          body(narrative.duplicateAnalysis),
          metricsTable([
            ['Potential Duplicates', input.duplicateOverview.potentialDuplicates.toLocaleString()],
            ['Detection Rate', `${input.duplicateOverview.detectionRate.toFixed(1)}%`],
            ...input.duplicateClusters.map((c): [string, string] => [`${c.id} (${c.locality})`, `${c.count} reports`]),
          ]),

          h1('Model Performance Summary'),
          body(narrative.modelPerformanceSummary),

          h1('Recommendations'),
          ...narrative.recommendations.map(bullet),

          new Paragraph({
            spacing: { before: 400 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Generated by SwachhLens AI Analytics — narrative content produced by Gemini from live platform data.',
                italics: true,
                size: 16,
                color: '898781',
              }),
            ],
          }),
        ],
      },
    ],
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// Calls Gemini to turn the live-computed digest into a narrative, then
// assembles a real .docx (via the `docx` package) and triggers a browser
// download. Throws on any failure — the caller (GenerateReportButton) is
// responsible for surfacing that to the admin rather than silently
// producing a report with fabricated content.
export async function generateAIReport(input: AIReportInput): Promise<void> {
  const narrative = await requestNarrative(input);
  const doc = buildDocument(input, narrative);
  const blob = await Packer.toBlob(doc);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `swachhlens-ai-analytics-report-${stamp}.docx`);
}
