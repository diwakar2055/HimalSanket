import { LANGTANG_RIVER_PATH } from "./langtangRiverPath";
import { KHUMBU_RIVER_PATH } from "./khumbuRiverPath";
import { ANNAPURNA_RIVER_PATH } from "./annapurnaRiverPath";
import { MANASLU_RIVER_PATH } from "./manasluRiverPath";
import { ROLWALING_RIVER_PATH } from "./rolwalingRiverPath";

export interface MapAsset {
  id: string;
  name: string;
  type: "people" | "school" | "bridge" | "hospital" | "dam" | "safeZone";
  corridorId: string;
  lat: number;
  lng: number;
  x: number; // 0 to 1000 for vector topo fallback
  y: number; // 0 to 600 for vector topo fallback
  elevation: number; // meters
  gps: string;
  population?: number;
  capacity?: number;
  contact?: string;
  status: "safe" | "advisory" | "critical";
  hazardThresholdMeters: number; // water rise in meters that threatens this asset
  description: string;
  riskNote: string;
}

export interface LandslideZone {
  id: string;
  name: string;
  corridorId: string;
  severity: "high" | "critical" | "moderate";
  slopeDegrees: number;
  polygon: [number, number][]; // Array of [lat, lng] coordinates
  description: string;
  soilMoistureVwcPct: number;
}

export interface GlacialLakePolygon {
  lakeId: string;
  corridorId: string;
  name: string;
  baselinePolygon: [number, number][];
  expandedPolygon: [number, number][];
  expansionDeltaPct: number;
}

export interface RescueBase {
  id: string;
  name: string;
  agency: "APF" | "Nepal Army" | "National Park";
  corridorId: string;
  lat: number;
  lng: number;
  elevation: number;
  contact: string;
  heliFlightMin: number;
}

export interface DHMWeatherStation {
  id: string;
  stationCode: string;
  name: string;
  corridorId: string;
  elevation: number;
  lat: number;
  lng: number;
  rain24h: number;
  rainRateMmH: number;
  soilMoistureVwc: number;
  status: "Normal" | "Elevated" | "Warning" | "Critical";
}

export interface CorridorConfig {
  id: string;
  name: string;
  region: string;
  centerName: string;
  center: { lat: number; lng: number };
  zoom: number;
  riverPath: { lat: number; lng: number }[];
}

export const CORRIDOR_CONFIGS: Record<string, CorridorConfig> = {
  langtang: {
    id: "langtang",
    name: "Langtang Valley",
    region: "Rasuwa",
    centerName: "Langtang Khola Basin",
    center: { lat: 28.1880, lng: 85.4550 },
    zoom: 12,
    riverPath: LANGTANG_RIVER_PATH,
  },
  khumbu: {
    id: "khumbu",
    name: "Everest / Khumbu",
    region: "Solukhumbu",
    centerName: "Dudh Koshi Corridor",
    center: { lat: 27.8150, lng: 86.7450 },
    zoom: 12,
    riverPath: KHUMBU_RIVER_PATH,
  },
  annapurna: {
    id: "annapurna",
    name: "Annapurna Circuit",
    region: "Manang / Lamjung",
    centerName: "Marsyangdi River",
    center: { lat: 28.5650, lng: 84.2250 },
    zoom: 11,
    riverPath: ANNAPURNA_RIVER_PATH,
  },
  manaslu: {
    id: "manaslu",
    name: "Manaslu Circuit",
    region: "Gorkha",
    centerName: "Budhi Gandaki Canyon",
    center: { lat: 28.5800, lng: 84.6700 },
    zoom: 12,
    riverPath: MANASLU_RIVER_PATH,
  },
  rolwaling: {
    id: "rolwaling",
    name: "Rolwaling Valley",
    region: "Dolakha",
    centerName: "Tama Koshi Headwaters",
    center: { lat: 27.8850, lng: 86.3600 },
    zoom: 12,
    riverPath: ROLWALING_RIVER_PATH,
  },
};

export const CORRIDOR_OPTIONS = [
  { id: "langtang", name: "Langtang Valley", region: "Rasuwa", center: "Langtang Khola Basin" },
  { id: "khumbu", name: "Everest / Khumbu", region: "Solukhumbu", center: "Dudh Koshi Corridor" },
  { id: "annapurna", name: "Annapurna Circuit", region: "Manang / Lamjung", center: "Marsyangdi River" },
  { id: "manaslu", name: "Manaslu Circuit", region: "Gorkha", center: "Budhi Gandaki Canyon" },
  { id: "rolwaling", name: "Rolwaling Valley", region: "Dolakha", center: "Tama Koshi Headwaters" },
];

