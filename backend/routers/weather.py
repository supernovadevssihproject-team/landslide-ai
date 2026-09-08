from fastapi import APIRouter, Query
from typing import Optional

from backend.services.weather_service import weather_service

router = APIRouter(prefix="/api/weather", tags=["Live Meteorological & IMD Telemetry"])

@router.get("/live")
def get_live_meteorological_telemetry(
    state: Optional[str] = Query("sikkim", description="NER State (sikkim, assam, meghalaya, etc.)")
):
    """
    Returns actual live precipitation, 72h antecedent rainfall,
    volumetric soil moisture (0-7cm), and Doppler radar link status.
    """
    return weather_service.get_live_weather(state=state)

@router.get("/stations")
def list_weather_stations():
    """
    Lists all active automated weather stations across North Eastern India.
    """
    return weather_service.get_all_stations()
