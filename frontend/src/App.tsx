import React, { useState, useMemo, useCallback, useEffect } from "react";
import { GeminiChatbot } from "./components/GeminiChatbot";
import { LeafletHazardMap } from "./components/LeafletHazardMap";
import {
  CORRIDOR_CONFIGS,
  MAP_ASSETS,
  MapAsset,
  CORRIDOR_SENTINEL_LAKES,
} from "./data/hazardMapData";
import {
  fetchLiveTelemetry,
  triggerPresentationScenario,
  LiveTelemetryResponse,
} from "./services/riskEngineApi";
import {
  Users,
  GraduationCap,
  Route,
  HeartPulse,
  X,
  Shield,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
  Satellite,
  Waves,
  Activity,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

// ---- palette ----
const C = {
  bg: "#0F1B33",
  panel: "#16233F",
  panelAlt: "#1C2C4C",
  border: "#2A3B5E",
  text: "#ECF1F6",
  muted: "#8CA0BE",
  mutedDim: "#5E729A",
  teal: "#2E86AB",
  amber: "#C9A227",
  orange: "#E4572E",
  red: "#9B2C22",
};

const TIER: Record<string, { color: string; label: string; ne: string }> = {
  Low: { color: C.teal, label: "Low", ne: "न्यून" },
  Moderate: { color: C.amber, label: "Moderate", ne: "मध्यम" },
  High: { color: C.orange, label: "High", ne: "उच्च" },
  Critical: { color: C.red, label: "Critical", ne: "गम्भीर" },
};

const INITIAL_CORRIDORS = [
  { id: "langtang", name: "Langtang Valley", region: "Rasuwa", rainfall: 38, rainThreshold: 144, seismic: 1.8, lakeChange: 4, susceptibility: 0.71, reports: [], gps: "28.2096° N, 85.5089° E" },
  { id: "khumbu", name: "Everest / Khumbu", region: "Solukhumbu", rainfall: 22, rainThreshold: 144, seismic: 0.6, lakeChange: 1, susceptibility: 0.52, reports: [], gps: "27.9878° N, 86.9250° E" },
  { id: "annapurna", name: "Annapurna Circuit", region: "Manang", rainfall: 51, rainThreshold: 144, seismic: 1.1, lakeChange: 2, susceptibility: 0.63, reports: [], gps: "28.6667° N, 84.0167° E" },
  { id: "manaslu", name: "Manaslu Circuit", region: "Gorkha", rainfall: 17, rainThreshold: 144, seismic: 0.4, lakeChange: 0, susceptibility: 0.44, reports: [], gps: "28.5497° N, 84.5602° E" },
];

const REPORT_TYPES = [
  { id: "water", label: "Water rising" },
  { id: "crack", label: "Trail cracking" },
  { id: "sound", label: "Unusual sound" },
  { id: "other", label: "Other" },
];

const BUILDING_TYPES = [
  { id: "multi", label: "Multi-storey building", weight: 22 },
  { id: "single", label: "Single-storey home", weight: 10 },
  { id: "outdoor", label: "Outdoors / open field", weight: 4 },
];

const CONDITIONS = [
  { id: "collapsed", label: "Structure reported collapsed", weight: 40 },
  { id: "damaged", label: "Structure damaged, standing", weight: 18 },
  { id: "unknown", label: "Condition unknown", weight: 8 },
];

const SIGNAL_LEVELS = [
  { id: "none", label: "No signal" },
  { id: "weak", label: "Weak signal" },
  { id: "strong", label: "Strong signal" },
];

const SEVERITY_KEYWORDS = ["injured", "hurt", "bleeding", "blood", "can't move", "cannot move", "leg", "trapped", "pain", "broken"];

function computeRisk(c: any) {
  const rainScore = Math.min(c.rainfall / c.rainThreshold, 1);
  const seismicScore = Math.min(c.seismic / 4, 1);
  const lakeScore = Math.min(c.lakeChange / 15, 1);
  const reportScore = Math.min(c.reports.length * 0.18, 1);
  const score = rainScore * 0.3 + seismicScore * 0.2 + lakeScore * 0.25 + c.susceptibility * 0.1 + reportScore * 0.15;
  let tier = "Low";
  if (score >= 0.7) tier = "Critical";
  else if (score >= 0.5) tier = "High";
  else if (score >= 0.3) tier = "Moderate";
  return { score, tier, rainScore, seismicScore, lakeScore, reportScore };
}

function generateBriefing(c: any, risk: any) {
  if (!c || !risk) {
    return {
      en: "Corridor environmental monitoring active. All telemetry within baseline.",
      ne: "खोला तथा पहिरो जोखिम अनुगमन भइरहेको छ।",
    };
  }
  const drivers = [];
  if ((risk.rainScore || 0) > 0.35) drivers.push("rainfall approaching the district threshold");
  if ((risk.lakeScore || 0) > 0.15) drivers.push("measurable glacial lake area growth");
  if ((risk.seismicScore || 0) > 0.3) drivers.push("recent nearby seismic activity");
  if ((risk.reportScore || 0) > 0.15) drivers.push("multiple ground reports from the valley");
  if (drivers.length === 0) drivers.push("no elevated signals at this time");

  const tierKey = (risk.tier || "Low") as keyof typeof TIER;
  const tierInfo = TIER[tierKey] || TIER.Low;

  const en = tierKey === "Low"
    ? `${c.name || "This corridor"} is currently at LOW risk. Conditions are within normal range; ${drivers[0]}. Routine travel advisory in effect.`
    : `${c.name || "This corridor"} is at ${tierKey.toUpperCase()} risk. Key drivers: ${drivers.join(", ")}. ${
        tierKey === "Critical" ? "Recommend postponing entry and notifying registered trekking groups immediately."
        : tierKey === "High" ? "Recommend delaying non-essential entry and briefing agencies before departure."
        : "Monitor conditions closely before departure; no restriction yet."
      }`;

  const ne = tierKey === "Low"
    ? `${c.name || "यो क्षेत्र"} हाल कम जोखिममा छ। परिस्थिति सामान्य दायरामा छ।`
    : `${c.name || "यो क्षेत्र"} ${tierInfo.ne} जोखिममा छ। सतर्कता अपनाई यात्रा संगठनलाई जानकारी गराउनुहोस्।`;

  return { en, ne };
}

function priorityBand(score: number) {
  if (score >= 80) return { label: "Priority 0 — Confirmed distress signal", color: C.red };
  if (score >= 65) return { label: "Priority 1 — Dig now", color: C.red };
  if (score >= 40) return { label: "Priority 2 — Next in queue", color: C.orange };
  if (score >= 20) return { label: "Priority 3 — Monitor", color: C.amber };
  return { label: "Priority 4 — Low urgency", color: C.teal };
}

function StatRow({ label, value, unit, fraction }: { label: string, value: any, unit: string, fraction: number }) {
  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${C.border}` }}>
      <span className="text-sm" style={{ color: C.muted }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm" style={{ color: C.text, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{value}{unit}</span>
        <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ background: C.border }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(fraction, 1) * 100}%`, background: fraction > 0.65 ? C.orange : fraction > 0.35 ? C.amber : C.teal }} />
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="text-sm px-4 py-2 cursor-pointer transition-colors" style={{ color: active ? C.text : C.muted, borderBottom: active ? `2px solid ${C.orange}` : "2px solid transparent", fontWeight: active ? 600 : 400 }}>
      {children}
    </button>
  );
}

