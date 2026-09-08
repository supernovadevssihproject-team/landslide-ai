from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from backend.database.database import get_db
from backend.database.models import SensorNodeModel

router = APIRouter(prefix="/api/sensors", tags=["IoT Sensor Telemetry Nodes"])

class TelemetryUpdate(BaseModel):
    currentValue: str
    currentValueSub: Optional[str] = None
    thresholdPercentage: float
    status: str

@router.get("")
def list_sensors(
    state: Optional[str] = Query(None, description="Filter by state"),
    type: Optional[str] = Query(None, description="Filter by sensor type"),
    db: Session = Depends(get_db)
):
    query = db.query(SensorNodeModel)
    if state and state.lower() != "all":
        query = query.filter(SensorNodeModel.state == state.lower())
    if type and type.lower() != "all":
        query = query.filter(SensorNodeModel.type == type.lower())
    return query.all()

@router.get("/{sensor_id}")
def get_sensor(sensor_id: str, db: Session = Depends(get_db)):
    sensor = db.query(SensorNodeModel).filter(SensorNodeModel.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor node not found")
    return sensor

@router.put("/{sensor_id}/telemetry")
def update_telemetry(sensor_id: str, update: TelemetryUpdate, db: Session = Depends(get_db)):
    sensor = db.query(SensorNodeModel).filter(SensorNodeModel.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor node not found")
    sensor.currentValue = update.currentValue
    if update.currentValueSub:
        sensor.currentValueSub = update.currentValueSub
    sensor.thresholdPercentage = update.thresholdPercentage
    sensor.status = update.status
    sensor.lastSync = "Just now"
    db.commit()
    db.refresh(sensor)
    return sensor
