import logging
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status

from models import (
    SimulationRequest,
    SimulationResponse,
    LocationRiskInput,
    GroundReport,
    RiskAssessmentOutput
)
from risk_engine import evaluate_location_risk
from routes.regions import SAMPLE_REGIONS

router = APIRouter(tags=["Disaster Simulation Demo"])
logger = logging.getLogger("himalsanket.routes.simulate")


@router.post(
    "/simulate",
    response_model=SimulationResponse,
    status_code=status.HTTP_200_OK,
    summary="Simulate High-Risk Disaster Scenario (Demo)",
    description="Demonstrates the real-time transition from baseline conditions (Moderate) to an acute disaster threat (Critical) upon sensor spikes."
)
async def simulate_hazard_spike(req: SimulationRequest = SimulationRequest()):
    """
    Executes a high-risk multi-hazard simulation scenario for live demonstration.
    Demonstrates: Normal / Moderate -> Critical multi-hazard transition.
    """
    # 1. Resolve baseline data
    if req.custom_baseline is not None:
        baseline_input = req.custom_baseline
        location_id = baseline_input.location_id or "custom_location"
        location_name = baseline_input.location_name or "Custom Target Corridor"
    else:
        loc_id = (req.location_id or "langtang").lower().strip()
        if loc_id not in SAMPLE_REGIONS:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Region '{req.location_id}' not found. Available: {list(SAMPLE_REGIONS.keys())}"
            )
        baseline_region = SAMPLE_REGIONS[loc_id]
        baseline_input = baseline_region["baseline_data"].model_copy(deep=True)
        location_id = baseline_region["id"]
        location_name = baseline_region["name"]

    # Evaluate Baseline
    baseline_assessment: RiskAssessmentOutput = evaluate_location_risk(baseline_input)

    # 2. Synthesize Hazard Spike
    simulated_rainfall = round(baseline_input.rainfall + req.rainfall_spike, 2)
    simulated_seismic = round(baseline_input.seismic_activity + req.seismic_spike, 2)
    simulated_lake = round(baseline_input.lake_area_change + req.lake_spike, 2)

    # Build simulated reports
    simulated_reports = list(baseline_input.reports)
    urgent_samples = [
        GroundReport(
            id="sim-rep-1",
            report_type="water",
            label="Water rising rapidly",
            note="Debris torrent and muddy river surging by 2 meters in 30 minutes",
            voice_attached=True
        ),
        GroundReport(
            id="sim-rep-2",
            report_type="crack",
            label="Trail cracking & rockfall",
            note="Fresh fissure observed across main trail gorge flank",
            voice_attached=False
        ),
        GroundReport(
            id="sim-rep-3",
            report_type="sound",
            label="Rumbling sound from moraine",
            note="Loud subterranean boom heard towards upper hanging glacier",
            voice_attached=True
        )
    ]

    for i in range(min(req.additional_reports, len(urgent_samples))):
        simulated_reports.append(urgent_samples[i])

    simulated_input = LocationRiskInput(
        location_id=location_id,
        location_name=location_name,
        region=baseline_input.region,
        gps=baseline_input.gps,
        rainfall=simulated_rainfall,
        rain_threshold=baseline_input.rain_threshold,
        seismic_activity=simulated_seismic,
        lake_area_change=simulated_lake,
        terrain_susceptibility=baseline_input.terrain_susceptibility,
        reports=simulated_reports,
        custom_weights=baseline_input.custom_weights
    )

    # Evaluate Simulated Spiked Condition
    simulated_assessment: RiskAssessmentOutput = evaluate_location_risk(simulated_input)

    # 3. Compute Delta
    delta: Dict[str, float] = {
        "risk_score_delta": round(simulated_assessment.risk_score - baseline_assessment.risk_score, 4),
        "rainfall_delta_mm": round(simulated_input.rainfall - baseline_input.rainfall, 2),
        "seismic_delta_magnitude": round(simulated_input.seismic_activity - baseline_input.seismic_activity, 2),
        "lake_change_delta_pct": round(simulated_input.lake_area_change - baseline_input.lake_area_change, 2),
        "reports_delta_count": float(len(simulated_input.reports) - len(baseline_input.reports))
    }

    transition_str = f"{baseline_assessment.risk_level.value} -> {simulated_assessment.risk_level.value}"

    logger.info(
        f"Simulated hazard spike for {location_name}: {transition_str} "
        f"(score {baseline_assessment.risk_score:.3f} -> {simulated_assessment.risk_score:.3f})"
    )

    return SimulationResponse(
        location_id=location_id,
        location_name=location_name,
        transition=transition_str,
        baseline=baseline_assessment,
        simulated=simulated_assessment,
        delta=delta,
        timestamp=datetime.now(timezone.utc)
    )