export const MAP_ASSETS: MapAsset[] = [
  // --- Langtang Valley ---
  {
    id: "langtang-people-1",
    name: "Kyanjin Gompa Settlement",
    type: "people",
    corridorId: "langtang",
    lat: 28.2124,
    lng: 85.5666,
    x: 770,
    y: 200,
    elevation: 3870,
    gps: "28.2124° N, 85.5666° E",
    population: 145,
    status: "safe",
    hazardThresholdMeters: 4.5,
    description: "Primary upper valley settlement with active lodges, local yak herders, and visiting trekking teams.",
    riskNote: "Safe from minor river swell, but located beneath steep glacial moraine slope prone to rockfalls.",
  },
  {
    id: "langtang-people-2",
    name: "Old Langtang Village (Memorial & Gumba)",
    type: "people",
    corridorId: "langtang",
    lat: 28.2151,
    lng: 85.4969,
    x: 520,
    y: 275,
    elevation: 3430,
    gps: "28.2151° N, 85.4969° E",
    population: 68,
    status: "advisory",
    hazardThresholdMeters: 2.5,
    description: "Historic valley settlement and 2015 memorial site on terrace bench above Langtang Khola.",
    riskNote: "Highly sensitive to high-intensity precipitation triggers and secondary gully debris reactivation.",
  },
  {
    id: "langtang-people-3",
    name: "Rimche & Bamboo Riverside Camp",
    type: "people",
    corridorId: "langtang",
    lat: 28.1558,
    lng: 85.3975,
    x: 230,
    y: 395,
    elevation: 1970,
    gps: "28.1558° N, 85.3975° E",
    population: 42,
    status: "critical",
    hazardThresholdMeters: 1.5,
    description: "Narrow gorge settlement directly flanking the Langtang Khola riverbank.",
    riskNote: "Immediate flood impact zone. Evacuation to upper ridge trail required if rainfall exceeds 100mm.",
  },
  {
    id: "langtang-school-1",
    name: "Shree Buddha Primary School (New Langtang)",
    type: "school",
    corridorId: "langtang",
    lat: 28.2154,
    lng: 85.5076,
    x: 560,
    y: 265,
    elevation: 3460,
    gps: "28.2154° N, 85.5076° E",
    capacity: 45,
    status: "advisory",
    hazardThresholdMeters: 3.0,
    description: "Community school built with earthquake-resilient stone masonry in New Langtang Village. Serves as secondary high-ground assembly point.",
    riskNote: "Elevated above standard river flow on stable alluvial bench.",
  },
  {
    id: "langtang-school-2",
    name: "Syabrubesi Community Secondary School",
    type: "school",
    corridorId: "langtang",
    lat: 28.1653,
    lng: 85.3413,
    x: 110,
    y: 430,
    elevation: 1460,
    gps: "28.1653° N, 85.3413° E",
    capacity: 220,
    status: "safe",
    hazardThresholdMeters: 5.0,
    description: "Main corridor educational campus with concrete reinforced hall designated as district emergency relief shelter.",
    riskNote: "High ground location above river confluence with emergency generator and solar communication beacon.",
  },
  {
    id: "langtang-bridge-1",
    name: "Langtang Khola Suspension Bridge (Bamboo)",
    type: "bridge",
    corridorId: "langtang",
    lat: 28.1553,
    lng: 85.3974,
    x: 240,
    y: 400,
    elevation: 1960,
    gps: "28.1553° N, 85.3974° E",
    status: "critical",
    hazardThresholdMeters: 1.8,
    description: "Critical steel-cable suspension bridge crossing Langtang Khola canyon at Bamboo.",
    riskNote: "Severely vulnerable to debris torrents; river clearance is only 2.1m during monsoon crests.",
  },
  {
    id: "langtang-bridge-2",
    name: "Ghora Tabela River Crossing",
    type: "bridge",
    corridorId: "langtang",
    lat: 28.1992,
    lng: 85.4582,
    x: 410,
    y: 310,
    elevation: 3010,
    gps: "28.1992° N, 85.4582° E",
    status: "advisory",
    hazardThresholdMeters: 2.6,
    description: "Reinforced river bridge at Ghoda Tabela checkpoint. Key logistics artery for pack animals and trekkers.",
    riskNote: "Bridge abutment monitored for bank erosion after heavy upstream glacial melt.",
  },
  {
    id: "langtang-bridge-3",
    name: "Kyanjin Langtang Khola Bridge",
    type: "bridge",
    corridorId: "langtang",
    lat: 28.2084,
    lng: 85.5610,
    x: 820,
    y: 195,
    elevation: 3820,
    gps: "28.2084° N, 85.5610° E",
    status: "safe",
    hazardThresholdMeters: 4.0,
    description: "High-altitude wooden-cantilever crossing over upper glacial braided stream.",
    riskNote: "Cold season melt fluctuations; minimal risk under normal conditions.",
  },
  {
    id: "langtang-hospital-1",
    name: "Kyanjin Himalayan Rescue Aid Clinic",
    type: "hospital",
    corridorId: "langtang",
    lat: 28.2122,
    lng: 85.5675,
    x: 780,
    y: 205,
    elevation: 3865,
    gps: "28.2122° N, 85.5675° E",
    capacity: 12,
    contact: "VHF Ch 16 / Sat-phone +977-9801",
    status: "safe",
    hazardThresholdMeters: 4.8,
    description: "Volunteer-staffed high-altitude emergency medical clinic with hyperbaric chambers and oxygen reserves.",
    riskNote: "Reinforced shelter; designated triage point during upper valley evacuation.",
  },
  {
    id: "langtang-hospital-2",
    name: "Syabrubesi Primary Health Post",
    type: "hospital",
    corridorId: "langtang",
    lat: 28.1638,
    lng: 85.3422,
    x: 125,
    y: 435,
    elevation: 1475,
    gps: "28.1638° N, 85.3422° E",
    capacity: 25,
    contact: "Local Helipad VHF 122.8",
    status: "safe",
    hazardThresholdMeters: 5.5,
    description: "Government primary healthcare hub with ambulance access to Trishuli / Kathmandu district hospitals.",
    riskNote: "Adjacent to all-weather concrete road head; standard disaster medical depot.",
  },
  {
    id: "langtang-dam-1",
    name: "Mailung Hydropower Dam & Spillway",
    type: "dam",
    corridorId: "langtang",
    lat: 28.1020,
    lng: 85.3100,
    x: 90,
    y: 520,
    elevation: 1120,
    gps: "28.1020° N, 85.3100° E",
    capacity: 25,
    contact: "Control Room VHF 146.2",
    status: "advisory",
    hazardThresholdMeters: 1.8,
    description: "Concrete weir and penstock intake on lower river corridor. Critical floodgate release infrastructure.",
    riskNote: "High vulnerability to silt sediment plugging during upstream debris flows."
  },
  {
    id: "langtang-safezone-1",
    name: "Syabrubesi Helipad Safe Evacuation Haven",
    type: "safeZone",
    corridorId: "langtang",
    lat: 28.1580,
    lng: 85.3380,
    x: 140,
    y: 420,
    elevation: 1540,
    gps: "28.1580° N, 85.3380° E",
    capacity: 350,
    contact: "APF Heli Desk 1149",
    status: "safe",
    hazardThresholdMeters: 9.0,
    description: "Paved civil defense evacuation apron and emergency staging zone with clearance for Mi-17 helicopters.",
    riskNote: "Elevated bench 60m above riverbed; zero flood inundation risk."
  },
  {
    id: "langtang-safezone-2",
    name: "Kyanjin Gompa Ridge Crest Safe Haven",
    type: "safeZone",
    corridorId: "langtang",
    lat: 28.2150,
    lng: 85.5720,
    x: 810,
    y: 195,
    elevation: 3950,
    gps: "28.2150° N, 85.5720° E",
    capacity: 220,
    contact: "Lodge Association VHF 16",
    status: "safe",
    hazardThresholdMeters: 12.0,
    description: "Solid bedrock spur above upper glacial valley floor. Established civilian muster haven during flood sirens.",
    riskNote: "Safe from both river floods and northern avalanche trajectories."
  },

  // --- Everest / Khumbu ---
  {
    id: "khumbu-lake-outflow",
    name: "Imja Tsho Moraine Spillway Watchpoint",
    type: "dam",
    corridorId: "khumbu",
    lat: 27.8995,
    lng: 86.9185,
    x: 750,
    y: 180,
    elevation: 5010,
    gps: "27.8995° N, 86.9185° E",
    status: "advisory",
    hazardThresholdMeters: 1.2,
    description: "Automated early warning water-level sensor at Imja Tsho western moraine breach channel.",
    riskNote: "Direct origin point for Khumbu glacial flood waves.",
  },
  {
    id: "khumbu-safe-chhukung",
    name: "Chhukung Moraine Terrace Safe Haven",
    type: "safeZone",
    corridorId: "khumbu",
    lat: 27.9040,
    lng: 86.8750,
    x: 690,
    y: 200,
    elevation: 4730,
    gps: "27.9040° N, 86.8750° E",
    capacity: 250,
    status: "safe",
    hazardThresholdMeters: 8.0,
    description: "Elevated bedrock spur above Chhukung river flat; designated high-ground muster refuge.",
    riskNote: "Completely elevated above Imja Khola flood channel.",
  },
  {
    id: "khumbu-people-dingboche",
    name: "Dingboche Riverside Lodges",
    type: "people",
    corridorId: "khumbu",
    lat: 27.8920,
    lng: 86.8320,
    x: 620,
    y: 240,
    elevation: 4410,
    gps: "27.8920° N, 86.8320° E",
    population: 320,
    status: "advisory",
    hazardThresholdMeters: 2.2,
    description: "Trekking settlement on lower terrace flanking the Imja Khola outwash plain.",
    riskNote: "Lower stone lodges at risk of inundation if Imja moraine breaches.",
  },
  {
    id: "khumbu-bridge-phunki",
    name: "Phunki Thenga Suspension Bridge",
    type: "bridge",
    corridorId: "khumbu",
    lat: 27.8320,
    lng: 86.7455,
    x: 480,
    y: 330,
    elevation: 3250,
    gps: "27.8320° N, 86.7455° E",
    status: "critical",
    hazardThresholdMeters: 1.8,
    description: "Low suspension bridge crossing raging Dudh Koshi torrent beneath Tengboche hill.",
    riskNote: "Narrow gorge creates extreme hydro choke point during flood surges.",
  },
  {
    id: "khumbu-people-phakding",
    name: "Phakding Riverside Settlement",
    type: "people",
    corridorId: "khumbu",
    lat: 27.7400,
    lng: 86.7130,
    x: 210,
    y: 520,
    elevation: 2610,
    gps: "27.7400° N, 86.7130° E",
    population: 410,
    status: "critical",
    hazardThresholdMeters: 1.5,
    description: "Low-lying riverside village and lodges directly alongside Dudh Koshi gravel bars.",
    riskNote: "Highly vulnerable to downstream GLOF runout and riverbank undercutting.",
  },
  {
    id: "khumbu-people-1",
    name: "Namche Bazaar Amphitheater",
    type: "people",
    corridorId: "khumbu",
    lat: 27.8042,
    lng: 86.7098,
    x: 320,
    y: 380,
    elevation: 3440,
    gps: "27.8042° N, 86.7098° E",
    population: 1650,
    status: "safe",
    hazardThresholdMeters: 6.0,
    description: "Major regional commercial hub built in a natural terraced amphitheater above the river gorge.",
    riskNote: "Terraced architecture is secure from flash floods; gullies inspected for debris.",
  },
  {
    id: "khumbu-bridge-1",
    name: "Hillary Twin Suspension Bridges",
    type: "bridge",
    corridorId: "khumbu",
    lat: 27.7808,
    lng: 86.7227,
    x: 280,
    y: 450,
    elevation: 2830,
    gps: "27.7808° N, 86.7227° E",
    status: "safe",
    hazardThresholdMeters: 12.0,
    description: "Twin-tier high suspension bridge spanning deep Dudh Koshi river gorge.",
    riskNote: "High clearance protects against river crest, but upper anchors inspected for seismic shaking.",
  },
  {
    id: "khumbu-school-1",
    name: "Khumjung Hillary School",
    type: "school",
    corridorId: "khumbu",
    lat: 27.8208,
    lng: 86.7162,
    x: 410,
    y: 330,
    elevation: 3790,
    gps: "27.8208° N, 86.7162° E",
    capacity: 350,
    status: "safe",
    hazardThresholdMeters: 8.0,
    description: "Historic secondary school founded by Sir Edmund Hillary. Expansive grounds suitable for mass shelter.",
    riskNote: "Stable valley floor with wide evacuation space and reliable satellite links.",
  },
  {
    id: "khumbu-hospital-1",
    name: "Kundee Hospital",
    type: "hospital",
    corridorId: "khumbu",
    lat: 27.8235,
    lng: 86.7060,
    x: 390,
    y: 320,
    elevation: 3840,
    gps: "27.8235° N, 86.7060° E",
    capacity: 20,
    contact: "VHF 143.900 Emergency",
    status: "safe",
    hazardThresholdMeters: 8.0,
    description: "Full-service mountain hospital serving the entire Khumbu community.",
    riskNote: "High and dry elevation; reliable year-round solar power.",
  },

  // --- Annapurna Circuit ---
  {
    id: "annapurna-lake-watch",
    name: "Gangapurna Moraine Spillway Watchpoint",
    type: "dam",
    corridorId: "annapurna",
    lat: 28.6544,
    lng: 84.0217,
    x: 740,
    y: 160,
    elevation: 3540,
    gps: "28.6544° N, 84.0217° E",
    status: "advisory",
    hazardThresholdMeters: 1.5,
    description: "Hydrometric monitoring beacon installed at Gangapurna lake terminal moraine breach channel.",
    riskNote: "Direct surge trigger monitoring for upper Marsyangdi valley.",
  },
  {
    id: "annapurna-people-manang",
    name: "Manang Valley Central Settlement",
    type: "people",
    corridorId: "annapurna",
    lat: 28.6661,
    lng: 84.0231,
    x: 710,
    y: 175,
    elevation: 3540,
    gps: "28.6661° N, 84.0231° E",
    population: 580,
    status: "safe",
    hazardThresholdMeters: 4.0,
    description: "Main alpine trading hub and lodge center in upper Manang valley on stable limestone bench.",
    riskNote: "Elevated above Marsyangdi riverbed, but lower footbridges vulnerable.",
  },
  {
    id: "annapurna-safe-braka",
    name: "Braka Ancient Gompa High Refuge",
    type: "safeZone",
    corridorId: "annapurna",
    lat: 28.6550,
    lng: 84.0510,
    x: 670,
    y: 190,
    elevation: 3520,
    gps: "28.6550° N, 84.0510° E",
    capacity: 300,
    status: "safe",
    hazardThresholdMeters: 10.0,
    description: "500-year-old cliffside monastery complex built on massive granite crag above Marsyangdi riverbed.",
    riskNote: "Primary designated flood evacuation fortress for upper Manang.",
  },
  {
    id: "annapurna-bridge-pisang",
    name: "Lower Pisang Suspension Bridge",
    type: "bridge",
    corridorId: "annapurna",
    lat: 28.6155,
    lng: 84.1479,
    x: 580,
    y: 230,
    elevation: 3200,
    gps: "28.6155° N, 84.1479° E",
    status: "advisory",
    hazardThresholdMeters: 2.1,
    description: "Key steel pedestrian span connecting north and south Marsyangdi trekking trails.",
    riskNote: "Lower approaches threatened when glacial melt crests above 2.0m.",
  },
  {
    id: "annapurna-hospital-chame",
    name: "Chame District Hospital & APF Post",
    type: "hospital",
    corridorId: "annapurna",
    lat: 28.5504,
    lng: 84.2383,
    x: 520,
    y: 260,
    elevation: 2670,
    gps: "28.5504° N, 84.2383° E",
    capacity: 35,
    contact: "District Health Radio Manang +977-66-440114",
    status: "advisory",
    hazardThresholdMeters: 2.6,
    description: "District headquarters emergency treatment center and high-altitude SAR coordination base.",
    riskNote: "Reinforced riverbank bunding protects complex up to 2.5m surge.",
  },
  {
    id: "annapurna-bridge-1",
    name: "Dharapani Marsyangdi Crossing",
    type: "bridge",
    corridorId: "annapurna",
    lat: 28.5162,
    lng: 84.3588,
    x: 470,
    y: 290,
    elevation: 1860,
    gps: "28.5162° N, 84.3588° E",
    status: "critical",
    hazardThresholdMeters: 1.9,
    description: "Crucial suspension bridge connecting Manang district road to eastern trail across Marsyangdi.",
    riskNote: "Frequent riverbank undercutting during high flood velocity.",
  },
  {
    id: "annapurna-school-1",
    name: "Shree Marsyangdi Community School",
    type: "school",
    corridorId: "annapurna",
    lat: 28.5202,
    lng: 84.3572,
    x: 490,
    y: 275,
    elevation: 1890,
    gps: "28.5202° N, 84.3572° E",
    capacity: 110,
    status: "advisory",
    hazardThresholdMeters: 2.8,
    description: "Primary school situated safely on upper west bank village terrace.",
    riskNote: "Prone to isolation if the access footbridge is submerged.",
  },
  {
    id: "annapurna-people-1",
    name: "Tal Riverfront Village",
    type: "people",
    corridorId: "annapurna",
    lat: 28.4686,
    lng: 84.3737,
    x: 420,
    y: 310,
    elevation: 1700,
    gps: "28.4686° N, 84.3737° E",
    population: 310,
    status: "critical",
    hazardThresholdMeters: 1.4,
    description: "Village built on a historic flat lakebed directly at the level of the Marsyangdi River.",
    riskNote: "Severe risk of inundation during extreme monsoon or landslide dam burst flood.",
  },
  {
    id: "annapurna-bridge-chamje",
    name: "Chamje Waterfall Footbridge",
    type: "bridge",
    corridorId: "annapurna",
    lat: 28.4404,
    lng: 84.3867,
    x: 380,
    y: 350,
    elevation: 1430,
    gps: "28.4404° N, 84.3867° E",
    status: "critical",
    hazardThresholdMeters: 1.6,
    description: "Wooden and cable suspension bridge spanning deep gorge beneath Chamje falls.",
    riskNote: "Immediate flood impact zone during multi-hazard debris events.",
  },

  // --- Manaslu Circuit ---
  {
    id: "manaslu-lake-outflow",
    name: "Birendra Tal Flood Spillway",
    type: "dam",
    corridorId: "manaslu",
    lat: 28.5964,
    lng: 84.6336,
    x: 650,
    y: 200,
    elevation: 3691,
    gps: "28.5964° N, 84.6336° E",
    status: "critical",
    hazardThresholdMeters: 1.2,
    description: "Terminal moraine spillway breached in April 2024 following an ice-avalanche wave displacement.",
    riskNote: "Primary flood vector directly threatening Samagaun agricultural terraces.",
  },
  {
    id: "manaslu-people-1",
    name: "Samagaun Village & Glacial Basin",
    type: "people",
    corridorId: "manaslu",
    lat: 28.5866,
    lng: 84.6416,
    x: 620,
    y: 230,
    elevation: 3530,
    gps: "28.5866° N, 84.6416° E",
    population: 480,
    status: "advisory",
    hazardThresholdMeters: 3.2,
    description: "Sprawling stone village in wide glacial valley directly beneath Mount Manaslu.",
    riskNote: "Susceptible to Birendra Tal glacial lake outburst flood pathway.",
  },
  {
    id: "manaslu-school-1",
    name: "Samagaun Monastery & School",
    type: "school",
    corridorId: "manaslu",
    lat: 28.5894,
    lng: 84.6393,
    x: 640,
    y: 220,
    elevation: 3550,
    gps: "28.5894° N, 84.6393° E",
    capacity: 90,
    status: "safe",
    hazardThresholdMeters: 4.5,
    description: "Ancient stone gompa complex set on elevated ridge.",
    riskNote: "Excellent vantage point above river basin for disaster command.",
  },
  {
    id: "manaslu-safe-lho",
    name: "Lho Ribung High Monastery",
    type: "safeZone",
    corridorId: "manaslu",
    lat: 28.5737,
    lng: 84.6952,
    x: 550,
    y: 270,
    elevation: 3250,
    gps: "28.5737° N, 84.6952° E",
    capacity: 200,
    status: "safe",
    hazardThresholdMeters: 12.0,
    description: "Elevated monastery plateau commanding sweeping views of Mt. Manaslu.",
    riskNote: "150 meters vertically above Budhi Gandaki riverbed; ideal civilian sanctuary.",
  },
  {
    id: "manaslu-hospital-1",
    name: "Lho Health Clinic",
    type: "hospital",
    corridorId: "manaslu",
    lat: 28.5741,
    lng: 84.7015,
    x: 540,
    y: 280,
    elevation: 3180,
    gps: "28.5741° N, 84.7015° E",
    capacity: 10,
    contact: "VHF Ch 12 Gorkha Base",
    status: "safe",
    hazardThresholdMeters: 5.0,
    description: "Local medical dispensary serving upper Gorkha mountain trails.",
    riskNote: "Located away from river flow on stable hillside bench.",
  },
  {
    id: "manaslu-bridge-1",
    name: "Budhi Gandaki Gorge Bridge",
    type: "bridge",
    corridorId: "manaslu",
    lat: 28.4877,
    lng: 84.8666,
    x: 350,
    y: 380,
    elevation: 2100,
    gps: "28.4877° N, 84.8666° E",
    status: "critical",
    hazardThresholdMeters: 1.6,
    description: "Deep cantilever bridge over rapid narrow canyon.",
    riskNote: "High water levels create intense spray and structural vibration.",
  },
  {
    id: "manaslu-bridge-philim",
    name: "Philim Suspension Crossing",
    type: "bridge",
    corridorId: "manaslu",
    lat: 28.3914,
    lng: 84.8924,
    x: 310,
    y: 420,
    elevation: 1590,
    gps: "28.3914° N, 84.8924° E",
    status: "critical",
    hazardThresholdMeters: 1.8,
    description: "Primary link across Budhi Gandaki between lower Philim and Sirdibas.",
    riskNote: "High sediment velocity causes scouring of western tower abutment.",
  },

  // --- Rolwaling Valley (Tsho Rolpa) ---
  {
    id: "rolwaling-lake-siphon",
    name: "Tsho Rolpa Siphon Spillway Control",
    type: "dam",
    corridorId: "rolwaling",
    lat: 27.8694,
    lng: 86.4631,
    x: 820,
    y: 150,
    elevation: 4580,
    gps: "27.8694° N, 86.4631° E",
    status: "advisory",
    hazardThresholdMeters: 1.8,
    description: "Terminal moraine siphon channel regulating 85 million cubic meters of glacial meltwater.",
    riskNote: "Direct monitoring beacon for moraine piping and overflow surge.",
  },
  {
    id: "rolwaling-people-na",
    name: "Na Alpine Pasture Village",
    type: "people",
    corridorId: "rolwaling",
    lat: 27.8803,
    lng: 86.4304,
    x: 740,
    y: 200,
    elevation: 4180,
    gps: "27.8803° N, 86.4304° E",
    population: 65,
    status: "advisory",
    hazardThresholdMeters: 3.2,
    description: "Seasonal stone settlement situated on wide alluvial outwash plain below Tsho Rolpa.",
    riskNote: "Directly in primary flood wave runout zone; warning time ~8 minutes.",
  },
  {
    id: "rolwaling-safe-na",
    name: "Na North Moraine Evacuation Ridge",
    type: "safeZone",
    corridorId: "rolwaling",
    lat: 27.8835,
    lng: 86.4310,
    x: 750,
    y: 170,
    elevation: 4290,
    gps: "27.8835° N, 86.4310° E",
    capacity: 120,
    status: "safe",
    hazardThresholdMeters: 15.0,
    description: "Solid granitic lateral ridge 110m above valley floor.",
    riskNote: "Designated primary civilian sanctuary for Na pastoral community.",
  },
  {
    id: "rolwaling-people-beding",
    name: "Beding Sherpa Settlement",
    type: "people",
    corridorId: "rolwaling",
    lat: 27.9028,
    lng: 86.3755,
    x: 620,
    y: 250,
    elevation: 3690,
    gps: "27.9028° N, 86.3755° E",
    population: 220,
    status: "safe",
    hazardThresholdMeters: 4.5,
    description: "Principal permanent settlement of Rolwaling Valley with historical monastery and lodges.",
    riskNote: "Valley narrows sharply downstream, causing backwater pooling during extreme surges.",
  },
  {
    id: "rolwaling-school-beding",
    name: "Sangag Chholing Community School",
    type: "school",
    corridorId: "rolwaling",
    lat: 27.9050,
    lng: 86.3682,
    x: 630,
    y: 240,
    elevation: 3720,
    gps: "27.9050° N, 86.3682° E",
    capacity: 60,
    status: "safe",
    hazardThresholdMeters: 6.0,
    description: "Community school built on elevated terrace above main river trail.",
    riskNote: "Solar powered communications station and radio relay point.",
  },
  {
    id: "rolwaling-bridge-beding",
    name: "Beding River Suspension Bridge",
    type: "bridge",
    corridorId: "rolwaling",
    lat: 27.9059,
    lng: 86.3642,
    x: 615,
    y: 255,
    elevation: 3680,
    gps: "27.9059° N, 86.3642° E",
    status: "critical",
    hazardThresholdMeters: 2.2,
    description: "Key steel cable suspension crossing connecting Beding to southern grazing slopes.",
    riskNote: "Vulnerable to high-velocity debris scouring during glacial outburst.",
  },
  {
    id: "rolwaling-safe-beding",
    name: "Beding Gompa Sanctuary Hill",
    type: "safeZone",
    corridorId: "rolwaling",
    lat: 27.9045,
    lng: 86.3762,
    x: 635,
    y: 230,
    elevation: 3780,
    gps: "27.9045° N, 86.3762° E",
    capacity: 300,
    status: "safe",
    hazardThresholdMeters: 14.0,
    description: "Ancient Buddhist monastery knoll elevated 90m above Rolwaling Khola.",
    riskNote: "Official civil protection safe haven with emergency grain and solar stores.",
  },
  {
    id: "rolwaling-hospital-simigaun",
    name: "Simigaun Basic Health Post",
    type: "hospital",
    corridorId: "rolwaling",
    lat: 27.8725,
    lng: 86.2310,
    x: 450,
    y: 330,
    elevation: 2050,
    gps: "27.8725° N, 86.2310° E",
    capacity: 15,
    contact: "Dolakha Health Post VHF 145.200",
    status: "safe",
    hazardThresholdMeters: 8.0,
    description: "Mountain health clinic positioned high on the Simigaun village ridge terrace.",
    riskNote: "High elevation provides total safety from river flooding; helipad nearby.",
  },
  {
    id: "rolwaling-bridge-chetchet",
    name: "Chetchet Arterial Suspension Bridge",
    type: "bridge",
    corridorId: "rolwaling",
    lat: 27.8715,
    lng: 86.2217,
    x: 370,
    y: 390,
    elevation: 1377,
    gps: "27.8715° N, 86.2217° E",
    status: "critical",
    hazardThresholdMeters: 2.5,
    description: "Major pedestrian and pack animal gateway suspension bridge across Tama Koshi into Rolwaling.",
    riskNote: "Low river clearance; critical evacuation bottleneck.",
  },
  {
    id: "rolwaling-dam-gongar",
    name: "Upper Tamakoshi Hydropower Intake",
    type: "dam",
    corridorId: "rolwaling",
    lat: 27.8080,
    lng: 86.2245,
    x: 290,
    y: 450,
    elevation: 1150,
    gps: "27.8080° N, 86.2245° E",
    status: "advisory",
    hazardThresholdMeters: 3.5,
    description: "Headworks of 456 MW Upper Tamakoshi Hydropower Project, Nepal's largest plant.",
    riskNote: "Equipped with automatic radial gates; requires immediate sluice opening upon upstream GLOF alarm.",
  },
];

