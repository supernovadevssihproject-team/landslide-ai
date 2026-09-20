"""Dataset preparation entry point for the field report classifier.

This script intentionally does not auto-download anything when the app starts.
It is a manual preparation utility that can be used once a rights-cleared dataset
has been approved and downloaded.
"""
from __future__ import annotations

import json
from pathlib import Path

DATASET_ROOT = Path(__file__).resolve().parent / "datasets" / "field_report_classifier"


def create_manifest() -> dict:
    return {
        "status": "NOT TRAINED",
        "dataset_root": str(DATASET_ROOT),
        "classes": ["landslide", "rockfall", "roadBlockage", "slopeFailure", "flood", "other"],
        "split_strategy": "NOT TRAINED",
        "notes": "External dataset approval, downloads, deduplication, and license verification are required before training.",
    }


def main() -> None:
    manifest = create_manifest()
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
