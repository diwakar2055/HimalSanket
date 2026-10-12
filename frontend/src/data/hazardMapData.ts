import { LANGTANG_RIVER_PATH } from "./langtangRiverPath";

export interface MapAsset {
  id: string;
  name: string;
  type: "people" | "school" | "bridge" | "hospital";
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
    center: { lat: 27.8050, lng: 86.7200 },
    zoom: 12,
    riverPath: [
      // Dudh Koshi river canyon floor (does not climb into high mountain villages)
      { lat: 27.7400, lng: 86.7130 }, // Phakding riverbed
      { lat: 27.7520, lng: 86.7145 }, // Toktok
      { lat: 27.7650, lng: 86.7180 }, // Benkar
      { lat: 27.7780, lng: 86.7210 }, // Monjo riverbed
      { lat: 27.7815, lng: 86.7215 }, // Hillary Bridge / Larja Dobhan confluence
      { lat: 27.7910, lng: 86.7230 }, // Deep canyon gorge below Namche ridge
      { lat: 27.8020, lng: 86.7275 }, // Canyon floor below Syangboche
      { lat: 27.8140, lng: 86.7350 }, // Gorge below Khumjung
      { lat: 27.8220, lng: 86.7460 }, // Tashinga canyon descent
      { lat: 27.8285, lng: 86.7565 }, // Phunki Thenga suspension bridge
      { lat: 27.8330, lng: 86.7720 }, // Imja Khola confluence beneath Tengboche
      { lat: 27.8380, lng: 86.7890 }, // Riverbed below Pangboche
      { lat: 27.8450, lng: 86.8200 }, // Imja glacial outwash toward Dingboche
    ],
  },
  annapurna: {
    id: "annapurna",
    name: "Annapurna Circuit",
    region: "Manang / Lamjung",
    centerName: "Marsyangdi River",
    center: { lat: 28.5100, lng: 84.3900 },
    zoom: 12,
    riverPath: [
      // Marsyangdi River canyon floor
      { lat: 28.4200, lng: 84.4050 }, // Chamje waterfall canyon
      { lat: 28.4450, lng: 84.3920 },
      { lat: 28.4660, lng: 84.3800 }, // Tal flat river terrace
      { lat: 28.4820, lng: 84.3860 },
      { lat: 28.4950, lng: 84.3900 }, // Karte
      { lat: 28.5200, lng: 84.3950 }, // Dharapani suspension bridge
      { lat: 28.5350, lng: 84.3700 }, // Bagarchhap
      { lat: 28.5410, lng: 84.3480 }, // Danakyu
      { lat: 28.5450, lng: 84.3200 }, // Timang gorge
    ],
  },
  manaslu: {
    id: "manaslu",
    name: "Manaslu Circuit",
    region: "Gorkha",
    centerName: "Budhi Gandaki Canyon",
    center: { lat: 28.5400, lng: 84.6900 },
    zoom: 11,
    riverPath: [
      { lat: 28.4100, lng: 84.8500 }, // Philim
      { lat: 28.4500, lng: 84.8100 }, // Deng / Bridge
      { lat: 28.5000, lng: 84.7700 }, // Ghap
      { lat: 28.5300, lng: 84.7500 }, // Namrung
      { lat: 28.5600, lng: 84.6900 }, // Lho
      { lat: 28.5870, lng: 84.6340 }, // Samagaun
    ],
  },
};

