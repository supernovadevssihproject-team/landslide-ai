"""Evaluation entry point for the field report classifier.

When the model is absent or untrained, the script reports an honest status rather
than fabricating results.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODEL_FILE = ROOT / "artifacts" / "field_report_classifier_v2.onnx"


def main() -> None:
    metrics = {
        "status": "NOT MEASURED",
        "accuracy": "NOT MEASURED",
        "precision": "NOT MEASURED",
        "recall": "NOT MEASURED",
        "f1": "NOT MEASURED",
        "confusion_matrix": "NOT MEASURED",
        "notes": "The ONNX artifact is not present in this repository snapshot, so no real evaluation data exists.",
    }
    if not MODEL_FILE.exists():
        print(json.dumps(metrics, indent=2))
        return
    print(json.dumps({"status": "NOT MEASURED", "model_present": True}, indent=2))


if __name__ == "__main__":
    main()
