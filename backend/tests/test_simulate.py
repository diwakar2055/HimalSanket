import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_simulate_default_langtang_transition():
    """
    Critical demo test:
    Validates that a simulated rainfall, seismic, and lake spike transitions
    Langtang Valley from Moderate baseline to Critical emergency tier.
    """
    response = client.post("/simulate", json={})
    assert response.status_code == 200
    data = response.json()

    assert data["location_id"] == "langtang"
    assert data["transition"] == "Moderate -> Critical"
    assert data["baseline"]["risk_level"] == "Moderate"
    assert data["simulated"]["risk_level"] == "Critical"
    assert data["simulated"]["risk_score"] > data["baseline"]["risk_score"]

    # Verify delta
    assert data["delta"]["risk_score_delta"] > 0.35
    assert data["delta"]["rainfall_delta_mm"] == 75.0
    assert data["delta"]["seismic_delta_magnitude"] == 1.8
    assert data["delta"]["lake_change_delta_pct"] == 7.0
    assert data["delta"]["reports_delta_count"] == 2.0

    # Verify actionable recommendations switched to Evacuate
    assert data["simulated"]["explanation"]["action_code"] == "EVACUATE_AVOID_ENTRY"
    assert "CRITICAL" in data["simulated"]["explanation"]["summary_message"]


def test_simulate_custom_corridor():
    response = client.post("/simulate", json={"location_id": "annapurna"})
    assert response.status_code == 200
    data = response.json()
    assert data["location_id"] == "annapurna"
    assert data["simulated"]["risk_score"] > data["baseline"]["risk_score"]


def test_simulate_nonexistent_corridor():
    response = client.post("/simulate", json={"location_id": "unknown_pass"})
    assert response.status_code == 404
