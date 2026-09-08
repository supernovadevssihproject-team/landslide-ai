"""
LandslideGuard ML Model and Pipeline Router
Exposes the trained Random Forest classifier, feature preprocessing pipeline,
evaluation metrics, model comparison, feature importance, and datasets inventory.
"""

from pathlib import Path
import csv
import json
import warnings
from typing import Dict, Any, List, Optional

import joblib
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

warnings.filterwarnings("ignore")

router = APIRouter(prefix="/api/ml", tags=["ML Model and Pipeline"])

# ============================================================
# PATH CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ML_OUTPUTS_DIR = BASE_DIR / "ml" / "outputs"
DATA_DIR = BASE_DIR / "data" / "landslides"

MODEL_PATH = ML_OUTPUTS_DIR / "best_model.pkl"
PREPROCESSOR_PATH = ML_OUTPUTS_DIR / "preprocessing_pipeline.pkl"
METRICS_PATH = ML_OUTPUTS_DIR / "reports" / "evaluation_metrics.json"
COMPARISON_PATH = ML_OUTPUTS_DIR / "model_comparison.csv"
FEATURE_IMPORTANCE_PATH = ML_OUTPUTS_DIR / "feature_importance.csv"

# Load models into memory
ml_model = None
ml_preprocessor = None

try:
    if MODEL_PATH.exists():
        ml_model = joblib.load(MODEL_PATH)
        print(f"[ML Pipeline] Loaded model: {type(ml_model).__name__}")
    if PREPROCESSOR_PATH.exists():
        ml_preprocessor = joblib.load(PREPROCESSOR_PATH)
        print(f"[ML Pipeline] Loaded preprocessor: {type(ml_preprocessor).__name__}")
except Exception as e:
    print(f"[ML Pipeline] Warning: Could not initialize model or preprocessor: {e}")


# ============================================================
# PYDANTIC SCHEMAS
# ============================================================

class LandslidePredictionInput(BaseModel):
    elevation: float = Field(..., ge=0, description="Elevation in meters", example=1450.0)
    slope: float = Field(..., ge=0, le=90, description="Slope in degrees", example=35.0)
    aspect: float = Field(..., ge=0, le=360, description="Aspect in degrees", example=180.0)
    soil_id: str = Field(..., description="Soil classification ID", example="4276.0")
    landcover_class: str = Field(..., description="Land-cover class ID", example="50.0")
    rainfall_1d: float = Field(..., ge=0, description="1-day cumulative rainfall (mm)", example=55.0)
    rainfall_3d: float = Field(..., ge=0, description="3-day cumulative rainfall (mm)", example=110.0)
    rainfall_7d: float = Field(..., ge=0, description="7-day cumulative rainfall (mm)", example=180.0)
    rainfall_15d: float = Field(..., ge=0, description="15-day cumulative rainfall (mm)", example=240.0)
    rainfall_30d: float = Field(..., ge=0, description="30-day cumulative rainfall (mm)", example=350.0)


# ============================================================
# ENDPOINTS
# ============================================================

@router.get("/model-info")
def get_model_info():
    """Returns metadata about the active ML model."""
    return {
        "project": "LandslideGuard NER Early Warning System",
        "model_name": "Random Forest Classifier (Optimized)",
        "model_type": type(ml_model).__name__ if ml_model else "Not Loaded",
        "preprocessor_type": type(ml_preprocessor).__name__ if ml_preprocessor else "Not Loaded",
        "target": "landslide_occurrence (0: Safe, 1: Landslide)",
        "training_records": 523,
        "test_records": 131,
        "features": [
            "elevation",
            "slope",
            "aspect",
            "soil_id",
            "landcover_class",
            "rainfall_1d",
            "rainfall_3d",
            "rainfall_7d",
            "rainfall_15d",
            "rainfall_30d",
        ],
        "status": "Operational" if ml_model and ml_preprocessor else "Model Files Missing",
    }


