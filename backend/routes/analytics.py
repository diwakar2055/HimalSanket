from fastapi import APIRouter, status
from timesfm_forecaster import ForecastRequest, ForecastResponse, forecast_rainfall_series
from satellite_analyzer import GlacialLakeAnalysisInput, GlacialLakeAnalysisOutput, analyze_glacial_lake_expansion
from ai_reasoner import GeminiBriefingRequest, GeminiBriefingResponse, generate_gemini_briefing

router = APIRouter(prefix="/ai", tags=["AI Models & Advanced Analytics"])


@router.post(
    "/predict/rainfall",
    response_model=ForecastResponse,
    status_code=status.HTTP_200_OK,
    summary="TimesFM Time-Series Rainfall Prediction (Google Foundation Model)",
    description="Ingests historical hourly rainfall telemetry and predicts 6h-24h cumulative precipitation and atmospheric surge probability."
)
async def predict_rainfall(req: ForecastRequest):
    """
    Executes TimesFM hydrological time series prediction.
    """
    return forecast_rainfall_series(req)


@router.post(
    "/analyze/satellite",
    response_model=GlacialLakeAnalysisOutput,
    status_code=status.HTTP_200_OK,
    summary="Sentinel-2 / SAR Satellite Lake Analysis (GLOF Detection)",
    description="Processes multi-temporal satellite observations to compute glacial lake surface area expansion delta (%) and GLOF surge indicators."
)
async def analyze_satellite_lake(data: GlacialLakeAnalysisInput):
    """
    Executes satellite surface area delta analysis for glacial lakes.
    """
    return analyze_glacial_lake_expansion(data)


@router.post(
    "/briefing",
    response_model=GeminiBriefingResponse,
    status_code=status.HTTP_200_OK,
    summary="Google Gemini 2.0 Flash AI Briefing Generator",
    description="Uses Gemini 2.0 Flash to synthesize multimodal tactical briefings in English, Nepali (Devanagari), and SMS Romanized Nepali."
)
async def generate_briefing(data: GeminiBriefingRequest):
    """
    Generates contextual AI disaster intelligence briefings.
    """
    return generate_gemini_briefing(data)


from audio_processor import AudioAnalysisInput, AudioAnalysisOutput, process_voice_report
from river_network import DownstreamRiverNetwork, get_downstream_river_network


@router.post(
    "/process/voice-report",
    response_model=AudioAnalysisOutput,
    status_code=status.HTTP_200_OK,
    summary="Multilingual Voice Note & Audio Dispatch Processor",
    description="Analyzes audio voice reports from porters/guides in Nepali and English, extracts hazard keywords, and computes risk engine signal boost."
)
async def analyze_voice_report(data: AudioAnalysisInput):
    """
    Transcribes and processes voice dispatches to detect flood/landslide cues.
    """
    return process_voice_report(data)


@router.get(
    "/river-network/{corridor_id}",
    response_model=DownstreamRiverNetwork,
    status_code=status.HTTP_200_OK,
    summary="Downstream River Drainage Network & Settlement Cascade",
    description="Returns downstream river polyline coordinates for map drawing, along with vulnerable villages and flood arrival minutes."
)
async def get_river_network(corridor_id: str):
    """
    Provides river cascade routing and infrastructure alert timelines for maps.
    """
    return get_downstream_river_network(corridor_id)
