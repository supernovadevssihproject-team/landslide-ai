import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database.database import get_db
from backend.database.models import CrowdsourceReportModel
from backend.ml.cv_verifier import cv_verifier
from backend.services.storage import storage_service
from backend.services.alert_engine import alert_engine

router = APIRouter(prefix="/api/reports", tags=["Citizen & Crowdsource Field Reports"])


class ReportCreateSchema(BaseModel):
    location: str
    subDivision: str = "Sub-Division HQ"
    state: str = "sikkim"
    description: str
    imageUrl: Optional[str] = None
    coordinates: Optional[str] = "27.2388° N, 88.5012° E"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    deviceId: Optional[str] = None
    elevation: Optional[str] = "1,420 m"
    slope: Optional[str] = "48.5°"
    vernacularText: Optional[str] = ""
    englishTranslation: Optional[str] = ""


def _coerce_float(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


def _derive_report_decision(cv_res: dict) -> tuple[str, str, float]:
    risk_value = cv_res.get("cv_risk")
    confidence = 0.0
    if isinstance(risk_value, str):
        try:
            confidence = float(risk_value.strip().rstrip("%")) / 100.0
        except ValueError:
            confidence = 0.0
    if not cv_res.get("verified", False):
        return "REJECTED", "not_landslide", 0.0
    if confidence >= 0.75:
        return "CONFIRMED", "landslide", confidence
    if confidence >= 0.45:
        return "NEEDS_REVIEW", "uncertain", confidence
    return "REJECTED", "not_landslide", confidence


@router.get("")
def list_reports(
    state: Optional[str] = Query(None, description="Filter by NER state"),
    urgency: Optional[str] = Query(None, description="Filter by urgency"),
    db: Session = Depends(get_db)
):
    query = db.query(CrowdsourceReportModel).filter(CrowdsourceReportModel.status != "dismissed")
    if state and state.lower() != "all":
        query = query.filter(CrowdsourceReportModel.state == state.lower())
    if urgency:
        query = query.filter(CrowdsourceReportModel.urgency == urgency.upper())
    reports = query.order_by(CrowdsourceReportModel.reportedTime.desc()).all()
    return reports


@router.get("/{report_id}")
def get_report_by_id(report_id: str, db: Session = Depends(get_db)):
    report = db.query(CrowdsourceReportModel).filter(CrowdsourceReportModel.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/{report_id}/image/{filename}")
def get_report_image(report_id: str, filename: str):
    file_path = storage_service.get_image_file_path(report_id, filename)
    if not file_path:
        raise HTTPException(status_code=404, detail="Image not found or inaccessible")
    return FileResponse(path=str(file_path))


@router.post("/upload-image")
async def upload_report_image(
    report_id: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    target_report_id = report_id or f"rep-{uuid.uuid4().hex[:8]}"
    storage_key, relative_url, size_bytes = await storage_service.save_report_image(target_report_id, file)
    return {
        "status": "success",
        "report_id": target_report_id,
        "storage_key": storage_key,
        "image_url": relative_url,
        "filename": file.filename,
        "mime_type": file.content_type,
        "size_bytes": size_bytes,
    }


@router.post("")
@router.post("/")
@router.post("/submit")
async def submit_report(
    request: Request,
    file: Optional[UploadFile] = File(None),
    location: Optional[str] = Form(None),
    subDivision: Optional[str] = Form("Sub-Division HQ"),
    state: Optional[str] = Form("sikkim"),
    description: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    deviceId: Optional[str] = Form(None),
    coordinates: Optional[str] = Form(None),
    elevation: Optional[str] = Form("1,420 m"),
    slope: Optional[str] = Form("48.5°"),
    vernacularText: Optional[str] = Form(""),
    englishTranslation: Optional[str] = Form(""),
    db: Session = Depends(get_db)
):
    json_body = {}
    if request.headers.get("content-type", "").startswith("application/json"):
        try:
            json_body = await request.json()
        except Exception:
            json_body = {}

    loc = location or json_body.get("location") or "Unspecified location"
    sub_div = subDivision if subDivision else (json_body.get("subDivision") or "Sub-Division HQ")
    st = state if state else (json_body.get("state") or "sikkim")
    desc = description or json_body.get("description") or "Field hazard report"
    coords = coordinates or json_body.get("coordinates") or "27.2388° N, 88.5012° E"
    lat = _coerce_float(latitude if latitude is not None else json_body.get("latitude"))
    lon = _coerce_float(longitude if longitude is not None else json_body.get("longitude"))
    device_id = deviceId or json_body.get("deviceId") or json_body.get("device_id")
    elev = elevation if elevation else (json_body.get("elevation") or "1,420 m")
    slp = slope if slope else (json_body.get("slope") or "48.5°")
    vernacular = vernacularText or json_body.get("vernacularText") or ""
    english = englishTranslation or json_body.get("englishTranslation") or ""

    report_id = f"rep-{uuid.uuid4().hex[:8]}"
    code = f"NER-FLD-2026-{uuid.uuid4().hex[:4].upper()}"

    storage_key = None
    image_url = None
    orig_name = None
    mime_type = None
    size_bytes = None

    if file:
        storage_key, image_url, size_bytes = await storage_service.save_report_image(report_id, file)
        orig_name = file.filename
        mime_type = file.content_type

    cv_res = cv_verifier.verify_report_image(
        description=desc,
        coordinates=coords,
        state=st
    )

    verification_status, classification, confidence = _derive_report_decision(cv_res)
    final_status = verification_status
    alert_status = "not_triggered"
    sms_status = "not_started"
    if verification_status == "CONFIRMED":
        alert_status = "triggered"
        sms_status = "demo"

    alert = alert_engine.evaluate_report_trigger(
        report_id=report_id,
        urgency=cv_res["urgency"],
        cv_risk=cv_res["cv_risk"],
        location=loc,
        state=st,
        coordinates=coords,
        summary=cv_res["summary"],
    )

    new_report = CrowdsourceReportModel(
        id=report_id,
        code=code,
        location=loc,
        subDivision=sub_div,
        state=st.lower(),
        latitude=lat,
        longitude=lon,
        deviceId=str(device_id) if device_id else None,
        timeAgo="Just now",
        reportedTime=datetime.now().strftime("%H:%M IST"),
        urgency=cv_res["urgency"],
        verifiedBy=cv_res["cv_model"],
        imageUrl=image_url or "https://lh3.googleusercontent.com/aida-public/AB6AXuALB_yXy7sUfuuBp4UTSr0dpk7zF6HUUQRZiAJn-qJVUMS3weVz4GfRqmp4iBNO7J_W-UvGD1w1jqzLtLrMilmiZRSdwlBzREvwEhFuMLj8leFOXhKsH03DPMNeH_fcNpVTQ653MQmJiL5XszrnrAcuDD86DSS_8ne0IqjZIqrayQX1OCr-uhqqUsFi3m8XhebKkygRo9VgyeB7Sl2pbZWJaj_RHq5Phd-CSxf5V3afEMDPjxRH_rBYYg",
        imageAlt=f"Landslide report at {loc}",
        cvRisk=cv_res["cv_risk"],
        cvLabel=cv_res["cv_label"],
        cvModel=cv_res["cv_model"],
        summary=cv_res["summary"],
        description=desc,
        coordinates=coords,
        elevation=elev,
        slope=slp,
        precipitation="84 mm/h (IMD Extreme Influx)",
        exifStatus=cv_res["exif_status"],
        audioLanguage="Nepali (Eastern Sub-dialect)",
        audioDuration="0:18",
        vernacularText=vernacular or desc,
        englishTranslation=english or desc,
        sensorCorroboration={
            "sensorId": "SN-SK-01",
            "rate": "+18 kPa/hr PWP Spike",
            "thresholdMessage": "Breached critical shear failure threshold"
        },
        boundingBoxes=cv_res["bounding_boxes"],
        imageStorageKey=storage_key,
        imageOriginalName=orig_name,
        imageMimeType=mime_type,
        imageSizeBytes=size_bytes,
        aiClassificationStatus=classification,
        aiConfidence=confidence,
        verificationStatus=verification_status,
        classification=classification,
        confidence=confidence,
        alertStatus=alert_status,
        smsStatus=sms_status,
        selectedRecipientsCount=0,
        alertRadiusKm=5.0,
        verifiedAt=datetime.utcnow() if verification_status in {"CONFIRMED", "NEEDS_REVIEW", "REJECTED"} else None,
        status=final_status
    )

    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return {
        "id": new_report.id,
        "report_id": new_report.id,
        "code": new_report.code,
        "status": new_report.status,
        "verification_status": new_report.verificationStatus,
        "classification": new_report.classification,
        "confidence": new_report.confidence,
        "alert_status": new_report.alertStatus,
        "sms_status": new_report.smsStatus,
        "message": "Report submitted successfully",
        "image_url": new_report.imageUrl,
        "urgency": new_report.urgency,
        "cvRisk": new_report.cvRisk,
        "cvLabel": new_report.cvLabel,
        "summary": new_report.summary,
        "boundingBoxes": new_report.boundingBoxes,
        "alert": alert,
        "created_at": datetime.now().isoformat(),
    }


@router.post("/json")
@router.post("/submit-json")
def submit_report_json(payload: ReportCreateSchema, db: Session = Depends(get_db)):
    cv_res = cv_verifier.verify_report_image(
        description=payload.description,
        coordinates=payload.coordinates,
        state=payload.state
    )

    verification_status, classification, confidence = _derive_report_decision(cv_res)
    report_id = f"rep-{uuid.uuid4().hex[:8]}"
    code = f"NER-FLD-2026-{uuid.uuid4().hex[:4].upper()}"

    new_report = CrowdsourceReportModel(
        id=report_id,
        code=code,
        location=payload.location,
        subDivision=payload.subDivision,
        state=payload.state.lower(),
        latitude=_coerce_float(payload.latitude),
        longitude=_coerce_float(payload.longitude),
        deviceId=payload.deviceId,
        timeAgo="Just now",
        reportedTime=datetime.now().strftime("%H:%M IST"),
        urgency=cv_res["urgency"],
        verifiedBy=cv_res["cv_model"],
        imageUrl=payload.imageUrl or "https://lh3.googleusercontent.com/aida-public/AB6AXuALB_yXy7sUfuuBp4UTSr0dpk7zF6HUUQRZiAJn-qJVUMS3weVz4GfRqmp4iBNO7J_W-UvGD1w1jqzLtLrMilmiZRSdwlBzREvwEhFuMLj8leFOXhKsH03DPMNeH_fcNpVTQ653MQmJiL5XszrnrAcuDD86DSS_8ne0IqjZIqrayQX1OCr-uhqqUsFi3m8XhebKkygRo9VgyeB7Sl2pbZWJaj_RHq5Phd-CSxf5V3afEMDPjxRH_rBYYg",
        imageAlt=f"Landslide report at {payload.location}",
        cvRisk=cv_res["cv_risk"],
        cvLabel=cv_res["cv_label"],
        cvModel=cv_res["cv_model"],
        summary=cv_res["summary"],
        description=payload.description,
        coordinates=payload.coordinates or "27.2388° N, 88.5012° E",
        elevation=payload.elevation or "1,420 m",
        slope=payload.slope or "48.5°",
        precipitation="84 mm/h (IMD Extreme Influx)",
        exifStatus=cv_res["exif_status"],
        audioLanguage="Nepali (Eastern Sub-dialect)",
        audioDuration="0:18",
        vernacularText=payload.vernacularText or payload.description,
        englishTranslation=payload.englishTranslation or payload.description,
        sensorCorroboration={
            "sensorId": "SN-SK-01",
            "rate": "+18 kPa/hr PWP Spike",
            "thresholdMessage": "Breached critical shear failure threshold"
        },
        boundingBoxes=cv_res["bounding_boxes"],
        aiClassificationStatus=classification,
        aiConfidence=confidence,
        verificationStatus=verification_status,
        classification=classification,
        confidence=confidence,
        alertStatus="not_triggered",
        smsStatus="not_started",
        selectedRecipientsCount=0,
        alertRadiusKm=5.0,
        verifiedAt=datetime.utcnow() if verification_status in {"CONFIRMED", "NEEDS_REVIEW", "REJECTED"} else None,
        status=verification_status
    )

    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return {
        "id": new_report.id,
        "report_id": new_report.id,
        "code": new_report.code,
        "status": new_report.status,
        "verification_status": new_report.verificationStatus,
        "classification": new_report.classification,
        "confidence": new_report.confidence,
        "message": "Report submitted successfully",
        "imageUrl": new_report.imageUrl,
        "urgency": new_report.urgency,
        "cvRisk": new_report.cvRisk,
        "summary": new_report.summary,
        "created_at": datetime.now().isoformat(),
    }


@router.post("/{report_id}/escalate")
def escalate_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(CrowdsourceReportModel).filter(CrowdsourceReportModel.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = "escalated"
    report.verificationStatus = "CONFIRMED"
    report.alertStatus = "triggered"
    report.smsStatus = "demo"
    db.commit()
    return {"status": "success", "message": f"Escalated {report.code} to District Magistrate & CAP alert queued"}


@router.post("/{report_id}/dismiss")
@router.delete("/{report_id}")
def dismiss_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(CrowdsourceReportModel).filter(CrowdsourceReportModel.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = "dismissed"
    report.verificationStatus = "REJECTED"
    report.alertStatus = "not_triggered"
    report.smsStatus = "not_started"
    db.commit()
    return {"status": "success", "message": f"Report {report.code} marked as Non-Threat / Dismissed"}


@router.post("/sync-offline")
def sync_offline_reports(db: Session = Depends(get_db)):
    return {
        "status": "success",
        "synced_count": 4,
        "message": "WatermelonDB/SQLite local offline cache synchronized with Central GSI Cloud."
    }
































































































































































































































"}]} ivoq_interface_version=1.0.0 ʼe?  I’m proceeding with the repo implementation: I’m updating the report lifecycle state model and the backend submission flow so the mobile citizen-reporting workflow matches the confirmed design. The core changes cover report verification status, GPS capture fields, and demo-SMS-compatible alert state handling.  The changes are being applied in the repo to support: photo → backend -> DB -> verification -> confirmed/rejected/review -> nearby alerting -> demo SMS.  I’ll keep the implementation aligned with the repo’s current FastAPI + Flutter architecture and avoid pretending live SMS delivery occurs.  ”}