import pytest
from fastapi.testclient import TestClient
from main import app
from firestore_service import firestore_service

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_store():
    firestore_service._fallback_store.clear()


def test_orchestration_flow_success():
    """
    Tests complete 4-step orchestration:
    1. Calls Risk Engine
    2. Passes engine numbers to Gemini
    3. Saves session to Firestore
    4. Returns combined JSON to frontend
    """
    payload = {
        "location_id": "langtang",
        "location_name": "Langtang Valley",
        "region": "Rasuwa",
        "gps": "28.2096° N, 85.5089° E",
        "rainfall": 75.0,
        "rain_threshold": 144.0,
        "seismic_activity": 2.2,
        "lake_area_change": 6.5,
        "terrain_susceptibility": 0.71,
        "reports": [
            {
                "report_type": "water",
                "label": "Water rising",
                "note": "Stream murky and water level rising rapidly",
                "voice_attached": True
            }
        ]
    }

    response = client.post("/orchestrate", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Session ID verification
    assert "session_id" in data
    assert data["session_id"].startswith("session_langtang_")
    assert data["status"] == "success"
    assert data["orchestration_time_ms"] >= 0.0

    # Location metadata
    assert data["location"]["location_id"] == "langtang"
    assert data["location"]["region"] == "Rasuwa"

    # Step 1: Risk Engine Numbers
    risk = data["risk_assessment"]
    assert "risk_score" in risk
    assert 0.0 <= risk["risk_score"] <= 1.0
    assert risk["risk_level"] in ["Moderate", "High", "Critical"]
    assert "normalized_signals" in risk
    assert "signal_contributions" in risk
    assert "key_drivers" in risk["explanation"]

    # Step 2: Gemini Intelligence
    gemini = data["gemini_intelligence"]
    assert "briefing_en" in gemini
    assert len(gemini["briefing_en"]) > 10
    assert "briefing_ne" in gemini
    assert len(gemini["briefing_ne"]) > 5
    assert "sms_alert_romanized" in gemini
    assert len(gemini["sms_alert_romanized"]) <= 160
    assert "action_directive" in gemini
    assert "model_used" in gemini

    # Step 3: Firestore Sync Status
    firestore_sync = data["firestore_sync"]
    assert firestore_sync["saved"] is True
    assert firestore_sync["session_id"] == data["session_id"]
    assert firestore_sync["collection"] == "hazard_sessions"
    assert "storage_backend" in firestore_sync


def test_orchestrate_get_session_by_id():
    """
    Tests retrieving saved session document from Firestore.
    """
    payload = {
        "location_id": "khumbu",
        "location_name": "Everest / Khumbu",
        "region": "Solukhumbu",
        "rainfall": 120.0,
        "rain_threshold": 144.0,
        "seismic_activity": 3.5,
        "lake_area_change": 12.0,
        "terrain_susceptibility": 0.52,
        "reports": []
    }
    create_resp = client.post("/orchestrate", json=payload)
    assert create_resp.status_code == 200
    session_id = create_resp.json()["session_id"]

    # Fetch from Firestore endpoint
    fetch_resp = client.get(f"/orchestrate/sessions/{session_id}")
    assert fetch_resp.status_code == 200
    session_data = fetch_resp.json()

    assert session_data["session_id"] == session_id
    assert session_data["location_id"] == "khumbu"
    assert "inputs" in session_data
    assert "risk_assessment" in session_data
    assert "gemini_intelligence" in session_data


def test_orchestrate_list_recent_sessions():
    """
    Tests listing recent sessions recorded in Firestore for the dashboard.
    """
    payload = {
        "location_id": "annapurna",
        "rainfall": 15.0,
        "rain_threshold": 144.0,
        "seismic_activity": 0.5,
        "lake_area_change": 0.0,
        "terrain_susceptibility": 0.45,
        "reports": []
    }
    client.post("/orchestrate", json=payload)

    list_resp = client.get("/orchestrate/sessions")
    assert list_resp.status_code == 200
    sessions = list_resp.json()
    assert isinstance(sessions, list)
    assert len(sessions) >= 1
    assert any(s.get("location_id") == "annapurna" for s in sessions)


def test_orchestrate_nonexistent_session():
    """
    Querying a nonexistent session returns 404.
    """
    response = client.get("/orchestrate/sessions/nonexistent_id_9999")
    assert response.status_code == 404


def test_orchestrate_validation_error():
    """
    Validates invalid telemetry triggers HTTP 422.
    """
    invalid_payload = {
        "location_id": "langtang",
        "rainfall": -50.0,  # Negative rainfall is invalid
        "rain_threshold": 144.0,
        "seismic_activity": 1.0,
        "lake_area_change": 0.0,
        "terrain_susceptibility": 0.5
    }
    response = client.post("/orchestrate", json=invalid_payload)
    assert response.status_code == 422