export interface SentinelLakeData {
  lakeId: string;
  lakeName: string;
  corridorId: string;
  region: string;
  elevationM: number;
  gps: string;
  center: { lat: number; lng: number };
  baselineDate: string;
  currentDate: string;
  baselineAreaKm2: number;
  currentAreaKm2: number;
  areaChangePct: number;
  waterMaskStatus: string;
  sensor: string;
  bandRatio: string;
  description: string;
}

export const CORRIDOR_SENTINEL_LAKES: Record<string, SentinelLakeData> = {
  langtang: {
    lakeId: "langtang_lake_upper",
    lakeName: "Langtang Moraine Melt Lake",
    corridorId: "langtang",
    region: "Rasuwa",
    elevationM: 4950,
    gps: "28.2415° N, 85.5890° E",
    center: { lat: 28.2415, lng: 85.5890 },
    baselineDate: "2026-08-05",
    currentDate: "2026-08-25",
    baselineAreaKm2: 0.88,
    currentAreaKm2: 1.01,
    areaChangePct: 14.8,
    waterMaskStatus: "CRITICAL GLOF EXPANSION (+14.8%)",
    sensor: "Sentinel-2 MSI Level-2A",
    bandRatio: "B03 (Green) / B08 (Near-Infrared NDWI > 0.30)",
    description: "Unstable moraine-dammed melt pond expanding rapidly above Langtang Khola canyon headwaters."
  },
  khumbu: {
    lakeId: "imja_tsho",
    lakeName: "Imja Tsho Glacial Lake",
    corridorId: "khumbu",
    region: "Solukhumbu",
    elevationM: 5010,
    gps: "27.9015° N, 86.9240° E",
    center: { lat: 27.9015, lng: 86.9240 },
    baselineDate: "2026-08-01",
    currentDate: "2026-08-20",
    baselineAreaKm2: 1.28,
    currentAreaKm2: 1.42,
    areaChangePct: 10.9,
    waterMaskStatus: "ELEVATED GLACIAL GROWTH (+10.9%)",
    sensor: "Sentinel-2 MSI Level-2A",
    bandRatio: "B03 (Green) / B08 (Near-Infrared NDWI > 0.30)",
    description: "End-moraine impounded glacial lake at terminus of Imja Glacier, feeding Dudh Koshi basin."
  },
  annapurna: {
    lakeId: "gangapurna_lake",
    lakeName: "Gangapurna Glacial Lake",
    corridorId: "annapurna",
    region: "Manang",
    elevationM: 3540,
    gps: "28.6570° N, 84.0200° E",
    center: { lat: 28.6570, lng: 84.0200 },
    baselineDate: "2026-08-10",
    currentDate: "2026-08-25",
    baselineAreaKm2: 0.42,
    currentAreaKm2: 0.44,
    areaChangePct: 4.8,
    waterMaskStatus: "MODERATE SEASONAL MELT (+4.8%)",
    sensor: "Sentinel-2 MSI Level-2A",
    bandRatio: "B03 (Green) / B08 (Near-Infrared NDWI > 0.30)",
    description: "Proglacial lake in Manang valley formed by retreat of Gangapurna Glacier."
  },
  manaslu: {
    lakeId: "birendra_tal",
    lakeName: "Birendra Tal (Glacial Lake)",
    corridorId: "manaslu",
    region: "Gorkha",
    elevationM: 3691,
    gps: "28.5959° N, 84.6281° E",
    center: { lat: 28.5959, lng: 84.6281 },
    baselineDate: "2026-08-12",
    currentDate: "2026-08-26",
    baselineAreaKm2: 0.31,
    currentAreaKm2: 0.32,
    areaChangePct: 3.2,
    waterMaskStatus: "STABLE (+3.2%)",
    sensor: "Sentinel-2 MSI Level-2A",
    bandRatio: "B03 (Green) / B08 (Near-Infrared NDWI > 0.30)",
    description: "Freshwater glacial lake below Mt. Manaslu near Samagaun village."
  },
  rolwaling: {
    lakeId: "tsho_rolpa",
    lakeName: "Tsho Rolpa Glacial Lake",
    corridorId: "rolwaling",
    region: "Dolakha",
    elevationM: 4580,
    gps: "27.8602° N, 86.4777° E",
    center: { lat: 27.8602, lng: 86.4777 },
    baselineDate: "2026-08-08",
    currentDate: "2026-08-27",
    baselineAreaKm2: 1.54,
    currentAreaKm2: 1.68,
    areaChangePct: 9.1,
    waterMaskStatus: "ELEVATED WATCH (+9.1%)",
    sensor: "Sentinel-2 MSI Level-2A",
    bandRatio: "B03 (Green) / B08 (Near-Infrared NDWI > 0.30)",
    description: "Nepal's premier moraine-dammed mega glacial lake (~85M m³). Monitored for siphon capacity and moraine dam stability."
  }
};

