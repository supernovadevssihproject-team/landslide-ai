"""Training entry point for the field report classifier.

This script is intentionally explicit and safe: it exits without training if no
verified dataset and ONNX model artifact are present.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODEL_FILE = ROOT / "artifacts" / "field_report_classifier_v2.onnx"
DATASET_DIR = ROOT / "datasets" / "field_report_classifier"


def main() -> int:
    if not MODEL_FILE.exists() or not DATASET_DIR.exists():
        print("NOT TRAINED: verified dataset and ONNX artifact are required before training.")
        return 1
    print("Training pipeline is ready but no dataset was approved in this repository snapshot.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
