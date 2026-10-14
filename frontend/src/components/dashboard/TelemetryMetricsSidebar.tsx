import React from "react";
import {
  ShieldAlert,
  Activity,
  Waves,
  Plane,
  RefreshCw,
  AlertTriangle,
  FileText,
  Satellite,
  BarChart3,
  TrendingDown,
  Radio,
  Sparkles,
  SlidersHorizontal,
  Compass,
} from "lucide-react";

interface TelemetryMetricsSidebarProps {
  corridor: any;
  risk: {
    score: number;
    tier: "Low" | "Moderate" | "High" | "Critical";
    rainScore?: number;
    seismicScore?: number;
    lakeScore?: number;
    reportScore?: number;
  };
  liveData?: any;
  activeScenario?: string;
  onTriggerScenario?: (scenarioId: string) => Promise<void> | void;
  waterSurge?: number;
  onSurgeChange?: (surge: number) => void;
  isSensingSyncing?: boolean;
  onSyncTelemetry?: () => void;
  forwardBases?: any[];
  onInspectLake?: () => void;
  onInspectProfile?: () => void;
  onInspectTimesfm?: () => void;
  onOpenSitrep?: () => void;
  onBroadcastAdvisory?: () => void;
  role?: "admin" | "rescuer" | "civilian";
  className?: string;
}

const TIER_STYLES = {
  Low: {
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    gauge: "#10B981",
    label: "LOW RISK",
    subtext: "Hydrological & Seismic telemetry within nominal safety envelopes.",
  },
  Moderate: {
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    gauge: "#F59E0B",
    label: "MODERATE",
    subtext: "Elevated monsoon runoff detected. Helipads on standby.",
  },
  High: {
    badge: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    gauge: "#F97316",
    label: "HIGH RISK",
    subtext: "Heavy precipitation & moraine dam destabilization warning.",
  },
  Critical: {
    badge: "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse",
    gauge: "#F43F5E",
    label: "CRITICAL THREAT",
    subtext: "GLOF Outburst / debris torrent surge imminent. Immediate evacuation active.",
  },
};

