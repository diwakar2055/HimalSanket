from enum import Enum
from typing import List, Optional, Union, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict
from config import RiskWeightsSettings


class RiskLevel(str, Enum):
    LOW = "Low"
    MODERATE = "Moderate"
    HIGH = "High"
    CRITICAL = "Critical"


NEPALI_RISK_LEVEL_MAP = {
    RiskLevel.LOW: "न्यून",
    RiskLevel.MODERATE: "मध्यम",
    RiskLevel.HIGH: "उच्च",
    RiskLevel.CRITICAL: "गम्भीर",
}


class GroundReport(BaseModel):
    """
    Crowdsourced field report from guides, porters, or teahouse operators.
    """
    model_config = ConfigDict(extra="ignore")

    id: Optional[Union[str, int]] = None
    report_type: str = Field(
        default="other",
        description="Hazard report category: 'water', 'crack', 'sound', 'other'"
    )
    label: Optional[str] = Field(
        default=None,
        description="Human label e.g., 'Water rising', 'Trail cracking', 'Unusual sound'"
    )
    note: Optional[str] = Field(
        default=None,
        description="Observer notes describing ground phenomena"
    )
    voice_attached: bool = Field(
        default=False,
        description="Whether an audio dispatch note is attached"
    )
    timestamp: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Time when the report was recorded"
    )


class LocationRiskInput(BaseModel):
    """
    Input telemetry data for a corridor or region.
    """
    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "location_id": "langtang",
                "location_name": "Langtang Valley",
                "region": "Rasuwa",
                "gps": "28.2096° N, 85.5089° E",
                "rainfall": 38.0,
                "rain_threshold": 144.0,
                "seismic_activity": 1.8,
                "lake_area_change": 4.0,
                "terrain_susceptibility": 0.71,
                "reports": [
                    {
                        "report_type": "water",
                        "label": "Water rising",
                        "note": "Stream murky and volume rising fast near Kyanjin Gompa"
                    }
                ]
            }
        }
    )

    location_id: Optional[str] = Field(
        default=None,
        description="Unique corridor or station ID (e.g. 'langtang', 'khumbu')"
    )
    location_name: Optional[str] = Field(
        default="Target Corridor",
        description="Display name of the corridor or valley"
    )
    region: Optional[str] = Field(
        default="Nepal",
        description="District or administrative region (e.g. 'Rasuwa', 'Solukhumbu')"
    )
    gps: Optional[str] = Field(
        default=None,
        description="GPS coordinate string (e.g. '28.2096° N, 85.5089° E')"
    )

    rainfall: float = Field(
        ...,
        ge=0.0,
        description="Cumulative 24-hour rainfall measured or forecasted in millimeters"
    )
    rain_threshold: float = Field(
        ...,
        gt=0.0,
        description="District or slope hazard rainfall trigger threshold in millimeters"
    )
    seismic_activity: float = Field(
        ...,
        ge=0.0,
        description="Seismic intensity (Richter magnitude or normalized scale, 0-10)"
    )
    lake_area_change: float = Field(
        ...,
        description="Percentage expansion of moraine-dammed glacial lake area (+% growth)"
    )
    terrain_susceptibility: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Static landslide susceptibility index based on slope, aspect & geology (0.0 to 1.0)"
    )
    reports: List[Union[GroundReport, Dict[str, Any], str]] = Field(
        default_factory=list,
        description="Collection of ground reports from trekking guides, porters, and locals"
    )
    custom_weights: Optional[RiskWeightsSettings] = Field(
        default=None,
        description="Optional runtime override for signal fusion weights"
    )


class NormalizedSignals(BaseModel):
    """
    Signals normalized to the [0.0, 1.0] domain for transparent comparison.
    """
    rainfall: float = Field(..., ge=0.0, le=1.0, description="Normalized rainfall score")
    seismic: float = Field(..., ge=0.0, le=1.0, description="Normalized seismic hazard score")
    lake: float = Field(..., ge=0.0, le=1.0, description="Normalized glacial lake expansion score")
    terrain: float = Field(..., ge=0.0, le=1.0, description="Normalized terrain susceptibility score")
    reports: float = Field(..., ge=0.0, le=1.0, description="Normalized ground report confidence boost")


class SignalContributions(BaseModel):
    """
    Explicit mathematical contribution of each signal to the final risk score.
    contribution = weight * normalized_score.
    """
    rainfall: float = Field(..., description="Absolute points contributed by rainfall")
    seismic: float = Field(..., description="Absolute points contributed by seismic")
    lake: float = Field(..., description="Absolute points contributed by glacial lake")
    terrain: float = Field(..., description="Absolute points contributed by terrain")
    reports: float = Field(..., description="Absolute points contributed by ground reports")


