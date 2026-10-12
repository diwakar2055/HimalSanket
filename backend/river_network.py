"""
Downstream River Network & Hydrological Cascade Routing Module.

Maps each high-altitude corridor to its downstream river drainage network,
vulnerable riverside settlements, bridges, hydropower dams, and estimated
floodwave travel times based on digital elevation and channel slope.
"""

from typing import List, Dict, Any
from pydantic import BaseModel, Field


class RiverSettlementAlert(BaseModel):
    name: str
    elevation_m: float
    distance_km_downstream: float
    est_flood_arrival_minutes: int
    infrastructure_at_risk: List[str]
    evacuation_safe_zone: str


class DownstreamRiverNetwork(BaseModel):
    corridor_id: str
    corridor_name: str
    primary_river: str
    drainage_basin: str
    total_channel_monitored_km: float
    map_polyline_coordinates: List[List[float]] = Field(
        ...,
        description="GeoJSON formatted [latitude, longitude] polyline path for Leaflet / Mapbox rendering"
    )
    vulnerable_downstream_settlements: List[RiverSettlementAlert]


RIVER_NETWORKS_DATABASE: Dict[str, DownstreamRiverNetwork] = {
    "langtang": DownstreamRiverNetwork(
        corridor_id="langtang",
        corridor_name="Langtang Valley",
        primary_river="Langtang Khola ➔ Trishuli River",
        drainage_basin="Trishuli River Basin (Narayani system)",
        total_channel_monitored_km=48.5,
        map_polyline_coordinates=[
            [28.2096, 85.5089],  # Kyanjin Gompa
            [28.2167, 85.4167],  # Langtang Village area
            [28.1833, 85.3833],  # Ghodatabela
            [28.1667, 85.3500],  # Lama Hotel
            [28.1500, 85.3333],  # Bamboo
            [28.1333, 85.3000],  # Syabrubesi (Confluence with Bhote Koshi)
            [28.0500, 85.2500],  # Mailung Hydropower
            [27.9833, 85.1833],  # Betrawati Bazaar
        ],
        vulnerable_downstream_settlements=[
            RiverSettlementAlert(
                name="Lama Hotel Gorge",
                elevation_m=2470.0,
                distance_km_downstream=11.2,
                est_flood_arrival_minutes=18,
                infrastructure_at_risk=["Suspension trail bridge", "Riverside teahouses"],
                evacuation_safe_zone="Climb min 35m up south forest ridge"
            ),
            RiverSettlementAlert(
                name="Syabrubesi Confluence",
                elevation_m=1460.0,
                distance_km_downstream=24.5,
                est_flood_arrival_minutes=38,
                infrastructure_at_risk=["Highway motorable bridge", "Trishuli-Bhote Koshi junction", "Trekker lodges"],
                evacuation_safe_zone="Move to upper market road / police post plateau"
            ),
            RiverSettlementAlert(
                name="Mailung Hydro Intake",
                elevation_m=1120.0,
                distance_km_downstream=36.0,
                est_flood_arrival_minutes=55,
                infrastructure_at_risk=["Trishuli 1 Hydropower dam & worker camp", "Access tunnel portal"],
                evacuation_safe_zone="Sound dam sirens; evacuate portal to hillside barracks"
            ),
            RiverSettlementAlert(
                name="Betrawati Bazaar",
                elevation_m=620.0,
                distance_km_downstream=48.5,
                est_flood_arrival_minutes=78,
                infrastructure_at_risk=["Historic riverside market", "Nuwakot-Rasuwa highway bridge"],
                evacuation_safe_zone="Evacuate ground floors to upper Nuwakot terrace"
            ),
        ]
    ),
    "khumbu": DownstreamRiverNetwork(
        corridor_id="khumbu",
        corridor_name="Everest / Khumbu",
        primary_river="Imja Khola ➔ Dudh Koshi River",
        drainage_basin="Sapta Koshi Basin",
        total_channel_monitored_km=52.0,
        map_polyline_coordinates=[
            [27.9878, 86.9250],  # Imja Tsho Lake
            [27.8933, 86.8294],  # Dingboche
            [27.8700, 86.7600],  # Pangboche
            [27.8200, 86.7200],  # Tengboche foot
            [27.8000, 86.7100],  # Phunki Thenga bridge
            [27.7300, 86.7100],  # Phakding riverbank
            [27.6800, 86.7200],  # Surke / Below Lukla
        ],
        vulnerable_downstream_settlements=[
            RiverSettlementAlert(
                name="Dingboche Floodplain",
                elevation_m=4410.0,
                distance_km_downstream=8.5,
                est_flood_arrival_minutes=14,
                infrastructure_at_risk=["Yak pastures", "Low stone trekking lodges"],
                evacuation_safe_zone="Ascend Nangkartshang hillside above 4500m"
            ),
            RiverSettlementAlert(
                name="Phunki Thenga Bridge",
                elevation_m=3250.0,
                distance_km_downstream=26.0,
                est_flood_arrival_minutes=42,
                infrastructure_at_risk=["Critical Everest base suspension bridge", "Hydropower micro-turbines"],
                evacuation_safe_zone="Halt crossings; retreat to Tengboche steep trail"
            ),
            RiverSettlementAlert(
                name="Phakding River Crossing",
                elevation_m=2610.0,
                distance_km_downstream=39.0,
                est_flood_arrival_minutes=64,
                infrastructure_at_risk=["Main tourist trail", "5 riverside luxury lodges"],
                evacuation_safe_zone="Move to high trail bypass above Rimishung monastery"
            ),
        ]
    ),
    "annapurna": DownstreamRiverNetwork(
        corridor_id="annapurna",
        corridor_name="Annapurna Circuit",
        primary_river="Marsyangdi River",
        drainage_basin="Gandaki Basin",
        total_channel_monitored_km=42.0,
        map_polyline_coordinates=[
            [28.6667, 84.0167],  # Manang
            [28.5333, 84.2500],  # Chame
            [28.4500, 84.3667],  # Tal Village
            [28.3833, 84.4167],  # Chamje
            [28.2333, 84.3833],  # Besisahar
        ],
        vulnerable_downstream_settlements=[
            RiverSettlementAlert(
                name="Tal Lake Basin",
                elevation_m=1700.0,
                distance_km_downstream=21.0,
                est_flood_arrival_minutes=32,
                infrastructure_at_risk=["Valley floor village (flooded in 2021)", "Road link"],
                evacuation_safe_zone="Ascend valley wall cliff path immediately"
            ),
            RiverSettlementAlert(
                name="Chamje Gorge",
                elevation_m=1430.0,
                distance_km_downstream=29.0,
                est_flood_arrival_minutes=48,
                infrastructure_at_risk=["Narrow rock gorge passage", "Suspension bridge"],
                evacuation_safe_zone="Clear gorge bottlenecks"
            ),
        ]
    ),
    "manaslu": DownstreamRiverNetwork(
        corridor_id="manaslu",
        corridor_name="Manaslu Circuit",
        primary_river="Budhi Gandaki River",
        drainage_basin="Gandaki Basin",
        total_channel_monitored_km=56.0,
        map_polyline_coordinates=[
            [28.5497, 84.5602],  # Samagaun / Birendra Lake
            [28.4833, 84.8500],  # Namrung
            [28.3667, 84.9000],  # Jagat
            [28.1000, 84.8167],  # Arughat Bazaar
        ],
        vulnerable_downstream_settlements=[
            RiverSettlementAlert(
                name="Jagat Canyon",
                elevation_m=1340.0,
                distance_km_downstream=27.0,
                est_flood_arrival_minutes=40,
                infrastructure_at_risk=["Canyon footpath cantilevered over river", "Police checkpoint"],
                evacuation_safe_zone="Climb to upper terrace cultivation fields"
            ),
            RiverSettlementAlert(
                name="Arughat Bazaar",
                elevation_m=570.0,
                distance_km_downstream=56.0,
                est_flood_arrival_minutes=85,
                infrastructure_at_risk=["Densely populated riverside market", "Major vehicle bridge"],
                evacuation_safe_zone="Move east/west away from river banks to higher town terraces"
            ),
        ]
    )
}


def get_downstream_river_network(corridor_id: str) -> DownstreamRiverNetwork:
    """
    Retrieves downstream river drainage network and cascade alerts for a corridor.
    """
    key = corridor_id.lower().strip()
    return RIVER_NETWORKS_DATABASE.get(key, RIVER_NETWORKS_DATABASE["langtang"])