@router.post("/predict")
def predict_landslide(data: LandslidePredictionInput):
    """
    Executes inference through the serialized Preprocessing Pipeline
    and Random Forest model.
    """
    if ml_model is None or ml_preprocessor is None:
        raise HTTPException(
            status_code=503,
            detail="ML Model or Preprocessing Pipeline is not loaded.",
        )

    # Validate logical cumulative rainfall windows
    r1, r3, r7, r15, r30 = (
        data.rainfall_1d,
        data.rainfall_3d,
        data.rainfall_7d,
        data.rainfall_15d,
        data.rainfall_30d,
    )
    if r3 < r1 or r7 < r3 or r15 < r7 or r30 < r15:
        raise HTTPException(
            status_code=422,
            detail=(
                "Cumulative rainfall constraint violated: "
                "rainfall_1d <= rainfall_3d <= rainfall_7d <= rainfall_15d <= rainfall_30d"
            ),
        )

    try:
        input_df = pd.DataFrame(
            [
                {
                    "elevation": data.elevation,
                    "slope": data.slope,
                    "aspect": data.aspect,
                    "soil_id": str(data.soil_id),
                    "landcover_class": str(data.landcover_class),
                    "rainfall_1d": data.rainfall_1d,
                    "rainfall_3d": data.rainfall_3d,
                    "rainfall_7d": data.rainfall_7d,
                    "rainfall_15d": data.rainfall_15d,
                    "rainfall_30d": data.rainfall_30d,
                }
            ]
        )

        # Apply preprocessing
        processed_input = ml_preprocessor.transform(input_df)

        # Predict
        prediction = int(ml_model.predict(processed_input)[0])

        if hasattr(ml_model, "predict_proba"):
            probabilities = ml_model.predict_proba(processed_input)[0]
            probability = float(probabilities[1]) if len(probabilities) >= 2 else float(probabilities[0])
        else:
            probability = float(prediction)

        # Risk Classification
        if probability >= 0.75:
            risk_level = "VERY_HIGH"
            action_code = "RED_EVACUATION_MANDATE"
        elif probability >= 0.50:
            risk_level = "HIGH"
            action_code = "ORANGE_FIELD_PATROL"
        elif probability >= 0.25:
            risk_level = "MODERATE"
            action_code = "YELLOW_SENSOR_WATCH"
        else:
            risk_level = "LOW"
            action_code = "GREEN_NOMINAL"

        return {
            "prediction": prediction,
            "prediction_label": "LANDSLIDE" if prediction == 1 else "NO_LANDSLIDE",
            "landslide_probability": round(probability, 4),
            "probability_percentage": round(probability * 100, 1),
            "risk_level": risk_level,
            "action_code": action_code,
            "input_features": data.dict(),
            "model": "Random Forest (ROC-AUC: 0.896)",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@router.get("/metrics")
def get_metrics():
    """Returns evaluation metrics from test set evaluation."""
    if not METRICS_PATH.exists():
        raise HTTPException(status_code=404, detail="Metrics file not found")
    try:
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/comparison")
def get_model_comparison():
    """Returns model comparison matrix between Random Forest & Logistic Regression."""
    if not COMPARISON_PATH.exists():
        raise HTTPException(status_code=404, detail="Comparison file not found")
    try:
        rows = []
        with open(COMPARISON_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append({
                    "model": row.get("model", ""),
                    "train_accuracy": float(row.get("train_accuracy", 0)),
                    "train_roc_auc": float(row.get("train_roc_auc", 0)),
                    "test_accuracy": float(row.get("test_accuracy", 0)),
                    "test_precision": float(row.get("test_precision", 0)),
                    "test_recall": float(row.get("test_recall", 0)),
                    "test_f1": float(row.get("test_f1", 0)),
                    "test_roc_auc": float(row.get("test_roc_auc", 0)),
                    "true_positives": int(row.get("true_positives", 0)),
                    "true_negatives": int(row.get("true_negatives", 0)),
                    "false_positives": int(row.get("false_positives", 0)),
                    "false_negatives": int(row.get("false_negatives", 0)),
                })
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feature-importance")
def get_feature_importance(limit: int = 15):
    """Returns top influential features ranked by Gini importance."""
    if not FEATURE_IMPORTANCE_PATH.exists():
        raise HTTPException(status_code=404, detail="Feature importance file not found")
    try:
        features = []
        with open(FEATURE_IMPORTANCE_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if i >= limit:
                    break
                name = row.get("feature", "")
                display_name = (
                    name.replace("numeric__", "")
                    .replace("categorical__", "")
                    .replace("_", " ")
                    .title()
                )
                features.append({
                    "feature": name,
                    "display_name": display_name,
                    "importance": round(float(row.get("importance", 0)), 5),
                    "importance_percentage": round(float(row.get("importance", 0)) * 100, 2),
                })
        return features
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


DATASET_DESCRIPTIONS = {
    "India_Cross_Dataset_Duplicate_Candidates.csv": "Audit candidates across national landslide inventory sources",
    "India_Dataset1_Duplicate_Candidates.csv": "Internal duplicate cross-checks for primary inventory",
    "India_Dataset2_Duplicate_Candidates.csv": "Secondary dataset duplicate audit log with spatial coordinates",
    "India_Landslides_CrossDataset_Deduplicated.csv": "Master national deduplicated landslide inventory covering India",
    "India_Landslide_Master_Final.csv": "Final cleaned master repository of verified Indian landslide events",
    "NER_Background_Samples_Validated.csv": "Negative (non-landslide) background samples for model balancing in NER",
    "NER_Landslide_Events.csv": "Documented historical landslide occurrences across 8 North Eastern states",
    "NER_Landslide_Feature_Pilot_100.csv": "Pilot feature set of 100 benchmark landslide locations in NER",
    "NER_Landslide_Incomplete_Feature_Records.csv": "Audit log of incomplete GIS records flagged for sensor re-sampling",
    "NER_Landslide_Inventory.csv": "Comprehensive North Eastern Region landslide inventory registry",
    "NER_Landslide_Master_All.csv": "Merged master inventory of all NER slope instability events",
    "NER_Landslide_ML_Dataset.csv": "Engineered training matrix with spatial terrain and lithology features",
    "NER_Landslide_Rainfall_Events.csv": "Historical landslide events paired with IMD high-intensity precipitation",
    "NER_Landslide_Rainfall_Events_Integrated.csv": "Multi-window rainfall integrated landslide trigger registry",
    "NER_Landslide_Rainfall_ML_Dataset_654.csv": "Curated 654-record balanced ML dataset used for model training",
    "NER_Landslide_Records_Final.csv": "Final quality-audited landslide records for the North Eastern Region",
    "NER_Landslide_Temporal_Availability_Audit.csv": "Temporal continuity audit of weather station coverage in NER",
    "NER_Landslide_Training_Features.csv": "Full training feature matrix with multi-temporal antecedent rainfall",
    "NER_Landslide_Training_Features_Clean.csv": "Processed clean training dataset ready for ML pipeline consumption",
}


@router.get("/datasets")
def get_datasets_inventory():
    """Lists all 19 integrated datasets with record counts and file sizes."""
    if not DATA_DIR.exists():
        return []

    datasets = []
    for csv_file in sorted(DATA_DIR.glob("*.csv")):
        file_size_bytes = csv_file.stat().st_size
        size_kb = round(file_size_bytes / 1024, 1)
        size_mb = round(file_size_bytes / (1024 * 1024), 2)
        size_str = f"{size_mb} MB" if size_mb >= 1.0 else f"{size_kb} KB"

        line_count = 0
        try:
            with open(csv_file, "r", encoding="utf-8", errors="ignore") as f:
                for _ in f:
                    line_count += 1
            record_count = max(0, line_count - 1)
        except Exception:
            record_count = -1

        datasets.append({
            "name": csv_file.name,
            "size": size_str,
            "size_bytes": file_size_bytes,
            "record_count": record_count,
            "description": DATASET_DESCRIPTIONS.get(csv_file.name, "NER Landslide GIS and Meteorological Dataset"),
        })

    return datasets