export const CORRIDOR_SEISMIC_FAULTS: Record<string, { lat: number; lng: number; label: string }> = {
  langtang: { lat: 28.2250, lng: 85.4800, label: "Langtang Gorge Thrust Fault" },
  khumbu: { lat: 27.9100, lng: 86.8500, label: "Main Central Thrust (MCT) Solu" },
  annapurna: { lat: 28.6200, lng: 84.0500, label: "Pisang-Manang Fault Fracture" },
  manaslu: { lat: 28.5100, lng: 84.5200, label: "Budhi Gandaki River Bed Fault" },
  rolwaling: { lat: 27.8300, lng: 86.4200, label: "Gaurishankar-Beding Thrust Shear" }
};

export const CORRIDOR_LANDSLIDE_ZONES: Record<string, LandslideZone[]> = {
  langtang: [
    {
      id: "ls-langtang-1",
      name: "Langtang Village Debris Chute",
      corridorId: "langtang",
      severity: "critical",
      slopeDegrees: 44,
      polygon: [
        [28.2240, 85.4920],
        [28.2290, 85.5080],
        [28.2160, 85.5180],
        [28.2080, 85.5020],
        [28.2140, 85.4910]
      ],
      description: "Steep amphitheater below Langtang Lirung ice wall. Historical co-seismic rock-ice avalanche trajectory with active debris talus.",
      soilMoistureVwcPct: 88.5
    },
    {
      id: "ls-langtang-2",
      name: "Lama Hotel Narrow Gorge Scree",
      corridorId: "langtang",
      severity: "high",
      slopeDegrees: 41,
      polygon: [
        [28.1680, 85.4120],
        [28.1750, 85.4270],
        [28.1620, 85.4360],
        [28.1520, 85.4220]
      ],
      description: "Vertical V-shaped canyon with active scree raveling. Water saturation above 80% initiates rapid channelized mudflows.",
      soilMoistureVwcPct: 83.2
    },
    {
      id: "ls-langtang-3",
      name: "Ghora Tabela Moraine Slump",
      corridorId: "langtang",
      severity: "moderate",
      slopeDegrees: 36,
      polygon: [
        [28.1960, 85.4420],
        [28.2030, 85.4610],
        [28.1910, 85.4720],
        [28.1820, 85.4540]
      ],
      description: "Glacial till terrace with tension cracking along main trekking trail during high monsoonal rainfall.",
      soilMoistureVwcPct: 74.0
    }
  ],
  khumbu: [
    {
      id: "ls-khumbu-1",
      name: "Larja Dobhan / Hillary Bridge Escarpment",
      corridorId: "khumbu",
      severity: "critical",
      slopeDegrees: 46,
      polygon: [
        [27.7860, 86.7160],
        [27.7940, 86.7260],
        [27.7810, 86.7320],
        [27.7740, 86.7210]
      ],
      description: "Sheer granite cliff confluence above suspension bridge. Rockfall hazard high during localized micro-tremors.",
      soilMoistureVwcPct: 79.1
    }
  ],
  annapurna: [
    {
      id: "ls-annapurna-1",
      name: "Tal Riverbed Debris Fan",
      corridorId: "annapurna",
      severity: "critical",
      slopeDegrees: 39,
      polygon: [
        [28.4720, 84.3820],
        [28.4810, 84.3980],
        [28.4680, 84.4060],
        [28.4590, 84.3910]
      ],
      description: "Historical landslide dam site on Marshyangdi River. Prone to sudden lake ponding and breach.",
      soilMoistureVwcPct: 85.0
    }
  ],
  manaslu: [
    {
      id: "ls-manaslu-1",
      name: "Tatopani Cliff Ravel Zone",
      corridorId: "manaslu",
      severity: "high",
      slopeDegrees: 43,
      polygon: [
        [28.3620, 84.9210],
        [28.3710, 84.9350],
        [28.3580, 84.9420],
        [28.3490, 84.9280]
      ],
      description: "Fractured gneiss walls flanking Budhi Gandaki gorge trail with frequent monsoon rock detachment.",
      soilMoistureVwcPct: 81.3
    }
  ],
  rolwaling: [
    {
      id: "ls-rolwaling-1",
      name: "Tsho Rolpa Terminal Moraine Debris Chute",
      corridorId: "rolwaling",
      severity: "critical",
      slopeDegrees: 43,
      polygon: [
        [27.8550, 86.4720],
        [27.8580, 86.4850],
        [27.8510, 86.4880],
        [27.8480, 86.4740]
      ],
      description: "Steep terminal moraine dam wall holding 85M m³ meltwater. Seepage erosion monitored closely.",
      soilMoistureVwcPct: 86.0
    },
    {
      id: "ls-rolwaling-2",
      name: "Kyalche Gorge Vertical Scree",
      corridorId: "rolwaling",
      severity: "high",
      slopeDegrees: 45,
      polygon: [
        [27.8290, 86.3100],
        [27.8340, 86.3250],
        [27.8250, 86.3300],
        [27.8220, 86.3150]
      ],
      description: "Narrow chasm gorge prone to rockfalls that can momentarily dam Rolwaling Khola.",
      soilMoistureVwcPct: 79.5
    }
  ]
};

