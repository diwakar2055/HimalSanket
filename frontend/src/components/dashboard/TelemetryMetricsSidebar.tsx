import React, { useMemo } from "react";
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
    badge: "bg-emerald-950/40 text-emerald-300 border-emerald-500/40",
    gauge: "#22C55E",
    gradientFrom: "#22C55E",
    gradientTo: "#34D399",
    label: "LOW RISK",
    subtext: "Hydrological & seismic telemetry within nominal safety envelopes.",
  },
  Moderate: {
    badge: "bg-amber-950/40 text-amber-300 border-amber-500/40",
    gauge: "#F5B942",
    gradientFrom: "#F5B942",
    gradientTo: "#FBBF24",
    label: "MODERATE WATCH",
    subtext: "Elevated monsoon runoff detected. Helipads and ground squads on standby.",
  },
  High: {
    badge: "bg-orange-950/40 text-orange-300 border-orange-500/40",
    gauge: "#FB923C",
    gradientFrom: "#EA580C",
    gradientTo: "#FB923C",
    label: "HIGH ALERT",
    subtext: "Heavy precipitation & moraine dam destabilization warning active.",
  },
  Critical: {
    badge: "bg-rose-950/60 text-rose-300 border-rose-500/60 animate-pulse",
    gauge: "#F05252",
    gradientFrom: "#E11D48",
    gradientTo: "#FDA4AF",
    label: "CRITICAL THREAT",
    subtext: "GLOF Outburst or flash debris surge imminent. Immediate gorge evacuation active.",
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

  // Circular instrument gauge geometry
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scorePercent / 100) * circumference;

  // Generate 36 calibration tick marks around 360 degrees
  const tickMarks = useMemo(() => {
    return Array.from({ length: 36 }).map((_, i) => {
      const angle = (i * 10 * Math.PI) / 180;
      const x1 = 50 + 46 * Math.cos(angle);
      const y1 = 50 + 46 * Math.sin(angle);
      const isMajor = i % 9 === 0;
      const tickLength = isMajor ? 5 : 3;
      const x2 = 50 + (46 - tickLength) * Math.cos(angle);
      const y2 = 50 + (46 - tickLength) * Math.sin(angle);
      return { x1, y1, x2, y2, isMajor, i };
    });
  }, []);

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
      className={`flex flex-col bg-[#101A2A] border-r border-[#27364B] overflow-y-auto min-h-0 select-none custom-scrollbar ${className}`}
    >
      {/* 1. Header Bar with Realtime Heartbeat */}
      <div className="p-3.5 border-b border-[#27364B] flex items-center justify-between gap-2 shrink-0 bg-[#080E19] sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold shadow-inner">
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080E19]" />
          </div>
          <div>
            <div className="text-xs font-black text-[#F8FAFC] tracking-wider uppercase flex items-center gap-1.5">
              <span>Risk Intelligence</span>
            </div>
            <div className="text-[10px] text-[#A7B4C8] font-mono truncate max-w-[150px]">
              {corridor.name} • Sensor Feeds
            </div>
          </div>
        </div>

        {onSyncTelemetry && (
          <button
            onClick={onSyncTelemetry}
            disabled={isSensingSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#152238] hover:bg-[#1E2D48] text-cyan-300 border border-[#27364B] text-[11px] font-semibold cursor-pointer transition-colors disabled:opacity-50 shadow-sm"
            title="Poll DHM, USGS & Sentinel Feeds"
          >
            <RefreshCw className={`w-3 h-3 ${isSensingSyncing ? "animate-spin text-cyan-400" : ""}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        )}
      </div>

      <div className="p-3.5 space-y-3.5 flex-1 min-h-0">
        {/* 2. CARD: Calibrated Instrument Multi-Hazard Threat Gauge */}
        <div className="p-4 rounded-xl bg-[#152238] border border-[#27364B] relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#A7B4C8] font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Multi-Hazard Index</span>
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border tracking-wider transition-colors ${tierConfig.badge}`}
            >
              {tierConfig.label}
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Calibrated Radial Instrument Dial */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={tierConfig.gradientFrom} />
                    <stop offset="100%" stopColor={tierConfig.gradientTo} />
                  </linearGradient>
                </defs>

                {/* Calibration Tick Marks */}
                {tickMarks.map((t) => (
                  <line
                    key={t.i}
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                    stroke={t.isMajor ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"}
                    strokeWidth={t.isMajor ? "1.5" : "1"}
                  />
                ))}

                {/* Background Track */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="#101A2A"
                  strokeWidth="7"
                />

                {/* Active Arc */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="url(#gaugeGradient)"
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Center Digital Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-white tracking-tight tabular-nums leading-none">
                  {scorePercent}%
                </span>
                <span className="text-[8px] font-mono text-[#A7B4C8] mt-1 uppercase tracking-widest">
                  Fused Score
                </span>
              </div>
            </div>

            {/* Risk Narrative & Breakdown summary */}
            <div className="flex-1 space-y-2 min-w-0">
              <p className="text-[11px] text-[#A7B4C8] leading-snug line-clamp-2">
                {tierConfig.subtext}
              </p>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <div className="p-1.5 rounded-lg bg-[#101A2A] border border-[#27364B]">
                  <span className="text-[#A7B4C8] block text-[8px] uppercase tracking-wider">
                    Rainfall
                  </span>
                  <span className="font-bold text-cyan-300 tabular-nums">
                    {corridor.rainfall || 0} mm
                  </span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#101A2A] border border-[#27364B]">
                  <span className="text-[#A7B4C8] block text-[8px] uppercase tracking-wider">
                    Seismic
                  </span>
                  <span className="font-bold text-amber-300 tabular-nums">
                    {seismicMag} M_L
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Progress Bars */}
          <div className="mt-3.5 space-y-2 pt-3 border-t border-[#27364B]">
            {/* Precipitation Gauge */}
            <div>
              <div className="flex justify-between text-[10px] text-[#A7B4C8] mb-1 font-mono">
                <span className="flex items-center gap-1.5 text-[#F8FAFC]">
                  <span>🌧️</span> <span>Rainfall Runoff</span>
                </span>
                <span className="text-cyan-300 font-bold tabular-nums">
                  {corridor.rainfall || 0} / {rainThreshold} mm
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#101A2A] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 shadow-sm"
                  style={{ width: `${rainPercent}%` }}
                />
              </div>
            </div>

            {/* Seismic Activity Gauge */}
            <div>
              <div className="flex justify-between text-[10px] text-[#A7B4C8] mb-1 font-mono">
                <span className="flex items-center gap-1.5 text-[#F8FAFC]">
                  <span>⚡</span> <span>Seismic Tremor</span>
                </span>
                <span className="text-amber-300 font-bold tabular-nums">{seismicMag} M_L</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#101A2A] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 shadow-sm"
                  style={{ width: `${seismicPercent}%` }}
                />
              </div>
            </div>

            {/* Sentinel Lake Expansion Gauge */}
            <div>
              <div className="flex justify-between text-[10px] text-[#A7B4C8] mb-1 font-mono">
                <span className="flex items-center gap-1.5 text-[#F8FAFC]">
                  <span>🛰️</span> <span>Glacial Lake Swell</span>
                </span>
                <span className="text-indigo-300 font-bold tabular-nums">+{lakeChange}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#101A2A] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 shadow-sm"
                  style={{ width: `${lakePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. CARD: River Surge Telemetry with Animated Wave Sparkline */}
        <div className="p-3.5 rounded-xl bg-[#152238] border border-[#27364B] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-[#A7B4C8] uppercase tracking-wider flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hydrological Wave Surge</span>
            </span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                waterSurge > 0
                  ? "bg-cyan-950/50 text-cyan-300 border-cyan-500/40 animate-pulse"
                  : "bg-[#101A2A] text-[#A7B4C8] border-[#27364B]"
              }`}
            >
              +{waterSurge.toFixed(1)}m Crest
            </span>
          </div>

          {/* Dynamic SVG Wave Sparkline Visualizer */}
          <div className="h-10 w-full rounded-lg bg-[#101A2A] border border-[#27364B] p-1 relative overflow-hidden flex items-end">
            <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d={
                  waterSurge > 0
                    ? `M 0 35 Q 30 ${30 - waterSurge * 4}, 60 ${20 - waterSurge * 3} T 120 ${
                        10 - waterSurge * 2
                      } T 170 ${15 - waterSurge * 3} T 200 35 L 200 40 L 0 40 Z`
                    : "M 0 32 Q 50 30, 100 32 T 200 32 L 200 40 L 0 40 Z"
                }
                fill="url(#waveGradient)"
              />
              <path
                d={
                  waterSurge > 0
                    ? `M 0 35 Q 30 ${30 - waterSurge * 4}, 60 ${20 - waterSurge * 3} T 120 ${
                        10 - waterSurge * 2
                      } T 170 ${15 - waterSurge * 3} T 200 35`
                    : "M 0 32 Q 50 30, 100 32 T 200 32"
                }
                fill="transparent"
                stroke="#22D3EE"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute right-2 top-1.5 text-[9px] font-mono text-cyan-300">
              {waterSurge > 0 ? "Wave velocity: 34.2 km/h" : "Nominal velocity: 12 km/h"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-[#101A2A] border border-[#27364B]">
              <span className="text-[9px] text-[#A7B4C8] uppercase block font-mono">Runoff Impact</span>
              <span className="font-bold text-white font-mono">
                {waterSurge > 1 ? "Debris Torrent" : "Monsoon Runoff"}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-[#101A2A] border border-[#27364B]">
              <span className="text-[9px] text-[#A7B4C8] uppercase block font-mono">Inundation Buffer</span>
              <span className="font-bold text-cyan-400 font-mono">
                &plusmn;{Math.round(waterSurge * 22)}m spread
              </span>
            </div>
          </div>

          {onSurgeChange && (
            <div className="pt-1.5 space-y-1">
              <div className="flex justify-between text-[10px] text-[#A7B4C8] font-mono">
                <span>Interactive Water Rise:</span>
                <span className="text-cyan-300 font-bold">+{waterSurge.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={waterSurge}
                onChange={(e) => onSurgeChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#101A2A] rounded-lg"
              />
            </div>
          )}
        </div>

        {/* 4. CARD: SAR Air Fleet & Evac Base Readiness */}
        <div className="p-3.5 rounded-xl bg-[#152238] border border-[#27364B] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-[#A7B4C8] uppercase tracking-wider flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5 text-amber-400" />
              <span>SAR Air Fleet Readiness</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
              VFR Open
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#101A2A] border border-[#27364B]">
              <div className="flex items-center gap-2">
                <span className="text-base">🚁</span>
                <div>
                  <div className="font-bold text-white text-xs">AS350 B3e Ecureuil</div>
                  <div className="text-[9px] text-[#A7B4C8]">Simrik Air Rescue Squadron</div>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-emerald-400 font-bold block text-xs">Standby</span>
                <span className="text-[9px] text-[#64748B]">Ceiling: 7,000m</span>
              </div>
            </div>

            {forwardBases.length > 0 && (
              <div className="p-2 rounded-lg bg-[#101A2A] border border-[#27364B] text-[10px] space-y-1">
                <div className="text-[#A7B4C8] font-bold uppercase tracking-wider text-[8px] font-mono">
                  Designated Mountain Helipads:
                </div>
                {forwardBases.slice(0, 2).map((b, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-300">
                    <span className="truncate">{b.name}</span>
                    <span className="font-mono text-cyan-300">{b.elevation}m ASL</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 5. CARD: Live Presentation Scenario Drills */}
        {onTriggerScenario && (
          <div className="p-3.5 rounded-xl bg-[#152238] border border-[#27364B] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#A7B4C8] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI Summit Scenario Injection</span>
              </span>
              <span className="text-[8px] text-cyan-400 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">
                1-CLICK DRILL
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onTriggerScenario("baseline")}
                className={`p-2 rounded-lg text-left text-xs font-semibold transition-colors cursor-pointer border ${
                  activeScenario === "baseline"
                    ? "bg-cyan-600/30 text-cyan-300 border-cyan-500/60 shadow-sm"
                    : "bg-[#101A2A] text-[#A7B4C8] border-[#27364B] hover:text-white"
                }`}
              >
                <div className="text-[10px] font-bold">Baseline</div>
                <div className="text-[9px] text-[#64748B]">Normal Trail</div>
              </button>

              <button
                onClick={() => onTriggerScenario("cloudburst_spike")}
                className={`p-2 rounded-lg text-left text-xs font-semibold transition-colors cursor-pointer border ${
                  activeScenario === "cloudburst_spike"
                    ? "bg-orange-600/30 text-orange-300 border-orange-500/60 shadow-sm"
                    : "bg-[#101A2A] text-[#A7B4C8] border-[#27364B] hover:text-white"
                }`}
              >
                <div className="text-[10px] font-bold">🌧️ Cloudburst</div>
                <div className="text-[9px] text-[#64748B]">+2.5m Surge</div>
              </button>

              <button
                onClick={() => onTriggerScenario("glof_lake_expansion")}
                className={`p-2 rounded-lg text-left text-xs font-semibold transition-colors cursor-pointer border ${
                  activeScenario === "glof_lake_expansion"
                    ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/60 shadow-sm"
                    : "bg-[#101A2A] text-[#A7B4C8] border-[#27364B] hover:text-white"
                }`}
              >
                <div className="text-[10px] font-bold">🛰️ GLOF Swell</div>
                <div className="text-[9px] text-[#64748B]">Sentinel Lake</div>
              </button>

              <button
                onClick={() => onTriggerScenario("critical_cascade")}
                className={`p-2 rounded-lg text-left text-xs font-semibold transition-colors cursor-pointer border ${
                  activeScenario === "critical_cascade"
                    ? "bg-rose-600/40 text-rose-300 border-rose-500/70 shadow-sm animate-pulse"
                    : "bg-[#101A2A] text-[#A7B4C8] border-[#27364B] hover:text-white"
                }`}
              >
                <div className="text-[10px] font-bold">🚨 Cascade</div>
                <div className="text-[9px] text-[#64748B]">+3.5m Flash</div>
              </button>
            </div>
          </div>
        )}

        {/* 6. Quick Strategic Modals Launchbar */}
        <div className="p-2 rounded-xl bg-[#152238] border border-[#27364B] flex items-center justify-between gap-1 flex-wrap">
          {onInspectLake && (
            <button
              onClick={onInspectLake}
              className="p-2 rounded-lg bg-[#101A2A] hover:bg-[#1E2D48] text-sky-300 border border-[#27364B] text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              title="Sentinel-2 Lake NDWI Inspector"
            >
              <Satellite className="w-3.5 h-3.5" />
            </button>
          )}

          {onInspectTimesfm && (
            <button
              onClick={onInspectTimesfm}
              className="p-2 rounded-lg bg-[#101A2A] hover:bg-[#1E2D48] text-cyan-300 border border-[#27364B] text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              title="Google TimesFM 24h Rainfall Forecast"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          )}

          {onInspectProfile && (
            <button
              onClick={onInspectProfile}
              className="p-2 rounded-lg bg-[#101A2A] hover:bg-[#1E2D48] text-amber-300 border border-[#27364B] text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              title="Longitudinal Elevation Profile"
            >
              <TrendingDown className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenSitrep && (
            <button
              onClick={onOpenSitrep}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 border border-teal-500/40 text-xs font-bold transition-colors cursor-pointer shadow-sm"
              title="Export SITREP & 2G SMS Advisory"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>SITREP</span>
            </button>
          )}

          {onBroadcastAdvisory && (
            <button
              onClick={onBroadcastAdvisory}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition-colors cursor-pointer shadow-md"
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
