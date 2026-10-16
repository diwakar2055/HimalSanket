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
  Plane,
} from "lucide-react";
import { HelicopterIcon } from "../common/HelicopterIcon";

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
  const { distressBeacons, broadcastAdvisory, dispatchedTeams } = useUserRole();

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

  // Active SAR fleet items (showing live teams or default fleet units matching reference)
  const activeFleetItems = useMemo(() => {
    if (dispatchedTeams.length > 0) {
      return dispatchedTeams.map((team) => ({
        id: team.id,
        callSign: team.callSign,
        targetName: team.targetCivilianName,
        status:
          team.etaSeconds <= 0 || team.status === "arrived" || team.status === "evacuating"
            ? "On-Site"
            : `${Math.floor(team.etaSeconds / 60)}m ${team.etaSeconds % 60}s`,
        isOnSite:
          team.etaSeconds <= 0 || team.status === "arrived" || team.status === "evacuating",
      }));
    }
    return [
      {
        id: "sar-1",
        callSign: "SAR-NAT-8",
        targetName: "Pemba Tenzing (Port...",
        status: "On-Site",
        isOnSite: true,
      },
      {
        id: "sar-2",
        callSign: "SAR-NAT-2",
        targetName: "Trekker SOS (28.214...",
        status: "On-Site",
        isOnSite: true,
      },
      {
        id: "sar-3",
        callSign: "SAR-AIR-4",
        targetName: "Trail Patrol Unit",
        status: "On-Site",
        isOnSite: true,
      },
    ];
  }, [dispatchedTeams]);

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[#0b1320] text-[#f1f5f9] overflow-hidden font-sans">
      {/* 1. TOP EXECUTIVE 5-METRIC HEALTH CARDS */}
      <div className="px-4 py-3 bg-[#0b1320] border-b border-[#1c2536] shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {/* Metric 1: Fused Hazard Score */}
          <div className="p-3.5 rounded-xl bg-[#111c2e] border border-[#1e2c44] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-semibold text-[#8fa0b5] uppercase tracking-wider block">
                Fused Risk Index
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-[#f1f5f9] font-mono">
                  {(selectedRisk.score || 0).toFixed(2)}
                </span>
                <span className="text-xs text-[#8c96af] font-normal">/ 1.0</span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase ${
                selectedRisk.tier === "Critical"
                  ? "bg-[#3b0f19] text-[#fb7185] border border-[#9f1239]/60"
                  : selectedRisk.tier === "High"
                  ? "bg-[#3b2308] text-[#fbbf24] border border-[#78350f]/60"
                  : selectedRisk.tier === "Moderate"
                  ? "bg-[#132845] text-[#38bdf8] border border-[#1d4ed8]/50"
                  : "bg-[#053c2e] text-[#52c7ad] border border-[#16785d]/60"
              }`}
            >
              {selectedRisk.tier}
            </span>
          </div>

          {/* Metric 2: Rainfall Telemetry */}
          <div className="p-3.5 rounded-xl bg-[#111c2e] border border-[#1e2c44] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-semibold text-[#8fa0b5] uppercase tracking-wider block">
                Catchment Rain
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-[#f1f5f9] font-mono">
                  {selectedCorridor.rainfall}
                </span>
                <span className="text-xs text-[#8c96af] font-normal">
                  / {selectedCorridor.rainThreshold || 144}mm
                </span>
              </div>
            </div>
            <CloudRain className="w-4 h-4 text-[#8fa0b5]" />
          </div>

          {/* Metric 3: Glacial Lake (GLOF) Watch */}
          <div className="p-3.5 rounded-xl bg-[#111c2e] border border-[#1e2c44] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-semibold text-[#8fa0b5] uppercase tracking-wider block">
                Glacial Lake Area
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-[#f1f5f9] font-mono">
                  +{selectedCorridor.lakeChange || 3.8}%
                </span>
                <span className="text-xs text-[#8c96af] font-normal">NDWI</span>
              </div>
            </div>
            <Satellite className="w-4 h-4 text-[#8fa0b5]" />
          </div>

          {/* Metric 4: Active SOS Alerts */}
          <div className="p-3.5 rounded-xl bg-[#111c2e] border border-[#1e2c44] flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-semibold text-[#8fa0b5] uppercase tracking-wider block">
                Active SOS Alerts
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span
                  className={`text-xl font-bold font-mono ${
                    pendingSosCount > 0 ? "text-[#fb7185]" : "text-[#f1f5f9]"
                  }`}
                >
                  {pendingSosCount}
                </span>
                <span className="text-xs text-[#8c96af] font-normal">Pending</span>
              </div>
            </div>
            <Radio className={`w-4 h-4 text-[#8fa0b5] ${pendingSosCount > 0 ? "text-[#fb7185] animate-pulse" : ""}`} />
          </div>

          {/* Metric 5: Active SAR Fleet Sorties */}
          <div className="p-3.5 rounded-xl bg-[#111c2e] border border-[#1e2c44] flex items-center justify-between col-span-2 sm:col-span-1 shadow-sm">
            <div>
              <span className="text-[11px] font-semibold text-[#8fa0b5] uppercase tracking-wider block">
                Active SAR Fleet
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span
                  className={`text-xl font-bold font-mono ${
                    dispatchedTeams.length > 0 ? "text-[#38bdf8]" : "text-[#f1f5f9]"
                  }`}
                >
                  {dispatchedTeams.length}
                </span>
                <span className="text-xs text-[#8c96af] font-normal">In Flight</span>
              </div>
            </div>
            <HelicopterIcon className={`w-4 h-4 text-[#8fa0b5] ${dispatchedTeams.length > 0 ? "text-[#38bdf8]" : ""}`} />
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: MAP + CONTROL DRAWER */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* MAP CANVAS */}
        <div className="flex-1 h-full min-h-[350px] relative bg-[#0b1320]">
          <ModernHazardMap
            corridor={selectedCorridor}
            assets={assets}
            mode="admin"
            distressBeacons={distressBeacons}
            dispatchedTeams={dispatchedTeams}
            simulatedWaterRise={waterSurge}
            userPosition={userPosition}
            className="w-full h-full"
          />
        </div>

        {/* OPERATIONS SIDEBAR (~380px) */}
        <aside className="w-full lg:w-[380px] xl:w-[400px] shrink-0 h-full flex flex-col bg-[#0b1320] border-l border-[#1c2738] overflow-y-auto custom-scrollbar">
          {/* A. FLOOD SURGE SIMULATOR */}
          <div className="p-5 border-b border-[#1c2738] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-white" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  FLOOD SURGE SIMULATOR
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-medium text-[#22d3ee] bg-[#0c2e42] border border-[#0891b2]/80">
                +{waterSurge.toFixed(1)}m Rise
              </span>
            </div>

            {/* Glowing Luminous Slider Track & Capsule Thumb */}
            <div className="relative w-full h-2.5 rounded-full bg-[#1e293b] border border-[#2b3a4e] flex items-center mt-3">
              {/* Luminous cyan/blue gradient fill with glow aura */}
              <div
                className="absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-[#3b82f6]/40 via-[#60a5fa]/75 to-[#93c5fd] shadow-[0_0_14px_rgba(96,165,250,0.65)]"
                style={{ width: `${Math.max(3, Math.min(100, (waterSurge / 5) * 100))}%` }}
              />
              {/* Capsule Thumb with vertical notch */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-6 rounded-md bg-[#8fa8c7] border border-[#cbd5e1] shadow-md flex items-center justify-center pointer-events-none"
                style={{ left: `${Math.max(2, Math.min(98, (waterSurge / 5) * 100))}%` }}
              >
                <div className="w-0.5 h-3 bg-[#475569] rounded-full" />
              </div>
              {/* Native range input on top for full accessibility & smooth dragging */}
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={waterSurge}
                onChange={(e) => setWaterSurge(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            </div>

            <div className="flex justify-between text-xs font-mono text-[#8fa0b5] pt-0.5">
              <span>0m (Baseline)</span>
              <span>2.5m</span>
              <span>5.0m (Max)</span>
            </div>

            <p className="text-xs text-[#8fa0b5] leading-relaxed pt-0.5">
              {waterSurge === 0
                ? "River channel within natural embankment."
                : `Simulating +${waterSurge}m inundation surge. River buffer expands ~${Math.round(
                    20 + waterSurge * 35
                  )}m laterally.`}
            </p>
          </div>

          {/* B. SCENARIO DRILL TRIGGER */}
          <div className="p-5 border-b border-[#1c2738] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                DRILL SCENARIOS
              </h3>
              <span className="text-xs text-[#8fa0b5] font-mono">
                {activeScenario.charAt(0).toUpperCase() + activeScenario.slice(1)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "baseline", label: "Baseline Normal" },
                { id: "cloudburst_spike", label: "Cloudburst Spike" },
                { id: "glof_lake_expansion", label: "GLOF Outburst" },
                { id: "seismic_tremor", label: "3.6M Tremor" },
              ].map((s) => {
                const isActive = activeScenario === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleTriggerScenario(s.id)}
                    className={`py-3.5 px-4 rounded-2xl border text-left text-xs sm:text-sm font-medium cursor-pointer transition-all ${
                      isActive
                        ? "bg-[#16273e] border-2 border-[#38bdf8] shadow-[0_0_16px_rgba(56,189,248,0.38)] text-[#38bdf8] font-bold"
                        : "bg-[#131d2e] border border-[#1e2c44] text-[#8fa0b5] hover:bg-[#18253a] hover:border-[#2a4060] hover:text-[#f1f5f9]"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* C. BROADCAST EMERGENCY ADVISORY */}
          <div className="p-5 flex-1 flex flex-col space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#8fa0b5]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  BROADCAST ADVISORY
                </h3>
              </div>
              <span className="text-xs text-[#8fa0b5] font-mono">SMS & App</span>
            </div>

            {advisorySent && (
              <div className="p-3 rounded-2xl bg-[#053c2e] border border-[#16785d]/60 text-[#52c7ad] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#52c7ad] shrink-0" />
                <span>Advisory successfully transmitted across channels!</span>
              </div>
            )}

            <textarea
              value={advisoryText}
              onChange={(e) => setAdvisoryText(e.target.value)}
              placeholder={`Type advisory for ${selectedCorridor.name} (default alert will be used if empty)...`}
              rows={3}
              className="w-full bg-[#131d2e] border border-[#1e2c44] rounded-2xl p-3.5 text-xs text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none focus:border-[#38bdf8] focus:shadow-[0_0_12px_rgba(56,189,248,0.25)] resize-none"
            />

            <button
              onClick={handleBroadcast}
              className="w-full py-3 px-4 rounded-2xl bg-[#2f4a70] hover:bg-[#385885] active:bg-[#284062] border border-[#446594]/50 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2.5 cursor-pointer shadow-md shadow-black/25"
            >
              <Send className="w-4 h-4 text-white" />
              <span>Broadcast Official Advisory</span>
            </button>

            {/* Active SAR Fleet Live Telemetry Card */}
            <div className="p-3.5 rounded-2xl bg-[#131d2e] border border-[#1e2c44] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white uppercase tracking-wider text-xs">
                  <span className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
                  <span>ACTIVE SAR FLEET ({activeFleetItems.length})</span>
                </div>
                <span className="text-[10px] text-[#8fa0b5] font-mono">Live Sync</span>
              </div>

              {activeFleetItems.slice(0, 2).map((team) => (
                <div
                  key={team.id}
                  className="pt-2 border-t border-[#1c2738] flex items-center justify-between text-xs"
                >
                  <div className="truncate max-w-[210px] text-[#8fa0b5]">
                    <span className="font-semibold text-[#f1f5f9]">{team.callSign}</span>
                    <span className="ml-1 text-[#8fa0b5]">({team.targetName})</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-medium ${
                      team.isOnSite
                        ? "bg-[#123832] text-[#5eead4] border border-[#175c50]"
                        : "bg-[#1c2e4a] text-[#38bdf8] border border-[#2a456c]"
                    }`}
                  >
                    {team.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