class PreGeminiExplanation(BaseModel):
    """
    Structured reasoning output ready for frontend display and pre-Gemini prompt feeding.
    """
    key_drivers: List[str] = Field(
        default_factory=list,
        description="High-impact signals currently driving the risk score"
    )
    summary_message: str = Field(
        ...,
        description="Concise human-readable intelligence briefing (English)"
    )
    summary_message_ne: str = Field(
        ...,
        description="Concise human-readable intelligence briefing (Nepali)"
    )
    recommendation: str = Field(
        ...,
        description="Actionable disaster mitigation directive (English)"
    )
    recommendation_ne: str = Field(
        ...,
        description="Actionable disaster mitigation directive (Nepali)"
    )
    action_code: str = Field(
        ...,
        description="Machine-readable action category: 'ROUTINE_MONITORING', 'MONITOR_CONDITIONS', 'DELAY_NON_ESSENTIAL_TRAVEL', 'EVACUATE_AVOID_ENTRY'"
    )


class RiskAssessmentOutput(BaseModel):
    """
    Complete risk assessment output returned by the engine.
    """
    location_id: Optional[str] = None
    location_name: str
    region: str
    gps: Optional[str] = None
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Fused hazard score between 0.0 and 1.0")
    risk_level: RiskLevel = Field(..., description="Categorical risk tier: Low, Moderate, High, Critical")
    risk_level_ne: str = Field(..., description="Nepali translation of risk tier")
    normalized_signals: NormalizedSignals
    signal_contributions: SignalContributions
    explanation: PreGeminiExplanation
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="ISO 8601 UTC timestamp of evaluation"
    )
    calculated_in_ms: float = Field(
        default=0.0,
        description="Calculation latency in milliseconds"
    )


class SimulationRequest(BaseModel):
    """
    Payload for triggering a simulated hazard spike demo.
    """
    location_id: Optional[str] = Field(
        default="langtang",
        description="Target corridor to simulate: 'langtang', 'khumbu', 'annapurna', 'manaslu'"
    )
    rainfall_spike: float = Field(
        default=75.0,
        description="Incremental rainfall to inject in mm"
    )
    seismic_spike: float = Field(
        default=1.8,
        description="Incremental seismic magnitude to inject"
    )
    lake_spike: float = Field(
        default=7.0,
        description="Incremental glacial lake growth percentage"
    )
    additional_reports: int = Field(
        default=2,
        ge=0,
        description="Number of simulated urgent ground reports to add"
    )
    custom_baseline: Optional[LocationRiskInput] = Field(
        default=None,
        description="Optional custom baseline location input instead of predefined region"
    )


class SimulationResponse(BaseModel):
    """
    Detailed before-and-after comparison showing the transition to Critical risk.
    """
    location_id: str
    location_name: str
    transition: str = Field(..., description="Visual transition path, e.g. 'Moderate -> Critical'")
    baseline: RiskAssessmentOutput
    simulated: RiskAssessmentOutput
    delta: Dict[str, float] = Field(
        ...,
        description="Mathematical difference between simulated and baseline conditions"
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class RegionSummary(BaseModel):
    """
    Predefined region profile with current baseline risk.
    """
    id: str
    name: str
    region: str
    gps: str
    description: str
    baseline_data: LocationRiskInput
    baseline_risk: RiskAssessmentOutput


class FirestoreSyncStatus(BaseModel):
    """
    Status of session persistence to Cloud Firestore (Firebase).
    """
    saved: bool = Field(..., description="Whether the session was successfully persisted")
    collection: str = Field(..., description="Firestore collection name e.g. 'hazard_sessions'")
    session_id: str = Field(..., description="Unique document ID in Firestore")
    synced_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="ISO 8601 UTC timestamp of Firestore write"
    )
    storage_backend: str = Field(
        default="Cloud Firestore",
        description="Active backend: 'Cloud Firestore' or 'Local Memory Fallback'"
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message if Firestore write experienced an issue"
    )


class OrchestratedAssessmentResponse(BaseModel):
    """
    Combined JSON returned to the frontend by the Backend Orchestrator.
    Combines:
    1. Risk Engine physical calculations and scores
    2. Google Gemini natural language briefings and action recommendations
    3. Firebase Firestore persistence metadata and session tracking
    """
    session_id: str = Field(..., description="Unique session identifier saved in Firestore")
    status: str = Field(default="success", description="Orchestration status")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of request processing"
    )
    orchestration_time_ms: float = Field(
        default=0.0,
        description="Total end-to-end backend orchestration latency in milliseconds"
    )
    location: Dict[str, Any] = Field(
        ...,
        description="Corridor identity and spatial coordinates"
    )
    risk_assessment: RiskAssessmentOutput = Field(
        ...,
        description="Deterministic multi-hazard calculation from Risk Engine"
    )
    gemini_intelligence: Dict[str, Any] = Field(
        ...,
        description="Multimodal human-readable briefing and tactical directives from Google Gemini"
    )
    firestore_sync: FirestoreSyncStatus = Field(
        ...,
        description="Firestore persistence receipt"
    )


class FirestoreSessionRecord(BaseModel):
    """
    Document schema stored directly in Cloud Firestore (Firebase).
    """
    session_id: str
    timestamp: str
    location_id: Optional[str] = None
    location_name: str
    region: str
    gps: Optional[str] = None
    inputs: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    gemini_intelligence: Dict[str, Any]
    client_ip: Optional[str] = None

