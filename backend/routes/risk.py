import logging
import hashlib
import json
from fastapi import APIRouter, HTTPException, status
from models import LocationRiskInput, RiskAssessmentOutput
from risk_engine import evaluate_location_risk
from cache import cache

router = APIRouter(tags=["Hazard Risk Evaluation"])
logger = logging.getLogger("himalsanket.routes.risk")


def _generate_cache_key(data: LocationRiskInput) -> str:
    """
    Creates a deterministic cache key from the numerical telemetry and weights.
    """
    key_dict = {
        "loc": data.location_id,
        "rf": round(data.rainfall, 2),
        "rt": round(data.rain_threshold, 2),
        "seis": round(data.seismic_activity, 2),
        "lake": round(data.lake_area_change, 2),
        "terr": round(data.terrain_susceptibility, 3),
        "rep_len": len(data.reports),
        "w": data.custom_weights.model_dump() if data.custom_weights else None
    }
    encoded = json.dumps(key_dict, sort_keys=True).encode("utf-8")
    return f"risk:{hashlib.md5(encoded).hexdigest()}"


@router.post(
    "/risk",
    response_model=RiskAssessmentOutput,
    status_code=status.HTTP_200_OK,
    summary="Evaluate Multi-Hazard Risk for a Corridor",
    description="Fuses rainfall, seismic tremors, glacial lake expansion, terrain susceptibility, and ground reports into a unified risk score."
)
async def calculate_risk(location_data: LocationRiskInput):
    """
    Calculates multi-hazard risk score, operational tier, and explainable recommendations.
    """
    try:
        cache_key = _generate_cache_key(location_data)
        cached_result = cache.get(cache_key)
        if cached_result is not None:
            logger.debug(f"Cache hit for location: {location_data.location_id or 'unspecified'}")
            return cached_result

        result = evaluate_location_risk(location_data)
        cache.set(cache_key, result)

        logger.info(
            f"Evaluated risk for {result.location_name} ({result.region}): "
            f"score={result.risk_score:.4f} tier={result.risk_level.value} "
            f"took={result.calculated_in_ms}ms"
        )
        return result

    except ValueError as ve:
        logger.warning(f"Validation error evaluating risk: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Unexpected error during risk calculation: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while evaluating multi-hazard risk."
        )
