"""Grounded chat responses backed by the Risk Map location-risk pipeline."""
import re
import requests
from typing import Any, Dict, List, Optional
from backend.config import GEMINI_API_KEY
from backend.database.database import SessionLocal
from backend.database.models import HazardZoneModel
from backend.routers.ml_model import compute_location_risk, LocationRiskRequest

FAQ_DATABASE = [
    {
        "keywords": ["current risk", "risk information", "current status"],
        "answer": "Current location-specific risk is available from the TerraGuard Risk Map. Choose a monitored region or ask about a named place to receive the shared location-risk evaluation.",
        "action": {"type": "NAVIGATE", "module": "risk-map"},
    },
    {
        "keywords": ["sos", "emergency", "help", "call", "ndma", "1078", "rescue"],
        "answer": "Emergency & Safety:\nTerraGuard is a decision-support and information system, not an official emergency dispatcher.\n\n- Call NDMA at 1078 or 1077.\n- Move to designated high ground if you observe slope movement, sudden water turbidity, or deep ground cracks.\n- Follow official SDMA, district administration, rescue, and evacuation instructions for actual emergency response.",
        "action": {"type": "NAVIGATE", "module": "emergency-sos"},
    },
    {
        "keywords": ["map", "risk map", "gis", "spatial", "visualize"],
        "answer": "The TerraGuard Risk Map shows the live spatial risk view for monitored locations.",
        "action": {"type": "NAVIGATE", "module": "risk-map"},
    },
    {
        "keywords": ["score", "meaning", "ml score", "calculated", "formula", "how does terraguard work"],
        "answer": "TerraGuard evaluates slope, elevation, soil, rainfall, and seismic context through its existing ML location-risk pipeline. Location answers use the same 0-100 score shown on the Risk Map.",
        "action": {"type": "NAVIGATE", "module": "ml-pipeline"},
    },
    {
        "keywords": ["safety", "do during", "what to do", "landslide warning", "precautions"],
        "answer": "Landslide safety:\n1. Monitor TerraGuard alerts and identify evacuation routes.\n2. Evacuate away from debris paths when you hear rumbling or see ground cracks; never cross flooded gullies.\n3. Avoid slide areas afterward because secondary slides may occur.\n\nTerraGuard is decision support. Follow official emergency authorities for response instructions.",
        "action": {"type": "NAVIGATE", "module": "crowdsource"},
    },
]


def _number(value: Optional[str]) -> Optional[float]:
    match = re.search(r"-?\d+(?:\.\d+)?", (value or "").replace(",", ""))
    return float(match.group()) if match else None


def extract_location(message: str) -> Optional[Dict[str, Any]]:
    """Resolve user language against the database records used by the Risk Map."""
    db = SessionLocal()
    try:
        zones = db.query(HazardZoneModel).all()
    finally:
        db.close()

    text = message.lower()
    best, best_score = None, 0
    for zone in zones:
        name = zone.name.lower()
        state = (zone.state or "").lower()
        aliases = (
            [name, name.split("(")[0].strip(), state]
            + [token for token in re.split(r"[^a-z0-9]+", name) if len(token) >= 5]
        )
        score = max((len(alias) for alias in aliases if alias in text), default=0)
        if score > best_score:
            best, best_score = zone, score

    if not best:
        return None
    coords = re.findall(r"-?\d+(?:\.\d+)?", best.coords or "")
    if len(coords) < 2:
        return None
    return {
        "name": best.name,
        "lat": float(coords[0]),
        "lon": float(coords[1]),
        "state": best.state,
        "elevation": _number(best.elevation),
        "slope": _number(best.slopeGradient),
        "zone_id": best.id,
    }


def fetch_live_location_context(loc: Dict[str, Any]) -> Dict[str, Any]:
    request = LocationRiskRequest(
        name=loc["name"],
        location_type="region",
        latitude=loc["lat"],
        longitude=loc["lon"],
        state=loc["state"],
        elevation=loc["elevation"],
        slope=loc["slope"],
    )
    return {"location": loc, "risk_details": compute_location_risk(request)}