export function TelemetryMetricsSidebar({
  corridor,
  risk,
  liveData,
  activeScenario = "baseline",
  onTriggerScenario,
  waterSurge = 0,
  onSurgeChange,
  isSensingSyncing = false,
  onSyncTelemetry,
  forwardBases = [],
  onInspectLake,
  onInspectProfile,
  onInspectTimesfm,
  onOpenSitrep,
  onBroadcastAdvisory,
  role = "admin",
  className = "",
}: TelemetryMetricsSidebarProps) {
  const tierConfig = TIER_STYLES[risk.tier] || TIER_STYLES.Low;
  const scorePercent = Math.min(100, Math.round(risk.score * 100));

  // Circular gauge calculations (circumference = 2 * PI * r)
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scorePercent / 100) * circumference;

  // Rainfall progress
  const rainThreshold = corridor.rainThreshold || 144;
  const rainPercent = Math.min(100, Math.round(((corridor.rainfall || 0) / rainThreshold) * 100));

  // Seismic progress (normalized to 5.0 magnitude)
  const seismicMag = corridor.seismic || 0.8;
  const seismicPercent = Math.min(100, Math.round((seismicMag / 5.0) * 100));

  // Lake change progress
  const lakeChange = corridor.lakeChange || 0;
  const lakePercent = Math.min(100, Math.round((Math.abs(lakeChange) / 15) * 100));

  return (
    <aside
      className={`flex flex-col bg-[#0A1224] border-r border-[#1E293B] overflow-y-auto min-h-0 select-none custom-scrollbar ${className}`}
    >
      {/* 1. Header Bar with Realtime Status */}
      <div className="p-4 border-b border-[#1E293B] flex items-center justify-between gap-2 shrink-0 bg-[#070D18]/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs font-black text-white tracking-wide uppercase flex items-center gap-1.5">
              <span>Risk Intelligence</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            </div>
            <div className="text-[10px] text-[#64748B] font-mono truncate max-w-[150px]">
              {corridor.name}
            </div>
          </div>
        </div>

        {onSyncTelemetry && (
          <button
            onClick={onSyncTelemetry}
            disabled={isSensingSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#131F37] hover:bg-[#1C2C4C] text-cyan-300 border border-[#2A3B5E] text-[11px] font-semibold cursor-pointer transition-all disabled:opacity-50"
            title="Poll DHM & USGS Feeds"
          >
            <RefreshCw className={`w-3 h-3 ${isSensingSyncing ? "animate-spin text-cyan-400" : ""}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        )}
      </div>

      <div className="p-3.5 space-y-3.5 flex-1 min-h-0">
        {/* 2. CARD: Multi-Hazard Threat Index Gauge (Transcope Primary KPI) */}
        <div className="p-4 rounded-2xl bg-[#0F1B33]/90 border border-[#1E293B] shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
              Multi-Hazard Threat Index
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border tracking-wider ${tierConfig.badge}`}
            >
              {tierConfig.label}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Radial SVG Gauge */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Track */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="#16233F"
                  strokeWidth="8"
                />
                {/* Active Colored Arc */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={tierConfig.gauge}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-white tracking-tight leading-none">
                  {scorePercent}%
                </span>
                <span className="text-[9px] font-mono text-[#64748B] mt-0.5">SEVERITY</span>
              </div>
            </div>

            {/* Risk Narrative & Breakdown summary */}
            <div className="flex-1 space-y-2 min-w-0">
              <p className="text-[11px] text-[#94A3B8] leading-tight line-clamp-2">
                {tierConfig.subtext}
              </p>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <div className="p-1.5 rounded-lg bg-[#070D18]/80 border border-[#16233F]">
                  <span className="text-[#64748B] block text-[9px]">RAIN RUNOFF</span>
                  <span className="font-bold text-cyan-300">{corridor.rainfall || 0} mm</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#070D18]/80 border border-[#16233F]">
                  <span className="text-[#64748B] block text-[9px]">SEISMIC</span>
                  <span className="font-bold text-amber-300">{seismicMag} M_L</span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Progress Bars */}
          <div className="mt-3.5 space-y-2 pt-3 border-t border-[#1E293B]/70">
            {/* Precipitation */}
            <div>
              <div className="flex justify-between text-[10px] text-[#94A3B8] mb-1">
                <span className="flex items-center gap-1">
                  <span>🌧️</span> <span>Cumulative Rainfall</span>
                </span>
                <span className="font-mono text-cyan-300">
                  {corridor.rainfall || 0} / {rainThreshold} mm
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#16233F] overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                  style={{ width: `${rainPercent}%` }}
                />
              </div>
            </div>

            {/* Seismic Activity */}
            <div>
              <div className="flex justify-between text-[10px] text-[#94A3B8] mb-1">
                <span className="flex items-center gap-1">
                  <span>⚡</span> <span>Seismic Intensity</span>
                </span>
                <span className="font-mono text-amber-300">{seismicMag} M_L</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#16233F] overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${seismicPercent}%` }}
                />
              </div>
            </div>

            {/* Sentinel Lake Expansion */}
            <div>
              <div className="flex justify-between text-[10px] text-[#94A3B8] mb-1">
                <span className="flex items-center gap-1">
                  <span>🛰️</span> <span>Glacial Lake Moraine Swell</span>
                </span>
                <span className="font-mono text-indigo-300">+{lakeChange}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#16233F] overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-400 transition-all duration-500"
                  style={{ width: `${lakePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. CARD: River Surge & Inundation Vector */}
        <div className="p-3.5 rounded-2xl bg-[#0F1B33]/90 border border-[#1E293B] shadow-md space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              <span>River Surge Telemetry</span>
            </span>
            <span className="text-xs font-mono font-bold text-cyan-300">
              +{waterSurge.toFixed(1)}m Crest
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-[#070D18]/80 border border-[#16233F]">
              <span className="text-[9px] text-[#64748B] uppercase block">Wave Speed</span>
              <span className="font-bold text-white font-mono">
                {waterSurge > 0 ? "34.2 km/h" : "12.0 km/h"}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-[#070D18]/80 border border-[#16233F]">
              <span className="text-[9px] text-[#64748B] uppercase block">Inundation Buffer</span>
              <span className="font-bold text-cyan-400 font-mono">
                &plusmn;{Math.round(waterSurge * 22)}m width
              </span>
            </div>
          </div>

          {onSurgeChange && (
            <div className="pt-1.5 space-y-1">
              <div className="flex justify-between text-[10px] text-[#64748B]">
                <span>Interactive Surge Adjuster:</span>
                <span className="font-mono text-cyan-300">{waterSurge.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={waterSurge}
                onChange={(e) => onSurgeChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#16233F] rounded-lg"
              />
            </div>
          )}
        </div>

        {/* 4. CARD: SAR Air Fleet & Evac Base Readiness */}
        <div className="p-3.5 rounded-2xl bg-[#0F1B33]/90 border border-[#1E293B] shadow-md space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5 text-amber-400" />
              <span>SAR Air Fleet Readiness</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              VFR Open
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#070D18]/80 border border-[#16233F]">
              <div className="flex items-center gap-2">
                <span className="text-base">🚁</span>
                <div>
                  <div className="font-bold text-white text-xs">AS350 B3e Ecureuil</div>
                  <div className="text-[9px] text-[#64748B]">High-Altitude SAR Squadron</div>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-emerald-400 font-bold block text-xs">Ready</span>
                <span className="text-[9px] text-[#64748B]">Ceiling: 7,000m</span>
              </div>
            </div>

            {forwardBases.length > 0 && (
              <div className="p-2 rounded-xl bg-[#070D18]/80 border border-[#16233F] text-[10px] space-y-1">
                <div className="text-[#64748B] font-bold uppercase tracking-wider text-[9px]">
                  Forward Staging Helipads:
                </div>
                {forwardBases.slice(0, 2).map((b, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-300">
                    <span className="truncate">{b.name}</span>
                    <span className="font-mono text-cyan-300">{b.elevation}m</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 5. CARD: Live Presentation Scenario Drills */}
        {onTriggerScenario && (
          <div className="p-3.5 rounded-2xl bg-[#0F1B33]/90 border border-[#1E293B] shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI Scenario Simulation</span>
              </span>
              <span className="text-[9px] text-[#64748B] font-mono">AI Summit 2026</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onTriggerScenario("baseline")}
                className={`px-2 py-1.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer border ${
                  activeScenario === "baseline"
                    ? "bg-cyan-600/30 text-cyan-300 border-cyan-500/60 shadow-sm"
                    : "bg-[#070D18]/80 text-[#94A3B8] border-[#16233F] hover:text-white hover:border-[#2A3B5E]"
                }`}
              >
                <div className="text-[10px] font-bold">Baseline</div>
                <div className="text-[9px] text-[#64748B]">Normal Trail</div>
              </button>

              <button
                onClick={() => onTriggerScenario("cloudburst_spike")}
                className={`px-2 py-1.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer border ${
                  activeScenario === "cloudburst_spike"
                    ? "bg-orange-600/30 text-orange-300 border-orange-500/60 shadow-sm"
                    : "bg-[#070D18]/80 text-[#94A3B8] border-[#16233F] hover:text-white hover:border-[#2A3B5E]"
                }`}
              >
                <div className="text-[10px] font-bold">🌧️ Cloudburst</div>
                <div className="text-[9px] text-[#64748B]">+2.5m Surge</div>
              </button>

              <button
                onClick={() => onTriggerScenario("glof_lake_expansion")}
                className={`px-2 py-1.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer border ${
                  activeScenario === "glof_lake_expansion"
                    ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/60 shadow-sm"
                    : "bg-[#070D18]/80 text-[#94A3B8] border-[#16233F] hover:text-white hover:border-[#2A3B5E]"
                }`}
              >
                <div className="text-[10px] font-bold">🛰️ GLOF Swell</div>
                <div className="text-[9px] text-[#64748B]">Sentinel Lake</div>
              </button>

              <button
                onClick={() => onTriggerScenario("critical_cascade")}
                className={`px-2 py-1.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer border ${
                  activeScenario === "critical_cascade"
                    ? "bg-rose-600/40 text-rose-300 border-rose-500/70 shadow-sm animate-pulse"
                    : "bg-[#070D18]/80 text-[#94A3B8] border-[#16233F] hover:text-white hover:border-[#2A3B5E]"
                }`}
              >
                <div className="text-[10px] font-bold">🚨 Cascade</div>
                <div className="text-[9px] text-[#64748B]">+3.5m Flash</div>
              </button>
            </div>
          </div>
        )}

        {/* 6. Quick Strategic Modals Launchbar */}
        <div className="p-2.5 rounded-2xl bg-[#0F1B33]/60 border border-[#1E293B] flex items-center justify-between gap-1 flex-wrap">
          {onInspectLake && (
            <button
              onClick={onInspectLake}
              className="p-2 rounded-xl bg-[#131F37] hover:bg-[#1C2C4C] text-sky-300 border border-[#2A3B5E] text-xs font-semibold transition-all cursor-pointer"
              title="Sentinel-2 Lake NDWI Inspector"
            >
              <Satellite className="w-3.5 h-3.5" />
            </button>
          )}

          {onInspectTimesfm && (
            <button
              onClick={onInspectTimesfm}
              className="p-2 rounded-xl bg-[#131F37] hover:bg-[#1C2C4C] text-cyan-300 border border-[#2A3B5E] text-xs font-semibold transition-all cursor-pointer"
              title="Google TimesFM 24h Rainfall Forecast"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          )}

          {onInspectProfile && (
            <button
              onClick={onInspectProfile}
              className="p-2 rounded-xl bg-[#131F37] hover:bg-[#1C2C4C] text-amber-300 border border-[#2A3B5E] text-xs font-semibold transition-all cursor-pointer"
              title="Longitudinal Elevation Profile"
            >
              <TrendingDown className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenSitrep && (
            <button
              onClick={onOpenSitrep}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 border border-teal-500/40 text-xs font-bold transition-all cursor-pointer"
              title="Export SITREP & 2G SMS Advisory"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>SITREP</span>
            </button>
          )}

          {onBroadcastAdvisory && (
            <button
              onClick={onBroadcastAdvisory}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition-all cursor-pointer shadow-md"
              title="Broadcast National Emergency SMS"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Broadcast</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
