import time
from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any

from config import settings
from cache import cache

router = APIRouter(tags=["Health & System"])
_START_TIME = time.time()


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    uptime_seconds: float
    timestamp: datetime
    active_weights: Dict[str, float]
    threshold_limits: Dict[str, float]
    cache_stats: Dict[str, Any]


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Returns system health status, active fusion weights, cache stats, and uptime.
    """
    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        version=settings.version,
        uptime_seconds=round(time.time() - _START_TIME, 2),
        timestamp=datetime.now(timezone.utc),
        active_weights=settings.weights.model_dump(),
        threshold_limits={
            "seismic_max_magnitude": settings.thresholds.seismic_max_magnitude,
            "lake_change_max_pct": settings.thresholds.lake_change_max_pct,
            "report_boost_per_report": settings.thresholds.report_boost_per_report,
            "tier_moderate": settings.thresholds.tier_moderate,
            "tier_high": settings.thresholds.tier_high,
            "tier_critical": settings.thresholds.tier_critical,
        },
        cache_stats=cache.get_stats()
    )
