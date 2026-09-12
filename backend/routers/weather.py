from fastapi import APIRouter, Query
from typing import Optional

from backend.services.weather_service import weather_service

router = APIRouter(prefix="/api/weather", tags=["Live Meteorological & IMD Telemetry"])

@router.get("/live")
def get_live_meteorological_telemetry(
    state: Optional[str] = Query("sikkim", description="NER State (sikkim, assam, meghalaya, etc.)"),
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="Representative Latitude"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="Representative Longitude"),
    region_name: Optional[str] = Query(None, description="Selected Hill/Mountain Region Name"),
):
    """
    Returns actual live precipitation, 72h antecedent rainfall,
    volumetric soil moisture (0-7cm), and Doppler radar link status.
    Can be queried by specific representative coordinates of a hill/mountain region.
    """
    return weather_service.get_live_weather(
        state=state,
        latitude=latitude,
        longitude=longitude,
        region_name=region_name,
    )

@router.get("/stations")
def list_weather_stations():
    """
    Lists all active automated weather stations across North Eastern India.
    """
    return weather_service.get_all_stations()