export const CORRIDOR_LAKE_POLYGONS: Record<string, GlacialLakePolygon> = {
  langtang: {
    lakeId: "langtang_lake_upper",
    corridorId: "langtang",
    name: "Langtang Supraglacial Melt Lake (4,950m)",
    baselinePolygon: [
      [28.2370, 85.5810],
      [28.2410, 85.5840],
      [28.2450, 85.5880],
      [28.2465, 85.5925],
      [28.2440, 85.5965],
      [28.2410, 85.5975],
      [28.2365, 85.5950],
      [28.2340, 85.5910],
      [28.2345, 85.5855],
    ],
    expandedPolygon: [
      [28.2355, 85.5785],
      [28.2420, 85.5825],
      [28.2475, 85.5870],
      [28.2490, 85.5935],
      [28.2460, 85.5995],
      [28.2415, 85.6015],
      [28.2350, 85.5980],
      [28.2315, 85.5925],
      [28.2325, 85.5835],
    ],
    expansionDeltaPct: 14.8,
  },
  khumbu: {
    lakeId: "imja_tsho",
    corridorId: "khumbu",
    name: "Imja Tsho Glacial Lake (5,010m)",
    baselinePolygon: [
      // Elongated ~2km moraine-dammed glacial lake body
      [27.8985, 86.9150], // Western moraine spillway throat
      [27.9020, 86.9200], // North moraine lateral flank
      [27.9045, 86.9255],
      [27.9055, 86.9310],
      [27.9040, 86.9360], // Eastern calving front against Amphu glacier
      [27.9005, 86.9385],
      [27.8965, 86.9370],
      [27.8940, 86.9320], // South moraine wall
      [27.8935, 86.9250],
      [27.8950, 86.9190],
      [27.8970, 86.9160],
    ],
    expandedPolygon: [
      [27.8970, 86.9125], // Outward moraine breach pressure zone
      [27.9035, 86.9185],
      [27.9065, 86.9250],
      [27.9080, 86.9315],
      [27.9060, 86.9380],
      [27.9015, 86.9410],
      [27.8950, 86.9390],
      [27.8920, 86.9330],
      [27.8915, 86.9240],
      [27.8935, 86.9170],
      [27.8955, 86.9135],
    ],
    expansionDeltaPct: 10.9,
  },
  annapurna: {
    lakeId: "gangapurna_lake",
    corridorId: "annapurna",
    name: "Gangapurna Glacial Lake (3,540m)",
    baselinePolygon: [
      // Crescent alpine cirque moraine lake directly opposite Manang village
      [28.6565, 84.0235], // Spillway outlet emptying into Marsyangdi
      [28.6585, 84.0220],
      [28.6605, 84.0190],
      [28.6610, 84.0150],
      [28.6590, 84.0115], // Western ice-contact terminal moraine
      [28.6560, 84.0110],
      [28.6535, 84.0130], // Southern steep glacier ice fall base
      [28.6520, 84.0165],
      [28.6530, 84.0205],
      [28.6550, 84.0230],
    ],
    expandedPolygon: [
      [28.6575, 84.0250], // Expanding moraine overflow throat
      [28.6600, 84.0235],
      [28.6625, 84.0195],
      [28.6630, 84.0140],
      [28.6605, 84.0095],
      [28.6550, 84.0090],
      [28.6515, 84.0115],
      [28.6500, 84.0160],
      [28.6515, 84.0215],
      [28.6545, 84.0245],
    ],
    expansionDeltaPct: 4.8,
  },
  manaslu: {
    lakeId: "birendra_tal",
    corridorId: "manaslu",
    name: "Birendra Tal Glacial Lake (3,691m)",
    baselinePolygon: [
      // Alpine cirque lake at terminus of Manaslu North Glacier - exact surveyed perimeter
      [28.5954, 84.6303],
      [28.5961, 84.6334],
      [28.5979, 84.6334],
      [28.5985, 84.6322],
      [28.5978, 84.6307],
      [28.5975, 84.6285],
      [28.5969, 84.6257],
      [28.5956, 84.6244],
      [28.5948, 84.6231],
      [28.5934, 84.6232],
      [28.5931, 84.6250],
      [28.5940, 84.6272],
    ],
    expandedPolygon: [
      // 15% expanded GLOF breach perimeter toward Samagaun
      [28.5950, 84.6310],
      [28.5963, 84.6345],
      [28.5983, 84.6345],
      [28.5990, 84.6328],
      [28.5982, 84.6305],
      [28.5978, 84.6280],
      [28.5972, 84.6250],
      [28.5958, 84.6238],
      [28.5945, 84.6225],
      [28.5930, 84.6226],
      [28.5926, 84.6248],
      [28.5935, 84.6275],
    ],
    expansionDeltaPct: 3.2,
  },
  rolwaling: {
    lakeId: "tsho_rolpa",
    corridorId: "rolwaling",
    name: "Tsho Rolpa Glacial Lake (4,580m)",
    baselinePolygon: [
      // Nepal's premier moraine-dammed mega glacial lake (~85M m³) - exact surveyed perimeter
      [27.8497, 86.4899],
      [27.8558, 86.4851],
      [27.8590, 86.4823],
      [27.8617, 86.4799],
      [27.8653, 86.4765],
      [27.8676, 86.4735],
      [27.8696, 86.4691],
      [27.8710, 86.4663],
      [27.8711, 86.4644],
      [27.8694, 86.4631], // Siphon outlet breach throat
      [27.8600, 86.4742],
      [27.8525, 86.4840],
    ],
    expandedPolygon: [
      [27.8530, 86.4750], // Siphon overflow zone
      [27.8590, 86.4700],
      [27.8615, 86.4820],
      [27.8600, 86.4970],
      [27.8565, 86.5080],
      [27.8505, 86.5050],
      [27.8485, 86.4910],
      [27.8490, 86.4780],
    ],
    expansionDeltaPct: 9.1,
  },
};