export const CORRIDOR_OPTIONS = [
  { id: "langtang", name: "Langtang Valley", region: "Rasuwa", center: "Langtang Khola Basin" },
  { id: "khumbu", name: "Everest / Khumbu", region: "Solukhumbu", center: "Dudh Koshi Corridor" },
  { id: "annapurna", name: "Annapurna Circuit", region: "Manang / Lamjung", center: "Marsyangdi River" },
  { id: "manaslu", name: "Manaslu Circuit", region: "Gorkha", center: "Budhi Gandaki Canyon" },
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
    lat: 28.2159,
    lng: 85.5085,
    x: 560,
    y: 265,
    elevation: 3460,
    gps: "28.2159° N, 85.5085° E",
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
    lat: 28.1652,
    lng: 85.3435,
    x: 110,
    y: 430,
    elevation: 1460,
    gps: "28.1652° N, 85.3435° E",
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
    lat: 28.1552,
    lng: 85.3982,
    x: 240,
    y: 400,
    elevation: 1960,
    gps: "28.1552° N, 85.3982° E",
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
    lat: 28.2008,
    lng: 85.4612,
    x: 410,
    y: 310,
    elevation: 3010,
    gps: "28.2008° N, 85.4612° E",
    status: "advisory",
    hazardThresholdMeters: 2.6,
    description: "Reinforced river bridge at Ghoda Tabela checkpoint. Key logistics artery for pack animals and trekkers.",
    riskNote: "Bridge abutment monitored for bank erosion after heavy upstream glacial melt.",
  },
  {
    id: "langtang-bridge-3",
    name: "Kyanjin Upper Tributary Crossing",
    type: "bridge",
    corridorId: "langtang",
    lat: 28.2118,
    lng: 85.5785,
    x: 820,
    y: 195,
    elevation: 3910,
    gps: "28.2118° N, 85.5785° E",
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
    lat: 28.2120,
    lng: 85.5678,
    x: 780,
    y: 205,
    elevation: 3865,
    gps: "28.2120° N, 85.5678° E",
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
    lat: 28.1640,
    lng: 85.3420,
    x: 125,
    y: 435,
    elevation: 1475,
    gps: "28.1640° N, 85.3420° E",
    capacity: 25,
    contact: "Local Helipad VHF 122.8",
    status: "safe",
    hazardThresholdMeters: 5.5,
    description: "Government primary healthcare hub with ambulance access to Trishuli / Kathmandu district hospitals.",
    riskNote: "Adjacent to all-weather concrete road head; standard disaster medical depot.",
  },

  // --- Everest / Khumbu ---
  {
    id: "khumbu-people-1",
    name: "Namche Bazaar Amphitheater",
    type: "people",
    corridorId: "khumbu",
    lat: 27.8069,
    lng: 86.7140,
    x: 320,
    y: 380,
    elevation: 3440,
    gps: "27.8069° N, 86.7140° E",
    population: 1650,
    status: "safe",
    hazardThresholdMeters: 6.0,
    description: "Major regional commercial hub built in a natural terraced amphitheater above the river gorge.",
    riskNote: "Terraced architecture is secure from flash floods, but steep drainage gullies need cleared culverts.",
  },
  {
    id: "khumbu-bridge-1",
    name: "Hillary Suspension Bridge",
    type: "bridge",
    corridorId: "khumbu",
    lat: 27.7810,
    lng: 86.7210,
    x: 280,
    y: 450,
    elevation: 2900,
    gps: "27.7810° N, 86.7210° E",
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
    lat: 27.8180,
    lng: 86.7190,
    x: 410,
    y: 330,
    elevation: 3790,
    gps: "27.8180° N, 86.7190° E",
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
    lat: 27.8220,
    lng: 86.7120,
    x: 390,
    y: 320,
    elevation: 3840,
    gps: "27.8220° N, 86.7120° E",
    capacity: 20,
    contact: "VHF 143.900 Emergency",
    status: "safe",
    hazardThresholdMeters: 8.0,
    description: "Full-service mountain hospital serving the entire Khumbu community.",
    riskNote: "High and dry elevation; reliable year-round solar power.",
  },

  // --- Annapurna Circuit ---
  {
    id: "annapurna-people-1",
    name: "Tal Riverfront Village",
    type: "people",
    corridorId: "annapurna",
    lat: 28.4660,
    lng: 84.3800,
    x: 420,
    y: 310,
    elevation: 1700,
    gps: "28.4660° N, 84.3800° E",
    population: 310,
    status: "critical",
    hazardThresholdMeters: 1.4,
    description: "Village built on a historic flat lakebed directly at the level of the Marsyangdi River.",
    riskNote: "Severe risk of inundation during extreme monsoon or landslide dam burst flood.",
  },
  {
    id: "annapurna-bridge-1",
    name: "Dharapani Marsyangdi Crossing",
    type: "bridge",
    corridorId: "annapurna",
    lat: 28.5200,
    lng: 84.3950,
    x: 470,
    y: 290,
    elevation: 1860,
    gps: "28.5200° N, 84.3950° E",
    status: "critical",
    hazardThresholdMeters: 1.9,
    description: "Crucial suspension bridge connecting Manang district road to eastern trail.",
    riskNote: "Frequent riverbank undercutting during high flood velocity.",
  },
  {
    id: "annapurna-school-1",
    name: "Shree Marsyangdi Community School",
    type: "school",
    corridorId: "annapurna",
    lat: 28.5250,
    lng: 84.4010,
    x: 490,
    y: 275,
    elevation: 1890,
    gps: "28.5250° N, 84.4010° E",
    capacity: 110,
    status: "advisory",
    hazardThresholdMeters: 2.8,
    description: "Primary school situated on lower terrace.",
    riskNote: "Prone to isolation if the access footbridge is submerged.",
  },
  {
    id: "annapurna-hospital-1",
    name: "Dharapani Sub-Health Post",
    type: "hospital",
    corridorId: "annapurna",
    lat: 28.5210,
    lng: 84.3980,
    x: 480,
    y: 285,
    elevation: 1880,
    gps: "28.5210° N, 84.3980° E",
    capacity: 15,
    contact: "District Health Radio Lamjung",
    status: "advisory",
    hazardThresholdMeters: 2.5,
    description: "First responder post for trekker injuries and regional mountain sickness.",
    riskNote: "Emergency supplies stored on second floor in anticipation of seasonal high waters.",
  },

  // --- Manaslu Circuit ---
  {
    id: "manaslu-people-1",
    name: "Samagaun Glacial Basin",
    type: "people",
    corridorId: "manaslu",
    lat: 28.5870,
    lng: 84.6340,
    x: 620,
    y: 230,
    elevation: 3530,
    gps: "28.5870° N, 84.6340° E",
    population: 480,
    status: "advisory",
    hazardThresholdMeters: 3.2,
    description: "Sprawling stone village in wide glacial valley directly beneath Mount Manaslu.",
    riskNote: "Susceptible to Birendra Tal glacial lake outburst flood pathway.",
  },
  {
    id: "manaslu-bridge-1",
    name: "Budhi Gandaki Gorge Bridge",
    type: "bridge",
    corridorId: "manaslu",
    lat: 28.4500,
    lng: 84.8100,
    x: 350,
    y: 380,
    elevation: 2100,
    gps: "28.4500° N, 84.8100° E",
    status: "critical",
    hazardThresholdMeters: 1.6,
    description: "Deep cantilever bridge over rapid narrow canyon.",
    riskNote: "High water levels create intense spray and structural vibration.",
  },
  {
    id: "manaslu-school-1",
    name: "Samagaun Monastery & School",
    type: "school",
    corridorId: "manaslu",
    lat: 28.5900,
    lng: 84.6400,
    x: 640,
    y: 220,
    elevation: 3550,
    gps: "28.5900° N, 84.6400° E",
    capacity: 90,
    status: "safe",
    hazardThresholdMeters: 4.5,
    description: "Ancient stone gompa complex set on elevated ridge.",
    riskNote: "Excellent vantage point above river basin for disaster command.",
  },
  {
    id: "manaslu-hospital-1",
    name: "Lho Health Clinic",
    type: "hospital",
    corridorId: "manaslu",
    lat: 28.5600,
    lng: 84.6900,
    x: 540,
    y: 280,
    elevation: 3180,
    gps: "28.5600° N, 84.6900° E",
    capacity: 10,
    contact: "VHF Ch 12 Gorkha Base",
    status: "safe",
    hazardThresholdMeters: 5.0,
    description: "Local medical dispensary serving upper Gorkha mountain trails.",
    riskNote: "Located away from river flow on stable hillside bench.",
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
    gps: "28.5600° N, 84.6200° E",
    center: { lat: 28.5600, lng: 84.6200 },
    baselineDate: "2026-08-12",
    currentDate: "2026-08-26",
    baselineAreaKm2: 0.31,
    currentAreaKm2: 0.32,
    areaChangePct: 3.2,
    waterMaskStatus: "STABLE (+3.2%)",
    sensor: "Sentinel-2 MSI Level-2A",
    bandRatio: "B03 (Green) / B08 (Near-Infrared NDWI > 0.30)",
    description: "Freshwater glacial lake below Mt. Manaslu near Samagaun village."
  }
};

export const CORRIDOR_SEISMIC_FAULTS: Record<string, { lat: number; lng: number; label: string }> = {
  langtang: { lat: 28.2250, lng: 85.4800, label: "Langtang Gorge Thrust Fault" },
  khumbu: { lat: 27.9100, lng: 86.8500, label: "Main Central Thrust (MCT) Solu" },
  annapurna: { lat: 28.6200, lng: 84.0500, label: "Pisang-Manang Fault Fracture" },
  manaslu: { lat: 28.5100, lng: 84.5200, label: "Budhi Gandaki River Bed Fault" }
};

