#!/usr/bin/env sh
# Downloads the YuNet face-detection ONNX model used by main.py. Run this
# once locally (or let the Dockerfile run it at build time) — the model is
# ~230KB, published by OpenCV in the opencv_zoo repo.
#
# IMPORTANT: opencv_zoo tracks *.onnx via Git LFS. raw.githubusercontent.com
# does NOT resolve LFS content — it serves the small LFS *pointer* text file
# instead of the real binary, which OpenCV then fails to parse ("Unsupported
# format or combination of formats"). media.githubusercontent.com is GitHub's
# LFS media endpoint and resolves the actual binary, so that's what this
# uses. A sanity check below also refuses to save anything that isn't a real
# binary ONNX file, so a broken download fails the build loudly instead of
# silently baking in a bad model.
#
# NOTE: this pulls from opencv_zoo's `main` branch, which is not pinned to a
# commit (I couldn't verify a specific commit SHA without network access
# while writing this). For a fully reproducible build, replace `main` below
# with a commit SHA from https://github.com/opencv/opencv_zoo/commits/main
# after checking it still contains models/face_detection_yunet/.
set -eu

MODELS_DIR="$(dirname "$0")/models"
mkdir -p "$MODELS_DIR"

MODEL_URL="https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
MODEL_PATH="$MODELS_DIR/face_detection_yunet_2023mar.onnx"

if [ -f "$MODEL_PATH" ] && [ "$(wc -c < "$MODEL_PATH")" -gt 100000 ]; then
  echo "YuNet model already present at $MODEL_PATH"
  exit 0
fi

echo "Downloading YuNet face detector model..."
curl -fL "$MODEL_URL" -o "$MODEL_PATH" || wget -O "$MODEL_PATH" "$MODEL_URL"

# ONNX files are protobuf binaries — a real one here is >100KB. An LFS
# pointer (or a 404/HTML error page saved as if it were the model) is only a
# few hundred bytes, so this catches a bad download instead of shipping it.
SIZE=$(wc -c < "$MODEL_PATH")
if [ "$SIZE" -lt 100000 ]; then
  echo "ERROR: downloaded model is only $SIZE bytes — this is not a real ONNX file" >&2
  echo "First bytes of what was downloaded:" >&2
  head -c 300 "$MODEL_PATH" >&2 || true
  rm -f "$MODEL_PATH"
  exit 1
fi

echo "Saved to $MODEL_PATH ($SIZE bytes)"
