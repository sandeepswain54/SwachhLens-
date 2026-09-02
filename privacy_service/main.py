"""SwachhLens privacy-protection microservice.

Runs real OpenCV on every waste-report photo BEFORE it is sent to Gemini for
analysis or stored anywhere:
  - Human faces  -> detected with OpenCV's YuNet (cv2.FaceDetectorYN), a
    pretrained ONNX face detector shipped with OpenCV since 4.5.4.
  - Vehicle license plates -> detected with OpenCV's bundled Haar cascade
    (haarcascade_russian_plate_number.xml), a pretrained plate detector that
    ships with every opencv-python install.
Both are pixelated + blurred in place; everything else in the photo (the
waste, road, bins, vehicles themselves, etc.) is left untouched so the scene
stays clearly readable for Gemini and municipal officers.

The mobile app (lib/privacy.ts) calls POST /v1/protect with the original
photo and gets back only the redacted photo — the original bytes never
leave this function's memory and are never written to disk.
"""

import base64
import io
import os
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps
from pydantic import BaseModel

APP_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(APP_DIR, "models")
YUNET_MODEL_PATH = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")

# Shared secret the mobile app sends as `x-api-key`. Optional — if unset,
# the service accepts unauthenticated requests (fine for local/dev use, but
# set PRIVACY_SERVICE_API_KEY in production so this endpoint can't be used
# by anyone who finds the URL).
API_KEY = os.environ.get("PRIVACY_SERVICE_API_KEY")

MAX_IMAGE_BYTES = 15 * 1024 * 1024  # 15 MB, matches the app's downscaled photo quality

# How much to grow each detected box before blurring, so hairlines / plate
# edges right at the box boundary don't stay identifiable.
FACE_MARGIN = 0.25
PLATE_MARGIN = 0.25

app = FastAPI(title="SwachhLens Privacy Service")

_face_detector: Optional["cv2.FaceDetectorYN"] = None
_plate_cascade: Optional[cv2.CascadeClassifier] = None


def get_face_detector() -> "cv2.FaceDetectorYN":
    global _face_detector
    if _face_detector is None:
        if not os.path.exists(YUNET_MODEL_PATH):
            raise RuntimeError(
                f"YuNet model not found at {YUNET_MODEL_PATH}. "
                "Run download_models.sh (or see the Dockerfile) before starting the service."
            )
        _face_detector = cv2.FaceDetectorYN.create(
            YUNET_MODEL_PATH,
            "",
            (320, 320),
            score_threshold=0.6,
            nms_threshold=0.3,
            top_k=200,
        )
    return _face_detector


def get_plate_cascade() -> cv2.CascadeClassifier:
    global _plate_cascade
    if _plate_cascade is None:
        cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_russian_plate_number.xml")
        cascade = cv2.CascadeClassifier(cascade_path)
        if cascade.empty():
            raise RuntimeError(f"Could not load plate cascade from {cascade_path}")
        _plate_cascade = cascade
    return _plate_cascade


class ProtectRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"


class ProtectResponse(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"
    faces_detected: int
    plates_detected: int


def decode_image(image_base64: str) -> np.ndarray:
    try:
        raw = base64.b64decode(image_base64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="image_base64 is not valid base64.")

    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty image.")
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large.")

    try:
        # Decode + auto-rotate via PIL first so EXIF-rotated phone photos
        # (very common) get face/plate boxes that line up correctly.
        pil_image = Image.open(io.BytesIO(raw))
        pil_image = ImageOps.exif_transpose(pil_image)
        pil_image = pil_image.convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    rgb = np.array(pil_image)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    return bgr


def expand_box(x: int, y: int, w: int, h: int, margin: float, img_w: int, img_h: int):
    dx = int(w * margin)
    dy = int(h * margin)
    x0 = max(0, x - dx)
    y0 = max(0, y - dy)
    x1 = min(img_w, x + w + dx)
    y1 = min(img_h, y + h + dy)
    return x0, y0, x1, y1


def pixelate_region(image: np.ndarray, x0: int, y0: int, x1: int, y1: int) -> None:
    """Irreversibly pixelates + blurs the given region of `image` in place."""
    if x1 <= x0 or y1 <= y0:
        return
    roi = image[y0:y1, x0:x1]
    h, w = roi.shape[:2]
    if h == 0 or w == 0:
        return

    # Pixelate: shrink way down then blow back up with nearest-neighbor.
    small_w = max(1, w // 12)
    small_h = max(1, h // 12)
    small = cv2.resize(roi, (small_w, small_h), interpolation=cv2.INTER_LINEAR)
    pixelated = cv2.resize(small, (w, h), interpolation=cv2.INTER_NEAREST)

    # Extra Gaussian blur on top so even the pixelated blocks don't leave
    # any recoverable fine detail.
    ksize = max(3, (min(w, h) // 6) | 1)  # odd kernel size
    blurred = cv2.GaussianBlur(pixelated, (ksize, ksize), 0)

    image[y0:y1, x0:x1] = blurred


def detect_and_blur_faces(image: np.ndarray) -> int:
    h, w = image.shape[:2]
    detector = get_face_detector()
    detector.setInputSize((w, h))
    _, faces = detector.detect(image)
    if faces is None:
        return 0

    count = 0
    for face in faces:
        x, y, fw, fh = face[0:4].astype(int)
        x0, y0, x1, y1 = expand_box(x, y, fw, fh, FACE_MARGIN, w, h)
        pixelate_region(image, x0, y0, x1, y1)
        count += 1
    return count


def detect_and_blur_plates(image: np.ndarray) -> int:
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade = get_plate_cascade()

    # A plate is realistically never bigger than ~40% of the frame width nor
    # smaller than ~2.5% — bounding minSize/maxSize cuts down false positives
    # on unrelated rectangular waste/road texture.
    min_size = max(20, int(w * 0.025))
    max_size = int(w * 0.4)
    plates = cascade.detectMultiScale(
        gray,
        scaleFactor=1.08,
        minNeighbors=5,
        minSize=(min_size, min_size // 3 if min_size // 3 > 0 else 1),
        maxSize=(max_size, max_size),
    )

    count = 0
    for (x, y, pw, ph) in plates:
        x0, y0, x1, y1 = expand_box(x, y, pw, ph, PLATE_MARGIN, w, h)
        pixelate_region(image, x0, y0, x1, y1)
        count += 1
    return count


def encode_jpeg(image: np.ndarray) -> str:
    ok, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 90])
    if not ok:
        raise HTTPException(status_code=500, detail="Could not encode processed image.")
    return base64.b64encode(buffer.tobytes()).decode("ascii")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/v1/protect", response_model=ProtectResponse)
def protect(body: ProtectRequest, x_api_key: Optional[str] = Header(default=None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")

    image = decode_image(body.image_base64)

    try:
        faces_detected = detect_and_blur_faces(image)
    except Exception as exc:  # never let a face-detector crash leak the original image
        raise HTTPException(status_code=500, detail=f"Face detection failed: {exc}")

    try:
        plates_detected = detect_and_blur_plates(image)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Plate detection failed: {exc}")

    image_base64 = encode_jpeg(image)

    return ProtectResponse(
        image_base64=image_base64,
        mime_type="image/jpeg",
        faces_detected=faces_detected,
        plates_detected=plates_detected,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    # Fail closed with a generic message — never echo internals that could
    # hint at how to bypass detection, and never echo image bytes back.
    return JSONResponse(status_code=500, content={"detail": "Privacy processing failed."})
