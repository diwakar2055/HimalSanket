"""
Satellite Image & Glacial Lake Outburst Flood (GLOF) Analysis Module.

Processes multi-temporal satellite observations (e.g. Sentinel-2 NDWI, Sentinel-1 SAR Radar)
for moraine-dammed glacial lakes in the Himalayas (Imja Tsho, Tsho Rolpa, Langtang).
Calculates surface area expansion delta (%), detects sudden moraine surges, and feeds
the normalized lake risk signal into the HimalSanket risk engine.
"""

from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class SatelliteLakeObservation(BaseModel):
    date: str = Field(..., description="Observation date (YYYY-MM-DD)")
    sensor: str = Field(default="Sentinel-2", description="Sensor name: Sentinel-2 (Optical) or Sentinel-1 (SAR Radar)")
    surface_area_km2: float = Field(..., gt=0.0, description="Measured water surface area in square kilometers")
    water_index_method: str = Field(default="NDWI", description="Method: NDWI (Normalized Difference Water Index) or SAR_Backscatter")
    cloud_cover_pct: float = Field(default=0.0, ge=0.0, le=100.0, description="Satellite image cloud cover percentage")


class GlacialLakeAnalysisInput(BaseModel):
    lake_id: str = Field(default="langtang_glacier_lake", description="Unique glacial lake identifier")
    lake_name: str = Field(default="Langtang Upper Moraine Lake", description="Glacial lake name")
    region: str = Field(default="Rasuwa", description="District or valley")
    elevation_m: float = Field(default=4950.0, description="Altitude in meters")
    observations: List[SatelliteLakeObservation] = Field(
        ...,
        min_length=2,
        description="Chronological satellite surface area observations (minimum 2 timestamps for delta)"
    )


class GlacialLakeAnalysisOutput(BaseModel):
    lake_id: str
    lake_name: str
    region: str
    baseline_area_km2: float
    current_area_km2: float
    area_change_km2: float
    area_change_pct: float
    glof_risk_indicator: str
    satellite_confidence: float
    lake_score_normalized: float
    analysis_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    methodology: str


def analyze_glacial_lake_expansion(data: GlacialLakeAnalysisInput) -> GlacialLakeAnalysisOutput:
    """
    Computes satellite-derived surface area expansion and GLOF trigger indicators.
    """
    # Sort chronologically by date
    sorted_obs = sorted(data.observations, key=lambda x: x.date)
    baseline_obs = sorted_obs[0]
    current_obs = sorted_obs[-1]

    baseline_area = baseline_obs.surface_area_km2
    current_area = current_obs.surface_area_km2

    area_delta = round(current_area - baseline_area, 4)
    pct_change = round((area_delta / baseline_area) * 100.0, 2)

    # Normalize lake risk (cap at 15% expansion = 1.0 critical hazard)
    normalized_score = round(min(max(0.0, pct_change) / 15.0, 1.0), 4)

    # Determine GLOF Indicator category
    if pct_change >= 12.0:
        indicator = "CRITICAL_SURGE — Severe moraine expansion detected; high GLOF probability"
    elif pct_change >= 6.0:
        indicator = "ELEVATED_GROWTH — Accelerated supraglacial lake fusion; active monitoring advised"
    elif pct_change >= 2.0:
        indicator = "MODERATE_EXPANSION — Typical early-monsoon meltwater accumulation"
    else:
        indicator = "STABLE — Lake surface area within seasonal baseline variance"

    # Confidence score penalized by cloud cover
    cloud_penalty = (current_obs.cloud_cover_pct / 100.0) * 0.30
    confidence = round(max(0.60, 1.0 - cloud_penalty), 2)

    methodology = (
        f"Multi-temporal satellite {current_obs.sensor} analysis using {current_obs.water_index_method} "
        f"band ratioing. ΔArea computed over {baseline_obs.date} to {current_obs.date}."
    )

    return GlacialLakeAnalysisOutput(
        lake_id=data.lake_id,
        lake_name=data.lake_name,
        region=data.region,
        baseline_area_km2=baseline_area,
        current_area_km2=current_area,
        area_change_km2=area_delta,
        area_change_pct=pct_change,
        glof_risk_indicator=indicator,
        satellite_confidence=confidence,
        lake_score_normalized=normalized_score,
        methodology=methodology
    )
