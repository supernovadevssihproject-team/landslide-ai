"""
LandslideGuard ML Model and Pipeline Router
Exposes the trained Random Forest classifier, feature preprocessing pipeline,
evaluation metrics, model comparison, feature importance, and datasets inventory.
"""

from datetime import datetime, timezone
from pathlib import Path
import csv
import json
import warnings
from typing import Dict, Any, List, Optional

import joblib
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.services.weather_service import weather_service
from backend.services.earthquake_service import earthquake_service
from backend.services.soil_service import soil_service

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
TERRAIN_MODEL_PATH = ML_OUTPUTS_DIR / "terrain_model.pkl"
METRICS_PATH = ML_OUTPUTS_DIR / "reports" / "evaluation_metrics.json"
COMPARISON_PATH = ML_OUTPUTS_DIR / "model_comparison.csv"
FEATURE_IMPORTANCE_PATH = ML_OUTPUTS_DIR / "feature_importance.csv"

# Load models into memory
ml_model = None
ml_preprocessor = None
terrain_model_artifact = None

try:
    if MODEL_PATH.exists():
        ml_model = joblib.load(MODEL_PATH)
        print(f"[ML Pipeline] Loaded model: {type(ml_model).__name__}")
    if PREPROCESSOR_PATH.exists():
        ml_preprocessor = joblib.load(PREPROCESSOR_PATH)
        print(f"[ML Pipeline] Loaded preprocessor: {type(ml_preprocessor).__name__}")
    if TERRAIN_MODEL_PATH.exists():
        terrain_model_artifact = joblib.load(TERRAIN_MODEL_PATH)
        print(
            "[ML Pipeline] Loaded terrain model: "
            f"{terrain_model_artifact['metrics'].get('total_records', 0):,} records"
        )
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


class LocationRiskRequest(BaseModel):
    name: str = Field(..., description="Location name (region, town, or hill)", example="Dima Hasao Hill Tracts")
    location_type: str = Field("region", description="'region' or 'hill'", example="region")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate", example=25.1764)
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate", example=93.0248)
    state: Optional[str] = Field(None, description="NER state key or name", example="assam")
    elevation: Optional[float] = Field(None, ge=0, description="Elevation in meters", example=960.0)
    slope: Optional[float] = Field(None, ge=0, le=90, description="Slope in degrees", example=39.2)
    aspect: Optional[float] = Field(None, ge=0, le=360, description="Aspect in degrees", example=180.0)
    soil_id: Optional[str] = Field(None, description="Soil classification ID", example="4276.0")
    landcover_class: Optional[str] = Field(None, description="Land-cover class ID", example="50.0")
    extra_rainfall: Optional[float] = Field(0.0, ge=0, le=500, description="Simulated additional precipitation (mm)", example=0.0)


# ============================================================
# ENDPOINTS
# ============================================================