export const CORRIDOR_RESCUE_BASES: Record<string, RescueBase[]> = {
  langtang: [
    {
      id: "apf-dhunche",
      name: "Armed Police Force (APF) Disaster Base",
      agency: "APF",
      corridorId: "langtang",
      lat: 28.1120,
      lng: 85.3020,
      elevation: 1960,
      contact: "APF Rescue HQ +977-10-540199",
      heliFlightMin: 8
    },
    {
      id: "na-syabru",
      name: "Nepal Army Kalidatta Battalion Outpost",
      agency: "Nepal Army",
      corridorId: "langtang",
      lat: 28.1550,
      lng: 85.3350,
      elevation: 1460,
      contact: "Nepal Army SAR VHF 142.5 MHz",
      heliFlightMin: 5
    },
    {
      id: "park-kyanjin",
      name: "Langtang National Park Alpine Ranger Post",
      agency: "National Park",
      corridorId: "langtang",
      lat: 28.2120,
      lng: 85.5680,
      elevation: 3850,
      contact: "Ranger Station VHF Ch 9",
      heliFlightMin: 2
    }
  ],
  khumbu: [
    {
      id: "apf-namche",
      name: "APF High-Altitude Mountain Rescue Base",
      agency: "APF",
      corridorId: "khumbu",
      lat: 27.8050,
      lng: 86.7110,
      elevation: 3440,
      contact: "Namche SAR VHF Ch 16",
      heliFlightMin: 6
    }
  ],
  annapurna: [
    {
      id: "na-jomsom",
      name: "Nepal Army High Altitude Warfare School",
      agency: "Nepal Army",
      corridorId: "annapurna",
      lat: 28.7820,
      lng: 83.7250,
      elevation: 2720,
      contact: "HAWS Command +977-69-440101",
      heliFlightMin: 7
    }
  ],
  manaslu: [
    {
      id: "apf-araghat",
      name: "APF Disaster Response Detachment Arughat",
      agency: "APF",
      corridorId: "manaslu",
      lat: 28.0450,
      lng: 84.8150,
      elevation: 570,
      contact: "Gorkha Emergency Desk 1149",
      heliFlightMin: 12
    }
  ],
  rolwaling: [
    {
      id: "apf-charikot",
      name: "APF 18th Battalion Disaster Rescue Post Charikot",
      agency: "APF",
      corridorId: "rolwaling",
      lat: 27.6710,
      lng: 86.0330,
      elevation: 1970,
      contact: "Dolakha Emergency Desk 1149",
      heliFlightMin: 14
    },
    {
      id: "na-singati",
      name: "Nepal Army Disaster Outpost Singati",
      agency: "Nepal Army",
      corridorId: "rolwaling",
      lat: 27.7550,
      lng: 86.1680,
      elevation: 980,
      contact: "Singati Base VHF Ch 14",
      heliFlightMin: 9
    }
  ]
};

