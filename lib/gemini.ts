const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export const WASTE_CATEGORIES = [
  'Overflowing Bin',
  'Garbage Dump',
  'Plastic Waste',
  'Construction Debris',
  'Organic Waste',
  'E-Waste',
  'Hazardous Waste',
  'Drain Blockage',
] as const;

export type WasteCategory = (typeof WASTE_CATEGORIES)[number];

export type RiskItem = {
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  percent: number;
  explanation: string;
};

export type WasteTypeDetection = {
  primaryType: WasteCategory;
  secondaryType: WasteCategory | 'None';
  confidencePercent: number;
  detectedObjects: string[];
  visualEvidence: string;
  explanation: string;
  typeComparison: { type: WasteCategory; percent: number }[];
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
  level: 'Low' | 'Medium' | 'High' | 'Critical';
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

export type WasteAnalysis = {
  wasteType: WasteTypeDetection;
  volume: VolumeEstimation;
  severity: SeverityAnalysis;
};

const RISK_ITEM_SCHEMA = {
  type: 'OBJECT',
  properties: {
    level: { type: 'STRING', enum: ['Low', 'Medium', 'High', 'Critical'] },
    percent: { type: 'NUMBER' },
    explanation: { type: 'STRING' },
  },
  required: ['level', 'percent', 'explanation'],
} as const;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    wasteType: {
      type: 'OBJECT',
      properties: {
        primaryType: { type: 'STRING', enum: WASTE_CATEGORIES },
        secondaryType: { type: 'STRING', enum: [...WASTE_CATEGORIES, 'None'] },
        confidencePercent: { type: 'NUMBER' },
        detectedObjects: { type: 'ARRAY', items: { type: 'STRING' } },
        visualEvidence: { type: 'STRING' },
        explanation: { type: 'STRING' },
        typeComparison: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              type: { type: 'STRING', enum: WASTE_CATEGORIES },
              percent: { type: 'NUMBER' },
            },
            required: ['type', 'percent'],
          },
        },
      },
      required: [
        'primaryType',
        'secondaryType',
        'confidencePercent',
        'detectedObjects',
        'visualEvidence',
        'explanation',
        'typeComparison',
      ],
    },
    volume: {
      type: 'OBJECT',
      properties: {
        size: { type: 'STRING', enum: ['Small', 'Medium', 'Large', 'Very Large'] },
        estimatedVolumeLiters: { type: 'STRING' },
        coveragePercent: { type: 'NUMBER' },
        scaleReference: { type: 'STRING' },
        confidencePercent: { type: 'NUMBER' },
        explanation: { type: 'STRING' },
      },
      required: [
        'size',
        'estimatedVolumeLiters',
        'coveragePercent',
        'scaleReference',
        'confidencePercent',
        'explanation',
      ],
    },
    severity: {
      type: 'OBJECT',
      properties: {
        level: { type: 'STRING', enum: ['Low', 'Medium', 'High', 'Critical'] },
        score: { type: 'NUMBER' },
        priority: { type: 'STRING', enum: ['Normal', 'High', 'Urgent'] },
        risks: {
          type: 'OBJECT',
          properties: {
            wasteVolume: RISK_ITEM_SCHEMA,
            location: RISK_ITEM_SCHEMA,
            drainage: RISK_ITEM_SCHEMA,
            hazard: RISK_ITEM_SCHEMA,
            spreadRoadBlocking: RISK_ITEM_SCHEMA,
          },
          required: ['wasteVolume', 'location', 'drainage', 'hazard', 'spreadRoadBlocking'],
        },
        reason: { type: 'STRING' },
      },
      required: ['level', 'score', 'priority', 'risks', 'reason'],
    },
  },
  required: ['wasteType', 'volume', 'severity'],
} as const;

const PROMPT = `You are the AI analysis engine behind SwachhLens, a civic app citizens use to report waste issues to their city. Analyze the attached photo or video and return a structured assessment for municipal cleanup crews.

Strict accuracy rules — follow these exactly:
- Only ever use these waste categories: ${WASTE_CATEGORIES.join(', ')}.
- Never invent information you cannot actually see. If something isn't visible or determinable, say so honestly in the explanation and give it a lower confidence score rather than guessing.
- Never claim an exact waste volume — always describe it as approximate.
- Keep every explanation short (one or two sentences) and written for an ordinary citizen, not a technical audience.

1. WASTE TYPE DETECTION
- primaryType: the single best-matching category.
- secondaryType: a second category if a meaningful secondary waste type is also visible, otherwise exactly "None".
- confidencePercent: 0-100 confidence in the primary type.
- detectedObjects: a short list of specific objects/materials you can see (e.g. "plastic bottles", "food waste", "cardboard").
- visualEvidence: a short phrase citing what you saw that supports this classification.
- explanation: one short sentence explaining the classification.
- typeComparison: if more than one waste type is meaningfully present, list each with an approximate relative percentage (should sum to roughly 100). If only one type is present, return a single entry at your confidence level.

2. WASTE VOLUME ESTIMATION
- size: one of Small, Medium, Large, Very Large.
- estimatedVolumeLiters: an approximate range as a string, e.g. "120-150 L". Never a single exact number.
- coveragePercent: your estimate of what percentage of the visible dumping area/frame is covered by waste.
- scaleReference: something visible in the frame you used to judge scale (e.g. "Dustbin detected", "Road width"), or an empty string if nothing usable is visible.
- confidencePercent: 0-100 confidence in this estimate.
- explanation: one short sentence.

3. SEVERITY ANALYSIS
- level: Low, Medium, High, or Critical.
- score: 0-100.
- priority: Normal, High, or Urgent.
- risks.wasteVolume / risks.drainage / risks.hazard / risks.spreadRoadBlocking: each a { level, percent (0-100), explanation } based only on what's visible in the image.
- risks.location: same shape, but base it on the location context given below. If no location context is given, return { level: "Low", percent: 0, explanation: "Not available - no location was provided." }.
- reason: one short sentence summarizing why this severity was assigned.`;

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
  }
  return trimmed;
}

export async function analyzeWasteMedia(params: {
  base64: string;
  mimeType: string;
  address?: string;
}): Promise<WasteAnalysis> {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY. Check your .env file.');
  }

  const locationContext = params.address
    ? `\n\nLocation context for this report: ${params.address}`
    : '\n\nNo location context was provided for this report.';

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT + locationContext },
            { inlineData: { mimeType: params.mimeType, data: params.base64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `AI analysis failed (${response.status}). ${errorBody || 'Please try again.'}`
    );
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('AI analysis returned no result. Please try again.');
  }

  try {
    return JSON.parse(stripCodeFence(text)) as WasteAnalysis;
  } catch {
    throw new Error('Could not parse the AI analysis result. Please try again.');
  }
}
