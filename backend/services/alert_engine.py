from typing import Dict, Any, Optional
from datetime import datetime, timezone

class AlertEngineService:
    """
    Internal rule-based alert evaluation engine.
    Evaluates incoming reports and environmental triggers to generate CAP alerts.
    """
    @staticmethod
    def evaluate_report_trigger(
        report_id: str,
        urgency: str,
        cv_risk: str,
        location: str,
        state: str,
        coordinates: str,
        summary: str
    ) -> Optional[Dict[str, Any]]:
        urgency_upper = urgency.upper()
        if urgency_upper in ("CRITICAL", "URGENT") or cv_risk.upper() in ("CRITICAL RED", "HIGH"):
            return {
                "alert_triggered": True,
                "event": "Landslide Hazard Incident Report",
                "urgency": "Immediate" if urgency_upper == "CRITICAL" else "Expected",
                "severity": "Extreme" if urgency_upper == "CRITICAL" else "Severe",
                "headline": f"LANDSLIDE ALERT: Field incident reported at {location} ({state.upper()})",
                "instruction": "Avoid affected slope corridors. Emergency rescue and tactical response units dispatched.",
                "area_desc": f"{location}, Coordinates: {coordinates}",
                "triggered_at": datetime.now(timezone.utc).isoformat(),
                "report_id": report_id,
            }
        return None

alert_engine = AlertEngineService()