export const CORRIDOR_WEATHER_STATIONS: Record<string, DHMWeatherStation[]> = {
  langtang: [
    {
      id: "dhm-1004",
      stationCode: "DHM-1004",
      name: "Kyanjin Gompa Alpine AWS",
      corridorId: "langtang",
      elevation: 3840,
      lat: 28.2115,
      lng: 85.5690,
      rain24h: 38.0,
      rainRateMmH: 2.4,
      soilMoistureVwc: 44.5,
      status: "Normal"
    },
    {
      id: "dhm-1005",
      stationCode: "DHM-1005",
      name: "Lama Hotel Canyon Hydro-Station",
      corridorId: "langtang",
      elevation: 2470,
      lat: 28.1610,
      lng: 85.4230,
      rain24h: 58.0,
      rainRateMmH: 6.8,
      soilMoistureVwc: 76.2,
      status: "Elevated"
    },
    {
      id: "dhm-1008",
      stationCode: "DHM-1008",
      name: "Dhunche District Synoptic AWS",
      corridorId: "langtang",
      elevation: 1960,
      lat: 28.1125,
      lng: 85.3030,
      rain24h: 41.0,
      rainRateMmH: 3.1,
      soilMoistureVwc: 58.0,
      status: "Normal"
    }
  ],
  rolwaling: [
    {
      id: "dhm-1019",
      stationCode: "DHM-1019",
      name: "Beding Alpine Telemetric AWS",
      corridorId: "rolwaling",
      elevation: 3690,
      lat: 27.8385,
      lng: 86.3725,
      rain24h: 28.0,
      rainRateMmH: 1.8,
      soilMoistureVwc: 46.0,
      status: "Normal"
    }
  ]
};

