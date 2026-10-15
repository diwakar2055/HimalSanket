import React from "react";
import {
  Activity,
  CloudRain,
  Satellite,
  Radio,
  ArrowUpRight,
  Plane,
  Sparkles,
  FileText,
  TrendingDown,
  BarChart3,
} from "lucide-react";
import { SegmentedMeter } from "./SegmentedMeter";

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
    badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    label: "Safe baseline",
    subtext: "Hydrological & seismic telemetry within nominal envelope.",
  },
  Moderate: {
    badge: "bg-amber-500/10 text-amber-300 border border-amber-500/20",
    label: "Moderate watch",
    subtext: "Elevated monsoon runoff detected. Helipads on standby.",
  },
  High: {
    badge: "bg-orange-500/10 text-orange-300 border border-orange-500/20",
    label: "Elevated risk",
    subtext: "Heavy precipitation & moraine dam destabilization warning.",
  },
  Critical: {
    badge: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
    label: "Critical threat",
    subtext: "GLOF outburst or flash debris surge warning active.",
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

  // Semicircular Gauge (180 degree arc, Transcope style)
  const radius = 38;
  const arcLength = Math.PI * radius;
  const strokeOffset = arcLength - (scorePercent / 100) * arcLength;

  const seismicMag = corridor.seismic || 0.8;
  const lakeChange = corridor.lakeChange || 0;

  return (
    <aside
      className={`flex flex-col bg-[#121316] border-r border-white/[0.08] overflow-y-auto min-h-0 select-none custom-scrollbar ${className}`}
    >
      {/* 1. Header Bar */}
      <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between gap-2 shrink-0 bg-[#18191E] sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-200">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide font-sans">
              Tactical Telemetry
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
              {corridor.name}
            </div>
          </div>
        </div>

        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${tierConfig.badge}`}>
          {tierConfig.label}
        </span>
      </div>

      <div className="p-3.5 space-y-3 flex-1 min-h-0">
        {/* 2. CARD 1: CORRIDOR HAZARD PROGRESS (Transcope Delivery Progress Style) */}
        <div className="p-4 rounded-2xl bg-[#181A20] border border-white/[0.08] hover:border-white/[0.14] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white font-sans">
              Corridor Hazard Threat
            </span>
            {onInspectProfile && (
              <button
                onClick={onInspectProfile}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="View Elevation Profile"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Badges Row */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <CloudRain className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <div className="min-w-0">
                <span className="text-[9px] text-slate-400 uppercase font-mono block">Rainfall</span>
                <span className="text-xs font-bold text-white font-mono truncate block">
                  {corridor.rainfall || 0} mm
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <Activity className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <div className="min-w-0">
                <span className="text-[9px] text-slate-400 uppercase font-mono block">Seismic</span>
                <span className="text-xs font-bold text-white font-mono truncate block">
                  {seismicMag} M_L
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <Satellite className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <div className="min-w-0">
                <span className="text-[9px] text-slate-400 uppercase font-mono block">Lake Swell</span>
                <span className="text-xs font-bold text-white font-mono truncate block">
                  +{lakeChange}% NDWI
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <Radio className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <div className="min-w-0">
                <span className="text-[9px] text-slate-400 uppercase font-mono block">Reports</span>
                <span className="text-xs font-bold text-white font-mono truncate block">
                  {corridor.reports?.length || 0} Reports
                </span>
              </div>
            </div>
          </div>

          {/* Semicircular Arc Gauge */}
          <div className="relative flex flex-col items-center justify-center pt-1 pb-1">
            <svg className="w-44 h-24 overflow-visible" viewBox="0 0 100 55">
              <defs>
                <linearGradient id="balancedArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="60%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
              </defs>

              {/* Background Arc */}
              <path
                d="M 12 50 A 38 38 0 0 1 88 50"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="6"
                strokeLinecap="round"
              />

              {/* Dynamic Progress Arc */}
              <path
                d="M 12 50 A 38 38 0 0 1 88 50"
                fill="none"
                stroke="url(#balancedArcGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={arcLength}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-500 ease-out"
              />
            </svg>

            {/* Centered Percentage Pill */}
            <div className="absolute bottom-1 flex flex-col items-center">
              <span className="px-3 py-0.5 rounded-full bg-[#121316] border border-white/[0.12] text-xs font-bold text-white font-mono">
                {scorePercent}%
              </span>
            </div>
          </div>

          {/* Threshold Progress text */}
          <div className="mt-2 pt-2 border-t border-white/[0.06] text-center">
            <div className="text-[10px] font-mono text-slate-400">
              <strong className="text-white">{(risk.score).toFixed(2)}</strong> / 1.00 hazard threshold ({scorePercent}%)
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
              {tierConfig.subtext}
            </div>
          </div>
        </div>

        {/* 3. CARD 2: FLEET DISTRIBUTION BY TYPE (Transcope Equalizer Bars) */}
        <div className="p-4 rounded-2xl bg-[#181A20] border border-white/[0.08] hover:border-white/[0.14] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white font-sans">
              SAR & Sensor Distribution
            </span>
            {onOpenSitrep && (
              <button
                onClick={onOpenSitrep}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="View Full Fleet & Asset SITREP"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 w-28 shrink-0">
                <span className="text-sm">🚁</span>
                <span className="text-slate-300 font-medium truncate text-[11px]">SAR Helis</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px] w-6 text-right">4</span>
              <div className="flex-1 max-w-[130px] flex justify-center">
                <SegmentedMeter value={84} totalSegments={20} color="white" />
              </div>
              <span className="text-white font-mono font-bold text-[11px] w-8 text-right">84%</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 w-28 shrink-0">
                <span className="text-sm">🦺</span>
                <span className="text-slate-300 font-medium truncate text-[11px]">Rescue Squads</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px] w-6 text-right">8</span>
              <div className="flex-1 max-w-[130px] flex justify-center">
                <SegmentedMeter value={65} totalSegments={20} color="white" />
              </div>
              <span className="text-white font-mono font-bold text-[11px] w-8 text-right">65%</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 w-28 shrink-0">
                <span className="text-sm">📡</span>
                <span className="text-slate-300 font-medium truncate text-[11px]">IoT Relays</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px] w-6 text-right">18</span>
              <div className="flex-1 max-w-[130px] flex justify-center">
                <SegmentedMeter value={95} totalSegments={20} color="emerald" />
              </div>
              <span className="text-white font-mono font-bold text-[11px] w-8 text-right">95%</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 w-28 shrink-0">
                <span className="text-sm">🛰️</span>
                <span className="text-slate-300 font-medium truncate text-[11px]">Sat Passes</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px] w-6 text-right">2</span>
              <div className="flex-1 max-w-[130px] flex justify-center">
                <SegmentedMeter value={40} totalSegments={20} color="white" />
              </div>
              <span className="text-white font-mono font-bold text-[11px] w-8 text-right">40%</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 w-28 shrink-0">
                <span className="text-sm">🛸</span>
                <span className="text-slate-300 font-medium truncate text-[11px]">UAV Drones</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px] w-6 text-right">6</span>
              <div className="flex-1 max-w-[130px] flex justify-center">
                <SegmentedMeter value={50} totalSegments={20} color="white" />
              </div>
              <span className="text-white font-mono font-bold text-[11px] w-8 text-right">50%</span>
            </div>
          </div>
        </div>

        {/* 4. CARD 3: PRECIPITATION & SURGE TREND */}
        <div className="p-4 rounded-2xl bg-[#181A20] border border-white/[0.08] hover:border-white/[0.14] transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-sans">
              Precipitation & Surge Trend
            </span>
            {onInspectTimesfm && (
              <button
                onClick={onInspectTimesfm}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Open TimesFM Forecast"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[9px] text-slate-400 uppercase font-mono block">Runoff Velocity</span>
              <span className="text-sm font-bold text-white font-mono tabular-nums block mt-0.5">
                {waterSurge > 0 ? "34.2 km/h" : "12.0 km/h"}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">+6% vs baseline</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[9px] text-slate-400 uppercase font-mono block">Surge Crest</span>
              <span className="text-sm font-bold text-white font-mono tabular-nums block mt-0.5">
                +{waterSurge.toFixed(1)} m
              </span>
              <span className="text-[9px] text-slate-500 font-mono">&plusmn;{Math.round(waterSurge * 22)}m buffer</span>
            </div>
          </div>

          {/* Minimal Waveform Histogram */}
          <div className="h-10 w-full rounded-xl bg-white/[0.02] border border-white/[0.05] p-1.5 relative overflow-hidden flex items-end">
            <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="balancedWaveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d={
                  waterSurge > 0
                    ? `M 0 35 Q 25 ${30 - waterSurge * 4}, 50 ${20 - waterSurge * 3} T 100 ${
                        10 - waterSurge * 2
                      } T 150 ${15 - waterSurge * 3} T 200 35 L 200 40 L 0 40 Z`
                    : "M 0 32 Q 50 28, 100 32 T 200 32 L 200 40 L 0 40 Z"
                }
                fill="url(#balancedWaveGradient)"
              />
              <path
                d={
                  waterSurge > 0
                    ? `M 0 35 Q 25 ${30 - waterSurge * 4}, 50 ${20 - waterSurge * 3} T 100 ${
                        10 - waterSurge * 2
                      } T 150 ${15 - waterSurge * 3} T 200 35`
                    : "M 0 32 Q 50 28, 100 32 T 200 32"
                }
                fill="transparent"
                stroke="#CBD5E1"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {onSurgeChange && (
            <div className="pt-1 space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Interactive Water Rise:</span>
                <span className="text-white font-bold">+{waterSurge.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={waterSurge}
                onChange={(e) => onSurgeChange(parseFloat(e.target.value))}
                className="w-full accent-slate-200 cursor-pointer h-1.5 bg-white/[0.08] rounded-lg"
              />
            </div>
          )}
        </div>

        {/* 5. CARD 4: SIMULATION DRILLS */}
        {onTriggerScenario && (
          <div className="p-4 rounded-2xl bg-[#181A20] border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-300" />
                <span>Simulation Drills</span>
              </span>
              <span className="text-[9px] text-slate-400 font-mono bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/[0.08]">
                1-CLICK
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onTriggerScenario("baseline")}
                className={`p-2 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                  activeScenario === "baseline"
                    ? "bg-white/[0.12] text-white border-white/20 font-bold"
                    : "bg-white/[0.02] text-slate-400 border-white/[0.05] hover:text-white"
                }`}
              >
                <div className="text-[11px] font-semibold">Baseline</div>
                <div className="text-[9px] text-slate-500 font-mono">Normal</div>
              </button>

              <button
                onClick={() => onTriggerScenario("cloudburst_spike")}
                className={`p-2 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                  activeScenario === "cloudburst_spike"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                    : "bg-white/[0.02] text-slate-400 border-white/[0.05] hover:text-white"
                }`}
              >
                <div className="text-[11px] font-semibold">Cloudburst</div>
                <div className="text-[9px] text-slate-500 font-mono">+2.5m</div>
              </button>

              <button
                onClick={() => onTriggerScenario("glof_lake_expansion")}
                className={`p-2 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                  activeScenario === "glof_lake_expansion"
                    ? "bg-white/[0.12] text-white border-white/20 font-bold"
                    : "bg-white/[0.02] text-slate-400 border-white/[0.05] hover:text-white"
                }`}
              >
                <div className="text-[11px] font-semibold">GLOF Swell</div>
                <div className="text-[9px] text-slate-500 font-mono">Lake Swell</div>
              </button>

              <button
                onClick={() => onTriggerScenario("critical_cascade")}
                className={`p-2 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                  activeScenario === "critical_cascade"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold"
                    : "bg-white/[0.02] text-slate-400 border-white/[0.05] hover:text-white"
                }`}
              >
                <div className="text-[11px] font-semibold">Cascade</div>
                <div className="text-[9px] text-slate-500 font-mono">+3.5m</div>
              </button>
            </div>
          </div>
        )}

        {/* 6. Tools Launchbar */}
        <div className="p-2 rounded-2xl bg-[#181A20] border border-white/[0.08] flex items-center justify-between gap-1.5 flex-wrap">
          {onInspectLake && (
            <button
              onClick={onInspectLake}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] text-xs transition-colors cursor-pointer"
              title="Sentinel-2 Lake NDWI"
            >
              <Satellite className="w-4 h-4" />
            </button>
          )}

          {onInspectTimesfm && (
            <button
              onClick={onInspectTimesfm}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] text-xs transition-colors cursor-pointer"
              title="TimesFM Rainfall Forecast"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          )}

          {onInspectProfile && (
            <button
              onClick={onInspectProfile}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] text-xs transition-colors cursor-pointer"
              title="Elevation Profile"
            >
              <TrendingDown className="w-4 h-4" />
            </button>
          )}

          {onOpenSitrep && (
            <button
              onClick={onOpenSitrep}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] text-xs font-semibold transition-colors cursor-pointer"
              title="SITREP Advisory"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>SITREP</span>
            </button>
          )}

          {onBroadcastAdvisory && (
            <button
              onClick={onBroadcastAdvisory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer"
              title="Broadcast National Emergency SMS"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Broadcast</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