def generate_offline_response(message: str, loc_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if loc_context:
        details = loc_context["risk_details"]
        loc_info = loc_context["location"]
        inputs = details.get("inputs", {})
        rainfall = inputs.get("rainfall", {})
        seismic = inputs.get("seismic", {})
        soil = inputs.get("soil_details", {})
        location = details.get("location", {})

        def display(value: Any, suffix: str = "") -> str:
            return "Unavailable" if value is None else f"{value}{suffix}"

        base_probability = details.get("base_ml_probability")
        base_probability_text = (
            "Unavailable" if base_probability is None else f"{float(base_probability) * 100:.1f}%"
        )
        coordinates = (
            f"{location.get('latitude')}, {location.get('longitude')}"
            if location.get("latitude") is not None and location.get("longitude") is not None
            else "Unavailable"
        )
        return {
            "reply": (
                f"TerraGuard Risk Map analysis: **{loc_info['name']}**\n\n"
                f"• **Overall Landslide Risk Score:** **{display(details.get('final_risk_score'), ' / 100')}** ({details.get('risk_level', 'Unavailable')})\n"
                f"• **Base ML probability:** {base_probability_text}\n"
                f"• **3-day rainfall:** {display(rainfall.get('rainfall_3d_mm'), ' mm')}\n"
                f"• **Slope:** {display(inputs.get('slope_deg'), '°')}\n"
                f"• **Elevation:** {display(inputs.get('elevation_m'), ' m')}\n"
                f"• **Coordinates:** {coordinates}\n"
                f"• **Soil:** {soil.get('soil_name') or 'Unavailable'}\n"
                f"• **Seismic trigger score:** {display(seismic.get('seismic_trigger_score'))}\n\n"
                "TerraGuard is decision support, not an official warning or evacuation order. Follow SDMA/NDMA and local authority instructions."
            ),
            "source": "terraguard-live-ml",
            "action": {
                "type": "SELECT_REGION",
                "module": "risk-map",
                "zone_id": loc_info["zone_id"],
                "coordinates": {"lat": loc_info["lat"], "lon": loc_info["lon"]},
            },
        }

    msg_lower = message.lower()
    for faq in FAQ_DATABASE:
        if any(keyword in msg_lower for keyword in faq["keywords"]):
            return {"reply": faq["answer"], "source": "terraguard-rule-engine", "action": faq.get("action")}
    return {
        "reply": (
            "TerraGuard Assistant can analyze real-time landslide risk, terrain, rainfall, and seismic activity.\n\n"
            "Try asking about Teesta Basin, a Risk Map location, rainfall, or emergency safety."
        ),
        "source": "terraguard-rule-engine",
    }


def generate_gemini_response(
    message: str, history: List[Dict[str, str]], loc_context: Optional[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    if not GEMINI_API_KEY:
        return None
    try:
        system_instruction = (
            "You are TerraGuard Assistant. Use only general geotechnical and safety knowledge. "
            "Never invent numerical risk, rainfall, soil, seismic, or warning data."
        )
        prompt_content = f"{system_instruction}\nUser Question: {message}"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        response = requests.post(
            url,
            json={"contents": [{"parts": [{"text": prompt_content}]}]},
            timeout=8,
        )
        if response.status_code == 200:
            data = response.json()
            return {
                "reply": data["candidates"][0]["content"]["parts"][0]["text"],
                "source": "gemini-1.5-flash",
            }
    except Exception as error:
        print(f"Gemini API fallback to offline rule engine: {error}")
    return None


def process_chat_message(message: str, history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    loc = extract_location(message)
    loc_context = fetch_live_location_context(loc) if loc else None
    if GEMINI_API_KEY and not loc_context:
        gemini_response = generate_gemini_response(message, history or [], None)
        if gemini_response:
            return gemini_response
    return generate_offline_response(message, loc_context)
