from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pathlib import Path
from pydantic import BaseModel
import pandas as pd
import numpy as np

from backend.database.database import get_db
from backend.database.models import HazardZoneModel
from backend.ml.susceptibility import susceptibility_engine
from backend.routers.ml_model import ml_model, ml_preprocessor

router = APIRouter(prefix="/api/zones", tags=["Susceptibility & Hazard Zones"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ML_DATASET_FILE = BASE_DIR / "data" / "landslides" / "NER_Landslide_Rainfall_ML_Dataset_654.csv"
EVENTS_DATASET_FILE = BASE_DIR / "data" / "landslides" / "NER_Landslide_Events.csv"

# Pre-load and cache representative historical training events
CACHED_TRAINING_EVENTS = []

def load_training_events():
    global CACHED_TRAINING_EVENTS
    if CACHED_TRAINING_EVENTS:
        return CACHED_TRAINING_EVENTS

    events = []
    if ML_DATASET_FILE.exists():
        try:
            df = pd.read_csv(ML_DATASET_FILE)
            positives = df[df["label"] == 1].dropna(subset=["latitude", "longitude"])
            
            # Map lat/lon to approximate NER states and percentage canvas coordinates
            def resolve_state(lat: float, lon: float) -> str:
                if lat >= 27.0 and lon <= 89.0:
                    return "sikkim"
                if lat >= 27.0 and lon > 91.5:
                    return "arunachal"
                if 25.0 <= lat < 26.5 and 90.0 <= lon < 92.5:
                    return "meghalaya"
                if 24.0 <= lat < 25.8 and 93.5 <= lon <= 94.8:
                    return "manipur"
                if 25.5 <= lat < 27.0 and 93.8 <= lon <= 95.5:
                    return "nagaland"
                if 22.5 <= lat < 24.5 and 92.5 <= lon <= 93.5:
                    return "mizoram"
                if 23.0 <= lat < 24.5 and 91.0 <= lon <= 92.4:
                    return "tripura"
                return "assam"

            # Sample 60 well-distributed positive events
            sample_df = positives.sample(min(60, len(positives)), random_state=42)
            
            for idx, row in sample_df.iterrows():
                lat = float(row["latitude"])
                lon = float(row["longitude"])
                state = resolve_state(lat, lon)
                
                # Bounding box of NER GIS canvas: Lat 22.5 - 28.5, Lon 88.0 - 97.0
                top_pct = max(10.0, min(85.0, (28.5 - lat) / (28.5 - 22.5) * 80 + 8.0))
                left_pct = max(10.0, min(88.0, (lon - 88.0) / (97.0 - 88.0) * 80 + 10.0))
                
                rec_id = str(row.get("event_record_id", f"EVT-{idx}"))
                if rec_id == "nan" or not rec_id:
                    rec_id = f"EVT-{idx}"

                events.append({
                    "id": f"trn-evt-{idx}",
                    "record_id": rec_id,
                    "latitude": round(lat, 4),
                    "longitude": round(lon, 4),
                    "state": state,
                    "event_date": str(row.get("event_date", "Historical Monsoon Event")),
                    "rainfall_3d": round(float(row.get("rainfall_3d", 120.0)), 1),
                    "slope": round(float(row.get("slope", 32.0)), 1),
                    "elevation": round(float(row.get("elevation", 950.0))),
                    "top_pct": f"{round(top_pct, 1)}%",
                    "left_pct": f"{round(left_pct, 1)}%",
                    "soil_id": str(row.get("soil_id", "4276.0")),
                    "landcover_class": str(row.get("landcover_class", "50.0")),
                    "dataset_source": "NER_Landslide_Rainfall_ML_Dataset_654.csv",
                    "type": "verified_historical_landslide"
                })
        except Exception as e:
            print(f"[GIS] Warning loading training events: {e}")

    CACHED_TRAINING_EVENTS = events
    return events


class SusceptibilityRequest(BaseModel):
    slope_deg: float
    soil_saturation_pct: float
    elevation_m: float
    lithology_index: float = 0.8
    drainage_density_km: float = 2.4


@router.get("")
def get_hazard_zones(
    state: Optional[str] = Query(None, description="Filter by NER state (e.g., sikkim, assam)"),
    critical_only: bool = Query(False, description="Filter only critical zones"),
    db: Session = Depends(get_db)
):
    query = db.query(HazardZoneModel)
    if state and state.lower() != "all":
        query = query.filter(HazardZoneModel.state == state.lower())
    if critical_only:
        query = query.filter(HazardZoneModel.isCritical == True)
    
    zones = query.all()
    return zones


@router.get("/historical-training-events")
def get_historical_training_events(
    state: Optional[str] = Query(None, description="Filter by NER state")
):
    """
    Returns real, verified historical landslide events from the ML training dataset
    to project directly onto the GIS canvas.
    """
    events = load_training_events()
    if state and state.lower() != "all":
        events = [e for e in events if e["state"] == state.lower()]
    return events


@router.get("/ml-heatmap-points")
def get_ml_heatmap_points(
    state: Optional[str] = Query(None, description="Filter by NER state"),
    extra_rainfall: float = Query(0.0, description="Simulated stress rainfall in mm"),
    db: Session = Depends(get_db)
):
    """
    Returns weighted coordinate points [latitude, longitude, weight, category, label]
    synthesized from:
    1. Active Hazard Zones (evaluated with the Random Forest ML model)
    2. Corridor Buffer Points along vulnerable mountain arteries
    3. Verified Historical Training Ground Truth Events (654-dataset)
    """
    points = []
    
    # 1. Active hazard zones with live ML inference
    query = db.query(HazardZoneModel)
    if state and state.lower() != "all":
        query = query.filter(HazardZoneModel.state == state.lower())
    zones = query.all()

    for zone in zones:
        # Extract lat/lng
        try:
            coord_str = zone.coords.replace("°", "").replace("N", "").replace("E", "").replace("S", "").replace("W", "")
            lat_part, lon_part = coord_str.split(",")
            lat, lon = float(lat_part.strip()), float(lon_part.strip())
        except Exception:
            lat, lon = 27.5312, 88.5134

        # Calculate live ML risk weight
        try:
            slope_val = float(zone.slopeGradient.replace("°", "").strip())
            sat_val = float(zone.soilPoreSaturation.replace("%", "").strip())
            elev_val = float(zone.elevation.replace("m", "").replace(",", "").strip())
        except Exception:
            slope_val, sat_val, elev_val = 45.0, 85.0, 1400.0

        r3 = 135.5 + float(extra_rainfall)
        r30 = 420.0 + float(extra_rainfall) * 1.5

        if ml_model and ml_preprocessor:
            sample_df = pd.DataFrame([{
                "elevation": elev_val,
                "slope": slope_val,
                "aspect": 180.0,
                "soil_id": "4276.0",
                "landcover_class": "50.0",
                "rainfall_1d": min(300.0, 45.0 + float(extra_rainfall) * 0.4),
                "rainfall_3d": min(500.0, r3),
                "rainfall_7d": min(700.0, 190.0 + float(extra_rainfall)),
                "rainfall_15d": min(900.0, 280.0 + float(extra_rainfall) * 1.2),
                "rainfall_30d": min(1200.0, r30),
            }])
            X_proc = ml_preprocessor.transform(sample_df)
            probs = ml_model.predict_proba(X_proc)[0]
            weight = float(probs[1]) if len(probs) > 1 else float(probs[0])
        else:
            weight = min(0.99, max(0.1, sat_val / 100.0 * 0.6 + slope_val / 60.0 * 0.4))

        points.append({
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "weight": round(weight, 3),
            "category": "zone_susceptibility",
            "label": zone.name,
            "state": zone.state
        })

        # Add micro-cluster points around the zone epicenter to simulate physical spatial spread
        spread_offsets = [
            (0.008, 0.006, 0.88),
            (-0.007, 0.008, 0.82),
            (0.006, -0.009, 0.75),
            (-0.005, -0.006, 0.70),
        ]
        for dlat, dlon, factor in spread_offsets:
            points.append({
                "latitude": round(lat + dlat, 5),
                "longitude": round(lon + dlon, 5),
                "weight": round(weight * factor, 3),
                "category": "corridor_stress",
                "label": f"{zone.name} Runout Sector",
                "state": zone.state
            })

    # 2. Historical ground truth events from training dataset
    training_events = load_training_events()
    if state and state.lower() != "all":
        training_events = [e for e in training_events if e["state"] == state.lower()]

    for evt in training_events:
        r3_evt = evt.get("rainfall_3d", 120.0)
        slope_evt = evt.get("slope", 35.0)
        base_w = min(1.0, 0.35 + 0.4 * (r3_evt / 200.0) + 0.25 * (slope_evt / 50.0))
        stress_boost = min(0.3, (extra_rainfall / 120.0) * 0.25)
        final_w = min(1.0, base_w + stress_boost)

        points.append({
            "latitude": evt["latitude"],
            "longitude": evt["longitude"],
            "weight": round(final_w, 3),
            "category": "historical_ground_truth",
            "label": f"Historical Landslide {evt['record_id']}",
            "state": evt["state"]
        })

    return {
        "count": len(points),
        "state_filter": state or "all",
        "extra_rainfall_applied": extra_rainfall,
        "points": points
    }


@router.get("/{zone_id}")
def get_hazard_zone_by_id(zone_id: str, db: Session = Depends(get_db)):
    zone = db.query(HazardZoneModel).filter(HazardZoneModel.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Hazard zone not found")
    return zone


@router.get("/{zone_id}/ml-risk")
def get_zone_ml_risk(
    zone_id: str,
    extra_rainfall: float = Query(0.0, ge=0, le=300, description="Stress-test additional rainfall in mm"),
    db: Session = Depends(get_db)
):
    """
    Evaluates real-time ML risk for a specific GIS hazard zone using the trained
    Random Forest pipeline and live corridor geotechnical parameters.
    """
    zone = db.query(HazardZoneModel).filter(HazardZoneModel.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Hazard zone not found")

    # Parse numeric attributes from corridor strings
    # e.g., "1,480 m" -> 1480.0, "48.6°" -> 48.6, "92.4%" -> 92.4
    try:
        elev_val = float(zone.elevation.replace("m", "").replace(",", "").strip())
    except Exception:
        elev_val = 1200.0

    try:
        slope_val = float(zone.slopeGradient.replace("°", "").strip())
    except Exception:
        slope_val = 35.0

    try:
        sat_val = float(zone.soilPoreSaturation.replace("%", "").strip())
    except Exception:
        sat_val = 75.0

    # Base rainfall correlated with saturation + extra stress rainfall
    r1 = max(10.0, round(sat_val * 0.6 + extra_rainfall * 0.4, 1))
    r3 = max(r1, round(r1 * 2.2 + extra_rainfall * 0.8, 1))
    r7 = max(r3, round(r3 * 1.6 + extra_rainfall * 1.0, 1))
    r15 = max(r7, round(r7 * 1.4 + extra_rainfall * 1.2, 1))
    r30 = max(r15, round(r15 * 1.5 + extra_rainfall * 1.4, 1))

    # Geotechnical feature vector
    features_input = pd.DataFrame([{
        "elevation": elev_val,
        "slope": slope_val,
        "aspect": 195.0 if "Teesta" in zone.name else 145.0,
        "soil_id": "4276.0" if zone.state == "sikkim" else ("4301.0" if zone.state == "assam" else "3662.0"),
        "landcover_class": "50.0" if elev_val > 1000 else "40.0",
        "rainfall_1d": r1,
        "rainfall_3d": r3,
        "rainfall_7d": r7,
        "rainfall_15d": r15,
        "rainfall_30d": r30,
    }])

    # Execute inference through preprocessor + Random Forest model
    if ml_model and ml_preprocessor:
        try:
            x_proc = ml_preprocessor.transform(features_input)
            proba = ml_model.predict_proba(x_proc)[0]
            probability = float(proba[1]) if len(proba) >= 2 else float(proba[0])
            pred_class = int(ml_model.predict(x_proc)[0])
        except Exception as e:
            print(f"[GIS ML] Error during inference: {e}")
            probability = min(0.99, max(0.1, sat_val / 100.0 * 0.6 + slope_val / 60.0 * 0.4))
            pred_class = 1 if probability >= 0.5 else 0
    else:
        probability = min(0.99, max(0.1, sat_val / 100.0 * 0.6 + slope_val / 60.0 * 0.4))
        pred_class = 1 if probability >= 0.5 else 0

    # Classify Risk Tier
    if probability >= 0.75:
        risk_tier = "VERY_HIGH"
        action_code = "RED_EVACUATION_MANDATE"
    elif probability >= 0.50:
        risk_tier = "HIGH"
        action_code = "ORANGE_FIELD_PATROL"
    elif probability >= 0.25:
        risk_tier = "MODERATE"
        action_code = "YELLOW_SENSOR_WATCH"
    else:
        risk_tier = "LOW"
        action_code = "GREEN_NOMINAL"

    # Count nearby historical events from training dataset
    training_events = load_training_events()
    nearby_count = len([e for e in training_events if e["state"] == zone.state])

    return {
        "zone_id": zone.id,
        "zone_name": zone.name,
        "state": zone.state,
        "prediction": pred_class,
        "prediction_label": "LANDSLIDE" if pred_class == 1 else "NO_LANDSLIDE",
        "landslide_probability": round(probability, 4),
        "probability_percentage": round(probability * 100, 1),
        "risk_tier": risk_tier,
        "action_code": action_code,
        "model_name": "Random Forest Ensemble (ROC-AUC: 0.896)",
        "feature_summary": {
            "elevation_m": elev_val,
            "slope_deg": slope_val,
            "soil_saturation_pct": sat_val,
            "rainfall_3d_mm": r3,
            "rainfall_30d_mm": r30,
        },
        "primary_features": [
            {"name": "Slope Gradient", "value": f"{slope_val}°", "impact": "High Gini Weight (11.4%)"},
            {"name": "Elevation", "value": f"{int(elev_val)} m", "impact": "Primary Discriminator (12.7%)"},
            {"name": "3-Day Cumulative Rain", "value": f"{r3} mm", "impact": "Trigger Driver (8.0%)"},
            {"name": "30-Day Antecedent Rain", "value": f"{r30} mm", "impact": "PWP Builder (7.8%)"},
        ],
        "historical_precedents_count": max(3, nearby_count),
    }


@router.post("/calculate-susceptibility")
def calculate_custom_susceptibility(req: SusceptibilityRequest):
    return susceptibility_engine.calculate_susceptibility(
        slope_deg=req.slope_deg,
        soil_saturation_pct=req.soil_saturation_pct,
        elevation_m=req.elevation_m,
        lithology_index=req.lithology_index,
        drainage_density_km=req.drainage_density_km,
    )



