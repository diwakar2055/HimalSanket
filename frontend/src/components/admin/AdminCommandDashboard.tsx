import React, { useState, useMemo, useCallback } from "react";
import { ModernHazardMap } from "../map/ModernHazardMap";
import { MapAsset, CORRIDOR_CONFIGS } from "../../data/hazardMapData";
import { Language } from "../../data/localization";
import { useUserRole } from "../../context/UserRoleContext";
import { playConfirmationBeep, playEmergencyChime } from "../../utils/audioAlert";
import {
  Activity,
  AlertTriangle,
  CloudRain,
  Radio,
  Satellite,
  Send,
  Shield,
  Sliders,
  CheckCircle2,
  FileText,
  Volume2,
} from "lucide-react";

interface AdminCommandDashboardProps {
  corridors: any[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  selectedRisk: any;
  liveData: any;
  isSensingSyncing: boolean;
  syncLiveTelemetry: (corridorId: string) => Promise<void>;
  handleTriggerScenario: (scenarioId: string) => Promise<void>;
  activeScenario: string;
  waterSurge: number;
  setWaterSurge: (surge: number) => void;
  userPosition: { lat: number; lng: number; accuracy?: number; altitude?: number } | null;
  language: Language;
  assets: MapAsset[];
}

export function AdminCommandDashboard({
  corridors,
  selectedId,
  setSelectedId,
  selectedRisk,
  liveData,
  isSensingSyncing,
  syncLiveTelemetry,
  handleTriggerScenario,
  activeScenario,
  waterSurge,
  setWaterSurge,
  userPosition,
  language,
  assets,
}: AdminCommandDashboardProps) {
  const { distressBeacons, broadcastAdvisory } = useUserRole();

  const [advisorySent, setAdvisorySent] = useState(false);
  const [advisoryText, setAdvisoryText] = useState("");

  const selectedCorridor = useMemo(() => {
    const config = CORRIDOR_CONFIGS[selectedId] || CORRIDOR_CONFIGS.langtang;
    const telemetry = corridors.find((c) => c.id === selectedId) || corridors[0];
    return {
      ...config,
      ...telemetry,
      center: config.center,
      zoom: config.zoom,
      riverPath: config.riverPath,
      centerName: config.centerName,
    };
  }, [corridors, selectedId]);

  const pendingSosCount = distressBeacons.filter((b) => b.status === "pending").length;

  // Handle Broadcast Advisory
  const handleBroadcast = () => {
    playConfirmationBeep();
    const defaultMsg =
      selectedRisk.tier === "Critical" || selectedRisk.tier === "High"
        ? `EMERGENCY ALERT: High hazard detected in ${selectedCorridor.name}. River surge risk is elevated. Move to high-ground terraces immediately.`
        : `ADVISORY: Normal environmental baseline maintained in ${selectedCorridor.name}. All trails remain operational.`;

    const message = advisoryText || defaultMsg;

    broadcastAdvisory({
      corridorId: selectedId,
      tier: selectedRisk.tier,
      messageEn: message,
      messageNe: `${selectedCorridor.name} क्षेत्रका लागि सतर्कता सन्देश जारी गरिएको छ।`,
      smsDraft: `HimalSanket ALERT: ${selectedCorridor.name} risk level: ${selectedRisk.tier}. Evacuate riverbeds if surge observed.`,
      issuedBy: "NDRRMA Emergency Operations Center",
    });

    setAdvisorySent(true);
    setAdvisoryText("");
    setTimeout(() => setAdvisorySent(false), 5000);
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* 1. TOP EXECUTIVE 4-METRIC HEALTH CARDS */}
      <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Metric 1: Fused Hazard Score */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                Fused Risk Index
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-semibold text-zinc-100 font-mono">
                  {(selectedRisk.score || 0).toFixed(2)}
                </span>
                <span className="text-xs text-zinc-500 font-normal">/ 1.0</span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium uppercase ${
                selectedRisk.tier === "Critical"
                  ? "bg-red-950/40 text-red-300 border border-red-900/40"
                  : selectedRisk.tier === "High"
                  ? "bg-orange-950/40 text-orange-300 border border-orange-900/40"
                  : selectedRisk.tier === "Moderate"
                  ? "bg-amber-950/40 text-amber-300 border border-amber-900/40"
                  : "bg-emerald-950/40 text-emerald-300 border border-emerald-900/40"
              }`}
            >
              {selectedRisk.tier}
            </span>
          </div>

          {/* Metric 2: Rainfall Telemetry */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                Catchment Rain
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-semibold text-zinc-100 font-mono">
                  {selectedCorridor.rainfall}
                </span>
                <span className="text-xs text-zinc-500 font-normal">
                  / {selectedCorridor.rainThreshold || 144}mm
                </span>
              </div>
            </div>
            <CloudRain className="w-4 h-4 text-zinc-400" />
          </div>

          {/* Metric 3: Glacial Lake (GLOF) Watch */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                Glacial Lake Area
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-semibold text-zinc-100 font-mono">
                  +{selectedCorridor.lakeChange || 3.8}%
                </span>
                <span className="text-xs text-zinc-500 font-normal">NDWI</span>
              </div>
            </div>
            <Satellite className="w-4 h-4 text-zinc-400" />
          </div>

          {/* Metric 4: Active SOS Alerts */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                Active SOS Alerts
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span
                  className={`text-xl font-semibold font-mono ${
                    pendingSosCount > 0 ? "text-red-400" : "text-zinc-100"
                  }`}
                >
                  {pendingSosCount}
                </span>
                <span className="text-xs text-zinc-500 font-normal">Pending</span>
              </div>
            </div>
            <Radio className={`w-4 h-4 text-zinc-400 ${pendingSosCount > 0 ? "text-red-400 animate-pulse" : ""}`} />
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: MAP + CONTROL DRAWER */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* MAP CANVAS */}
        <div className="flex-1 h-full min-h-[350px] relative bg-zinc-950">
          <ModernHazardMap
            corridor={selectedCorridor}
            assets={assets}
            mode="admin"
            distressBeacons={distressBeacons}
            simulatedWaterRise={waterSurge}
            userPosition={userPosition}
            className="w-full h-full"
          />
        </div>

        {/* OPERATIONS SIDEBAR (~360px) */}
        <aside className="w-full lg:w-[360px] xl:w-[380px] shrink-0 h-full flex flex-col bg-zinc-950 border-l border-zinc-800 overflow-y-auto custom-scrollbar">
          {/* A. FLOOD SURGE SIMULATOR */}
          <div className="p-4 border-b border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-300">
                  Flood Surge Simulator
                </h3>
              </div>
              <span className="text-xs font-mono font-medium text-zinc-200">
                +{waterSurge.toFixed(1)}m Rise
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={waterSurge}
              onChange={(e) => setWaterSurge(parseFloat(e.target.value))}
              className="w-full accent-zinc-200 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
            />

            <div className="flex justify-between text-xs font-mono text-zinc-500">
              <span>0m (Baseline)</span>
              <span>2.5m</span>
              <span>5.0m (Max)</span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {waterSurge === 0
                ? "River channel within natural embankment."
                : `Simulating +${waterSurge}m inundation surge. River buffer expands ~${Math.round(
                    20 + waterSurge * 35
                  )}m laterally.`}
            </p>
          </div>

          {/* B. SCENARIO DRILL TRIGGER */}
          <div className="p-4 border-b border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-300">
                Drill Scenarios
              </h3>
              <span className="text-xs text-zinc-500 capitalize font-mono">
                {activeScenario}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "baseline", label: "Baseline Normal" },
                { id: "cloudburst_spike", label: "Cloudburst Spike" },
                { id: "glof_lake_expansion", label: "GLOF Outburst" },
                { id: "seismic_tremor", label: "3.6M Tremor" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleTriggerScenario(s.id)}
                  className={`p-2.5 rounded-lg border text-left text-xs font-medium cursor-pointer transition-colors ${
                    activeScenario === s.id
                      ? "bg-zinc-800 border-zinc-600 text-zinc-100 shadow-sm"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* C. BROADCAST EMERGENCY ADVISORY */}
          <div className="p-4 flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-300">
                  Broadcast Advisory
                </h3>
              </div>
              <span className="text-xs text-zinc-500">SMS & App</span>
            </div>

            {advisorySent ? (
              <div className="p-3 rounded-lg bg-zinc-900 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Advisory successfully transmitted across channels!</span>
              </div>
            ) : null}

            <textarea
              value={advisoryText}
              onChange={(e) => setAdvisoryText(e.target.value)}
              placeholder={`Type advisory for ${selectedCorridor.name} (default alert will be used if empty)...`}
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
            />

            <button
              onClick={handleBroadcast}
              className="w-full py-2.5 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Official Advisory</span>
            </button>

            {/* Quick Summary Box */}
            <div className="mt-auto p-3 rounded-lg bg-zinc-900/40 border border-zinc-850 space-y-1 text-xs text-zinc-500">
              <div className="text-zinc-300 font-medium">Corridor: {selectedCorridor.name}</div>
              <div>Station: Dhunche / Rasuwa EOC</div>
              <div>Connected Sensors: 18 Active Feeds</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
