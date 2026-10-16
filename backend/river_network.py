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
    ),
    "rolwaling": DownstreamRiverNetwork(
        corridor_id="rolwaling",
        corridor_name="Rolwaling Valley",
        primary_river="Rolwaling Khola ➔ Tama Koshi River",
        drainage_basin="Tama Koshi Basin (Koshi System)",
        total_channel_monitored_km=52.0,
        map_polyline_coordinates=[
            [27.8540, 86.4780],  # Tsho Rolpa Glacial Lake
            [27.8460, 86.4350],  # Na Village
            [27.8380, 86.3720],  # Beding Village
            [27.8250, 86.2950],  # Simigaun
            [27.8180, 86.2550],  # Chetchet Bridge
            [27.8050, 86.2250],  # Gongar Khola / Upper Tama Koshi Intake
        ],
        vulnerable_downstream_settlements=[
            RiverSettlementAlert(
                name="Na Village Flood Fan",
                elevation_m=4180.0,
                distance_km_downstream=5.2,
                est_flood_arrival_minutes=8,
                infrastructure_at_risk=["High-altitude seasonal yak stone shelters", "Wooden trail bridge"],
                evacuation_safe_zone="Scramble 50m up northern moraine slope"
            ),
            RiverSettlementAlert(
                name="Beding Settlement",
                elevation_m=3690.0,
                distance_km_downstream=14.0,
                est_flood_arrival_minutes=19,
                infrastructure_at_risk=["Primary Sherpa village", "Ancient Buddhist monastery terrace", "Riverside lodges"],
                evacuation_safe_zone="Climb to Sangag Gompa hill (above 3,750m)"
            ),
            RiverSettlementAlert(
                name="Chetchet Suspension Bridge",
                elevation_m=1377.0,
                distance_km_downstream=38.0,
                est_flood_arrival_minutes=65,
                infrastructure_at_risk=["Key arterial steel suspension bridge", "Trailhead shops"],
                evacuation_safe_zone="Ascend road cut to Simigaun staircase entrance"
            ),
            RiverSettlementAlert(
                name="Gongar Khola Intake (Upper Tama Koshi)",
                elevation_m=1150.0,
                distance_km_downstream=52.0,
                est_flood_arrival_minutes=85,
                infrastructure_at_risk=["456MW Upper Tamakoshi Hydropower headworks", "Settling basins", "Workers camp"],
                evacuation_safe_zone="Immediate sluice opening and evacuation to control building on hill"
            ),
        ]
    ),
    "mardi": DownstreamRiverNetwork(
        corridor_id="mardi",
        corridor_name="Mardi Himal Trek",
        primary_river="Mardi Khola ➔ Seti Gandaki River",
        drainage_basin="Seti Gandaki Basin (Narayani system)",
        total_channel_monitored_km=41.0,
        map_polyline_coordinates=[
            [28.4650, 83.9400],  # Upper Mardi Glacial Cirque
            [28.4320, 83.9335],  # Upper Mardi Gorge
            [28.4020, 83.9305],  # Sub-alpine Gorge below Forest Camp
            [28.3750, 83.9280],  # Siding Village Riverbank
            [28.3550, 83.9310],  # Kalimati River Terrace
            [28.3350, 83.9350],  # Lwang Khola Confluence
            [28.3100, 83.9440],  # Mardi Hydro Weir
            [28.2650, 83.9580],  # Mardi Dobhan (Seti Confluence)
        ],
        vulnerable_downstream_settlements=[
            RiverSettlementAlert(
                name="Siding Village Riverbank",
                elevation_m=1750.0,
                distance_km_downstream=14.0,
                est_flood_arrival_minutes=44,
                infrastructure_at_risk=["Suspension footbridge", "Riverside homestays", "Fish farming ponds"],
                evacuation_safe_zone="Move min 30m uphill toward upper Gurung stone houses"
            ),
            RiverSettlementAlert(
                name="Mardi Hydropower Weir",
                elevation_m=1020.0,
                distance_km_downstream=28.5,
                est_flood_arrival_minutes=65,
                infrastructure_at_risk=["Small hydro diversion weir", "Service access bridge"],
                evacuation_safe_zone="Open radial sluice gates and sound valley siren"
            )
        ]
    ),
    "poonhill": DownstreamRiverNetwork(
        corridor_id="poonhill",
        corridor_name="Ghorepani Poon Hill",
        primary_river="Bhurungdi Khola ➔ Modi Khola ➔ Kali Gandaki",
        drainage_basin="Kali Gandaki Basin",
        total_channel_monitored_km=38.5,
        map_polyline_coordinates=[
            [28.3950, 83.7120],  # Bhurungdi Headwaters below Ghorepani
            [28.3810, 83.7220],  # Banthanti Stream Crossing
            [28.3610, 83.7380],  # Ulleri Base Waterfalls
            [28.3491, 83.7423],  # Tikhedhunga Riverside Settlement
            [28.3380, 83.7520],  # Sudame Riverside
            [28.3240, 83.7650],  # Matathanti River Terrace
            [28.3150, 83.7720],  # Birethanti (Modi Confluence)
            [28.3110, 83.7745],  # Nayapul Trailhead
        ],
        vulnerable_downstream_settlements=[
            RiverSettlementAlert(
                name="Tikhedhunga Riverside Lodges",
                elevation_m=1540.0,
                distance_km_downstream=12.5,
                est_flood_arrival_minutes=38,
                infrastructure_at_risk=["Bhurungdi suspension bridge", "Low-lying tourist lodges"],
                evacuation_safe_zone="Evacuate up Ulleri stone staircase terraces immediately"
            ),
            RiverSettlementAlert(
                name="Birethanti Confluence",
                elevation_m=1070.0,
                distance_km_downstream=22.0,
                est_flood_arrival_minutes=52,
                infrastructure_at_risk=["Major pedestrian steel bridge", "ACAP tourist entry station"],
                evacuation_safe_zone="Climb to upper highway police station terrace"
            )
        ]
    ),
    "abc": DownstreamRiverNetwork(
        corridor_id="abc",
        corridor_name="Annapurna Base Camp (ABC)",
        primary_river="Modi Khola Glacial Canyon",
        drainage_basin="Gandaki River System",
        total_channel_monitored_km=42.0,
        map_polyline_coordinates=[
            [28.5308, 83.8780],  # Annapurna Base Camp Glacial Outflow
            [28.5040, 83.8918],  # Machhapuchhre Base Camp Gorge
            [28.4680, 83.8760],  # Deurali Gorge
            [28.4420, 83.8580],  # Dovan Riverside
            [28.4320, 83.8500],  # Bamboo Riverside
            [28.4140, 83.8235],  # Chhomrong Khola Bridge
            [28.3980, 83.8260],  # Jhinu Danda Hot Springs
            [28.3650, 83.8238],  # Landruk Bridge
            [28.3380, 83.7980],  # Shauli Bazaar
            [28.3150, 83.7720],  # Birethanti Confluence
        ],
        vulnerable_downstream_settlements=[
            RiverSettlementAlert(
                name="Dovan Canyon Gorge",
                elevation_m=2600.0,
                distance_km_downstream=15.0,
                est_flood_arrival_minutes=39,
                infrastructure_at_risk=["Narrow rock gorge teahouses", "Trail retaining timber walls"],
                evacuation_safe_zone="Ascend marked staircase toward Upper Sinuwa"
            ),
            RiverSettlementAlert(
                name="Chhomrong Khola Suspension Bridge",
                elevation_m=1900.0,
                distance_km_downstream=24.5,
                est_flood_arrival_minutes=62,
                infrastructure_at_risk=["Deep gorge cable bridge", "Essential Sanctuary access link"],
                evacuation_safe_zone="Climb uphill to Chhomrong village plateau (2,170m)"
            )
        ]
    )
}


def get_downstream_river_network(corridor_id: str) -> DownstreamRiverNetwork:
    """
    Retrieves downstream river drainage network and cascade alerts for a corridor.
    """
    key = corridor_id.lower().strip()
    return RIVER_NETWORKS_DATABASE.get(key, RIVER_NETWORKS_DATABASE["langtang"])
