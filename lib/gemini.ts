const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type WasteAnalysis = {
  category: { emoji: string; label: string; confidencePercent: number };
  composition: { material: string; level: 'High' | 'Medium' | 'Low' }[];
  severity: { emoji: string; label: string; score: number };
  estimatedSize: { description: string; coveragePercent: number; scaleReference: string };
  spread: { label: string; description: string };
  environmentalRisk: { emoji: string; level: string; description: string };
  locationSensitivity: { emoji: string; label: string; note: string };
  urgency: { emoji: string; label: string; recommendation: string };
  recommendedCleanup: { emoji: string; resource: string }[];
};

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    category: {
      type: 'OBJECT',
      properties: {
        emoji: { type: 'STRING' },
        label: { type: 'STRING' },
        confidencePercent: { type: 'NUMBER' },
      },
      required: ['emoji', 'label', 'confidencePercent'],
    },
    composition: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          material: { type: 'STRING' },
          level: { type: 'STRING', enum: ['High', 'Medium', 'Low'] },
        },
        required: ['material', 'level'],
      },
    },
    severity: {
      type: 'OBJECT',
      properties: {
        emoji: { type: 'STRING' },
        label: { type: 'STRING' },
        score: { type: 'NUMBER' },
      },
      required: ['emoji', 'label', 'score'],
    },
    estimatedSize: {
      type: 'OBJECT',
      properties: {
        description: { type: 'STRING' },
        coveragePercent: { type: 'NUMBER' },
        scaleReference: { type: 'STRING' },
      },
      required: ['description', 'coveragePercent', 'scaleReference'],
    },
    spread: {
      type: 'OBJECT',
      properties: {
        label: { type: 'STRING' },
        description: { type: 'STRING' },
      },
      required: ['label', 'description'],
    },
    environmentalRisk: {
      type: 'OBJECT',
      properties: {
        emoji: { type: 'STRING' },
        level: { type: 'STRING' },
        description: { type: 'STRING' },
      },
      required: ['emoji', 'level', 'description'],
    },
    locationSensitivity: {
      type: 'OBJECT',
      properties: {
        emoji: { type: 'STRING' },
        label: { type: 'STRING' },
        note: { type: 'STRING' },
      },
      required: ['emoji', 'label', 'note'],
    },
    urgency: {
      type: 'OBJECT',
      properties: {
        emoji: { type: 'STRING' },
        label: { type: 'STRING' },
        recommendation: { type: 'STRING' },
      },
      required: ['emoji', 'label', 'recommendation'],
    },
    recommendedCleanup: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          emoji: { type: 'STRING' },
          resource: { type: 'STRING' },
        },
        required: ['emoji', 'resource'],
      },
    },
  },
  required: [
    'category',
    'composition',
    'severity',
    'estimatedSize',
    'spread',
    'environmentalRisk',
    'locationSensitivity',
    'urgency',
    'recommendedCleanup',
  ],
} as const;

const PROMPT = `You are the waste-analysis engine behind SwachhLens, a civic app citizens use to report waste dumping issues to their city. Analyze the attached photo or video of a reported waste issue and produce a structured assessment for municipal cleanup crews.

Fill in every field of the JSON response:
- category: the type of waste issue shown (e.g. "Garbage Dump", "Overflowing Bin", "Littering", "Construction Debris") with an emoji and your confidence (0-100) that this classification is correct.
- composition: estimate the rough mix of materials visible (Plastic, Organic waste, Paper, Other mixed waste, etc.) each rated High/Medium/Low.
- severity: an overall severity label (e.g. "Small", "Moderate", "Large") with an emoji (🟢/🟡/🔴) and a 0-100 severity score, based primarily on the visible waste volume and apparent risk. Note: report frequency and complaint age at this location aren't available to you yet, so base this purely on what's visible.
- estimatedSize: a short description of the waste region, your best-guess percentage of the visible frame/area covered by waste, and what you used as a scale reference (e.g. nearby objects, road width). Always describe this as an approximate visual estimate, never an exact physical measurement.
- spread: whether the waste is contained to one spot or spread across a wider area, with a one-sentence description.
- environmentalRisk: a risk level (e.g. "Low", "Moderate", "Moderate-High", "High") with an emoji and a short note on the specific risk (blockage, contamination, health hazard, etc.).
- locationSensitivity: given the location context below (if provided), classify how sensitive the location is (e.g. "Residential roadside", "Isolated / low-traffic", "Near water body", "Public park") with an emoji and a short note on why that matters for prioritization.
- urgency: an overall priority label (e.g. "LOW PRIORITY", "MEDIUM PRIORITY", "HIGH PRIORITY") with an emoji and a one-sentence recommended response.
- recommendedCleanup: 1-3 resources a cleanup crew would likely need (e.g. "Extra workers", "Mini truck", "Protective gear"), each with a fitting emoji.

Be realistic and conservative — this feeds a real municipal dashboard.`;

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
    : '';

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
