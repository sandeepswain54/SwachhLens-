# SwachhLens Privacy Service

A small FastAPI microservice that runs real OpenCV on waste-report photos
before they're analyzed by Gemini or stored — blurring/pixelating every
detected human face (OpenCV YuNet) and vehicle license plate (OpenCV Haar
cascade) while leaving the rest of the scene untouched.

This exists because the SwachhLens mobile app is a pure Expo-managed React
Native app with no native modules and no backend server of its own — there's
nowhere for real OpenCV to run inside the app or inside a Supabase Edge
Function. This service is called over plain HTTPS from `lib/privacy.ts`,
the same way the app already calls Gemini directly.

## API

`POST /v1/protect`

Headers: `Content-Type: application/json`, optionally `x-api-key: <your key>`
if `PRIVACY_SERVICE_API_KEY` is set.

Body:
```json
{ "image_base64": "...", "mime_type": "image/jpeg" }
```

Response (200):
```json
{
  "image_base64": "...",
  "mime_type": "image/jpeg",
  "faces_detected": 2,
  "plates_detected": 1
}
```

On any failure this returns a non-200 with `{ "detail": "..." }` and never
echoes back the original image — the mobile app treats any non-200 as
"privacy processing failed" and aborts the report instead of falling back
to the original photo.

`GET /health` — plain liveness check for your hosting platform.

## Run locally

```bash
cd privacy_service
python -m venv .venv && . .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
sh download_models.sh          # or download_models.sh via Git Bash on Windows
uvicorn main:app --reload --port 8000
```

## Deploy

Any host that runs a Docker container works (this was written against
Render's free web-service tier, which is enough for this workload):

1. Push this repo (or just this folder) somewhere Render/Railway/Fly can
   build from.
2. Create a new Web Service pointing at `privacy_service/Dockerfile`.
3. Set the env var `PRIVACY_SERVICE_API_KEY` to a random secret string.
4. Once deployed, note the public URL (e.g. `https://swachhlens-privacy.onrender.com`).
5. In the app's `.env`, set:
   ```
   EXPO_PUBLIC_PRIVACY_SERVICE_URL=https://swachhlens-privacy.onrender.com
   EXPO_PUBLIC_PRIVACY_SERVICE_API_KEY=<same random secret string>
   ```

Note: like `EXPO_PUBLIC_GEMINI_API_KEY` already in this repo, both of these
`EXPO_PUBLIC_*` values are bundled into the client and are visible to anyone
who inspects the app — that's an existing tradeoff in this codebase, not
one introduced here. Don't reuse a secret you use anywhere else for it.

Render's free tier spins down after inactivity — the first request after a
cold start can take 30-60s while the container boots. If that's a problem,
either pay for an always-on instance or switch hosts.

## Detection notes / limitations

- **Faces**: YuNet (`cv2.FaceDetectorYN`) is a real pretrained deep-learning
  face detector, generally reliable across angles/lighting.
- **License plates**: `haarcascade_russian_plate_number.xml` ships with
  every `opencv-python` install. It's a classic Haar cascade — decent at
  catching plate-shaped rectangles but, unlike YuNet, not a modern detector,
  so it can occasionally miss plates at odd angles or produce a false
  positive on plate-shaped clutter. Both detected-region boxes are grown by
  25% before blurring specifically to absorb small misses at the edges. If
  plate recall needs to improve later, swap `get_plate_cascade()` in
  `main.py` for an ONNX plate detector the same way `get_face_detector()`
  uses YuNet — the rest of the pipeline doesn't change.
