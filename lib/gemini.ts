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

const LANGUAGE_NAME: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (हिंदी)',
  or: 'Odia (ଓଡ଼ିଆ)',
};

// ---- Retry/timeout wrapper ----
//
// Gemini occasionally returns 503 ("model is currently experiencing high
// demand") or other transient errors — these are momentary upstream
// overload, not something wrong with the request, and used to bubble
// straight up to the UI as a hard failure. Retrying a couple of times with
// a short backoff clears almost all of them without the user ever seeing an
// error. A per-attempt timeout also keeps a stalled request from hanging
// the analysis screen indefinitely instead of failing fast enough to retry.
const REQUEST_TIMEOUT_MS = 20000;
const RETRY_DELAYS_MS = [600, 1800]; // 2 retries => 3 attempts total

function isRetryableStatus(status: number) {
  return status === 503 || status === 429 || status === 500 || status === 502 || status === 504;
}

async function fetchGeminiWithRetry(url: string, body: unknown): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok && isRetryableStatus(response.status) && attempt < RETRY_DELAYS_MS.length) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        continue;
      }
      return response;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        continue;
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Could not reach the AI service. Please check your connection and try again.');
}

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
  // The citizen/field member's chosen app language ('en' | 'hi' | 'or') —
  // every free-text field in the response (explanations, visual evidence,
  // reason, etc.) comes back written in this language in real time, matching
  // whatever was picked on the language-select screen or in Profile. The
  // enum fields (primaryType, level, size, ...) always stay the fixed
  // English tokens the schema requires — those are translated for display
  // separately, in lib/i18n/translations.ts, since they're also stored and
  // read by the admin panel.
  language?: string;
}): Promise<WasteAnalysis> {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY. Check your .env file.');
  }

  const locationContext = params.address
    ? `\n\nLocation context for this report: ${params.address}`
    : '\n\nNo location context was provided for this report.';

  const languageName = (params.language && LANGUAGE_NAME[params.language]) || null;
  const languageInstruction =
    languageName && languageName !== 'English'
      ? `\n\nLanguage: write every free-text value (explanation, visualEvidence, scaleReference, reason, and each risk's explanation) in ${languageName}, in natural everyday wording an ordinary citizen would use — not a literal machine translation. detectedObjects entries should also be in ${languageName}. Keep every enum field (primaryType, secondaryType, size, level, priority, typeComparison[].type) exactly as one of the fixed English tokens listed above — never translate those.`
      : '';

  const response = await fetchGeminiWithRetry(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    contents: [
      {
        parts: [
          { text: PROMPT + locationContext + languageInstruction },
          { inlineData: { mimeType: params.mimeType, data: params.base64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
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

// ---- Waste image validation (gatekeeper) ----
//
// Runs BEFORE any OpenCV privacy processing or the detailed analysis above
// — rejects photos with no genuine waste/sanitation issue (selfies,
// screenshots, scenery, random objects, ...) so nothing invalid ever gets a
// report created or a photo stored. Deliberately a separate, smaller Gemini
// call/schema so the existing analyzeWasteMedia prompt above is untouched.

const VALIDATION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isWasteIssue: { type: 'BOOLEAN' },
    confidencePercent: { type: 'NUMBER' },
    reason: { type: 'STRING' },
  },
  required: ['isWasteIssue', 'confidencePercent', 'reason'],
} as const;

const VALIDATION_PROMPT = `You are the image gatekeeper for SwachhLens, a civic app citizens use to report waste and sanitation issues to their city. Look at the attached photo and decide ONLY whether it clearly shows a genuine, meaningful waste or sanitation problem worth reporting to a municipal cleanup crew.

Accept photos showing things like: garbage piles, plastic waste, organic/food waste, overflowing dustbins, construction debris, e-waste, hazardous waste, illegal dumping, uncollected garbage, garbage on roads, or garbage blocking/near drains.

Reject photos such as: selfies or portraits, photos focused only on people, random animals, nature/scenery with no waste issue, random buildings, clean roads with no waste, random vehicles with no visible waste problem, screenshots, documents, memes/graphics, blank or completely dark images, or anything else unrelated to waste/sanitation.

Be strict: do not accept an image just because some object could loosely be mistaken for waste — there must be a genuine, clearly visible waste or sanitation problem in the photo.

Respond with:
- isWasteIssue: true only if the image clearly shows a genuine waste/sanitation problem, false otherwise.
- confidencePercent: 0-100, your confidence in that judgment.
- reason: one short sentence explaining what you saw and why you accepted or rejected it.`;

// Below this confidence, treat an "accepted" result as a reject too — keeps
// borderline/uncertain guesses from letting through an unrelated photo.
const VALIDATION_ACCEPT_THRESHOLD = 55;

export type WasteImageValidation = {
  isValid: boolean;
  confidencePercent: number;
  reason: string;
};

export async function validateWasteImage(params: {
  base64: string;
  mimeType: string;
}): Promise<WasteImageValidation> {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY. Check your .env file.');
  }

  const response = await fetchGeminiWithRetry(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    contents: [
      {
        parts: [
          { text: VALIDATION_PROMPT },
          { inlineData: { mimeType: params.mimeType, data: params.base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: VALIDATION_SCHEMA,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `Image validation failed (${response.status}). ${errorBody || 'Please try again.'}`
    );
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Image validation returned no result. Please try again.');
  }

  let parsed: { isWasteIssue: boolean; confidencePercent: number; reason: string };
  try {
    parsed = JSON.parse(stripCodeFence(text));
  } catch {
    throw new Error('Could not parse the image validation result. Please try again.');
  }

  return {
    isValid: parsed.isWasteIssue === true && parsed.confidencePercent >= VALIDATION_ACCEPT_THRESHOLD,
    confidencePercent: parsed.confidencePercent,
    reason: parsed.reason,
  };
}
