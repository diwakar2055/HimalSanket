from typing import List, Dict
from fastapi import APIRouter, HTTPException, status

from models import (
    LocationRiskInput,
    RiskAssessmentOutput,
    RegionSummary,
    SimulationResponse
)
from risk_engine import evaluate_location_risk

router = APIRouter(prefix="/regions", tags=["Corridor Profiles & Telemetry"])

SAMPLE_REGIONS: Dict[str, Dict] = {
    "langtang": {
        "id": "langtang",
        "name": "Langtang Valley",
        "region": "Rasuwa",
        "gps": "28.2096° N, 85.5089° E",
        "description": "Steep glaciated valley with narrow gorge bottlenecks, vulnerable to moraine collapse and debris flow cascades.",
        "baseline_data": LocationRiskInput(
            location_id="langtang",
            location_name="Langtang Valley",
            region="Rasuwa",
            gps="28.2096° N, 85.5089° E",
            rainfall=38.0,
            rain_threshold=144.0,
            seismic_activity=1.8,
            lake_area_change=4.0,
            terrain_susceptibility=0.71,
            reports=[]
        )
    },
    "khumbu": {
        "id": "khumbu",
        "name": "Everest / Khumbu",
        "region": "Solukhumbu",
        "gps": "27.9878° N, 86.9250° E",
        "description": "High-altitude glacial basin with prominent moraine-dammed glacial lakes (Imja Tsho) and heavy seasonal trekking traffic.",
        "baseline_data": LocationRiskInput(
            location_id="khumbu",
            location_name="Everest / Khumbu",
            region="Solukhumbu",
            gps="27.9878° N, 86.9250° E",
            rainfall=22.0,
            rain_threshold=144.0,
            seismic_activity=0.6,
            lake_area_change=1.0,
            terrain_susceptibility=0.52,
            reports=[]
        )
    },
    "annapurna": {
        "id": "annapurna",
        "name": "Annapurna Circuit",
        "region": "Manang",
        "gps": "28.6667° N, 84.0167° E",
        "description": "Trans-Himalayan rain shadow transition zone prone to sudden cloudburst flash flooding along the Marsyangdi River.",
        "baseline_data": LocationRiskInput(
            location_id="annapurna",
            location_name="Annapurna Circuit",
            region="Manang",
            gps="28.6667° N, 84.0167° E",
            rainfall=51.0,
            rain_threshold=144.0,
            seismic_activity=1.1,
            lake_area_change=2.0,
            terrain_susceptibility=0.63,
            reports=[]
        )
    },
    "manaslu": {
        "id": "manaslu",
        "name": "Manaslu Circuit",
        "region": "Gorkha",
        "gps": "28.5497° N, 84.5602° E",
        "description": "Seismically sensitive tectonic shear zone along the Budhi Gandaki river gorge with historical epicenter proximity.",
        "baseline_data": LocationRiskInput(
            location_id="manaslu",
            location_name="Manaslu Circuit",
            region="Gorkha",
            gps="28.5497° N, 84.5602° E",
            rainfall=17.0,
            rain_threshold=144.0,
            seismic_activity=0.4,
            lake_area_change=0.0,
            terrain_susceptibility=0.44,
            reports=[]
        )
    },
    "rolwaling": {
        "id": "rolwaling",
        "name": "Rolwaling Valley",
        "region": "Dolakha",
        "gps": "27.8540° N, 86.4780° E",
        "description": "High-risk glacial trough containing Tsho Rolpa (~85M m³ moraine-dammed lake) draining into the steep Tama Koshi canyon.",
        "baseline_data": LocationRiskInput(
            location_id="rolwaling",
            location_name="Rolwaling Valley",
            region="Dolakha",
            gps="27.8540° N, 86.4780° E",
            rainfall=28.0,
            rain_threshold=144.0,
            seismic_activity=0.8,
            lake_area_change=1.5,
            terrain_susceptibility=0.68,
            reports=[]
        )
    },
    "mardi": {
        "id": "mardi",
        "name": "Mardi Himal Trek",
        "region": "Kaski",
        "gps": "28.3840° N, 83.8920° E",
        "description": "High-altitude razor ridge trail rising above dense cloudburst forests to 4,500m beneath Machapuchare.",
        "baseline_data": LocationRiskInput(
            location_id="mardi",
            location_name="Mardi Himal Trek",
            region="Kaski",
            gps="28.3840° N, 83.8920° E",
            rainfall=42.0,
            rain_threshold=160.0,
            seismic_activity=0.9,
            lake_area_change=0.5,
            terrain_susceptibility=0.65,
            reports=[]
        )
    },
    "poonhill": {
        "id": "poonhill",
        "name": "Ghorepani Poon Hill",
        "region": "Myagdi / Parbat",
        "gps": "28.3750° N, 83.7380° E",
        "description": "High-density mountain pass and 3,300-step Ulleri stone staircase route in heavy monsoon catchment.",
        "baseline_data": LocationRiskInput(
            location_id="poonhill",
            location_name="Ghorepani Poon Hill",
            region="Myagdi / Parbat",
            gps="28.3750° N, 83.7380° E",
            rainfall=35.0,
            rain_threshold=150.0,
            seismic_activity=0.7,
            lake_area_change=0.0,
            terrain_susceptibility=0.58,
            reports=[]
        )
    },
    "abc": {
        "id": "abc",
        "name": "Annapurna Base Camp (ABC)",
        "region": "Kaski / Sanctuary",
        "gps": "28.4750° N, 83.8570° E",
        "description": "Enclosed glacial amphitheater cirque along the sheer Modi Khola canyon with historical avalanche trajectories.",
        "baseline_data": LocationRiskInput(
            location_id="abc",
            location_name="Annapurna Base Camp (ABC)",
            region="Kaski / Sanctuary",
            gps="28.4750° N, 83.8570° E",
            rainfall=48.0,
            rain_threshold=160.0,
            seismic_activity=1.2,
            lake_area_change=2.5,
            terrain_susceptibility=0.74,
            reports=[]
        )
    }
}


def _build_region_summary(region_info: Dict) -> RegionSummary:
    baseline_inp = region_info["baseline_data"]
    evaluated_risk = evaluate_location_risk(baseline_inp)
    return RegionSummary(
        id=region_info["id"],
        name=region_info["name"],
        region=region_info["region"],
        gps=region_info["gps"],
        description=region_info["description"],
        baseline_data=baseline_inp,
        baseline_risk=evaluated_risk
    )


@router.get(
    "",
    response_model=List[RegionSummary],
    summary="Get Predefined Sample Regions in Nepal",
    description="Returns pre-seeded sample trekking and river corridors with geographic metadata and current baseline risk evaluations."
)
async def get_all_regions():
    """
    Returns all configured Nepal monitoring corridors with live baseline evaluations.
    """
    return [_build_region_summary(r) for r in SAMPLE_REGIONS.values()]


@router.get(
    "/{region_id}",
    response_model=RegionSummary,
    summary="Get Single Region Profile by ID"
)
async def get_region_by_id(region_id: str):
    """
    Returns specific corridor details and current baseline risk assessment.
    """
    region_key = region_id.lower().strip()
    if region_key not in SAMPLE_REGIONS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Region '{region_id}' not found. Available regions: {list(SAMPLE_REGIONS.keys())}"
        )
    return _build_region_summary(SAMPLE_REGIONS[region_key])
