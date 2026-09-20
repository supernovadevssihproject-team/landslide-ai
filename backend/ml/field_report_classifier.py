"""Versioned field-report image classifier.

The production seam is classify_field_image(). Replace its implementation with
an exported Torch/ONNX/TFLite model without changing the API contract.
"""
import json
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Optional

from PIL import Image, UnidentifiedImageError

ARTIFACT = Path(__file__).parent / "artifacts" / "field_report_classifier_v1.json"
with ARTIFACT.open(encoding="utf-8") as f:
    CONFIG = json.load(f)
LABELS = tuple(CONFIG["labels"])


def classify_field_image(report_id: str, image_bytes: bytes, hazard_type: Optional[str] = None) -> dict:
    try:
        with Image.open(BytesIO(image_bytes)) as source:
            source.verify()
        with Image.open(BytesIO(image_bytes)) as source:
            image = source.convert("RGB").resize((32, 32))
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValueError("image must be a valid JPEG, PNG, or WebP file") from exc
    pixels = list(image.getdata())
    mean = tuple(sum(p[i] for p in pixels) / len(pixels) for i in range(3))
    scores = {label: 0.05 for label in LABELS}
    hint = (hazard_type or "").strip()
    if hint in LABELS:
        scores[hint] += 0.62
    brightness = sum(mean) / 3
    if mean[2] > mean[0] * 1.08:
        scores["flood"] += 0.20
    if mean[0] > mean[1] * 1.12 and brightness < 150:
        scores["landslide"] += 0.20
    if brightness < 95:
        scores["rockfall"] += 0.12
    total = sum(scores.values())
    label = max(scores, key=scores.get)
    confidence = round(min(0.99, max(0.01, scores[label] / total)), 2)
    if confidence < CONFIG["low_confidence_threshold"]:
        label, severity = "other", "UNKNOWN"
    elif confidence >= 0.80:
        severity = "HIGH"
    elif confidence >= 0.65:
        severity = "MEDIUM"
    else:
        severity = "LOW"
    return {"report_id": report_id, "predicted_class": label, "confidence": confidence,
            "severity": severity, "model_version": CONFIG["model_version"],
            "processed_at": datetime.now(timezone.utc).isoformat()}
