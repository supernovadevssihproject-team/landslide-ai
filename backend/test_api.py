"""
Test Suite for LandslideGuard Backend API
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from starlette.testclient import TestClient
from backend.main import app
from backend.services import earthquake_service as earthquake_module
from backend.services.chatbot_service import generate_offline_response

client = TestClient(app)

def test_health():
    res1 = client.get("/api/health")
    assert res1.status_code == 200
    assert res1.json()["status"] == "healthy"
    res2 = client.get("/health")
    assert res2.status_code == 200
    assert res2.json()["status"] == "healthy"
    print("[PASS] Health check endpoints (/health, /api/health) passed")


def test_chatbot_language_support():
    response = client.post("/api/chat", json={
        "message": "What is the risk in Sikkim?",
        "history": [],
        "language": "hi"
    })
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload["reply"], str)
    assert "" != payload["reply"].strip()
    print(f"[PASS] Chatbot language support passed: {payload['source']} in hi mode")


def test_chatbot_all_language_responses():
    language_markers = {
        "en": "TerraGuard Assistant can analyze",
        "hi": "TerraGuard सहायक",
        "as": "TerraGuard সহায়কে",
        "bn": "TerraGuard সহায়ক",
        "brx": "TerraGuard सहायक",
        "ks": "TerraGuard madadgar",
        "mni": "TerraGuard assistant-na",
        "lus": "TerraGuard assistant chuan",
        "ne": "TerraGuard सहायकले",
    }
    english_reply = None
    for language, marker in language_markers.items():
        response = client.post("/api/chat", json={"message": "hello", "language": language})
        assert response.status_code == 200
        reply = response.json()["reply"]
        assert marker in reply
        if language == "en":
            english_reply = reply
        else:
            assert reply != english_reply

    structured = generate_offline_response(
        "North Cachar Hills risk?",
        loc_context={
            "location": {"name": "North Cachar Hills", "zone_id": "zone-test", "lat": 25.2, "lon": 93.0},
            "risk_details": {
                "final_risk_score": 42,
                "risk_level": "MODERATE",
                "base_ml_probability": 0.42,
                "inputs": {
                    "rainfall": {"rainfall_3d_mm": 120},
                    "slope_deg": 35,
                    "elevation_m": 900,
                    "seismic": {"seismic_trigger_score": 0.1},
                    "soil_details": {"soil_name": "Loam"},
                },
                "location": {"latitude": 25.2, "longitude": 93.0},
            },
        },
        language="hi",
    )
    assert "कुल भूस्खलन जोखिम स्कोर" in structured["reply"]
    assert "42 / 100" in structured["reply"]
    print("[PASS] Chatbot responses and structured location-risk localization passed for all 9 languages")


def test_chatbot_navigation_commands():
    commands = {
        "Show me the risk map": "risk-map",
        "Open earthquake monitor": "earthquake-monitor",
        "Show weather": "dashboard",
        "Open Hills": "hills-regions",
        "Open Hills and Mountain Regions": "hills-regions",
        "Show mountain regions": "hills-regions",
        "Go to hills": "hills-regions",
        "Open Regions": "hills-regions",
        "Show regions": "hills-regions",
        "Go to regions": "hills-regions",
        "Show hills in Meghalaya": "hills-regions",
        "Open alerts": "alerts",
        "Report a hazard": "crowdsource-cv-verification",
        "Go home": "home",
    }
    for message, module in commands.items():
        response = client.post("/api/chat", json={"message": message, "language": "en"})
        assert response.status_code == 200
        action = response.json()["action"]
        assert action["type"] == "NAVIGATE"
        assert action["module"] == module
    print("[PASS] Chatbot navigation commands preserved shared action routing")


def test_hazard_zones():
    response = client.get("/api/zones")
    assert response.status_code == 200
    zones = response.json()
    assert len(zones) >= 5
    assert any(z["id"] == "zone-sk-01" for z in zones)
    print(f"[PASS] Hazard zones endpoint passed ({len(zones)} zones loaded)")

def test_susceptibility_calculation():
    payload = {
        "slope_deg": 48.5,
        "soil_saturation_pct": 85.0,
        "elevation_m": 1420.0
    }
    response = client.post("/api/zones/calculate-susceptibility", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "susceptibility_index" in data
    assert data["risk_status"] in ["CRITICAL RED", "ADVISORY ORANGE", "NOMINAL GREEN"]
    print(f"[PASS] Susceptibility calculation passed: {data['risk_status']} ({data['susceptibility_index']})")

def test_predict_lstm():
    response = client.get("/api/predict/lstm?extra_rainfall=25")
    assert response.status_code == 200
    data = response.json()
    assert "hazard_score" in data
    assert "simulated_fos" in data
    assert "simulated_pwp" in data
    assert "lead_time_display" in data
    print(f"[PASS] LSTM dynamic trigger passed: Hazard Score={data['hazard_score']}, FoS={data['simulated_fos']}, Lead Time={data['lead_time_display']}")

def test_crowdsource_reports():
    response = client.get("/api/reports")
    assert response.status_code == 200
    reports = response.json()
    assert len(reports) >= 1
    print(f"[PASS] Crowdsource reports passed ({len(reports)} reports)")

def test_report_submission_and_cv():
    payload = {
        "location": "NH-10 Near Dikchu Bend (Km 36.2)",
        "subDivision": "Mangan Sub-Division",
        "state": "sikkim",
        "description": "Active rotational blowout with tension cracks across roadway."
    }
    response = client.post("/api/reports/submit", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["urgency"] == "CRITICAL"
    assert len(data["boundingBoxes"]) > 0
    print(f"[PASS] Citizen report upload + AI CV vision passed: {data['code']} ({data['cvLabel']})")

def test_sensor_nodes():
    response = client.get("/api/sensors")
    assert response.status_code == 200
    sensors = response.json()
    assert len(sensors) >= 4
    print(f"[PASS] IoT Sensor telemetry nodes passed ({len(sensors)} sensors)")

def test_cap_alert():
    response = client.get("/api/alerts/cap")
    assert response.status_code == 200
    data = response.json()
    assert "alert" in data
    assert "raw_xml" in data
    assert "MANDATORY EVACUATION" in data["alert"]["headline"]
    print(f"[PASS] CAP 1.2 Alert generation passed: {data['alert']['identifier']}")

def test_live_weather():
    response = client.get("/api/weather/live?state=sikkim")
    assert response.status_code == 200
    data = response.json()
    assert "current_temperature_c" in data
    assert "soil_saturation_pct" in data
    print(f"[PASS] Live meteorological & soil moisture feed passed: {data['station_name']} ({data['current_temperature_c']}C, {data['soil_saturation_pct']}% Saturation)")

def test_sms_broadcast():
    payload = {
        "headline": "MANDATORY EVACUATION NH-10",
        "instruction": "Move to Singtam Relief Camp immediately.",
        "state": "sikkim"
    }
    response = client.post("/api/alerts/sms-broadcast", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "delivered"
    print(f"[PASS] Emergency SMS Broadcast gateway passed: {data['gateway']}")

def test_ml_predict():
    payload = {
        "elevation": 1450.0,
        "slope": 38.0,
        "aspect": 190.0,
        "soil_id": "4276.0",
        "landcover_class": "50.0",
        "rainfall_1d": 65.0,
        "rainfall_3d": 120.0,
        "rainfall_7d": 195.0,
        "rainfall_15d": 260.0,
        "rainfall_30d": 380.0
    }
    # Test both /api/ml/predict and /predict alias
    response = client.post("/api/ml/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data

    res_alias = client.post("/predict", json=payload)
    assert res_alias.status_code == 200
    assert "prediction" in res_alias.json()

    print(f"[PASS] ML Pipeline Inference passed: {data['prediction_label']} ({data['probability_percentage']}% Prob, {data['risk_level']})")

def test_model_info():
    res1 = client.get("/api/ml/model-info")
    assert res1.status_code == 200
    assert "model_name" in res1.json()
    res2 = client.get("/model-info")
    assert res2.status_code == 200
    assert "model_name" in res2.json()
    print("[PASS] Model info endpoints (/model-info, /api/ml/model-info) passed")

def test_predict_invalid_rainfall():
    # Violate cumulative rainfall constraint: rainfall_3d < rainfall_1d
    invalid_payload = {
        "elevation": 1450.0,
        "slope": 38.0,
        "aspect": 190.0,
        "soil_id": "4276.0",
        "landcover_class": "50.0",
        "rainfall_1d": 120.0,
        "rainfall_3d": 50.0,  # Invalid: 50 < 120
        "rainfall_7d": 195.0,
        "rainfall_15d": 260.0,
        "rainfall_30d": 380.0
    }
    response = client.post("/predict", json=invalid_payload)
    assert response.status_code == 422
    assert "Cumulative rainfall constraint violated" in response.json()["detail"]
    print("[PASS] Invalid rainfall validation (422) caught correctly")

def test_ml_metrics():
    response = client.get("/api/ml/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "roc_auc" in data
    assert "accuracy" in data
    print(f"[PASS] ML Pipeline Metrics passed: ROC-AUC {round(data['roc_auc'], 3)}, Accuracy {round(data['accuracy'], 3)}")

def test_ml_comparison():
    response = client.get("/api/ml/comparison")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    models = [m["model"] for m in data]
    assert "Random Forest" in models
    assert "Logistic Regression" in models
    print(f"[PASS] ML Model Comparison passed: {len(data)} models evaluated")

def test_ml_datasets():
    response = client.get("/api/ml/datasets")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 15
    print(f"[PASS] Landslide Datasets Inventory passed: {len(data)} datasets integrated")

def test_gis_historical_training_events():
    response = client.get("/api/zones/historical-training-events")
    assert response.status_code == 200
    events = response.json()
    assert len(events) >= 30
    assert any("rainfall_3d" in evt for evt in events)
    assert any("top_pct" in evt and "left_pct" in evt for evt in events)
    print(f"[PASS] GIS Historical Training Events passed: {len(events)} real ground-truth events loaded with canvas coordinates")

def test_gis_zone_ml_risk():
    response = client.get("/api/zones/zone-sk-01/ml-risk?extra_rainfall=30")
    assert response.status_code == 200
    data = response.json()
    assert data["zone_id"] == "zone-sk-01"
    assert "probability_percentage" in data
    assert "historical_precedents_count" in data
    assert "risk_tier" in data
    print(f"[PASS] GIS Zone ML Risk Inference passed: {data['zone_name']} -> {data['probability_percentage']}% ({data['risk_tier']}, {data['historical_precedents_count']} precedents)")

def test_gis_ml_heatmap_points():
    response = client.get("/api/zones/ml-heatmap-points?extra_rainfall=25")
    assert response.status_code == 200
    data = response.json()
    assert "points" in data
    assert len(data["points"]) >= 50
    assert any(p["category"] == "zone_susceptibility" for p in data["points"])
    assert any(p["category"] == "historical_ground_truth" for p in data["points"])
    assert all(0.0 <= p["weight"] <= 1.0 for p in data["points"])
    print(f"[PASS] GIS ML Pattern Heatmap passed: {len(data['points'])} weighted points generated from ML model & training data")

def test_official_earthquake_contract():
    response = client.get("/api/earthquakes?latitude=27.53&longitude=88.51&radius_km=500")
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "National Center for Seismology"
    assert "earthquake_data_available" in data
    assert "earthquake_trigger_score" in data
    assert isinstance(data["events"], list)
    if data["events"]:
        event = data["events"][0]
        assert set(("id", "magnitude", "latitude", "longitude", "depth_km", "location", "event_time", "source", "status")) <= set(event)
        assert event["source"] == "National Center for Seismology"
    print(f"[PASS] Official NCS earthquake feed contract passed ({len(data['events'])} nearby events)")

    no_nearby = client.get("/api/earthquakes?latitude=0&longitude=0&radius_km=1")
    assert no_nearby.status_code == 200
    no_nearby_data = no_nearby.json()
    if no_nearby_data["earthquake_data_available"]:
        assert no_nearby_data["events"] == []
        assert no_nearby_data["earthquake_trigger_score"] == 0.0
    print("[PASS] No-nearby-earthquake state keeps the trigger at zero")

def test_earthquake_parser_and_safe_fallback():
    html = """
    <li data-json='{"event_id":"ncs-1","event_name":"M: 4.2 - Sikkim","origin_time":"2026-09-09 10:01:25 IST","lat_long":"27.531, 88.513","magnitude_depth":"M: 4.2 , D: 20km","event_type":"Reviewed"}'></li>
    <li data-json='{"event_id":"ncs-1","event_name":"M: 4.2 - Sikkim","origin_time":"2026-09-09 10:01:25 IST","lat_long":"27.531, 88.513","magnitude_depth":"M: 4.2 , D: 20km","event_type":"Reviewed"}'></li>
    <li data-json='not-json'></li>
    """
    events = earthquake_module.EarthquakeService._parse_ncs_html(html)
    assert len(events) == 1
    assert events[0]["location"] == "Sikkim"
    assert events[0]["event_time"].endswith("+05:30")

    original_get = earthquake_module.requests.get
    earthquake_module.earthquake_service._cache = None
    earthquake_module.requests.get = lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("offline"))
    try:
        response = earthquake_module.earthquake_service.get_earthquakes()
        assert response["earthquake_data_available"] is False
        assert response["source_status"] == "temporarily_unavailable"
        assert response["events"] == []
        assert response["earthquake_trigger_score"] == 0.0
    finally:
        earthquake_module.requests.get = original_get
        earthquake_module.earthquake_service._cache = None
    print("[PASS] Earthquake deduplication, validation, and unavailable fallback passed")

def test_chatbot():
    res = client.post("/api/chat", json={"message": "What is the landslide risk at Teesta Basin?"})
    assert res.status_code == 200
    data = res.json()
    assert "Teesta Basin" in data["reply"]
    assert "final_risk_score" in data["reply"] or "Score" in data["reply"]
    assert data["source"] in ["terraguard-live-ml", "gemini-1.5-flash"]
    assert data["action"]["type"] == "SELECT_REGION"

    # Test offline FAQ answer
    res2 = client.post("/api/chat", json={"message": "Show me the risk map"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["action"]["type"] == "NAVIGATE"
    assert data2["action"]["module"] == "risk-map"

    # Test emergency SOS question
    res3 = client.post("/api/chat", json={"message": "What is the emergency helpline number?"})
    assert res3.status_code == 200
    data3 = res3.json()
    assert "1078" in data3["reply"]
    print("[PASS] Chatbot /api/chat grounded location risk, FAQ, and Emergency SOS tests passed")

if __name__ == "__main__":
    print("\nRunning LandslideGuard Backend API Tests...\n")
    test_health()
    test_hazard_zones()
    test_susceptibility_calculation()
    test_predict_lstm()
    test_crowdsource_reports()
    test_report_submission_and_cv()
    test_sensor_nodes()
    test_cap_alert()
    test_live_weather()
    test_sms_broadcast()
    test_ml_predict()
    test_model_info()
    test_predict_invalid_rainfall()
    test_ml_metrics()
    test_ml_comparison()
    test_ml_datasets()
    test_gis_historical_training_events()
    test_gis_zone_ml_risk()
    test_gis_ml_heatmap_points()
    test_official_earthquake_contract()
    test_earthquake_parser_and_safe_fallback()
    test_chatbot()
    test_chatbot_all_language_responses()
    test_chatbot_navigation_commands()
    print("\nAll 24 Backend API tests passed successfully!\n")

