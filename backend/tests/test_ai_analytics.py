import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_timesfm_rainfall_prediction():
    payload = {
        "corridor_id": "langtang",
        "corridor_name": "Langtang Valley",
        "rain_threshold_24h": 144.0,
        "historical_hourly_rain": [1.2, 2.5, 3.8, 5.0, 8.5, 14.0],
        "forecast_horizon_hours": 24
    }
    response = client.post("/ai/predict/rainfall", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["corridor_id"] == "langtang"
    assert data["forecast_horizon_hours"] == 24
    assert len(data["predicted_hourly_rain_mm"]) == 24
    assert data["predicted_cumulative_rain_mm"] > 0
    assert "TimesFM" in data["forecasting_engine"]
    assert data["threshold_exceedance_probability"] >= 0.0


def test_satellite_lake_analysis():
    payload = {
        "lake_id": "imja_tsho",
        "lake_name": "Imja Tsho Glacial Lake",
        "region": "Solukhumbu",
        "elevation_m": 5010.0,
        "observations": [
            {
                "date": "2026-08-01",
                "sensor": "Sentinel-2",
                "surface_area_km2": 1.28,
                "water_index_method": "NDWI",
                "cloud_cover_pct": 5.0
            },
            {
                "date": "2026-08-20",
                "sensor": "Sentinel-2",
                "surface_area_km2": 1.42,
                "water_index_method": "NDWI",
                "cloud_cover_pct": 10.0
            }
        ]
    }
    response = client.post("/ai/analyze/satellite", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["lake_id"] == "imja_tsho"
    assert data["area_change_km2"] == 0.14
    assert data["area_change_pct"] > 10.0
    assert "CRITICAL" in data["glof_risk_indicator"] or "ELEVATED" in data["glof_risk_indicator"]
    assert data["lake_score_normalized"] > 0.60
    assert "Sentinel-2" in data["methodology"]


def test_gemini_briefing_synthesis():
    payload = {
        "corridor_name": "Langtang Valley",
        "region": "Rasuwa",
        "risk_score": 0.82,
        "risk_level": "Critical",
        "rainfall_mm": 120.0,
        "rain_threshold_mm": 144.0,
        "seismic_magnitude": 3.4,
        "lake_change_pct": 12.5,
        "terrain_susceptibility": 0.71,
        "ground_reports_count": 3,
        "key_drivers": ["high rainfall", "rapid glacial lake expansion"]
    }
    response = client.post("/ai/briefing", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["corridor_name"] == "Langtang Valley"
    assert data["risk_level"] == "Critical"
    assert "Gemini" in data["model_used"]
    assert len(data["briefing_en"]) > 20
    assert len(data["briefing_ne"]) > 10
    assert "sms_alert_romanized" in data
    assert "POSTPONE" in data["action_directive"] or "EVACUATE" in data["action_directive"]


def test_voice_report_analysis():
    payload = {
        "corridor_id": "langtang",
        "reporter_role": "porter",
        "raw_transcript": "खोला धमिलो भएर तीव्र गतिमा बढ्दै छ, माथिबाट ठूलो आवाज आयो",
        "duration_seconds": 8.0
    }
    response = client.post("/ai/process/voice-report", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["detected_language"] == "Nepali (नेपाली)"
    assert data["detected_hazard_category"] == "water"
    assert len(data["detected_keywords"]) >= 2
    assert data["risk_engine_report_boost"] > 0.18


def test_river_network_retrieval():
    response = client.get("/ai/river-network/langtang")
    assert response.status_code == 200
    data = response.json()
    assert data["corridor_id"] == "langtang"
    assert "Trishuli" in data["primary_river"]
    assert len(data["map_polyline_coordinates"]) >= 4
    assert len(data["vulnerable_downstream_settlements"]) >= 3
    # Check Syabrubesi exists in vulnerable settlements
    settlement_names = [s["name"] for s in data["vulnerable_downstream_settlements"]]
    assert any("Syabrubesi" in name for name in settlement_names)