function SentinelLakeModal({
  lake,
  onClose,
}: {
  lake: any;
  onClose: () => void;
}) {
  const lakeName = lake.lake_name || lake.lakeName || "Glacial Lake";
  const elevation = lake.elevation_m || lake.elevationM || 4950;
  const region = lake.region || "Himalayan Region";
  const gps = lake.gps || "28.2415° N, 85.5890° E";
  const baselineDate = lake.baseline_date || lake.baselineDate || "2026-08-05";
  const currentDate = lake.current_date || lake.currentDate || "2026-08-25";
  const baselineArea = lake.baseline_area_km2 || lake.baselineAreaKm2 || 0.88;
  const currentArea = lake.current_area_km2 || lake.currentAreaKm2 || 1.01;
  const areaChangePct = lake.area_change_pct ?? lake.areaChangePct ?? 14.8;
  const sensor = lake.sensor || "Sentinel-2 MSI Level-2A";
  const bandCombo = lake.band_combination || lake.bandRatio || "B03 (Green) / B08 (Near-Infrared NDWI > 0.30)";
  const status = lake.water_mask_status || lake.waterMaskStatus || "EXPANDING RAPIDLY";
  const description = lake.description || "Supraglacial meltwater lake expanding behind moraine dam.";

  const isRapid = areaChangePct > 10;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl rounded-2xl border border-[#2A3B5E] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: "#16233F" }}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#2A3B5E] bg-[#0F1B33]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#2E86AB]/20 text-[#2E86AB] border border-[#2E86AB]/40">
              <Satellite className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{lakeName}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {elevation}m ASL
                </span>
              </div>
              <p className="text-xs text-[#8CA0BE]">{region} · GPS: {gps}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8CA0BE] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Status banner */}
          <div
            className="p-3.5 rounded-xl flex items-center justify-between gap-3 border"
            style={{
              background: isRapid ? "rgba(228, 87, 46, 0.15)" : "rgba(46, 134, 171, 0.15)",
              borderColor: isRapid ? "#E4572E" : "#2E86AB",
            }}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: isRapid ? "#E4572E" : "#2E86AB" }} />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-white">
                  {status}
                </div>
                <div className="text-xs text-[#8CA0BE]">
                  Sentinel-2 multi-temporal surface water difference detected +{areaChangePct}% growth
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-mono font-bold" style={{ color: isRapid ? "#E4572E" : "#2E86AB" }}>
                +{areaChangePct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-[#8CA0BE]">Surface Area Delta</div>
            </div>
          </div>

          {/* Dual Observation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Baseline */}
            <div className="p-4 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8CA0BE] mb-1">
                Baseline Reference Observation
              </div>
              <div className="text-lg font-bold font-mono text-white">
                {baselineArea.toFixed(2)} km²
              </div>
              <div className="text-xs text-[#5E729A] mt-1">Pass Date: {baselineDate}</div>
              <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Stable Moraine Impoundment
              </div>
            </div>

            {/* Current Pass */}
            <div className="p-4 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8CA0BE] mb-1">
                Current Sensed Pass
              </div>
              <div className="text-lg font-bold font-mono text-amber-300">
                {currentArea.toFixed(2)} km²
              </div>
              <div className="text-xs text-[#5E729A] mt-1">Pass Date: {currentDate}</div>
              <div className="text-[11px] text-amber-400 mt-2 flex items-center gap-1">
                <Waves className="w-3.5 h-3.5" /> Rapid Melt Pond Formation
              </div>
            </div>
          </div>

          {/* Satellite NDWI Mask Visualization */}
          <div className="p-4 rounded-xl border border-[#2A3B5E] bg-[#0F1B33] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8CA0BE]">
                Satellite Imagery &amp; NDWI Water Mask
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                {sensor}
              </span>
            </div>

            {/* Satellite View Graphic */}
            <div className="relative h-44 w-full rounded-lg overflow-hidden border border-[#2A3B5E] bg-slate-900 flex items-center justify-center">
              <img
                src={lake.satellite_tile_preview || "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/13/3440/6045"}
                alt="Satellite Lake Tile"
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/70 via-transparent to-blue-900/40 pointer-events-none" />
              <div className="relative z-10 p-3 rounded-lg bg-black/75 backdrop-blur-sm border border-cyan-500/40 text-center max-w-sm">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                  <span className="text-xs font-bold text-cyan-300">NDWI Threshold &gt; 0.30 Water Mask Active</span>
                </div>
                <div className="text-[11px] text-[#ECF1F6]">
                  Supraglacial meltwater boundary expanded by {((currentArea - baselineArea) * 100).toFixed(0)} hectares toward loose frontal moraine debris.
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#8CA0BE] space-y-1">
              <div><strong>Spectral Band Ratio:</strong> {bandCombo}</div>
              <div><strong>Geomorphic Note:</strong> {description}</div>
            </div>
          </div>

          {/* GLOF Breach Hazard Warning */}
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-200">
            <strong>Downstream GLOF (Glacial Lake Outburst Flood) Hazard Path:</strong>
            <div className="mt-1 text-[11px] text-[#ECF1F6]/90">
              Any moraine dam crest collapse discharges down the primary headwaters corridor. Flood arrival at Kyanjin Gompa: ~8 mins; Lama Hotel: ~18 mins; Syabrubesi Highway: ~38 mins.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#2A3B5E] bg-[#0F1B33] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#2E86AB] hover:bg-[#2E86AB]/80 text-white transition-colors cursor-pointer"
          >
            Close Satellite Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

function WhyRegionAffectedCard({
  corridor,
  risk,
  liveData,
  onInspectLake,
}: {
  corridor: any;
  risk: any;
  liveData: LiveTelemetryResponse | null;
  onInspectLake: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"drivers" | "gemini" | "downstream">("drivers");

  const tierKey = (risk?.tier || "Low") as keyof typeof TIER;
  const tier = TIER[tierKey] || TIER.Low;
  const gemini = liveData?.gemini_intelligence;
  const signalContrib = liveData?.risk_assessment?.signal_contributions || {
    rainfall: (risk?.rainScore ?? 0) * 0.3,
    seismic: (risk?.seismicScore ?? 0) * 0.2,
    lake: (risk?.lakeScore ?? 0) * 0.25,
    terrain: (corridor?.susceptibility ?? 0.71) * 0.1,
    reports: (risk?.reportScore ?? 0) * 0.15,
  };

  const keyDrivers = liveData?.risk_assessment?.explanation?.key_drivers || [];
  const downstreamCascade = liveData?.downstream_cascade || [
    { station: "Glacial Lake Moraine (4,950m)", arrival_min: 0, status: "Breach Origin" },
    { station: "Kyanjin Gompa (3,860m)", arrival_min: 8, status: "Immediate alert" },
    { station: "Lama Hotel Gorge (2,470m)", arrival_min: 18, status: "Evacuate canyon" },
    { station: "Syabrubesi Bazaar (1,460m)", arrival_min: 38, status: "Sound siren & close bridge" },
    { station: "Mailung Hydropower Dam (1,120m)", arrival_min: 55, status: "Open floodgates" },
    { station: "Betrawati Highway (620m)", arrival_min: 78, status: "Stop Nuwakot traffic" },
  ];

  return (
    <div className="p-5 rounded-2xl border border-[#2A3B5E] shadow-xl bg-[#16233F] mb-6">
      {/* Header with Affected Region & Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#2A3B5E]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#E4572E]">
              Affected Region &amp; Hazard Driver Breakdown
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/10 text-[#8CA0BE]">
              GPS: {corridor?.gps || "28.2096° N, 85.5089° E"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span>📍 {corridor?.name || "Langtang Valley"} ({corridor?.region || "Rasuwa"} District)</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] text-[#8CA0BE] uppercase tracking-wider">Multi-Hazard Risk Score</div>
            <div className="text-lg font-mono font-bold" style={{ color: tier.color }}>
              {((risk?.score ?? 0) * 100).toFixed(1)} / 100
            </div>
          </div>
          <div
            className="px-4 py-2 rounded-xl text-center font-bold text-sm tracking-wide border shadow-md"
            style={{
              background: `${tier.color}25`,
              color: tier.color,
              borderColor: `${tier.color}66`,
            }}
          >
            {tier.label.toUpperCase()} RISK
            <div className="text-[11px] font-normal opacity-90">{tier.ne}</div>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 my-4 border-b border-[#2A3B5E]/50 pb-2">
        <button
          onClick={() => setActiveTab("drivers")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === "drivers"
              ? "bg-[#2E86AB] text-white"
              : "text-[#8CA0BE] hover:text-white hover:bg-white/5"
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> Physical Hazard Drivers (WHY It Is At Risk)
        </button>
        <button
          onClick={() => setActiveTab("gemini")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === "gemini"
              ? "bg-[#2E86AB] text-white"
              : "text-[#8CA0BE] hover:text-white hover:bg-white/5"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Gemini 2.0 Flash AI Intelligence
        </button>
        <button
          onClick={() => setActiveTab("downstream")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === "downstream"
              ? "bg-[#2E86AB] text-white"
              : "text-[#8CA0BE] hover:text-white hover:bg-white/5"
          }`}
        >
          <Waves className="w-3.5 h-3.5 text-cyan-300" /> Downstream Flood Arrival Tracker
        </button>
      </div>

      {/* Tab 1: Physics Drivers */}
      {activeTab === "drivers" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Rainfall */}
            <div className="p-3.5 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
              <div className="flex items-center justify-between text-xs text-[#8CA0BE] mb-1">
                <span className="flex items-center gap-1">🌧️ Rainfall</span>
                <span className="font-mono text-white font-bold">{corridor.rainfall} mm</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#2A3B5E] overflow-hidden my-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(risk.rainScore * 100, 100)}%`,
                    background: risk.rainScore > 0.7 ? "#E4572E" : "#2E86AB",
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#5E729A] font-mono">
                <span>Threshold: {corridor.rainThreshold}mm</span>
                <span>+{(signalContrib.rainfall || 0).toFixed(2)}</span>
              </div>
              <div className="text-[11px] text-[#8CA0BE] mt-2">
                {corridor.rainfall > 100 ? "Severe saturation surge" : "Catchment precipitation normal"}
              </div>
            </div>

            {/* 2. Seismic */}
            <div className="p-3.5 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
              <div className="flex items-center justify-between text-xs text-[#8CA0BE] mb-1">
                <span className="flex items-center gap-1">⚡ Seismic</span>
                <span className="font-mono text-white font-bold">{corridor.seismic.toFixed(1)} M</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#2A3B5E] overflow-hidden my-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(risk.seismicScore * 100, 100)}%`,
                    background: risk.seismicScore > 0.5 ? "#E4572E" : "#2E86AB",
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#5E729A] font-mono">
                <span>USGS Real-time</span>
                <span>+{(signalContrib.seismic || 0).toFixed(2)}</span>
              </div>
              <div className="text-[11px] text-[#8CA0BE] mt-2">
                {corridor.seismic >= 3.0 ? "Shallow tremor trigger" : "Microseismic tremors within baseline"}
              </div>
            </div>

            {/* 3. Glacial Lake */}
            <div className="p-3.5 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
              <div className="flex items-center justify-between text-xs text-[#8CA0BE] mb-1">
                <span className="flex items-center gap-1">🛰️ Sentinel-2</span>
                <span className="font-mono text-cyan-300 font-bold">+{corridor.lakeChange}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#2A3B5E] overflow-hidden my-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(risk.lakeScore * 100, 100)}%`,
                    background: risk.lakeScore > 0.6 ? "#E4572E" : "#2E86AB",
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#5E729A] font-mono">
                <button
                  onClick={onInspectLake}
                  className="text-cyan-400 underline hover:text-cyan-200 cursor-pointer"
                >
                  Inspect Satellite ↗
                </button>
                <span>+{(signalContrib.lake || 0).toFixed(2)}</span>
              </div>
              <div className="text-[11px] text-[#8CA0BE] mt-2">
                {corridor.lakeChange >= 10 ? "Rapid supraglacial melt" : "Seasonal melt pond stable"}
              </div>
            </div>

            {/* 4. Terrain */}
            <div className="p-3.5 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
              <div className="flex items-center justify-between text-xs text-[#8CA0BE] mb-1">
                <span className="flex items-center gap-1">🏔️ Terrain</span>
                <span className="font-mono text-white font-bold">{(corridor.susceptibility * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#2A3B5E] overflow-hidden my-2">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${corridor.susceptibility * 100}%`,
                    background: "#2E86AB",
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#5E729A] font-mono">
                <span>Moraine slope</span>
                <span>+{(signalContrib.terrain || 0).toFixed(2)}</span>
              </div>
              <div className="text-[11px] text-[#8CA0BE] mt-2">
                Steep glacial canyon profile
              </div>
            </div>

            {/* 5. Reports */}
            <div className="p-3.5 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
              <div className="flex items-center justify-between text-xs text-[#8CA0BE] mb-1">
                <span className="flex items-center gap-1">📻 Dispatches</span>
                <span className="font-mono text-white font-bold">{corridor.reports.length}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#2A3B5E] overflow-hidden my-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(risk.reportScore * 100, 100)}%`,
                    background: risk.reportScore > 0.4 ? "#E4572E" : "#2E86AB",
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#5E729A] font-mono">
                <span>Crowd notes</span>
                <span>+{(signalContrib.reports || 0).toFixed(2)}</span>
              </div>
              <div className="text-[11px] text-[#8CA0BE] mt-2">
                {corridor.reports.length > 0 ? "Ground anomalies reported" : "No crowd anomalies"}
              </div>
            </div>
          </div>

          {keyDrivers.length > 0 && (
            <div className="p-3 rounded-lg bg-[#0F1B33] border border-[#2A3B5E] text-xs">
              <span className="font-semibold text-white">Identified Physical Triggers: </span>
              <span className="text-[#8CA0BE]">{keyDrivers.join(" · ")}</span>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Gemini 2.0 Flash AI Intelligence */}
      {activeTab === "gemini" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* English Briefing */}
          <div className="p-4 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                🇬🇧 English Emergency Briefing
              </span>
              <span className="text-[10px] font-mono text-[#5E729A]">Gemini 2.0 Flash</span>
            </div>
            <p className="text-xs text-[#ECF1F6] leading-relaxed">
              {gemini?.briefing_en || "Langtang Valley is experiencing elevated risk. Maintain strict satellite radio monitoring."}
            </p>
            {gemini?.action_directive && (
              <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-300">
                DIRECTIVE: {gemini.action_directive}
              </div>
            )}
          </div>

          {/* Nepali Briefing */}
          <div className="p-4 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                🇳🇵 नेपाली आधिकारिक चेतावनी
              </span>
              <span className="text-[10px] font-mono text-[#5E729A]">स्थानिय भाषा</span>
            </div>
            <p className="text-xs text-[#ECF1F6] leading-relaxed">
              {gemini?.briefing_ne || "जोखिम बढ्दो क्रममा छ, सतर्कता अपनाउनुहोस्।"}
            </p>
          </div>

          {/* SMS Broadcast */}
          <div className="p-4 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                📱 SMS Romanized Broadcast (2G Cell)
              </span>
              <span className="text-[10px] font-mono text-[#5E729A]">160 chars</span>
            </div>
            <div className="p-2.5 rounded bg-black/40 border border-[#2A3B5E] font-mono text-xs text-emerald-400">
              {gemini?.sms_alert_romanized || `HimalSanket: ${corridor.name} ${risk.tier.toUpperCase()} risk. Mausam ra khola herera matra hidnu.`}
            </div>
            <div className="text-[10px] text-[#5E729A] mt-2">
              Broadcastable via NTC/Ncell tower cells during network congestion.
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Downstream Cascade Timeline */}
      {activeTab === "downstream" && (
        <div className="p-4 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Downstream Glacial Floodwave Lag-Time Tracker
            </span>
            <span className="text-[11px] text-[#8CA0BE]">
              Calculated for Langtang Khola → Trisuli River Catchment
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {downstreamCascade.map((step, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-[#2A3B5E] bg-[#16233F] flex flex-col justify-between"
              >
                <div>
                  <div className="text-[10px] font-mono text-cyan-400 font-bold">
                    ⏱️ +{step.arrival_min} MIN
                  </div>
                  <div className="text-xs font-semibold text-white mt-1 leading-snug">
                    {step.station.split(" (")[0]}
                  </div>
                </div>
                <div className="text-[10px] text-[#8CA0BE] mt-2 pt-1 border-t border-[#2A3B5E]">
                  {step.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function RiskDashboard({ onOpenMap }: { onOpenMap?: () => void }) {
  const [corridors, setCorridors] = useState(INITIAL_CORRIDORS as any[]);
  const [selectedId, setSelectedId] = useState(INITIAL_CORRIDORS[0].id);
  const [reportDraftType, setReportDraftType] = useState<string | null>(null);
  const [reportNote, setReportNote] = useState("");
  const [voiceAttached, setVoiceAttached] = useState(false);
  const [pulseId, setPulseId] = useState<string | null>(null);

  // Live Telemetry & Scenario Sensing state
  const [liveData, setLiveData] = useState<LiveTelemetryResponse | null>(null);
  const [activeScenario, setActiveScenario] = useState<string>("baseline");
  const [inspectingLake, setInspectingLake] = useState<any>(null);
  const [isSensingSyncing, setIsSensingSyncing] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Map state
  const [selectedAsset, setSelectedAsset] = useState<MapAsset | null>(null);
  const [waterSurge, setWaterSurge] = useState<number>(0);
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);
  const [activeLayers, setActiveLayers] = useState({
    people: true,
    school: true,
    bridge: true,
    hospital: true,
    hazardZone: true,
  });

  const currentCorridorConfig = useMemo(() => {
    return CORRIDOR_CONFIGS[selectedId] || CORRIDOR_CONFIGS.langtang;
  }, [selectedId]);

  const currentCorridorAllAssets = useMemo(() => {
    return MAP_ASSETS.filter((a) => a.corridorId === selectedId);
  }, [selectedId]);

  const currentCorridorAssets = useMemo(() => {
    return currentCorridorAllAssets.filter((a) => activeLayers[a.type as keyof typeof activeLayers] !== false);
  }, [currentCorridorAllAssets, activeLayers]);

  const getDynamicStatus = useCallback(
    (asset: MapAsset): "safe" | "advisory" | "critical" => {
      if (waterSurge === 0) return asset.status;
      const buffer = asset.hazardThresholdMeters - waterSurge;
      if (buffer <= 0) return "critical";
      if (buffer <= 1.2) return "critical";
      if (buffer <= 2.5) return "advisory";
      return "safe";
    },
    [waterSurge]
  );

  const risks = useMemo(() => {
    const map: Record<string, any> = {};
    corridors.forEach((c) => { map[c.id] = computeRisk(c); });
    return map;
  }, [corridors]);

  const selected = corridors.find((c) => c.id === selectedId) || corridors[0] || INITIAL_CORRIDORS[0];
  const selectedRisk = risks[selected.id] || computeRisk(selected);
  const briefing = useMemo(() => generateBriefing(selected, selectedRisk), [selected, selectedRisk]);

  // Sync real-time sensed telemetry from the backend
  const syncLiveTelemetry = useCallback(async (corridorId: string) => {
    setIsSensingSyncing(true);
    try {
      const data = await fetchLiveTelemetry(corridorId);
      setLiveData(data);
      setLastSynced(new Date());
      if (data.active_scenario) {
        setActiveScenario(data.active_scenario);
      }
      setCorridors((prev) =>
        prev.map((c) =>
          c.id === corridorId
            ? {
                ...c,
                rainfall: data.corridor.rainfall,
                seismic: data.corridor.seismic_activity,
                lakeChange: data.corridor.lake_area_change,
                reports: data.corridor.reports?.length ? data.corridor.reports : c.reports,
              }
            : c
        )
      );
    } catch (err) {
      console.warn("Live telemetry sync (offline fallback in use):", err);
    } finally {
      setIsSensingSyncing(false);
    }
  }, []);

  // Trigger presentation disaster scenarios
  const handleTriggerScenario = useCallback(
    async (scenarioId: string) => {
      setActiveScenario(scenarioId);
      try {
        await triggerPresentationScenario(scenarioId, selectedId);
        await syncLiveTelemetry(selectedId);
      } catch (err) {
        console.warn("Trigger scenario fallback:", err);
      }

      // Automatically adjust simulated water rise buffer
      if (scenarioId === "cloudburst_spike") {
        setWaterSurge(2.5);
      } else if (scenarioId === "glof_lake_expansion") {
        setWaterSurge(1.5);
      } else if (scenarioId === "critical_cascade") {
        setWaterSurge(3.5);
      } else if (scenarioId === "seismic_tremor") {
        setWaterSurge(1.0);
      } else {
        setWaterSurge(0);
      }

      setPulseId(selectedId);
      setTimeout(() => setPulseId(null), 900);
    },
    [selectedId, syncLiveTelemetry]
  );

  useEffect(() => {
    syncLiveTelemetry(selectedId);
  }, [selectedId, syncLiveTelemetry]);

  const simulateSpike = useCallback((id: string) => {
    setCorridors((prev) => prev.map((c) => (c.id === id ? { ...c, rainfall: Math.min(c.rainfall + 65, 220), lakeChange: c.lakeChange + 6, seismic: c.seismic + 1.6 } : c)));
    setWaterSurge(2.0);
    setPulseId(id);
    setTimeout(() => setPulseId(null), 900);
  }, []);

  const resetCorridor = useCallback((id: string) => {
    const base = INITIAL_CORRIDORS.find((c) => c.id === id)!;
    setCorridors((prev) => prev.map((c) => (c.id === id ? { ...base, reports: c.reports } : c)));
    setWaterSurge(0);
    setSelectedAsset(null);
    handleTriggerScenario("baseline");
  }, [handleTriggerScenario]);

  const submitReport = useCallback(() => {
    if (!reportDraftType) return;
    const label = REPORT_TYPES.find((t) => t.id === reportDraftType)?.label;
    setCorridors((prev) => prev.map((c) => (c.id === selectedId
      ? { ...c, reports: [{ id: Date.now(), label, note: reportNote, voice: voiceAttached, time: new Date() }, ...c.reports] }
      : c)));
    setReportDraftType(null);
    setReportNote("");
    setVoiceAttached(false);
  }, [reportDraftType, reportNote, voiceAttached, selectedId]);

  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-72 shrink-0 flex flex-col" style={{ borderRight: `1px solid ${C.border}` }}>
        <div className="flex-1 overflow-y-auto py-2">
          {corridors.map((c) => {
            const r = risks[c.id];
            const t = TIER[r.tier];
            const active = c.id === selectedId;
            return (
              <button key={c.id} onClick={() => { setSelectedId(c.id); setSelectedAsset(null); }} className="w-full text-left px-5 py-3 flex items-center justify-between hover:bg-[#16233F]/50 transition-colors cursor-pointer" style={{ background: active ? C.panel : "transparent" }}>
                <div>
                  <div className="text-sm" style={{ color: C.text, fontWeight: active ? 600 : 400 }}>{c.name}</div>
                  <div className="text-xs" style={{ color: C.mutedDim }}>{c.region}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full transition-transform" style={{ background: `${t.color}22`, color: t.color, border: `1px solid ${t.color}55`, transform: pulseId === c.id ? "scale(1.12)" : "scale(1)" }}>{t.label}</span>
              </button>
            );
          })}
        </div>
        <div className="px-5 py-4 text-xs flex items-center gap-2" style={{ color: C.muted, borderTop: `1px solid ${C.border}` }}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
          <span>Live Telemetry Feeds Active</span>
        </div>
      </div>

      <div className="flex-1 px-8 py-7 overflow-y-auto">
        {/* Live Continuous Sensing & Presentation Scenario Toolbar */}
        <div className="mb-6 p-4 rounded-xl border border-[#2A3B5E] bg-[#16233F]/90 backdrop-blur-sm shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#2A3B5E]/60">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">Live Continuous Sensing Active</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Backend Online</span>
                </div>
                <div className="text-[11px] text-[#8CA0BE]">
                  Pulls USGS Seismic GeoJSON, Open-Meteo Precipitation, Sentinel-2 NDWI Lake Analysis &amp; DHM Gauges
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => syncLiveTelemetry(selectedId)}
                disabled={isSensingSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#2A3B5E] bg-[#1C2C4C] hover:bg-[#2A3B5E] text-[#ECF1F6] transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSensingSyncing ? 'animate-spin text-[#2E86AB]' : 'text-[#8CA0BE]'}`} />
                <span>{isSensingSyncing ? 'Polling Sensors...' : 'Sync Live Feeds'}</span>
              </button>

              {lastSynced && (
                <span className="text-[11px] font-mono text-[#5E729A]">
                  Synced {lastSynced.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* 1-Click Presentation Scenario Triggers */}
          <div className="pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8CA0BE] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E4572E]" />
                1-Click Presentation Scenarios (For Live Demo &amp; Judging)
              </span>
              <span className="text-[11px] text-[#5E729A]">
                Scenario: <strong className="text-white capitalize">{activeScenario.replace(/_/g, ' ')}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {/* 1. Baseline */}
              <button
                onClick={() => handleTriggerScenario("baseline")}
                className={`px-3 py-2 rounded-lg text-left text-xs border transition-all cursor-pointer ${
                  activeScenario === "baseline"
                    ? "bg-[#2E86AB]/20 border-[#2E86AB] text-white shadow-md shadow-[#2E86AB]/10"
                    : "bg-[#1C2C4C] border-[#2A3B5E] text-[#8CA0BE] hover:text-white hover:border-[#2E86AB]/50"
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5 text-white">
                  <span>🔄</span> Baseline Normal
                </div>
                <div className="text-[10px] text-[#8CA0BE] mt-0.5">All signals normal</div>
              </button>

              {/* 2. Cloudburst Spike */}
              <button
                onClick={() => handleTriggerScenario("cloudburst_spike")}
                className={`px-3 py-2 rounded-lg text-left text-xs border transition-all cursor-pointer ${
                  activeScenario === "cloudburst_spike"
                    ? "bg-[#E4572E]/20 border-[#E4572E] text-white shadow-md shadow-[#E4572E]/10"
                    : "bg-[#1C2C4C] border-[#2A3B5E] text-[#8CA0BE] hover:text-white hover:border-[#E4572E]/50"
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5 text-white">
                  <span>🌧️</span> Cloudburst Spike
                </div>
                <div className="text-[10px] text-[#8CA0BE] mt-0.5">Rain surges to 118mm (82%)</div>
              </button>

              {/* 3. Seismic Tremor */}
              <button
                onClick={() => handleTriggerScenario("seismic_tremor")}
                className={`px-3 py-2 rounded-lg text-left text-xs border transition-all cursor-pointer ${
                  activeScenario === "seismic_tremor"
                    ? "bg-[#C9A227]/20 border-[#C9A227] text-white shadow-md shadow-[#C9A227]/10"
                    : "bg-[#1C2C4C] border-[#2A3B5E] text-[#8CA0BE] hover:text-white hover:border-[#C9A227]/50"
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5 text-white">
                  <span>⚡</span> USGS 3.6M Tremor
                </div>
                <div className="text-[10px] text-[#8CA0BE] mt-0.5">Shallow shockwaves &amp; rockfall</div>
              </button>

              {/* 4. Sentinel-2 GLOF Surge */}
              <button
                onClick={() => handleTriggerScenario("glof_lake_expansion")}
                className={`px-3 py-2 rounded-lg text-left text-xs border transition-all cursor-pointer ${
                  activeScenario === "glof_lake_expansion"
                    ? "bg-[#2E86AB]/30 border-[#2E86AB] text-cyan-200 shadow-md shadow-[#2E86AB]/20"
                    : "bg-[#1C2C4C] border-[#2A3B5E] text-[#8CA0BE] hover:text-white hover:border-cyan-400/50"
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5 text-white">
                  <span>🛰️</span> Sentinel-2 (+14.8%)
                </div>
                <div className="text-[10px] text-[#8CA0BE] mt-0.5">Upper Moraine Lake expands</div>
              </button>

              {/* 5. Catastrophic Cascade */}
              <button
                onClick={() => handleTriggerScenario("critical_cascade")}
                className={`px-3 py-2 rounded-lg text-left text-xs border transition-all cursor-pointer ${
                  activeScenario === "critical_cascade"
                    ? "bg-[#9B2C22]/30 border-[#9B2C22] text-rose-200 shadow-md shadow-[#9B2C22]/20"
                    : "bg-[#1C2C4C] border-[#2A3B5E] text-[#8CA0BE] hover:text-white hover:border-[#9B2C22]/50"
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5 text-white">
                  <span>🚨</span> Critical Cascade
                </div>
                <div className="text-[10px] text-[#8CA0BE] mt-0.5">Acute multi-hazard cascade</div>
              </button>
            </div>
          </div>
        </div>

        {/* Corridor header & Action Buttons */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-xs mb-1" style={{ color: C.mutedDim }}>{selected.region}</div>
            <h1 className="text-2xl" style={{ color: C.text, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700 }}>{selected.name}</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => simulateSpike(selected.id)} className="text-sm px-3 py-2 rounded font-medium cursor-pointer hover:opacity-90 transition-opacity" style={{ background: C.orange, color: "#fff" }}>Simulate rainfall spike</button>
            <button onClick={() => resetCorridor(selected.id)} className="text-sm px-3 py-2 rounded cursor-pointer hover:bg-white/5 transition-colors" style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}>Reset signals</button>
          </div>
        </div>

        {/* Side-by-side section: Live Signals on LEFT, Map on RIGHT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6 items-stretch">
          {/* Left Column: Live signals */}
          <div className="lg:col-span-4 p-5 rounded-xl flex flex-col justify-between" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.mutedDim }}>Live signals</div>
                <span className="text-[11px] px-2 py-0.5 rounded font-semibold" style={{ background: `${TIER[selectedRisk.tier].color}20`, color: TIER[selectedRisk.tier].color, border: `1px solid ${TIER[selectedRisk.tier].color}40` }}>
                  {TIER[selectedRisk.tier].label}
                </span>
              </div>
              <div className="space-y-1">
                <StatRow label="Rainfall" value={selected.rainfall} unit=" mm/24h" fraction={selectedRisk.rainScore} />
                <StatRow label="Seismic activity" value={selected.seismic.toFixed(1)} unit=" M nearby" fraction={selectedRisk.seismicScore} />
                <div className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <span className="text-sm flex items-center gap-1.5" style={{ color: C.muted }}>
                    Lake area change
                    <button
                      onClick={() => {
                        const lake = liveData?.sentinel_satellite_lake || (CORRIDOR_SENTINEL_LAKES as any)[selectedId];
                        setInspectingLake(lake);
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#2E86AB]/20 text-cyan-300 border border-[#2E86AB]/40 hover:bg-[#2E86AB]/40 cursor-pointer transition-colors"
                      title="Inspect Sentinel-2 satellite imagery & NDWI water mask"
                    >
                      Inspect 🛰️
                    </button>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-cyan-300">+{selected.lakeChange}%</span>
                    <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ background: C.border }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(selectedRisk.lakeScore, 1) * 100}%`, background: selectedRisk.lakeScore > 0.6 ? C.orange : C.teal }} />
                    </div>
                  </div>
                </div>
                <StatRow label="Terrain susceptibility" value={(selected.susceptibility * 100).toFixed(0)} unit="/100" fraction={selected.susceptibility} />
                <StatRow label="Ground reports" value={selected.reports.length} unit="" fraction={selectedRisk.reportScore} />
              </div>
            </div>

            <div className="mt-5 p-3.5 rounded-lg text-center" style={{ background: `${TIER[selectedRisk.tier].color}18`, border: `1px solid ${TIER[selectedRisk.tier].color}55` }}>
              <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: C.mutedDim }}>Fused risk tier</div>
              <div className="text-xl" style={{ color: TIER[selectedRisk.tier].color, fontWeight: 700 }}>{TIER[selectedRisk.tier].label}</div>
            </div>
          </div>

          {/* Right Column: Corridor Hazard Map */}
          <div className="lg:col-span-8 p-4 rounded-xl flex flex-col justify-between" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.mutedDim }}>
                  Corridor hazard map
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: `${TIER[selectedRisk.tier].color}20`, color: TIER[selectedRisk.tier].color, border: `1px solid ${TIER[selectedRisk.tier].color}40` }}>
                  {selected.name}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs">
                {/* Risk Legend */}
                <div className="flex items-center gap-2.5" style={{ color: C.muted }}>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.teal }}></span> Low</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.amber }}></span> Mod</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.orange }}></span> High</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.red }}></span> Crit</span>
                </div>

                {/* Surge Slider */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#2A3B5E]" style={{ background: C.bg }}>
                  <SlidersHorizontal className="w-3 h-3" style={{ color: C.orange }} />
                  <span className="text-[11px]" style={{ color: C.muted }}>Surge:</span>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={waterSurge}
                    onChange={(e) => setWaterSurge(parseFloat(e.target.value))}
                    className="w-14 accent-[#E4572E] cursor-pointer"
                  />
                  <span className="font-mono text-[11px] font-bold" style={{ color: waterSurge > 0 ? C.orange : C.muted }}>
                    +{waterSurge.toFixed(1)}m
                  </span>
                </div>

                {/* Expand Toggle */}
                <button
                  onClick={() => setIsMapExpanded((prev) => !prev)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-[#2A3B5E] hover:border-white/30 transition-colors cursor-pointer"
                  style={{ background: C.panelAlt, color: C.muted }}
                  title={isMapExpanded ? "Compact map view" : "Expand map view"}
                >
                  {isMapExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Layer Filter Pills */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5 pb-2 border-b border-[#2A3B5E]/50">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-[#5E729A] uppercase tracking-wider mr-1">Filter:</span>
                <button
                  onClick={() => setActiveLayers((p) => ({ ...p, people: !p.people }))}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                    activeLayers.people ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-transparent text-[#5E729A] border-[#2A3B5E]"
                  }`}
                >
                  <Users className="w-3 h-3" /> Settlements ({currentCorridorAllAssets.filter((a) => a.type === "people").length})
                </button>
                <button
                  onClick={() => setActiveLayers((p) => ({ ...p, bridge: !p.bridge }))}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                    activeLayers.bridge ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-transparent text-[#5E729A] border-[#2A3B5E]"
                  }`}
                >
                  <Route className="w-3 h-3" /> Bridges ({currentCorridorAllAssets.filter((a) => a.type === "bridge").length})
                </button>
                <button
                  onClick={() => setActiveLayers((p) => ({ ...p, school: !p.school }))}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                    activeLayers.school ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-transparent text-[#5E729A] border-[#2A3B5E]"
                  }`}
                >
                  <GraduationCap className="w-3 h-3" /> Schools ({currentCorridorAllAssets.filter((a) => a.type === "school").length})
                </button>
                <button
                  onClick={() => setActiveLayers((p) => ({ ...p, hospital: !p.hospital }))}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                    activeLayers.hospital ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-transparent text-[#5E729A] border-[#2A3B5E]"
                  }`}
                >
                  <HeartPulse className="w-3 h-3" /> Clinics ({currentCorridorAllAssets.filter((a) => a.type === "hospital").length})
                </button>
              </div>
            </div>

            {/* Interactive Map Canvas */}
            <div className={`relative w-full rounded-lg overflow-hidden border border-[#2A3B5E] ${isMapExpanded ? "h-[540px]" : "h-[340px]"} transition-all duration-300`}>
              <LeafletHazardMap
                corridor={currentCorridorConfig}
                assets={currentCorridorAssets}
                selectedAsset={selectedAsset}
                onSelectAsset={setSelectedAsset}
                activeLayers={activeLayers}
                simulatedWaterRise={waterSurge}
                getDynamicStatus={getDynamicStatus}
                seismicMagnitude={liveData?.seismic_waveform?.magnitude ?? selected.seismic}
                seismicEpicenter={liveData?.seismic_waveform?.epicenter ?? { lat: 28.2250, lng: 85.4800, label: "Langtang Gorge Tremor", depth_km: 10 }}
                lakeAreaChangePct={liveData?.corridor?.lake_area_change ?? selected.lakeChange}
                onInspectSentinelLake={() => {
                  const lake = liveData?.sentinel_satellite_lake || (CORRIDOR_SENTINEL_LAKES as any)[selectedId];
                  setInspectingLake(lake);
                }}
                className="h-full w-full"
              />

              {/* Selected Asset Float Inspector Overlay */}
              {selectedAsset && (
                <div className="absolute bottom-3 left-3 z-[1000] w-64 sm:w-72 p-3 rounded-xl border border-[#2A3B5E] shadow-2xl backdrop-blur-md bg-[#16233F]/95 text-xs animate-in fade-in duration-200">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#8CA0BE]">
                        {selectedAsset.type}
                      </span>
                      <h4 className="font-bold text-white text-sm leading-tight">{selectedAsset.name}</h4>
                    </div>
                    <button onClick={() => setSelectedAsset(null)} className="text-[#8CA0BE] hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mb-1.5 py-0.5 px-1.5 rounded font-semibold text-[10px]" style={{
                    background: getDynamicStatus(selectedAsset) === "critical" ? `${C.red}33` : getDynamicStatus(selectedAsset) === "advisory" ? `${C.amber}33` : `${C.teal}33`,
                    color: getDynamicStatus(selectedAsset) === "critical" ? "#ff9f8f" : getDynamicStatus(selectedAsset) === "advisory" ? "#ffd271" : "#74d2fc",
                    border: `1px solid ${getDynamicStatus(selectedAsset) === "critical" ? C.red : getDynamicStatus(selectedAsset) === "advisory" ? C.amber : C.teal}66`,
                  }}>
                    <span className="flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> Status: {getDynamicStatus(selectedAsset).toUpperCase()}</span>
                    <span>{selectedAsset.elevation}m ASL</span>
                  </div>

                  <p className="text-[#8CA0BE] text-[11px] leading-relaxed mb-1.5 line-clamp-2">{selectedAsset.description}</p>
                  <div className="text-[10px] font-mono text-[#5E729A] flex justify-between border-t border-[#2A3B5E] pt-1">
                    <span>GPS: {selectedAsset.gps}</span>
                    <span>Threshold: +{selectedAsset.hazardThresholdMeters}m</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 text-[11px] flex items-center justify-between flex-wrap gap-2" style={{ color: C.mutedDim }}>
              <span>Center: {currentCorridorConfig.centerName} ({selected.region})</span>
              <span>Click markers for threshold inspection</span>
            </div>
          </div>
        </div>

        {/* Which Region is Affected & WHY: Multi-Hazard Physical Root Cause Analysis */}
        <WhyRegionAffectedCard
          corridor={selected}
          risk={selectedRisk}
          liveData={liveData}
          onInspectLake={() => {
            const lake = liveData?.sentinel_satellite_lake || (CORRIDOR_SENTINEL_LAKES as any)[selectedId];
            setInspectingLake(lake);
          }}
        />

        {/* Gemini Reasoning & Ground Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="p-4 rounded-xl" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Gemini 2.0 Flash Reasoning Layer
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                {liveData?.gemini_intelligence?.model_used || "Google Gemini 2.0 Flash"}
              </span>
            </div>
            <p className="text-sm mb-3 text-white leading-relaxed">
              {liveData?.gemini_intelligence?.briefing_en || briefing.en}
            </p>
            <p className="text-xs text-[#8CA0BE] leading-relaxed">
              {liveData?.gemini_intelligence?.briefing_ne || briefing.ne}
            </p>
            {liveData?.gemini_intelligence?.action_directive && (
              <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                <span>⚡ ACTION DIRECTIVE:</span>
                <span>{liveData.gemini_intelligence.action_directive}</span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="text-xs mb-3 font-semibold uppercase tracking-wider" style={{ color: C.mutedDim }}>Submit a ground report</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {REPORT_TYPES.map((t) => (
                <button key={t.id} onClick={() => setReportDraftType(t.id)} className="text-sm px-3 py-1.5 rounded cursor-pointer transition-colors" style={{ background: reportDraftType === t.id ? C.teal : "transparent", color: reportDraftType === t.id ? "#fff" : C.muted, border: `1px solid ${reportDraftType === t.id ? C.teal : C.border}` }}>{t.label}</button>
              ))}
            </div>
            <textarea value={reportNote} onChange={(e) => setReportNote(e.target.value)} placeholder="Optional note (what did you see?) — useful when typing isn't practical" className="w-full text-sm p-2 rounded mb-3 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, resize: "none" }} rows={2} />
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={submitReport} disabled={!reportDraftType} className="text-sm font-medium px-4 py-2 rounded transition-opacity cursor-pointer disabled:cursor-not-allowed" style={{ background: reportDraftType ? C.orange : C.border, color: reportDraftType ? "#fff" : C.mutedDim, opacity: reportDraftType ? 1 : 0.5 }}>Submit report</button>
              <button onClick={() => setVoiceAttached((v) => !v)} className="text-sm px-3 py-2 rounded flex items-center gap-2 cursor-pointer transition-colors" style={{ background: voiceAttached ? `${C.teal}22` : "transparent", color: voiceAttached ? C.teal : C.muted, border: `1px solid ${voiceAttached ? C.teal : C.border}` }}>
                <span style={{ fontSize: "0.9em" }}>{voiceAttached ? "●" : "○"}</span>
                {voiceAttached ? "Voice note attached" : "Attach voice note"}
              </button>
              <span className="text-xs" style={{ color: C.mutedDim }}>for local dialects, low literacy</span>
            </div>
            {selected.reports.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {selected.reports.map((r: any) => (
                  <div key={r.id} className="text-xs p-2 rounded flex justify-between items-center" style={{ background: C.panelAlt, color: C.muted }}>
                    <span>
                      <strong style={{ color: C.text }}>{r.label || "Ground Report"}</strong>
                      {r.note ? ` — ${r.note}` : ""}
                      {(r.voice || r.voice_attached) ? <span style={{ color: C.teal }}> · voice note</span> : ""}
                    </span>
                    <span style={{ color: C.mutedDim }} className="font-mono text-[10px]">
                      {r.time
                        ? r.time instanceof Date
                          ? r.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : new Date(r.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "Field dispatch"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sentinel-2 Satellite Inspector Modal */}
        {inspectingLake && (
          <SentinelLakeModal
            lake={inspectingLake}
            onClose={() => setInspectingLake(null)}
          />
        )}
      </div>
    </div>
  );
}

function SearchPriorityPanel({ searchItems, addFamilyReport }: { searchItems: any[]; addFamilyReport: (r: any) => void }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [buildingType, setBuildingType] = useState(BUILDING_TYPES[0].id);
  const [condition, setCondition] = useState(CONDITIONS[2].id);
  const [daysSinceContact, setDaysSinceContact] = useState<number | string>(1);

  const submit = useCallback(() => {
    if (!name.trim() || !location.trim()) return;
    addFamilyReport({ name, location, buildingType, condition, daysSinceContact: Number(daysSinceContact) });
    setName(""); setLocation(""); setDaysSinceContact(1);
  }, [name, location, buildingType, condition, daysSinceContact, addFamilyReport]);

  const sorted = useMemo(() => [...searchItems].sort((a, b) => b.priority - a.priority), [searchItems]);

  return (
    <div className="flex-1 px-8 py-7 overflow-y-auto">
      <div className="mb-5 p-4 rounded" style={{ background: `${C.amber}18`, border: `1px solid ${C.amber}55` }}>
        <div className="text-sm leading-relaxed" style={{ color: C.text }}>
          <strong>Phase 2 concept — not part of the hackathon MVP.</strong> On Sept 5, 2026, a 60-year-old woman was rescued alive
          after 11 days trapped beneath a collapsed building in Betrawati, Nuwakot — found by Armed Police Force sniffer-dog teams
          searching largely undirected terrain. This panel does not replace that work. It shows how family reports and direct SOS
          signals could help direct search teams toward the highest-priority sites sooner.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="col-span-1 p-4 rounded" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-xs mb-3 font-medium uppercase tracking-wider" style={{ color: C.mutedDim }}>Family: report a missing person</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full text-sm p-2 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }} />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Last known location (village / landmark)" className="w-full text-sm p-2 rounded mb-3 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }} />

          <div className="text-xs mb-1 font-medium" style={{ color: C.mutedDim }}>Building type</div>
          <div className="flex flex-col gap-1 mb-3">
            {BUILDING_TYPES.map((b) => (
              <button key={b.id} onClick={() => setBuildingType(b.id)} className="text-sm px-3 py-1.5 rounded text-left cursor-pointer transition-colors" style={{ background: buildingType === b.id ? C.teal : "transparent", color: buildingType === b.id ? "#fff" : C.muted, border: `1px solid ${buildingType === b.id ? C.teal : C.border}` }}>{b.label}</button>
            ))}
          </div>

          <div className="text-xs mb-1 font-medium" style={{ color: C.mutedDim }}>Reported condition</div>
          <div className="flex flex-col gap-1 mb-3">
            {CONDITIONS.map((cnd) => (
              <button key={cnd.id} onClick={() => setCondition(cnd.id)} className="text-sm px-3 py-1.5 rounded text-left cursor-pointer transition-colors" style={{ background: condition === cnd.id ? C.orange : "transparent", color: condition === cnd.id ? "#fff" : C.muted, border: `1px solid ${condition === cnd.id ? C.orange : C.border}` }}>{cnd.label}</button>
            ))}
          </div>

          <div className="text-xs mb-1 font-medium" style={{ color: C.mutedDim }}>Days since last contact</div>
          <input type="number" min="0" value={daysSinceContact} onChange={(e) => setDaysSinceContact(e.target.value)} className="w-full text-sm p-2 rounded mb-3 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }} />

          <button onClick={submit} className="text-sm px-4 py-2 rounded font-medium cursor-pointer hover:opacity-90 transition-opacity" style={{ background: C.orange, color: "#fff" }}>Add to search list</button>
        </div>

        <div className="col-span-1 lg:col-span-2 p-4 rounded" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-xs mb-3 font-medium uppercase tracking-wider" style={{ color: C.mutedDim }}>Prioritized search list ({sorted.length})</div>
          {sorted.length === 0 && <div className="text-sm" style={{ color: C.mutedDim }}>No reports yet — add one, or send an SOS from the beacon tab, to see it prioritized.</div>}
          <div className="flex flex-col gap-2">
            {sorted.map((r) => {
              const band = priorityBand(r.priority);
              return (
                <div key={r.id} className="p-3 rounded flex items-center justify-between" style={{ background: C.panelAlt, border: r.source === "sos" ? `1px solid ${C.red}55` : "1px solid transparent" }}>
                  <div>
                    <div className="text-sm flex items-center gap-2" style={{ color: C.text, fontWeight: 600 }}>
                      {r.name}
                      {r.source === "sos" && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${C.red}30`, color: "#ff9f8f" }}>Direct SOS</span>}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: C.mutedDim }}>{r.detail}</div>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full shrink-0 ml-3" style={{ background: `${band.color}22`, color: band.color, border: `1px solid ${band.color}55` }}>{band.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SOSBeaconPanel({ addSOSReport }: { addSOSReport: (r: any) => void }) {
  const [corridorId, setCorridorId] = useState(INITIAL_CORRIDORS[0].id);
  const [transcript, setTranscript] = useState("");
  const [photoAttached, setPhotoAttached] = useState(false);
  const [signal, setSignal] = useState("weak");
  const [log, setLog] = useState<string[]>([]);

  const corridor = INITIAL_CORRIDORS.find((c) => c.id === corridorId)!;

  const send = useCallback(() => {
    const time = new Date().toLocaleTimeString();
    const entries = [];
    
    entries.push(`[${time}] GPS ping (${corridor.gps}) — sent`);
    if (signal === "none") {
      entries.push(`[${time}] No signal — voice note and photo queued locally, will retry automatically`);
    } else if (signal === "weak") {
      entries.push(`[${time}] Weak signal — location delivered. Voice note and photo still queued, sending when signal improves`);
    } else {
      if (transcript.trim()) entries.push(`[${time}] Voice note delivered (${transcript.trim().split(/\s+/).length} words)`);
      if (photoAttached) entries.push(`[${time}] Photo delivered`);
    }
    setLog((prev) => [...entries, ...prev]);

    const severityHit = SEVERITY_KEYWORDS.some((k) => transcript.toLowerCase().includes(k));
    const gotFullPayload = signal === "strong";
    let priority = 75; // direct SOS always outranks family reports
    if (severityHit) priority += 15;
    if (!gotFullPayload) priority -= 10; 
    priority = Math.min(priority, 100);

    const detailParts = [`GPS: ${corridor.gps}`];
    detailParts.push(gotFullPayload ? "full report received" : signal === "weak" ? "location only — media queued" : "no data received yet, retrying");
    if (gotFullPayload && transcript.trim()) detailParts.push(`"${transcript.trim().slice(0, 60)}${transcript.trim().length > 60 ? "…" : ""}"`);

    addSOSReport({ name: `SOS — ${corridor.name}`, detail: detailParts.join(" · "), priority });
  }, [corridor, transcript, photoAttached, signal, addSOSReport]);

  return (
    <div className="flex-1 px-8 py-7 overflow-y-auto">
      <div className="mb-5 p-4 rounded" style={{ background: `${C.red}18`, border: `1px solid ${C.red}55` }}>
        <div className="text-sm leading-relaxed" style={{ color: C.text }}>
          <strong>Victim self-report — Phase 2 concept.</strong> Designed for the moment right after a collapse or flood, while
          someone is still conscious and has a few seconds of signal. Location is sent first, as the smallest possible payload —
          voice and photo follow only if the connection allows. If the phone dies before anything sends, this tool has nothing to
          offer; it only helps once at least one signal gets through.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-xs mb-2 font-medium" style={{ color: C.mutedDim }}>Simulated location context</div>
          <select value={corridorId} onChange={(e) => setCorridorId(e.target.value)} className="w-full text-sm p-2 rounded mb-4 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }}>
            {INITIAL_CORRIDORS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="text-xs mb-2 font-medium" style={{ color: C.mutedDim }}>Voice note (type what you'd say — stands in for a recording)</div>
          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="e.g. I'm trapped on the second floor, my leg is stuck, there are two of us" className="w-full text-sm p-2 rounded mb-4 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, resize: "none" }} rows={3} />

          <button onClick={() => setPhotoAttached((v) => !v)} className="text-sm px-3 py-2 rounded mb-4 cursor-pointer transition-colors" style={{ background: photoAttached ? `${C.teal}22` : "transparent", color: photoAttached ? C.teal : C.muted, border: `1px solid ${photoAttached ? C.teal : C.border}` }}>
            {photoAttached ? "● Photo attached" : "○ Attach photo of surroundings"}
          </button>

          <div className="text-xs mb-2 font-medium" style={{ color: C.mutedDim }}>Simulated signal strength</div>
          <div className="flex gap-2 mb-5">
            {SIGNAL_LEVELS.map((s) => (
              <button key={s.id} onClick={() => setSignal(s.id)} className="text-sm px-3 py-1.5 rounded cursor-pointer transition-colors" style={{ background: signal === s.id ? C.orange : "transparent", color: signal === s.id ? "#fff" : C.muted, border: `1px solid ${signal === s.id ? C.orange : C.border}` }}>{s.label}</button>
            ))}
          </div>

          <button onClick={send} className="w-full text-base font-semibold px-4 py-3 rounded cursor-pointer hover:opacity-90 transition-opacity" style={{ background: C.red, color: "#fff" }}>Send SOS</button>
        </div>

        <div className="p-5 rounded" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-xs mb-3 font-medium uppercase tracking-wider" style={{ color: C.mutedDim }}>Transmission log</div>
          {log.length === 0 && <div className="text-sm" style={{ color: C.mutedDim }}>No SOS sent yet.</div>}
          <div className="flex flex-col gap-2">
            {log.map((entry, i) => (
              <div key={i} className="text-xs p-2 rounded font-mono" style={{ background: C.panelAlt, color: C.muted }}>{entry}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("risk");
  const [searchItems, setSearchItems] = useState<any[]>([]);

  const addFamilyReport = useCallback((r: any) => {
    const bw = BUILDING_TYPES.find((b) => b.id === r.buildingType)!.weight;
    const cw = CONDITIONS.find((c) => c.id === r.condition)!.weight;
    const dayScore = Math.min(r.daysSinceContact * 3, 24);
    const priority = Math.min(bw + cw + dayScore, 100);
    setSearchItems((prev) => [{
      id: Date.now(),
      source: "family",
      name: r.name,
      detail: `${r.location} · ${BUILDING_TYPES.find((b) => b.id === r.buildingType)!.label} · ${CONDITIONS.find((c) => c.id === r.condition)!.label} · ${r.daysSinceContact}d since contact`,
      priority,
    }, ...prev]);
  }, []);

  const addSOSReport = useCallback((r: any) => {
    setSearchItems((prev) => [{ id: Date.now(), source: "sos", name: r.name, detail: r.detail, priority: r.priority }, ...prev]);
  }, []);

  return (
    <div className="w-full min-h-screen flex flex-col" style={{ background: C.bg, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}>
      <div className="px-5 pt-6 pb-0 flex items-end justify-between flex-wrap gap-2" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <div className="text-xl" style={{ color: C.text, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700 }}>HimalSanket</div>
          <div className="text-xs mt-1 mb-3" style={{ color: C.mutedDim }}>Corridor risk monitor</div>
        </div>
        <div className="flex">
          <TabButton active={tab === "risk"} onClick={() => setTab("risk")}>Corridor Risk Dashboard</TabButton>
          <TabButton active={tab === "search"} onClick={() => setTab("search")}>Search &amp; Rescue Priority</TabButton>
          <TabButton active={tab === "sos"} onClick={() => setTab("sos")}>SOS Beacon (victim view)</TabButton>
        </div>
      </div>

      {tab === "risk" && <RiskDashboard />}
      {tab === "search" && <SearchPriorityPanel searchItems={searchItems} addFamilyReport={addFamilyReport} />}
      {tab === "sos" && <SOSBeaconPanel addSOSReport={addSOSReport} />}

      {/* Floating Gemini Chatbot on Bottom Right Corner */}
      <GeminiChatbot />
    </div>
  );
}
