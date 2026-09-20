from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.ml.field_report_classifier import classify_field_image

router = APIRouter(prefix="/api/reports", tags=["Field Report AI Classification"])


@router.post("/classify")
async def classify_report(
    report_id: str = Form(...),
    image: UploadFile = File(...),
    hazard_type: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    state: Optional[str] = Form(None),
    zone_id: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    timestamp: Optional[str] = Form(None),
):
    """Classify field evidence only; this never calls location-risk inference."""
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="image must be an image upload")
    payload = await image.read()
    if not payload:
        raise HTTPException(status_code=400, detail="image is empty")
    try:
        return classify_field_image(report_id, payload, hazard_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="field image classification failed") from exc
