// Calls the SwachhLens privacy-protection microservice (see
// /privacy_service) which runs real OpenCV — YuNet for faces, a plate
// detection cascade for vehicle license plates — to blur every visible
// human face and license plate before a photo is analyzed by Gemini or
// stored anywhere. This step is mandatory: nothing downstream (Gemini
// analysis, Supabase Storage) should ever see the original, unprotected
// photo. See report-scan.tsx for where this sits between waste-image
// validation and the existing Gemini analysis.

const PRIVACY_SERVICE_URL = process.env.EXPO_PUBLIC_PRIVACY_SERVICE_URL;
const PRIVACY_SERVICE_API_KEY = process.env.EXPO_PUBLIC_PRIVACY_SERVICE_API_KEY;

export type PrivacyProtectionResult = {
  base64: string;
  mimeType: string;
  facesBlurred: number;
  platesBlurred: number;
};

// Throws on any failure (missing config, network error, non-200, malformed
// response) — callers must treat a thrown error as "stop the report safely"
// per the privacy-processing error-handling requirement: never fall back to
// the original image, never silently skip this step.
export async function protectImagePrivacy(params: {
  base64: string;
  mimeType: string;
}): Promise<PrivacyProtectionResult> {
  if (!PRIVACY_SERVICE_URL) {
    throw new Error(
      'Missing EXPO_PUBLIC_PRIVACY_SERVICE_URL. Check your .env file — see privacy_service/README.md.'
    );
  }

  let response: Response;
  try {
    response = await fetch(`${PRIVACY_SERVICE_URL.replace(/\/$/, '')}/v1/protect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(PRIVACY_SERVICE_API_KEY ? { 'x-api-key': PRIVACY_SERVICE_API_KEY } : {}),
      },
      body: JSON.stringify({ image_base64: params.base64, mime_type: params.mimeType }),
    });
  } catch {
    throw new Error(
      'Could not reach the privacy protection service. Please check your connection and try again.'
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      `Privacy protection failed (${response.status}). ${body?.detail || 'Please try again.'}`
    );
  }

  const json = await response.json().catch(() => null);
  if (!json?.image_base64) {
    throw new Error('Privacy protection returned no result. Please try again.');
  }

  return {
    base64: json.image_base64,
    mimeType: json.mime_type || 'image/jpeg',
    facesBlurred: json.faces_detected ?? 0,
    platesBlurred: json.plates_detected ?? 0,
  };
}
