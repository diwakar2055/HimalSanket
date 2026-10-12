"""
Orchestrator Route: Coordinates Frontend Request, Risk Engine, Gemini AI, and Firebase Firestore.

Architecture Workflow:
1. Frontend makes a single request with corridor telemetry.
2. Backend calls the Risk Engine to compute normalized multi-hazard scores, weights, and operational tier.
3. Backend passes the engine's numbers to Google Gemini (2.0 Flash) to get human-readable explanations
   and action recommendations (English, Nepali, SMS Romanized).
4. Backend saves the session to Cloud Firestore (Firebase) for audit trails and real-time dashboard listeners.
5. Backend returns the consolidated, combined JSON response to the frontend.
"""

import time
import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, status

from models import (
    LocationRiskInput,
    OrchestratedAssessmentResponse,
    RiskAssessmentOutput,
)
from risk_engine import evaluate_location_risk
from ai_reasoner import GeminiBriefingRequest, generate_gemini_briefing
from firestore_service import firestore_service

router = APIRouter(tags=["Multi-Hazard Orchestrator"])
logger = logging.getLogger("himalsanket.orchestrator")


@router.post(
    "/orchestrate",
    response_model=OrchestratedAssessmentResponse,
    status_code=status.HTTP_200_OK,
    summary="End-to-End Multi-Hazard Orchestration",
    description=(
        "Acts as the master orchestrator: (1) calls the Risk Engine, "
        "(2) passes calculated figures to Gemini for multilingual briefings and action directives, "
        "(3) saves the session to Firebase Firestore, and "
        "(4) returns the combined JSON to the frontend."
    )
)
@router.post(
    "/risk/orchestrate",
    response_model=OrchestratedAssessmentResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False
)
async def orchestrate_hazard_assessment(
    location_data: LocationRiskInput,
    request: Request
) -> OrchestratedAssessmentResponse:
    """
    Executes the full 4-step orchestration pipeline:
    Frontend -> Risk Engine -> Google Gemini -> Firestore -> Frontend JSON
    """
    start_time = time.perf_counter()
    loc_id = location_data.location_id or "unspecified"
    logger.info(f"[Orchestrator] Starting assessment for corridor: {loc_id}")

    try:
        # ─────────────────────────────────────────────────────────────────────────────
        # STEP 1: Backend calls the Risk Engine
        # ─────────────────────────────────────────────────────────────────────────────
        engine_start = time.perf_counter()
        risk_output: RiskAssessmentOutput = evaluate_location_risk(location_data)
        engine_ms = round((time.perf_counter() - engine_start) * 1000, 2)
        logger.info(
            f"[Step 1: Risk Engine] Calculated score={risk_output.risk_score:.4f} "
            f"tier={risk_output.risk_level.value} in {engine_ms}ms"
        )

        # ─────────────────────────────────────────────────────────────────────────────
        # STEP 2: Backend passes the engine's numbers to Gemini
        # ─────────────────────────────────────────────────────────────────────────────
        gemini_start = time.perf_counter()
        gemini_request = GeminiBriefingRequest(
            corridor_name=risk_output.location_name,
            region=risk_output.region,
            risk_score=risk_output.risk_score,
            risk_level=risk_output.risk_level.value,
            rainfall_mm=location_data.rainfall,
            rain_threshold_mm=location_data.rain_threshold,
            seismic_magnitude=location_data.seismic_activity,
            lake_change_pct=location_data.lake_area_change,
            terrain_susceptibility=location_data.terrain_susceptibility,
            ground_reports_count=len(location_data.reports),
            key_drivers=risk_output.explanation.key_drivers
        )
        gemini_response = generate_gemini_briefing(gemini_request)
        gemini_ms = round((time.perf_counter() - gemini_start) * 1000, 2)
        logger.info(f"[Step 2: Gemini AI] Synthesized briefings using {gemini_response.model_used} in {gemini_ms}ms")

        # ─────────────────────────────────────────────────────────────────────────────
        # STEP 3: Backend saves the session to Firestore (Firebase)
        # ─────────────────────────────────────────────────────────────────────────────
        firestore_start = time.perf_counter()
        session_id = f"session_{loc_id}_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        client_ip = request.client.host if request.client else None

        session_record = {
            "session_id": session_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "location_id": location_data.location_id,
            "location_name": risk_output.location_name,
            "region": risk_output.region,
            "gps": risk_output.gps,
            "client_ip": client_ip,
            "inputs": location_data.model_dump(mode="json"),
            "risk_assessment": risk_output.model_dump(mode="json"),
            "gemini_intelligence": gemini_response.model_dump(mode="json"),
            "timing_ms": {
                "risk_engine": engine_ms,
                "gemini_ai": gemini_ms
            }
        }
        sync_status = firestore_service.save_session(session_id, session_record)
        firestore_ms = round((time.perf_counter() - firestore_start) * 1000, 2)
        logger.info(f"[Step 3: Firestore] Persisted session {session_id} in {firestore_ms}ms ({sync_status.storage_backend})")

        # ─────────────────────────────────────────────────────────────────────────────
        # STEP 4: Backend returns the combined JSON to the frontend
        # ─────────────────────────────────────────────────────────────────────────────
        total_latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return OrchestratedAssessmentResponse(
            session_id=session_id,
            status="success",
            timestamp=risk_output.timestamp,
            orchestration_time_ms=total_latency_ms,
            location={
                "location_id": location_data.location_id,
                "location_name": risk_output.location_name,
                "region": risk_output.region,
                "gps": risk_output.gps
            },
            risk_assessment=risk_output,
            gemini_intelligence=gemini_response.model_dump(mode="json"),
            firestore_sync=sync_status
        )

    except ValueError as ve:
        logger.warning(f"[Orchestrator] Input validation error: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"[Orchestrator] Unexpected failure during orchestration: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Orchestration failure: {str(e)}"
        )


@router.get(
    "/orchestrate/sessions/{session_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Fetch Saved Assessment Session from Firestore",
    description="Retrieves a past disaster risk evaluation session directly from Firebase Firestore by session_id."
)
async def get_orchestrated_session(session_id: str):
    """
    Fetches an archived session document from Firestore.
    """
    session = firestore_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID '{session_id}' not found in Firestore."
        )
    return session


@router.get(
    "/orchestrate/sessions",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="List Recent Assessment Sessions from Firestore",
    description="Returns the recent multi-hazard assessment sessions recorded in Firebase Firestore for dashboard timeline displays."
)
async def list_orchestrated_sessions(limit: int = 20):
    """
    Returns recent assessment session history.
    """
    return firestore_service.list_sessions(limit=min(limit, 100))
