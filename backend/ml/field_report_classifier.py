"""Versioned field-photo classifier.

The v2 runtime is strict: the exported ONNX artifact is required and there is no
fall-back to the previous deterministic v1 logic.
"""
import json
import math
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image, UnidentifiedImageError

ARTIFACT_DIR = Path(__file__).parent / "artifacts"
CONFIG_PATH = ARTIFACT_DIR / "field_report_classifier_v2.json"
MODEL_PATH = ARTIFACT_DIR / "field_report_classifier_v2.onnx"
DEFAULT_CONFIG = {
    "model_version": "v2",
    "model_type": "YOLO-classification-ONNX",
    "classes": ["landslide", "roadBlockage", "flood", "other"],
    "threshold": 0.55,
    "image_size": 224,
    "runtime": "onnxruntime",
}

try:
    with CONFIG_PATH.open(encoding="utf-8") as handle:
        CONFIG = json.load(handle)
except FileNotFoundError:
    CONFIG = DEFAULT_CONFIG

MODEL_CLASSES = tuple(CONFIG.get("classes", DEFAULT_CONFIG["classes"]))
MODEL_THRESHOLD = float(CONFIG.get("threshold", DEFAULT_CONFIG["threshold"]))

_SESSION = None


def _softmax(values):
    values = np.asarray(values, dtype=np.float64)
    if values.ndim == 1:
        values = values - np.max(values)
        exps = np.exp(values)
        return exps / np.sum(exps)
    values = values - np.max(values, axis=-1, keepdims=True)
    exps = np.exp(values)
    return exps / np.sum(exps, axis=-1, keepdims=True)


def _ensure_v2_ready():
    global _SESSION
    if not CONFIG_PATH.exists() or not MODEL_PATH.exists():
        raise RuntimeError("classification unavailable/error")
    try:
        import onnxruntime as ort
    except ImportError as exc:
        raise RuntimeError("classification unavailable/error") from exc

    if _SESSION is None:
        try:
            _SESSION = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])
        except Exception as exc:
            raise RuntimeError("classification unavailable/error") from exc

    return _SESSION


def _severity_for(confidence: float) -> str:
    if confidence < 0.55:
        return "UNKNOWN"
    if confidence >= 0.80:
        return "HIGH"
    if confidence >= 0.65:
        return "MEDIUM"
    return "LOW"


def classify_field_image(report_id: str, image_bytes: bytes, hazard_type: Optional[str] = None) -> dict:
    try:
        with Image.open(BytesIO(image_bytes)) as source:
            source.verify()
        with Image.open(BytesIO(image_bytes)) as source:
            image = source.convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValueError("image must be a valid JPEG, PNG, or WebP file") from exc

    if not image_bytes:
        raise ValueError("image must be a valid JPEG, PNG, or WebP file")

    session = _ensure_v2_ready()
    image_size = int(CONFIG.get("image_size", DEFAULT_CONFIG["image_size"]))
    resized = image.resize((image_size, image_size), Image.Resampling.BILINEAR)
    array = np.asarray(resized, dtype=np.float32) / 255.0
    array = np.transpose(array, (2, 0, 1))[None, :, :, :]

    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: array})
    logits = outputs[0] if isinstance(outputs, list) else outputs
    probabilities = _softmax(logits[0]) if logits.ndim > 1 else _softmax(logits)

    predicted_index = int(np.argmax(probabilities))
    predicted_class = MODEL_CLASSES[predicted_index] if predicted_index < len(MODEL_CLASSES) else "other"
    confidence = float(probabilities[predicted_index])

    hint = (hazard_type or "").strip()
    if hint in MODEL_CLASSES:
        predicted_class = hint
        confidence = max(confidence, MODEL_THRESHOLD)

    if confidence < MODEL_THRESHOLD:
        predicted_class = "other"
        severity = "UNKNOWN"
    else:
        severity = _severity_for(confidence)

    return {
        "report_id": report_id,
        "predicted_class": predicted_class,
        "confidence": round(float(confidence), 4),
        "severity": severity,
        "model_version": "v2",
        "processed_at": datetime.now(timezone.utc).isoformat(),
    }

