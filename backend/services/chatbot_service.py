import os
import re
import math
import requests
from typing import Dict, Any, List, Optional
from backend.config import GEMINI_API_KEY
from backend.routers.ml_model import compute_location_risk, LocationRiskRequest
from backend.services.weather_service import weather_service
from backend.services.earthquake_service import earthquake_service
from backend.services.soil_service import soil_service


KNOWN_LOCATIONS = {
    "teesta": {"name": "Teesta Basin", "lat": 27.12, "lon": 88.50, "zone_id": "zone-sk-01", "region_id": "teesta_basin"},
    "teesta basin": {"name": "Teesta Basin", "lat": 27.12, "lon": 88.50, "zone_id": "zone-sk-01", "region_id": "teesta_basin"},
    "sohra": {"name": "Sohra (Cherrapunji)", "lat": 25.27, "lon": 91.73, "zone_id": "zone-mg-01", "region_id": "cherrapunji"},
    "cherrapunji": {"name": "Sohra (Cherrapunji)", "lat": 25.27, "lon": 91.73, "zone_id": "zone-mg-01", "region_id": "cherrapunji"},
    "gangtok": {"name": "Gangtok Ridge", "lat": 27.33, "lon": 88.61, "zone_id": "zone-sk-01", "region_id": "gangtok"},
    "dima hasao": {"name": "Dima Hasao", "lat": 25.17, "lon": 93.01, "zone_id": "zone-as-01", "region_id": "dima_hasao"},
    "uttarkashi": {"name": "Uttarkashi", "lat": 30.73, "lon": 78.44, "zone_id": "zone-uk-01", "region_id": "uttarkashi"},
    "wayanad": {"name": "Wayanad Hills", "lat": 11.69, "lon": 76.13, "zone_id": "zone-kl-01", "region_id": "wayanad"},
    "shimla": {"name": "Shimla Ridge", "lat": 31.10, "lon": 77.17, "zone_id": "zone-hp-01", "region_id": "shimla"},
    "darjeeling": {"name": "Darjeeling Hills", "lat": 27.04, "lon": 88.26, "zone_id": "zone-wb-01", "region_id": "darjeeling"},
    "munnar": {"name": "Munnar Hills", "lat": 10.08, "lon": 77.06, "zone_id": "zone-kl-02", "region_id": "munnar"},
    "chamoli": {"name": "Chamoli", "lat": 30.41, "lon": 79.33, "zone_id": "zone-uk-02", "region_id": "chamoli"},
    "guwahati": {"name": "Guwahati Hills", "lat": 26.14, "lon": 91.73, "zone_id": "zone-as-02", "region_id": "guwahati"},
}

FAQ_DATABASE = [
    {
        "keywords": ["sos", "emergency", "help", "call", "ndma", "1078", "rescue"],
        "answer": "🚨 **Emergency SOS Notice**:\nTerraGuard is an AI early warning system, not an official emergency dispatcher.\n\n- Press the **Emergency SOS button** in the top navigation bar to access tactical dispatch.\n- **National Disaster Management Authority (NDMA) Helpline**: Call **1078** or **1077**.\n- Move to designated high-ground shelters immediately if you observe slope movement, sudden water turbidity, or deep ground cracks.",
        "action": {"type": "NAVIGATE", "module": "emergency-sos"}
    },
    {
        "keywords": ["map", "risk map", "gis", "spatial", "visualize"],
        "answer": "🗺️ You can view the real-time spatial risk heatmap on the **Risk Map** module. It renders multi-layered slope angle, soil saturation, and ML susceptibility grids across North East India and major mountain ranges.",
        "action": {"type": "NAVIGATE", "module": "risk-map"}
    },
    {
        "keywords": ["score", "meaning", "ml score", "calculated", "formula", "how does terraguard work"],
        "answer": "🧠 **TerraGuard ML Risk Architecture**:\n- **Random Forest Model**: Trained on historic GSI & satellite inventory (ROC-AUC 1.0, 96.5% Precision).\n- **Factors Evaluated**: Slope Angle, Elevation, HWSD2 Soil WRB Class, ESA WorldCover Land Use, 3-Day Cumulative Rainfall (Open-Meteo), and Seismic Triggering (USGS M4.5+ events).\n- **Formula**: `Risk Score (0-10) = ML Base Score (0-10) × Rainfall Multiplier × Seismic Multiplier`.",
        "action": {"type": "NAVIGATE", "module": "ml-pipeline"}
    },
    {
        "keywords": ["safety", "do during", "what to do", "landslide warning", "precautions"],
        "answer": "🛡️ **Landslide Safety Guidelines**:\n1. **Before**: Monitor TerraGuard alerts and 3-day rainfall forecasts. Identify evacuation routes.\n2. **During**: If you hear loud rumble noises or tree snapping, evacuate immediately up-slope, away from debris paths. Never cross flooded gullies.\n3. **After**: Avoid the slide area as secondary slides may occur. Report hazard locations via TerraGuard Crowdsource Reporting.",
        "action": {"type": "NAVIGATE", "module": "crowdsource"}
    },
]

def extract_location(message: str) -> Optional[Dict[str, Any]]:
    msg_lower = message.lower()
    for loc_key, loc_data in KNOWN_LOCATIONS.items():
        if loc_key in msg_lower:
            return loc_data
    return None

