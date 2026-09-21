from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.database.models import HazardZoneModel
from backend.routers.ml_model import LocationRiskRequest, compute_location_risk

router = APIRouter(prefix="/api/map", tags=["GIS Map Layers"])


NORTHEAST_STATE_POLYGONS: Dict[str, List[List[List[float]]]] = {
    "sikkim": [[[88.0, 27.0], [88.9, 27.0], [88.9, 28.5], [88.0, 28.5], [88.0, 27.0]]],
    "assam": [[[90.0, 24.0], [96.0, 24.0], [96.0, 28.5], [90.0, 28.5], [90.0, 24.0]]],
    "meghalaya": [[[90.7, 24.6], [92.1, 24.6], [92.1, 26.1], [90.7, 26.1], [90.7, 24.6]]],
    "arunachal": [[[91.5, 26.5], [97.0, 26.5], [97.0, 29.5], [91.5, 29.5], [91.5, 26.5]]],
    "manipur": [[[93.2, 23.5], [94.8, 23.5], [94.8, 25.8], [93.2, 25.8], [93.2, 23.5]]],
    "nagaland": [[[93.3, 25.2], [95.3, 25.2], [95.3, 27.0], [93.3, 27.0], [93.3, 25.2]]],
    "mizoram": [[[92.2, 21.9], [93.5, 21.9], [93.5, 24.5], [92.2, 24.5], [92.2, 21.9]]],
    "tripura": [[[91.0, 22.9], [92.5, 22.9], [92.5, 24.6], [91.0, 24.6], [91.0, 22.9]]],
}


def _parse_coord_string(coord_text: str) -> Optional[Tuple[float, float]]:
    try:
        cleaned = coord_text.replace("°", "").replace("N", "").replace("S", "").replace("E", "").replace("W", "").strip()
        lat_text, lon_text = [part.strip() for part in cleaned.split(",")[:2]]
        lat = float(lat_text)
        lon = float(lon_text)
        if -90 <= lat <= 90 and -180 <= lon <= 180:
            return lat, lon
    except Exception:
        return None
    return None


def _risk_level_from_score(score: float) -> str:
    if score >= 75:
        return "VERY_HIGH"
    if score >= 50:
        return "HIGH"
    if score >= 25:
        return "MODERATE"
    return "LOW"


def _point_polygon(lat: float, lon: float, meters: float = 1200.0) -> List[List[float]]:
    lat_offset = meters / 111_000.0
    lon_offset = meters / (111_000.0 * max(0.25, abs(__import__('math').cos(__import__('math').radians(lat)))))
    return [
        [lon - lon_offset, lat - lat_offset],
        [lon + lon_offset, lat - lat_offset],
        [lon + lon_offset, lat + lat_offset],
        [lon - lon_offset, lat + lat_offset],
        [lon - lon_offset, lat - lat_offset],
    ]


def _feature_for_zone(zone: HazardZoneModel, risk_score: float, risk_level: str) -> Dict[str, Any]:
    coords = _parse_coord_string(zone.coords)
    center = coords if coords else (27.5312, 88.5134)
    polygon = _point_polygon(center[0], center[1], meters=1800.0)
    return {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [polygon],
        },
        "properties": {
            "risk_score": float(risk_score),
            "risk_level": risk_level,
            "state": zone.state,
            "district": zone.subDivision,
            "updated_at": "live",
            "source": "TerraGuard",
            "zone_id": zone.id,
            "name": zone.name,
            "corridor": zone.corridor,
        },
    }


@router.get("/risk-polygons")
def get_risk_polygons(
    state: Optional[str] = Query(None, description="Optional NER state filter"),
    db: Session = Depends(get_db),
):
    """Return a GeoJSON FeatureCollection for live risk polygons derived from TerraGuard hazard zones."""
    query = db.query(HazardZoneModel)
    if state and state.lower() != "all":
        query = query.filter(HazardZoneModel.state == state.lower())

    features: List[Dict[str, Any]] = []
    for zone in query.all():
        try:
            parsed_lat, parsed_lon = _parse_coord_string(zone.coords) or (27.5312, 88.5134)
            risk_eval = compute_location_risk(
                LocationRiskRequest(
                    name=zone.name,
                    location_type="region",
                    latitude=parsed_lat,
                    longitude=parsed_lon,
                    state=zone.state,
                    elevation=float(str(zone.elevation).replace(",", "").replace("m", "").strip() or "1200"),
                    slope=float(str(zone.slopeGradient).replace("°", "").strip() or "35"),
                    aspect=180.0,
                    soil_id="4276.0",
                    landcover_class="50.0",
                    extra_rainfall=0.0,
                )
            )
            risk_score = float(risk_eval.get("final_risk_score", 0.0) or 0.0)
            risk_level = str(risk_eval.get("risk_level", _risk_level_from_score(risk_score))).upper()
        except Exception:
            risk_score = float(zone.hazardScore or 0.0) * 10.0
            risk_level = _risk_level_from_score(risk_score)

        features.append(_feature_for_zone(zone, risk_score, risk_level))

    return {
        "type": "FeatureCollection",
        "features": features,
    }


@router.get("/boundaries")
def get_boundaries(
    level: str = Query("state", description="state or district"),
    state: Optional[str] = Query(None, description="Optional state filter"),
):
    """Return lightweight administrative boundary polygons for NER context. These are representative map overlays, not a replacement for authoritative datasets."""
    requested_level = (level or "state").lower()
    state_filter = (state or "all").lower()

    if requested_level != "state":
        return {"type": "FeatureCollection", "features": []}

    features: List[Dict[str, Any]] = []
    for key, polygons in NORTHEAST_STATE_POLYGONS.items():
        if state_filter != "all" and key != state_filter:
            continue
        for index, polygon in enumerate(polygons):
            ring = [[point[0], point[1]] for point in polygon] if polygon else []
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [ring],
                },
                "properties": {
                    "state": key,
                    "state_code": key.upper(),
                    "district": f"Boundary Context {index + 1}",
                    "district_code": f"{key.upper()}-{index + 1:02d}",
                    "level": "state",
                    "source": "TerraGuard boundary context",
                },
            })

    return {"type": "FeatureCollection", "features": features}


@router.get("/reports")
def get_map_reports(
    state: Optional[str] = Query(None, description="Filter by state"),
    db: Session = Depends(get_db),
):
    """Return report coordinates in GeoJSON format for lower overhead map rendering."""
    from backend.database.models import CrowdsourceReportModel

    query = db.query(CrowdsourceReportModel)
    if state and state.lower() != "all":
        query = query.filter(CrowdsourceReportModel.state == state.lower())

    features: List[Dict[str, Any]] = []
    for report in query.order_by(CrowdsourceReportModel.reportedTime.desc()).all():
        if report.latitude is None or report.longitude is None:
            continue
        properties = {
            "id": report.id,
            "location": report.location,
            "state": report.state,
            "classification": report.classification or report.aiClassificationStatus or "pending",
            "confidence": report.confidence,
            "severity": report.urgency,
            "timestamp": report.reportedTime,
            "description": report.description,
            "source": "citizen_report",
        }
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [report.longitude, report.latitude]},
            "properties": properties,
        })

    return {"type": "FeatureCollection", "features": features}
