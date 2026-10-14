import React, { useState, useMemo, useCallback } from "react";
import { FullScreenHazardMap } from "../map/FullScreenHazardMap";
import { SentinelLakeModal } from "../SentinelLakeModal";
import { ValleyElevationProfileModal } from "../ValleyElevationProfileModal";
import { SitrepExportModal } from "../SitrepExportModal";
import { TimesfmForecastChart } from "../TimesfmForecastChart";
import { MapAsset, CORRIDOR_CONFIGS, CORRIDOR_SENTINEL_LAKES } from "../../data/hazardMapData";
import { Language } from "../../data/localization";
import { useUserRole } from "../../context/UserRoleContext";
import { playConfirmationBeep, playEmergencyChime } from "../../utils/audioAlert";
import {
  Layers,
  Activity,
  SlidersHorizontal,
  FileText,
  TrendingDown,
  Satellite,
  RefreshCw,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  BarChart3,
  Waves,
  Compass,
  Radio,
  CheckCircle2,
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

  // Modals state
  const [inspectingLake, setInspectingLake] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSitrepModal, setShowSitrepModal] = useState(false);
  const [showTimesfmModal, setShowTimesfmModal] = useState(false);
  const [advisorySentToast, setAdvisorySentToast] = useState(false);

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

  // Trigger Disaster Simulation Drill
  const triggerDrill = useCallback(
    async (scenarioId: string) => {
      playConfirmationBeep();
      if (scenarioId === "critical_cascade") {
        playEmergencyChime();
      }
      await handleTriggerScenario(scenarioId);
    },
    [handleTriggerScenario]
  );

  // Broadcast National Advisory
  const handleQuickAdvisory = useCallback(() => {
    playEmergencyChime();
    broadcastAdvisory({
      corridorId: selectedId,
      tier: selectedRisk.tier || "High",
      messageEn: `National Emergency Advisory: Active flood surge watch in ${selectedCorridor.name}. Evacuate gorge floors.`,
      messageNe: `राष्ट्रिय विपद् सूचना: ${selectedCorridor.name} क्षेत्रमा बाढी तथा पहिरोको उच्च जोखिम। नदी किनार तत्काल खाली गर्नुहोस्।`,
      smsDraft: `HIMALSANKET ALERT: High flood risk in ${selectedCorridor.name}. Move uphill immediately!`,
      issuedBy: "NDRRMA Emergency Operations Center (Level 4)",
    });
    setAdvisorySentToast(true);
    setTimeout(() => setAdvisorySentToast(false), 4000);
  }, [selectedId, selectedRisk, selectedCorridor, broadcastAdvisory]);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-[#0A1224] text-slate-100 overflow-hidden relative">
      {/* 1. TOP ENTERPRISE HUD BAR (Floating glassmorphism strip) */}
      <div className="p-2 sm:p-3 bg-[#0F1B33]/90 border-b border-[#2A3B5E] backdrop-blur-xl z-20 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        {/* Left: Corridor & Fused Mathematical Score */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white flex items-center gap-1.5">
              <span>🛡️ {selectedCorridor.name}</span>
            </span>
            <span className="text-xs text-[#64748B] font-mono">({selectedCorridor.region})</span>
          </div>

          <div
            className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 ${
              selectedRisk.tier === "Critical"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse"
                : selectedRisk.tier === "High"
                ? "bg-orange-500/20 text-orange-300 border-orange-500/50"
                : selectedRisk.tier === "Moderate"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-ping" />
            <span>{selectedRisk.tier} RISK</span>
            <span className="font-mono">({Math.round((selectedRisk.score || 0.3) * 100)}%)</span>
          </div>
        </div>

        {/* Center: Live Sensor HUD Gauges */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B]">Rainfall:</span>
            <strong className="text-cyan-300 font-mono">{selectedCorridor.rainfall}mm</strong>
            <span className="text-[10px] text-[#64748B]">/ {selectedCorridor.rainThreshold}mm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B]">Seismic:</span>
            <strong className="text-amber-300 font-mono">{selectedCorridor.seismic} M</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B]">Lake Delta:</span>
            <strong className="text-rose-300 font-mono">+{selectedCorridor.lakeChange}%</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B]">Slope Susceptibility:</span>
            <strong className="text-white font-mono">{selectedCorridor.susceptibility}</strong>
          </div>
        </div>

        {/* Right: Simulation Presentation Bar + Sync */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Scenario Pills for Summit Presentation */}
          <div className="flex items-center gap-1 bg-[#16233F] p-1 rounded-xl border border-[#2A3B5E] text-xs">
            <span className="text-[10px] text-[#64748B] uppercase font-bold px-1 hidden xl:inline">Drills:</span>
            <button
              onClick={() => triggerDrill("baseline")}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeScenario === "baseline" ? "bg-cyan-600 text-white shadow" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              Baseline
            </button>
            <button
              onClick={() => triggerDrill("cloudburst_spike")}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeScenario === "cloudburst_spike" ? "bg-orange-600 text-white shadow" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              🌧️ Cloudburst
            </button>
            <button
              onClick={() => triggerDrill("glof_lake_expansion")}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeScenario === "glof_lake_expansion" ? "bg-cyan-600 text-white shadow" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              🛰️ GLOF
            </button>
            <button
              onClick={() => triggerDrill("critical_cascade")}
              className={`px-2 py-0.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeScenario === "critical_cascade" ? "bg-rose-600 text-white shadow animate-pulse" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              🚨 Cascade
            </button>
          </div>

          {/* Sync Button */}
          <button
            onClick={() => syncLiveTelemetry(selectedId)}
            disabled={isSensingSyncing}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#1C2C4C] hover:bg-[#2A3B5E] text-cyan-300 border border-[#2A3B5E] text-xs font-semibold cursor-pointer disabled:opacity-50"
            title="Poll DHM & USGS Feeds"
          >
            <RefreshCw className={`w-3 h-3 ${isSensingSyncing ? "animate-spin text-cyan-400" : ""}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* 2. FULL-SCREEN GIS CANVAS CONTAINER */}
      <div className="flex-1 relative w-full h-full min-h-[450px]">
        <FullScreenHazardMap
          corridor={selectedCorridor}
          assets={assets}
          mode="admin"
          userPosition={userPosition}
          distressBeacons={distressBeacons}
          simulatedWaterRise={waterSurge}
          showSurgeControls={true}
          onSurgeChange={setWaterSurge}
          className="w-full h-full"
        />

        {/* Floating Bottom Left: Corridor Quick Switcher */}
        <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-1 p-1 rounded-2xl bg-[#0F1B33]/90 backdrop-blur-xl border border-[#2A3B5E] shadow-2xl">
          {corridors.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                playConfirmationBeep();
                setSelectedId(c.id);
                syncLiveTelemetry(c.id);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedId === c.id
                  ? "bg-cyan-600 text-white shadow-lg"
                  : "text-[#94A3B8] hover:text-white hover:bg-[#1C2C4C]"
              }`}
            >
              {c.name.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Floating Bottom Right: Tactical Tools Dock */}
        <div className="absolute bottom-16 sm:bottom-4 right-3 sm:right-4 z-10 flex items-center gap-2">
          {/* TimesFM 24h Forecast Modal Button */}
          <button
            onClick={() => {
              playConfirmationBeep();
              setShowTimesfmModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F1B33]/90 hover:bg-[#1C2C4C] backdrop-blur-xl border border-[#2A3B5E] text-cyan-300 hover:text-white text-xs font-bold shadow-2xl cursor-pointer transition-all"
            title="Inspect Google TimesFM 24h Rainfall Forecast"
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">TimesFM Forecast</span>
          </button>

          {/* Sentinel-2 Lake Inspector Button */}
          <button
            onClick={() => {
              playConfirmationBeep();
              const lake =
                liveData?.sentinel_satellite_lake ||
                (CORRIDOR_SENTINEL_LAKES as any)[selectedId] ||
                (CORRIDOR_SENTINEL_LAKES as any).langtang;
              setInspectingLake(lake);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F1B33]/90 hover:bg-[#1C2C4C] backdrop-blur-xl border border-[#2A3B5E] text-sky-300 hover:text-white text-xs font-bold shadow-2xl cursor-pointer transition-all"
            title="Inspect ESA Sentinel-2 Glacial Lake NDWI"
          >
            <Satellite className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Sentinel-2 Lake</span>
          </button>

          {/* Valley Profile Button */}
          <button
            onClick={() => {
              playConfirmationBeep();
              setShowProfileModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F1B33]/90 hover:bg-[#1C2C4C] backdrop-blur-xl border border-[#2A3B5E] text-amber-300 hover:text-white text-xs font-bold shadow-2xl cursor-pointer transition-all"
            title="Longitudinal Elevation & Flood Wave Velocity Profile"
          >
            <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Valley Profile</span>
          </button>

          {/* SITREP & Satellite SMS Export */}
          <button
            onClick={() => {
              playConfirmationBeep();
              setShowSitrepModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 backdrop-blur-xl border border-emerald-400/40 text-white text-xs font-extrabold shadow-2xl cursor-pointer transition-all"
            title="Compile Official Situation Report & 2G SMS Broadcast"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>SITREP & SMS</span>
          </button>

          {/* Quick 1-Click National Advisory Broadcast */}
          <button
            onClick={handleQuickAdvisory}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-2xl cursor-pointer transition-all border border-rose-400/40"
            title="Broadcast National Emergency Warning"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">Broadcast Advisory</span>
          </button>
        </div>
      </div>

      {/* Advisory Sent Toast */}
      {advisorySentToast && (
        <div className="fixed top-16 right-6 z-50 p-3 rounded-2xl bg-emerald-600 border border-emerald-400 text-white shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-xs font-bold">National Advisory Broadcasted across Radio & Satellite Relays!</span>
        </div>
      )}

      {/* MODALS */}
      {inspectingLake && (
        <SentinelLakeModal
          lake={inspectingLake}
          onClose={() => setInspectingLake(null)}
          language={language}
        />
      )}

      {showProfileModal && (
        <ValleyElevationProfileModal
          corridorId={selectedId}
          waterSurge={waterSurge}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {showSitrepModal && (
        <SitrepExportModal
          corridor={selectedCorridor}
          risk={selectedRisk}
          liveData={liveData}
          waterSurge={waterSurge}
          onClose={() => setShowSitrepModal(false)}
        />
      )}

      {showTimesfmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0F1B33] border border-[#2A3B5E] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#16233F] border-b border-[#2A3B5E] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-white text-sm">Google TimesFM 24h Precipitation Forecast</span>
              </div>
              <button
                onClick={() => setShowTimesfmModal(false)}
                className="text-[#94A3B8] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <TimesfmForecastChart
                corridorId={selectedId}
                corridorName={selectedCorridor.name}
                currentRainfall={selectedCorridor.rainfall}
                rainThreshold={selectedCorridor.rainThreshold || 144}
                activeScenario={activeScenario}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
