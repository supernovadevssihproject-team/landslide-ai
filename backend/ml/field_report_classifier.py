"""Versioned field-report image classifier.

This is deliberately separate from the location-risk model. The v1 artifact
contains the supported label contract and thresholds; the inference adapter
uses deterministic image statistics plus the reporter's optional hazard hint.
A trained model can replace this adapter without changing the API contract.
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
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        image.verify()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValueError("image must be a valid JPEG, PNG, or WebP file") from exc
    image = Image.open(BytesIO(image_bytes)).convert("RGB").resize((32, 32))
    pixels = list(image.getdata())
    mean = tuple(sum(p[i] for p in pixels) / len(pixels) for i in range(3))
    hint = (hazard_type or "").strip()
    scores = {label: 0.05 for label in LABELS}
    if hint in LABELS:
        scores[hint] += 0.62
    # Reproducible visual cues: water-heavy imagery favors flood; dark/high-red
    # rocky imagery favors rockfall/landslide. These are triage cues, not risk.
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
