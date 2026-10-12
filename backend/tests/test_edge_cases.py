import pytest
from fastapi.testclient import TestClient
from main import app
from models import LocationRiskInput, RiskLevel, GroundReport
from risk_engine import evaluate_location_risk

client = TestClient(app)


def test_zero_signals_yields_minimum_low_risk():
    zero_inp = LocationRiskInput(
        rainfall=0.0,
        rain_threshold=100.0,
        seismic_activity=0.0,
        lake_area_change=0.0,
        terrain_susceptibility=0.0,
        reports=[]
    )
    res = evaluate_location_risk(zero_inp)
    assert res.risk_score == 0.0
    assert res.risk_level == RiskLevel.LOW
    assert res.risk_level_ne == "न्यून"
    assert res.explanation.action_code == "ROUTINE_MONITORING"
    assert "within normal limits" in res.explanation.key_drivers[0]


def test_extreme_overflow_signals_yields_maximum_critical_risk():
    overflow_inp = LocationRiskInput(
        rainfall=300.0,  # >> 100mm threshold
        rain_threshold=100.0,
        seismic_activity=8.0,  # >> 4.0 magnitude
        lake_area_change=50.0,  # >> 15% cap
        terrain_susceptibility=1.0,
        reports=[
            GroundReport(report_type="water", voice_attached=True),
            GroundReport(report_type="crack", voice_attached=True),
            GroundReport(report_type="sound", voice_attached=True),
            GroundReport(report_type="water", voice_attached=True),
            GroundReport(report_type="water", voice_attached=True),
        ]
    )
    res = evaluate_location_risk(overflow_inp)
    assert res.risk_score == 1.0
    assert res.risk_level == RiskLevel.CRITICAL
    assert res.risk_level_ne == "गम्भीर"
    assert res.explanation.action_code == "EVACUATE_AVOID_ENTRY"
    assert len(res.explanation.key_drivers) >= 3


def test_simulate_with_custom_baseline_payload():
    custom_baseline = {
        "location_id": "custom_valley",
        "location_name": "Mustang Kali Gandaki",
        "region": "Mustang",
        "rainfall": 10.0,
        "rain_threshold": 120.0,
        "seismic_activity": 0.5,
        "lake_area_change": 0.0,
        "terrain_susceptibility": 0.40,
        "reports": []
    }
    response = client.post("/simulate", json={
        "rainfall_spike": 100.0,
        "seismic_spike": 3.0,
        "lake_spike": 12.0,
        "additional_reports": 2,
        "custom_baseline": custom_baseline
    })
    assert response.status_code == 200
    data = response.json()
    assert data["location_name"] == "Mustang Kali Gandaki"
    assert data["baseline"]["risk_level"] == "Low"
    assert data["simulated"]["risk_level"] in ("High", "Critical")
    assert data["delta"]["rainfall_delta_mm"] == 100.0
