import React, { useState, useMemo, useCallback } from "react";
import { FullScreenHazardMap } from "../map/FullScreenHazardMap";
import { TelemetryMetricsSidebar } from "../dashboard/TelemetryMetricsSidebar";
import { IncidentQueueTable } from "../dashboard/IncidentQueueTable";
import { SentinelLakeModal } from "../SentinelLakeModal";
import { ValleyElevationProfileModal } from "../ValleyElevationProfileModal";
import { SitrepExportModal } from "../SitrepExportModal";
import { TimesfmForecastChart } from "../TimesfmForecastChart";
import {
  MapAsset,
  CORRIDOR_CONFIGS,
  CORRIDOR_SENTINEL_LAKES,
  CORRIDOR_RESCUE_BASES,
} from "../../data/hazardMapData";
import { Language } from "../../data/localization";
import { useUserRole, DistressBeacon } from "../../context/UserRoleContext";
import { playConfirmationBeep, playEmergencyChime } from "../../utils/audioAlert";
import { CheckCircle2, BarChart3, Activity, Map as MapIcon, X } from "lucide-react";

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
  const { distressBeacons, broadcastAdvisory, updateBeaconStatus } = useUserRole();

  // Selected victim / beacon to focus Google Map
  const [selectedBeacon, setSelectedBeacon] = useState<DistressBeacon | null>(null);

  // Mobile View Toggle: "operations" (Map + Table) vs "telemetry" (Left Column)
  const [mobileTab, setMobileTab] = useState<"operations" | "telemetry">("operations");

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

  // Helicopter Forward Bases for this corridor
  const forwardBases = useMemo(() => {
    return CORRIDOR_RESCUE_BASES[selectedId] || CORRIDOR_RESCUE_BASES.langtang || [];
  }, [selectedId]);

  // Focus victim location on map with slight zoom
  const handleSelectVictim = useCallback((beacon: DistressBeacon) => {
    playConfirmationBeep();
    setSelectedBeacon({ ...beacon });
  }, []);

  // Dispatch SAR Team
  const handleDispatch = useCallback(
    (beacon: DistressBeacon) => {
      playConfirmationBeep();
      updateBeaconStatus(beacon.id, "dispatched", "APF Mountain Rescue Squad 1");
    },
    [updateBeaconStatus]
  );

  // Mark Beacon Extracted / Resolved
  const handleResolve = useCallback(
    (beacon: DistressBeacon) => {
      playConfirmationBeep();
      updateBeaconStatus(beacon.id, "rescued");
    },
    [updateBeaconStatus]
  );

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
      messageEn: `National Emergency Advisory: Active flood surge watch in ${selectedCorridor.name}. Evacuate gorge floors immediately.`,
      messageNe: `राष्ट्रिय विपद् सूचना: ${selectedCorridor.name} क्षेत्रमा बाढी तथा पहिरोको उच्च जोखिम। नदी किनार तत्काल खाली गर्नुहोस्।`,
      smsDraft: `HIMALSANKET ALERT: High flood risk in ${selectedCorridor.name}. Move uphill immediately!`,
      issuedBy: "NDRRMA Emergency Operations Center (Level 4)",
    });
    setAdvisorySentToast(true);
    setTimeout(() => setAdvisorySentToast(false), 4000);
  }, [selectedId, selectedRisk, selectedCorridor, broadcastAdvisory]);

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[#080E19] text-[#F8FAFC] overflow-hidden relative">
      {/* Mobile Tab Switcher (Visible only below lg) */}
      <div className="lg:hidden flex items-center justify-between p-2 bg-[#101A2A] border-b border-[#27364B] shrink-0 text-xs">
        <div className="flex items-center gap-1 bg-[#080E19] p-0.5 rounded-lg border border-[#27364B]">
          <button
            onClick={() => setMobileTab("operations")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
              mobileTab === "operations"
                ? "bg-[#152238] text-cyan-400 border border-cyan-500/40 shadow-sm"
                : "text-[#A7B4C8] hover:text-[#F8FAFC]"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Map & Incidents</span>
          </button>
          <button
            onClick={() => setMobileTab("telemetry")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
              mobileTab === "telemetry"
                ? "bg-[#152238] text-cyan-400 border border-cyan-500/40 shadow-sm"
                : "text-[#A7B4C8] hover:text-[#F8FAFC]"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Risk Telemetry</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#A7B4C8]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span>{selectedCorridor.name.split(" ")[0]}</span>
        </div>
      </div>

      {/* TRANSCOPE HIGH-DENSITY BENTO COMMAND GRID */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Telemetry & Multi-Hazard Intelligence (~360px-400px width on desktop) */}
        <div
          className={`w-full lg:w-[360px] xl:w-[410px] shrink-0 h-full ${
            mobileTab === "telemetry" ? "flex" : "hidden lg:flex"
          } flex-col min-h-0`}
        >
          <TelemetryMetricsSidebar
            corridor={selectedCorridor}
            risk={selectedRisk}
            liveData={liveData}
            activeScenario={activeScenario}
            onTriggerScenario={triggerDrill}
            waterSurge={waterSurge}
            onSurgeChange={setWaterSurge}
            isSensingSyncing={isSensingSyncing}
            onSyncTelemetry={() => syncLiveTelemetry(selectedId)}
            forwardBases={forwardBases}
            onInspectLake={() => {
              playConfirmationBeep();
              const lake =
                liveData?.sentinel_satellite_lake ||
                (CORRIDOR_SENTINEL_LAKES as any)[selectedId] ||
                (CORRIDOR_SENTINEL_LAKES as any).langtang;
              setInspectingLake(lake);
            }}
            onInspectProfile={() => {
              playConfirmationBeep();
              setShowProfileModal(true);
            }}
            onInspectTimesfm={() => {
              playConfirmationBeep();
              setShowTimesfmModal(true);
            }}
            onOpenSitrep={() => {
              playConfirmationBeep();
              setShowSitrepModal(true);
            }}
            onBroadcastAdvisory={handleQuickAdvisory}
            role="admin"
            className="w-full h-full"
          />
        </div>

        {/* RIGHT COLUMN: Framed GIS Map Viewport (Upper) + Structured Incident Table (Lower) */}
        <div
          className={`flex-1 flex flex-col min-w-0 min-h-0 bg-[#080E19] ${
            mobileTab === "operations" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* UPPER PANE: Framed High-Performance GIS Map */}
          <div className="flex-1 min-h-[300px] lg:min-h-[380px] p-2.5 sm:p-3 pb-1.5 flex flex-col">
            <div className="w-full h-full rounded-2xl overflow-hidden border border-[#27364B] shadow-2xl relative bg-[#101A2A] flex flex-col">
              {/* Sleek Command Frame Bar */}
              <div className="px-3 py-1.5 bg-[#080E19] border-b border-[#27364B] flex items-center justify-between gap-2 shrink-0 z-10">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                    <span>GIS Tactical Operations Map</span>
                  </span>
                  <span className="text-[10px] text-[#A7B4C8] font-mono hidden sm:inline">
                    • 3D Digital Elevation Model
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-[#A7B4C8]">
                  <span className="text-cyan-400 font-mono font-bold">{selectedCorridor.name}</span>
                  {selectedBeacon && (
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40 font-mono animate-pulse">
                      Focus: #{String(selectedBeacon.id).slice(-4)}
                    </span>
                  )}
                </div>
              </div>

              {/* Map Canvas */}
              <div className="flex-1 relative w-full h-full min-h-0">
                <FullScreenHazardMap
                  corridor={selectedCorridor}
                  assets={assets}
                  mode="admin"
                  userPosition={userPosition}
                  distressBeacons={distressBeacons}
                  selectedBeacon={selectedBeacon}
                  onSelectBeacon={handleSelectVictim}
                  simulatedWaterRise={waterSurge}
                  showSurgeControls={false}
                  onSurgeChange={setWaterSurge}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>

          {/* LOWER PANE: Structured High-Density Incidents Table */}
          <div className="h-[260px] sm:h-[280px] xl:h-[310px] shrink-0 p-2.5 sm:p-3 pt-1.5 flex flex-col">
            <div className="w-full h-full rounded-2xl overflow-hidden border border-[#27364B] shadow-2xl bg-[#101A2A] flex flex-col">
              <IncidentQueueTable
                beacons={distressBeacons}
                selectedBeacon={selectedBeacon}
                onSelectBeacon={handleSelectVictim}
                onDispatchBeacon={handleDispatch}
                onResolveBeacon={handleResolve}
                corridorName={selectedCorridor.name}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Advisory Sent Toast */}
      {advisorySentToast && (
        <div className="fixed top-16 right-6 z-50 p-3 rounded-xl bg-emerald-700 border border-emerald-500 text-white shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="text-xs font-bold">
            National Advisory Broadcasted across Radio & Satellite Relays!
          </span>
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
          <div className="w-full max-w-2xl rounded-2xl bg-[#101A2A] border border-[#27364B] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#080E19] border-b border-[#27364B] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-white text-sm">
                  Google TimesFM 24h Precipitation Forecast
                </span>
              </div>
              <button
                onClick={() => setShowTimesfmModal(false)}
                className="p-1 rounded-lg text-[#A7B4C8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar">
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