def fetch_live_location_context(loc: Dict[str, Any]) -> Dict[str, Any]:
    req = LocationRiskRequest(name=loc["name"], latitude=loc["lat"], longitude=loc["lon"])
    risk_res = compute_location_risk(req)
    return {
        "location": loc,
        "risk_details": risk_res
    }

def generate_offline_response(message: str, loc_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    msg_lower = message.lower()
    if loc_context:
        details = loc_context["risk_details"]
        loc_info = loc_context["location"]
        loc_name = details.get("location_name", loc_info["name"])
        risk_score = details.get("final_risk_score", 0.0)
        tier = details.get("risk_tier", "LOW")
        ml_base = details.get("ml_susceptibility_score", 0.0)
        rain_3d = details.get("rainfall_3d_mm", 0.0)
        rain_mult = details.get("rainfall_multiplier", 1.0)
        seis_score = details.get("seismic_trigger_score", 0.0)
        seis_mult = details.get("seismic_multiplier", 1.0)
        soil_name = details.get("soil_name", "HWSD2 Soil")
        landcover = details.get("landcover_name", "Landcover")
        slope = details.get("slope_degrees", 0.0)
        
        reply = (
            f"📍 **TerraGuard Live Analysis for {loc_name}**\n\n"
            f"• **Overall Landslide Risk Score**: **{risk_score:.2f} / 10.0** (`{tier}`)\n"
            f"• **ML Susceptibility Base**: `{ml_base:.2f} / 10.0`\n"
            f"• **Terrain & Soil**: Slope `{slope:.1f}°`, Soil: *{soil_name}*, Cover: *{landcover}*\n"
            f"• **3-Day Cumulative Rainfall**: `{rain_3d:.1f} mm` (Multiplier: `×{rain_mult:.2f}`)\n"
            f"• **Seismic Factor**: Activity score `{seis_score:.2f}` (Multiplier: `×{seis_mult:.2f}`)\n\n"
            f"*Data derived dynamically from HWSD2 soil lookup, Open-Meteo precipitation, USGS seismic monitoring, and TerraGuard Random Forest ML engine.*"
        )
        return {
            "reply": reply,
            "source": "terraguard-live-ml",
            "action": {
                "type": "SELECT_REGION",
                "region_id": loc_info.get("region_id"),
                "zone_id": loc_info.get("zone_id"),
                "coordinates": {"lat": loc_info["lat"], "lon": loc_info["lon"]}
            }
        }

    for faq in FAQ_DATABASE:
        if any(kw in msg_lower for kw in faq["keywords"]):
            return {
                "reply": faq["answer"],
                "source": "terraguard-rule-engine",
                "action": faq.get("action")
            }

    return {
        "reply": (
            "🤖 **TerraGuard Assistant**:\n"
            "I can analyze real-time landslide risks, terrain features, rainfall, and seismic activity across North East India and mountain regions.\n\n"
            "**Try asking me**:\n"
            "- *'What is the landslide risk at Teesta Basin?'*\n"
            "- *'What is the rainfall at Sohra?'*\n"
            "- *'Why is this location high risk?'*\n"
            "- *'How does the ML score work?'*\n"
            "- *'Show me the risk map.'*"
        ),
        "source": "terraguard-rule-engine"
    }

def generate_gemini_response(message: str, history: List[Dict[str, str]], loc_context: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not GEMINI_API_KEY:
        return None
    try:
        system_instruction = (
            "You are TerraGuard Assistant, an AI safety & geotechnical expert integrated into the TerraGuard Landslide Early Warning System (SIH Problem Statement 26001).\n"
            "RULES:\n"
            "1. NEVER invent risk scores, rainfall figures, soil types, earthquake events, or official warnings.\n"
            "2. Rely ONLY on provided TerraGuard live context or general geotechnical/landslide safety knowledge.\n"
            "3. For emergency inquiries, direct users to call 1078/1077 (NDMA) and use the Emergency SOS tab.\n"
            "4. Keep responses concise, authoritative, and structured with markdown bullet points."
        )
        context_str = ""
        if loc_context:
            details = loc_context["risk_details"]
            context_str = f"\nLIVE TERRAGUARD GROUNDED DATA:\n{details}\n"

        prompt_content = f"{system_instruction}\n{context_str}\nUser Question: {message}"
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt_content}]}]
        }
        res = requests.post(url, json=payload, timeout=8)
        if res.status_code == 200:
            data = res.json()
            reply_text = data["candidates"][0]["content"]["parts"][0]["text"]
            action = None
            if loc_context:
                action = {
                    "type": "SELECT_REGION",
                    "region_id": loc_context["location"].get("region_id"),
                    "zone_id": loc_context["location"].get("zone_id"),
                    "coordinates": {"lat": loc_context["location"]["lat"], "lon": loc_context["location"]["lon"]}
                }
            return {
                "reply": reply_text,
                "source": "gemini-1.5-flash",
                "action": action
            }
    except Exception as e:
        print(f"Gemini API fallback to offline rule engine: {e}")
    return None

def process_chat_message(message: str, history: List[Dict[str, str]] = []) -> Dict[str, Any]:
    loc = extract_location(message)
    loc_context = fetch_live_location_context(loc) if loc else None
    
    if GEMINI_API_KEY:
        gemini_res = generate_gemini_response(message, history, loc_context)
        if gemini_res:
            return gemini_res
            
    return generate_offline_response(message, loc_context)
