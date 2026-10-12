"""
Router for Live Telemetry, Sensor Feeds, Sentinel-2 Lake Imagery, and Demo Scenarios.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional

from live_telemetry_service import live_feeder, SENTINEL_GLACIAL_LAKES

router = APIRouter(prefix="/telemetry", tags=["Live Telemetry & Sensor Feeds"])


class ScenarioTriggerRequest(BaseModel):
    scenario_id: str = "critical_cascade"
    corridor_id: str = "langtang"


@router.get(
    "/live/{corridor_id}",
    summary="Get Real-Time Telemetry & Risk Assessment for Corridor",
    description="Returns live sensed telemetry (rainfall gauges, USGS tremors, Sentinel-2 lake expansion) and evaluated risk for the map."
)
async def get_live_telemetry(corridor_id: str):
    return live_feeder.get_live_corridor_evaluation(corridor_id.lower().strip())


@router.post(
    "/scenario",
    summary="Trigger Live Presentation Scenario (Demo Flow)",
    description="Injects live disaster events ('cloudburst_spike', 'glof_lake_expansion', 'seismic_tremor', 'critical_cascade', 'baseline') to demonstrate real-time sensing."
)
async def trigger_scenario(req: ScenarioTriggerRequest):
    return live_feeder.apply_scenario(req.scenario_id, req.corridor_id)


@router.get(
    "/satellite-lakes",
    summary="Get Sentinel-2 Monitored Glacial Lakes",
    description="Returns all glacial lakes with their multi-temporal satellite area observations and expansion deltas."
)
async def get_satellite_lakes():
    return SENTINEL_GLACIAL_LAKES
