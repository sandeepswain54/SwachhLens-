#!/usr/bin/env sh
# Downloads the YuNet face-detection ONNX model used by main.py. Run this
# once locally (or let the Dockerfile run it at build time) — the model is
# ~230KB, published by OpenCV in the opencv_zoo repo.
#
# NOTE: this pulls from opencv_zoo's `main` branch, which is not pinned to a
# commit (I couldn't verify a specific commit SHA without network access
# while writing this). For a fully reproducible build, replace `main` below
# with a commit SHA from https://github.com/opencv/opencv_zoo/commits/main
# after checking it still contains models/face_detection_yunet/.
set -eu

MODELS_DIR="$(dirname "$0")/models"
mkdir -p "$MODELS_DIR"

MODEL_URL="https://raw.githubusercontent.com/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
MODEL_PATH="$MODELS_DIR/face_detection_yunet_2023mar.onnx"

if [ -f "$MODEL_PATH" ]; then
  echo "YuNet model already present at $MODEL_PATH"
  exit 0
fi

echo "Downloading YuNet face detector model..."
curl -fL "$MODEL_URL" -o "$MODEL_PATH" || wget -O "$MODEL_PATH" "$MODEL_URL"
echo "Saved to $MODEL_PATH"
