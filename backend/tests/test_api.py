import pytest
from fastapi.testclient import TestClient
from main import app
from cache import cache

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "HimalSanket" in data["service"]
    assert "endpoints" in data


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "active_weights" in data
    assert data["active_weights"]["rainfall"] == 0.3
    assert "cache_stats" in data
    assert "uptime_seconds" in data


def test_calculate_risk_endpoint_success():
    payload = {
        "location_id": "langtang",
        "location_name": "Langtang Valley",
        "region": "Rasuwa",
        "rainfall": 38.0,
        "rain_threshold": 144.0,
        "seismic_activity": 1.8,
        "lake_area_change": 4.0,
        "terrain_susceptibility": 0.71,
        "reports": []
    }
    response = client.post("/risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["location_id"] == "langtang"
    assert data["risk_level"] == "Moderate"
    assert "risk_score" in data
    assert "normalized_signals" in data
    assert "signal_contributions" in data
    assert "explanation" in data
    assert "X-Process-Time-Ms" in response.headers


def test_calculate_risk_validation_error():
    # Negative rainfall
    payload = {
        "rainfall": -10.0,
        "rain_threshold": 144.0,
        "seismic_activity": 1.0,
        "lake_area_change": 0.0,
        "terrain_susceptibility": 0.5
    }
    response = client.post("/risk", json=payload)
    assert response.status_code == 422


def test_caching_behavior():
    payload = {
        "location_id": "khumbu",
        "rainfall": 20.0,
        "rain_threshold": 100.0,
        "seismic_activity": 1.0,
        "lake_area_change": 2.0,
        "terrain_susceptibility": 0.5,
        "reports": []
    }
    # First call: cache miss
    resp1 = client.post("/risk", json=payload)
    assert resp1.status_code == 200

    # Second call: cache hit
    resp2 = client.post("/risk", json=payload)
    assert resp2.status_code == 200
    assert resp2.json()["risk_score"] == resp1.json()["risk_score"]

    health_resp = client.get("/health")
    assert health_resp.json()["cache_stats"]["hits"] >= 1


def test_get_all_regions():
    response = client.get("/regions")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 8
    region_ids = [r["id"] for r in data]
    assert "langtang" in region_ids
    assert "khumbu" in region_ids
    assert "annapurna" in region_ids
    assert "manaslu" in region_ids
    assert "rolwaling" in region_ids
    assert "mardi" in region_ids
    assert "poonhill" in region_ids
    assert "abc" in region_ids


def test_get_region_by_id():
    response = client.get("/regions/langtang")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "langtang"
    assert data["region"] == "Rasuwa"
    assert "baseline_risk" in data

    resp_mardi = client.get("/regions/mardi")
    assert resp_mardi.status_code == 200
    assert resp_mardi.json()["name"] == "Mardi Himal Trek"

    resp_abc = client.get("/regions/abc")
    assert resp_abc.status_code == 200
    assert resp_abc.json()["name"] == "Annapurna Base Camp (ABC)"

    resp_rol = client.get("/regions/rolwaling")
    assert resp_rol.status_code == 200
    data_rol = resp_rol.json()
    assert data_rol["id"] == "rolwaling"
    assert data_rol["region"] == "Dolakha"


def test_get_nonexistent_region():
    response = client.get("/regions/nonexistent_valley")
    assert response.status_code == 404


def test_interactive_documentation_endpoints():
    r1 = client.get("/docs-web")
    assert r1.status_code == 200
    assert "HimalSanket" in r1.text
    assert "Physics MCDA" in r1.text
    assert "TimesFM" in r1.text

    r2 = client.get("/documentation")
    assert r2.status_code == 200
    assert "HimalSanket" in r2.text