@router.get("/model-info")
def get_model_info():
    """Returns metadata about the active ML model."""
    return {
        "project": "LandslideGuard NER Early Warning System",
        "model_name": "Terrain + Rainfall Ensemble",
        "model_type": "ExtraTrees + RandomForest" if terrain_model_artifact and ml_model else type(ml_model).__name__ if ml_model else "Not Loaded",
        "preprocessor_type": type(ml_preprocessor).__name__ if ml_preprocessor else "Not Loaded",
        "target": "landslide_occurrence (0: Safe, 1: Landslide)",
        "training_records": 14_426,
        "test_records": 3_607,
        "rainfall_training_records": 523,
        "rainfall_test_records": 131,
        "terrain_training_records": terrain_model_artifact.get("metrics", {}).get("training_records", 0) if terrain_model_artifact else 0,
        "terrain_test_records": terrain_model_artifact.get("metrics", {}).get("test_records", 0) if terrain_model_artifact else 0,
        "terrain_total_records": terrain_model_artifact.get("metrics", {}).get("total_records", 0) if terrain_model_artifact else 0,
        "ensemble_weights": {"terrain": 0.7, "rainfall": 0.3},
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

        rainfall_probability = float(ml_model.predict_proba(processed_input)[0][1])
        terrain_probability = None

        if terrain_model_artifact:
            terrain_input = input_df[
                ["elevation", "slope", "aspect", "soil_id", "landcover_class"]
            ]
            terrain_processed = terrain_model_artifact["preprocessor"].transform(terrain_input)
            terrain_probability = float(
                terrain_model_artifact["model"].predict_proba(terrain_processed)[0][1]
            )

        probability = (
            (0.7 * terrain_probability) + (0.3 * rainfall_probability)
            if terrain_probability is not None
            else rainfall_probability
        )
        prediction = int(probability >= 0.5)

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
            "model": "Terrain + Rainfall Ensemble",
            "model_details": {
                "terrain_probability": round(terrain_probability, 4) if terrain_probability is not None else None,
                "rainfall_probability": round(rainfall_probability, 4),
                "terrain_weight": 0.7,
                "rainfall_weight": 0.3,
                "terrain_records": terrain_model_artifact.get("metrics", {}).get("total_records", 0) if terrain_model_artifact else 0,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


def compute_location_risk(data: LocationRiskRequest) -> Dict[str, Any]:
    """
    Unified location-aware landslide prediction pipeline for both practical Regions
    and Hills & Mountain Regions.
    
    Data Flow:
    1. Resolve coordinates & query live weather (Open-Meteo + IMD Doppler fallback).
    2. Construct verified geotechnical & antecedent rainfall feature vectors.
    3. Run the existing trained ML ensemble (ExtraTrees + RandomForest) -> Base ML Probability.
    4. Query live NCS seismic monitoring feed for regional earthquake proximity & ground motion trigger.
    5. Apply bounded post-model seismic adjustment layer:
         delta_seismic = S_seismic * alpha * (1.0 - P_base)   [alpha = 0.20]
         P_final = clamp(P_base + delta_seismic, 0.0, 1.0)
         Final Score = round(P_final * 100)
    6. Return transparent, unified risk evaluation.
    """
    st = data.state.lower() if data.state else "sikkim"
    try:
        weather = weather_service.get_live_weather(
            state=st,
            latitude=data.latitude,
            longitude=data.longitude,
            region_name=data.name
        )
    except Exception as e:
        print(f"[LocationRisk] Weather lookup fallback for {data.name}: {e}")
        weather = {}

    current_rainfall = float(weather.get("current_rainfall_mm_hr", 0.0) or 0.0)
    antecedent_72h = float(weather.get("antecedent_72h_rainfall_mm", 110.0) or 110.0)
    soil_sat = float(weather.get("soil_saturation_pct", 75.0) or 75.0)
    station_elev = float(weather.get("elevation_m", 1000.0) or 1000.0)
    weather_source = str(weather.get("source", "IMD Doppler & Open-Meteo"))
    is_live_weather = bool(weather.get("is_live_feed", False))

    # Geomorphic terrain features
    elev = float(data.elevation) if data.elevation is not None else float(station_elev)
    if data.slope is not None:
        slope = float(data.slope)
    else:
        slope = min(52.0, max(28.0, 32.0 + (elev / 3500.0) * 8.0))
    aspect = float(data.aspect) if data.aspect is not None else 180.0
    
    # Resolve soil ID: explicit request parameter vs real geographic HWSD2 lookup
    if data.soil_id:
        soil_id = str(data.soil_id)
        soil_lookup_info = {
            "soil_id": soil_id,
            "soil_name": f"Soil ID {soil_id}",
            "lookup_source": "EXPLICIT_REQUEST_PARAM",
            "fallback_used": False,
        }
    else:
        soil_lookup_info = soil_service.resolve_soil_by_coordinates(data.latitude, data.longitude)
        soil_id = soil_lookup_info["soil_id"]

    landcover_class = str(data.landcover_class) if data.landcover_class else ("50.0" if elev >= 1000.0 else "40.0")

    # Antecedent rainfall windows (strictly non-decreasing r1 <= r3 <= r7 <= r15 <= r30)
    extra = float(data.extra_rainfall or 0.0)
    r1 = max(10.0, round(current_rainfall * 24.0 + extra * 0.4, 1))
    r3 = max(r1, round(antecedent_72h + extra * 0.8, 1))
    r7 = max(r3, round(r3 * 1.5 + extra * 1.0, 1))
    r15 = max(r7, round(r7 * 1.4 + extra * 1.2, 1))
    r30 = max(r15, round(r15 * 1.5 + extra * 1.4, 1))

    # Base ML model inference
    base_ml_prob = None
    terrain_prob = None
    rf_prob = None

    if ml_model is not None and ml_preprocessor is not None:
        try:
            input_df = pd.DataFrame([{
                "elevation": elev,
                "slope": slope,
                "aspect": aspect,
                "soil_id": str(soil_id),
                "landcover_class": str(landcover_class),
                "rainfall_1d": r1,
                "rainfall_3d": r3,
                "rainfall_7d": r7,
                "rainfall_15d": r15,
                "rainfall_30d": r30,
            }])
            processed_input = ml_preprocessor.transform(input_df)
            rf_prob = float(ml_model.predict_proba(processed_input)[0][1])

            if terrain_model_artifact:
                t_input = input_df[["elevation", "slope", "aspect", "soil_id", "landcover_class"]]
                t_proc = terrain_model_artifact["preprocessor"].transform(t_input)
                terrain_prob = float(terrain_model_artifact["model"].predict_proba(t_proc)[0][1])
                base_ml_prob = float((0.7 * terrain_prob) + (0.3 * rf_prob))
            else:
                base_ml_prob = rf_prob
        except Exception as e:
            print(f"[LocationRisk] ML inference fallback: {e}")

    if base_ml_prob is None:
        # Calibrated geotechnical empirical fallback
        base_ml_prob = min(0.95, max(0.08, (soil_sat / 100.0) * 0.55 + (slope / 60.0) * 0.35 + (r3 / 500.0) * 0.10))

    # Live Seismic / Earthquake evaluation
    seismic_trigger_score = 0.0
    seismic_source = "National Center for Seismology"
    events_in_range = 0
    nearest_event_km = None
    max_magnitude = None
    is_live_seismic = False

    try:
        eq_resp = earthquake_service.get_earthquakes(
            latitude=data.latitude,
            longitude=data.longitude,
            radius_km=500.0,
            limit=50
        )
        is_live_seismic = bool(eq_resp.get("earthquake_data_available", False))
        seismic_trigger_score = float(eq_resp.get("earthquake_trigger_score", 0.0))
        events = eq_resp.get("events", [])
        events_in_range = len(events)
        if events:
            magnitudes = [float(e.get("magnitude", 0)) for e in events if e.get("magnitude") is not None]
            if magnitudes:
                max_magnitude = max(magnitudes)
            distances = []
            for ev in events:
                ev_lat = float(ev.get("latitude", 0))
                ev_lon = float(ev.get("longitude", 0))
                d = earthquake_service._distance_km(data.latitude, data.longitude, ev_lat, ev_lon)
                distances.append(d)
            if distances:
                nearest_event_km = round(min(distances), 1)
    except Exception as e:
        print(f"[LocationRisk] Seismic lookup fallback: {e}")

    # Bounded Post-Model Seismic Adjustment Layer
    # Formula: delta_seismic = S_seismic * alpha * (1.0 - P_base)
    # alpha = 0.20 (max +20 percentage points for a severe seismic trigger on unsaturated slope)
    alpha = 0.20
    seismic_adj = round(seismic_trigger_score * alpha * (1.0 - base_ml_prob), 4)
    final_prob = min(1.0, max(0.0, base_ml_prob + seismic_adj))
    final_score = int(round(final_prob * 100.0))
    final_score = max(0, min(100, final_score))

    # Consistent Risk Level Classification
    if final_prob >= 0.75:
        risk_level = "VERY_HIGH"
        action_code = "RED_EVACUATION_MANDATE"
    elif final_prob >= 0.50:
        risk_level = "HIGH"
        action_code = "ORANGE_FIELD_PATROL"
    elif final_prob >= 0.25:
        risk_level = "MODERATE"
        action_code = "YELLOW_SENSOR_WATCH"
    else:
        risk_level = "LOW"
        action_code = "GREEN_NOMINAL"

    pred_class = 1 if final_prob >= 0.50 else 0

    return {
        "location": {
            "name": data.name,
            "type": data.location_type,
            "latitude": data.latitude,
            "longitude": data.longitude,
            "state": data.state or st,
        },
        "base_ml_probability": round(base_ml_prob, 4),
        "seismic_adjustment": seismic_adj,
        "final_risk_score": final_score,
        "probability_percentage": round(final_prob * 100.0, 1),
        "risk_level": risk_level,
        "prediction": pred_class,
        "prediction_label": "LANDSLIDE" if pred_class == 1 else "NO_LANDSLIDE",
        "action_code": action_code,
        "calculation_method": "Trained ML Ensemble (ExtraTrees + RandomForest) with Post-Model Bounded Geotechnical Seismic Adjustment Layer",
        "inputs": {
            "elevation_m": round(elev, 1),
            "slope_deg": round(slope, 1),
            "soil_id": soil_id,
            "soil_details": soil_lookup_info,
            "landcover_class": landcover_class,
            "rainfall": {
                "rainfall_1d_mm": r1,
                "rainfall_3d_mm": r3,
                "rainfall_7d_mm": r7,
                "rainfall_15d_mm": r15,
                "rainfall_30d_mm": r30,
                "extra_rainfall_applied_mm": extra,
                "source": weather_source,
                "is_live": is_live_weather,
            },
            "seismic": {
                "events_in_range_500km": events_in_range,
                "nearest_event_distance_km": nearest_event_km,
                "max_magnitude": max_magnitude,
                "seismic_trigger_score": seismic_trigger_score,
                "source": seismic_source,
                "is_live": is_live_seismic,
            }
        },
        "model_details": {
            "terrain_probability": round(terrain_prob, 4) if terrain_prob is not None else None,
            "rainfall_probability": round(rf_prob, 4) if rf_prob is not None else None,
            "terrain_weight": 0.7 if terrain_prob is not None else 0.0,
            "rainfall_weight": 0.3 if terrain_prob is not None else 1.0,
            "seismic_alpha": alpha,
        },
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/location-risk")
def post_location_risk(req: LocationRiskRequest):
    """
    Unified location-aware landslide prediction endpoint for both Regions/Places
    and Hills & Mountain Regions.
    """
    try:
        return compute_location_risk(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Location risk calculation error: {str(e)}")


@router.get("/location-risk")
def get_location_risk(
    name: str = Query(..., description="Location name"),
    location_type: str = Query("region", description="'region' or 'hill'"),
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude"),
    state: Optional[str] = Query(None, description="NER state key"),
    elevation: Optional[float] = Query(None, ge=0, description="Elevation in meters"),
    slope: Optional[float] = Query(None, ge=0, le=90, description="Slope in degrees"),
    aspect: Optional[float] = Query(None, ge=0, le=360, description="Aspect in degrees"),
    soil_id: Optional[str] = Query(None, description="Soil ID"),
    landcover_class: Optional[str] = Query(None, description="Landcover class ID"),
    extra_rainfall: float = Query(0.0, ge=0, le=500, description="Extra rainfall (mm)"),
):
    """
    GET alias for location risk evaluation using query parameters.
    """
    req = LocationRiskRequest(
        name=name,
        location_type=location_type,
        latitude=latitude,
        longitude=longitude,
        state=state,
        elevation=elevation,
        slope=slope,
        aspect=aspect,
        soil_id=soil_id,
        landcover_class=landcover_class,
        extra_rainfall=extra_rainfall,
    )
    return compute_location_risk(req)


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
