import pytest
from config import RiskWeightsSettings, settings
from models import LocationRiskInput, RiskLevel, GroundReport
from risk_engine import (
    normalize_rainfall,
    normalize_seismic,
    normalize_lake_growth,
    normalize_terrain,
    normalize_reports,
    determine_risk_level,
    evaluate_location_risk,
)


def test_normalize_rainfall():
    assert normalize_rainfall(0, 144) == 0.0
    assert normalize_rainfall(72, 144) == 0.5
    assert normalize_rainfall(144, 144) == 1.0
    assert normalize_rainfall(200, 144) == 1.0  # Capped at 1.0
    assert normalize_rainfall(-10, 144) == 0.0  # Non-negative


def test_normalize_seismic():
    assert normalize_seismic(0, 4.0) == 0.0
    assert normalize_seismic(2.0, 4.0) == 0.5
    assert normalize_seismic(4.0, 4.0) == 1.0
    assert normalize_seismic(6.5, 4.0) == 1.0  # Capped at 1.0


def test_normalize_lake_growth():
    assert normalize_lake_growth(0, 15.0) == 0.0
    assert normalize_lake_growth(7.5, 15.0) == 0.5
    assert normalize_lake_growth(15.0, 15.0) == 1.0
    assert normalize_lake_growth(25.0, 15.0) == 1.0  # Capped at 1.0
    assert normalize_lake_growth(-5.0, 15.0) == 0.0  # Negative growth yields 0.0


def test_normalize_terrain():
    assert normalize_terrain(0.0) == 0.0
    assert normalize_terrain(0.71) == 0.71
    assert normalize_terrain(1.0) == 1.0
    assert normalize_terrain(1.5) == 1.0


def test_normalize_reports():
    assert normalize_reports([]) == 0.0
    # 2 simple reports = 2 * 0.18 = 0.36
    assert normalize_reports([{}, {}]) == 0.36
    # Voice attached report gets boost
    rep = GroundReport(report_type="water", voice_attached=True)
    score = normalize_reports([rep])
    assert score > 0.18
    # 10 reports capped at 1.0
    assert normalize_reports([{}] * 10) == 1.0


def test_determine_risk_level():
    assert determine_risk_level(0.15) == RiskLevel.LOW
    assert determine_risk_level(0.29) == RiskLevel.LOW
    assert determine_risk_level(0.30) == RiskLevel.MODERATE
    assert determine_risk_level(0.49) == RiskLevel.MODERATE
    assert determine_risk_level(0.50) == RiskLevel.HIGH
    assert determine_risk_level(0.69) == RiskLevel.HIGH
    assert determine_risk_level(0.70) == RiskLevel.CRITICAL
    assert determine_risk_level(0.95) == RiskLevel.CRITICAL


def test_evaluate_location_risk_baseline_moderate():
    # Langtang baseline
    inp = LocationRiskInput(
        location_id="langtang",
        location_name="Langtang Valley",
        region="Rasuwa",
        rainfall=38.0,
        rain_threshold=144.0,
        seismic_activity=1.8,
        lake_area_change=4.0,
        terrain_susceptibility=0.71,
        reports=[]
    )
    result = evaluate_location_risk(inp)

    assert result.risk_level == RiskLevel.MODERATE
    assert 0.30 <= result.risk_score < 0.50
    assert result.risk_level_ne == "मध्यम"
    assert result.explanation.action_code == "MONITOR_CONDITIONS"
    assert "summary_message_ne" in result.explanation.model_dump()
    assert result.calculated_in_ms >= 0


def test_evaluate_location_risk_custom_weights():
    inp = LocationRiskInput(
        rainfall=100.0,
        rain_threshold=100.0,  # norm = 1.0
        seismic_activity=0.0,  # norm = 0.0
        lake_area_change=0.0,  # norm = 0.0
        terrain_susceptibility=0.0,
        reports=[]
    )
    # Default score: 0.3 * 1.0 = 0.30 -> Moderate
    default_result = evaluate_location_risk(inp)
    assert default_result.risk_score == pytest.approx(0.30, abs=0.01)

    # Custom weights: rainfall 0.80, others 0.05
    custom_w = RiskWeightsSettings(
        rainfall=0.80,
        seismic=0.05,
        lake=0.05,
        terrain=0.05,
        reports=0.05
    )
    inp.custom_weights = custom_w
    custom_result = evaluate_location_risk(inp)
    assert custom_result.risk_score == pytest.approx(0.80, abs=0.01)
    assert custom_result.risk_level == RiskLevel.CRITICAL


def test_invalid_weights_validation():
    with pytest.raises(ValueError):
        RiskWeightsSettings(
            rainfall=0.5,
            seismic=0.5,
            lake=0.5,  # Sum = 1.5 != 1.0
            terrain=0.1,
            reports=0.1
        )
