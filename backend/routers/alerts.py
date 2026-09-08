import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from backend.database.database import get_db
from backend.database.models import (
    TacticalUnitModel,
    ReliefShelterModel,
    AuditLogModel,
    CapAlertModel,
)

router = APIRouter(prefix="/api/alerts", tags=["Alert Engine & Tactical Dispatch"])

class DispatchRequest(BaseModel):
    unit_id: str
    destination: str
    priority: str = "URGENT"

class SirenTriggerRequest(BaseModel):
    corridor: str
    towers: int = 6
    stage: int = 3

@router.get("/cap")
def get_cap_alert():
    """
    Returns latest Common Alerting Protocol (CAP 1.2) alert in structured JSON and XML representation.
    """
    sent_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S+05:30")
    cap_json = {
        "identifier": f"IN-GSI-LEWS-NER-{datetime.utcnow().strftime('%Y%m%d')}-0092",
        "sender": "lews.gsi.gov.in/ner-disaster-command",
        "sent": sent_iso,
        "status": "Actual",
        "msgType": "Alert",
        "scope": "Public",
        "category": "Geo",
        "event": "Critical Slope Debris Flow Imminent",
        "urgency": "Immediate",
        "severity": "Extreme",
        "certainty": "Observed",
        "headline": "MANDATORY EVACUATION: NH-10 KM 34-42 TEESTA BASIN CORRIDOR",
        "description": "Borehole piezometers SN-SK-01 breach 284 kPa limit. Shear creep exceeds 14.2 mm/hr. Deep-seated rotational slide failure expected within 3h 45m.",
        "instruction": "All civilian traffic diverted at Rangpo Checkpost. Immediate evacuation of Lower Singtam riverbank settlements to designated relief shelters.",
        "areaDesc": "NH-10 Km 34.2 to 41.8, Lower Singtam, Mangan Sub-Division, Sikkim",
        "circle": "27.5312,88.5134,5.0"
    }

    raw_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>{cap_json['identifier']}</identifier>
  <sender>{cap_json['sender']}</sender>
  <sent>{cap_json['sent']}</sent>
  <status>{cap_json['status']}</status>
  <msgType>{cap_json['msgType']}</msgType>
  <scope>{cap_json['scope']}</scope>
  <info>
    <category>{cap_json['category']}</category>
    <event>{cap_json['event']}</event>
    <urgency>{cap_json['urgency']}</urgency>
    <severity>{cap_json['severity']}</severity>
    <certainty>{cap_json['certainty']}</certainty>
    <headline>{cap_json['headline']}</headline>
    <description>{cap_json['description']}</description>
    <instruction>{cap_json['instruction']}</instruction>
    <area>
      <areaDesc>{cap_json['areaDesc']}</areaDesc>
      <circle>{cap_json['circle']}</circle>
    </area>
  </info>
</alert>"""

    return {
        "alert": cap_json,
        "raw_xml": raw_xml
    }

@router.get("/units")
def list_tactical_units(db: Session = Depends(get_db)):
    return db.query(TacticalUnitModel).all()

@router.get("/shelters")
def list_relief_shelters(db: Session = Depends(get_db)):
    return db.query(ReliefShelterModel).all()

@router.get("/audit-logs")
def list_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLogModel).order_by(AuditLogModel.created_at.desc()).limit(20).all()
    if not logs:
        # Return standard mock baseline if none inserted yet
        return [
            {
                "id": "log-01",
                "code": "CAP-DISPATCH-981",
                "title": "Stage 3 CAP Evacuation Order Authenticated",
                "timestamp": "14:32:08 IST",
                "message": "Digital signature verified via GSI C-DAC PKI token. Disseminated to Sikkim SDMA & NDRF.",
                "authority": "Duty Officer (NER Hub)",
                "type": "broadcast",
                "highlight": True,
            },
            {
                "id": "log-02",
                "code": "SIREN-ACT-04",
                "title": "Acoustic Tower Mesh Siren Active",
                "timestamp": "14:30:15 IST",
                "message": "6 Siren Towers along NH-10 Singtam-Rangpo activated. 130dB Wailing Signal sequence initiated.",
                "authority": "Automatic Alert Engine",
                "type": "siren",
                "highlight": True,
            },
        ]
    return logs

@router.post("/siren")
def trigger_siren(req: SirenTriggerRequest, db: Session = Depends(get_db)):
    new_log = AuditLogModel(
        id=f"log-{uuid.uuid4().hex[:6]}",
        code=f"SIREN-ACT-{uuid.uuid4().hex[:4].upper()}",
        title=f"Acoustic Siren Sequence Triggered ({req.towers} Towers)",
        timestamp=datetime.now().strftime("%H:%M:%S IST"),
        message=f"Stage {req.stage} High-Decibel Acoustic Warning Siren Active across {req.towers} towers along {req.corridor}.",
        authority="Disaster Operations Command",
        type="siren",
        highlight=True
    )
    db.add(new_log)
    db.commit()
    return {
        "status": "active",
        "towers_activated": req.towers,
        "corridor": req.corridor,
        "message": f"Stage {req.stage} High-Decibel Acoustic Warning Siren Active across {req.towers} towers"
    }

@router.post("/dispatch")
def dispatch_order(req: DispatchRequest, db: Session = Depends(get_db)):
    unit = db.query(TacticalUnitModel).filter(TacticalUnitModel.id == req.unit_id).first()
    if unit:
        unit.destination = req.destination
        unit.status = "EN ROUTE"
        db.commit()
    return {
        "status": "success",
        "message": f"Tactical Order issued for {req.unit_id} to {req.destination} with {req.priority} priority."
    }

class SmsBroadcastRequest(BaseModel):
    headline: str
    instruction: str
    phone_numbers: Optional[List[str]] = None
    state: Optional[str] = "sikkim"

@router.post("/sms-broadcast")
def broadcast_emergency_sms(req: SmsBroadcastRequest):
    from backend.services.sms_service import sms_service
    return sms_service.send_broadcast_alert(
        headline=req.headline,
        instruction=req.instruction,
        phone_numbers=req.phone_numbers,
        state=req.state
    )

