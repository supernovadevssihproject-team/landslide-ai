"""Versioned field-report image classifier.

This module intentionally exposes the v2 inference seam. The previous v1 heuristic
classifier is retained only as a historical reference and is not used as a silent
fallback.
"""
from __future__ import annotations

from backend.ml.field_report_classifier_v2 import classify_field_image

__all__ = ["classify_field_image"]
