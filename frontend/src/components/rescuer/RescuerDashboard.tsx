import React, { useState, useMemo, useCallback } from "react";
import { FullScreenHazardMap } from "../map/FullScreenHazardMap";
import { MobileBottomSheet } from "../mobile/MobileBottomSheet";
import { IncidentQueueTable } from "../dashboard/IncidentQueueTable";
import { MapAsset, CORRIDOR_RESCUE_BASES } from "../../data/hazardMapData";
import { Language } from "../../data/localization";
import { useUserRole, DistressBeacon } from "../../context/UserRoleContext";
import { playConfirmationBeep, playEmergencyChime } from "../../utils/audioAlert";
import {
  Radio,
  CheckCircle2,
  Clock,
  Plane,
  Users,
  MapPin,
  Filter,
  Mic,
  Crosshair,
  Shield,
  Activity,
  Map as MapIcon,
} from "lucide-react";

interface RescuerDashboardProps {
  corridor: any;
  userPosition: { lat: number; lng: number; accuracy?: number; altitude?: number } | null;
  onLocateMe: () => void;
  language: Language;
  assets: MapAsset[];
  activeScenario?: string;
  waterSurge?: number;
}

export function RescuerDashboard({
  corridor,
  userPosition,
  onLocateMe,
  language,
  assets,
  activeScenario = "baseline",
  waterSurge = 0,
}: RescuerDashboardProps) {
  const { distressBeacons, updateBeaconStatus, fieldDispatches, userProfile } = useUserRole();

  const [selectedBeacon, setSelectedBeacon] = useState<DistressBeacon | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "rescued">("active");
  const [activeTab, setActiveTab] = useState<"beacons" | "aviation" | "dispatches">("beacons");
  const [sheetPosition, setSheetPosition] = useState<"peek" | "half" | "full">("half");

  // Mobile view toggle (Operations vs Tactical Telemetry)
  const [mobileView, setMobileView] = useState<"map_and_table" | "tactical_sheet">("map_and_table");

  // Helicopter Forward Bases for this corridor
  const forwardBases = useMemo(() => {
    return CORRIDOR_RESCUE_BASES[corridor.id] || CORRIDOR_RESCUE_BASES.langtang || [];
  }, [corridor.id]);

  // Focus victim location on map with slight zoom and collapse sheet to peek on mobile
  const handleSelectVictim = useCallback((beacon: DistressBeacon) => {
    playConfirmationBeep();
    setSelectedBeacon({ ...beacon });
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSheetPosition("peek");
    }
  }, []);

  // Quick Dispatch Handler
  const handleDispatch = useCallback(
    (beacon: DistressBeacon) => {
      playConfirmationBeep();
      updateBeaconStatus(beacon.id, "dispatched", "APF Mountain Rescue Squad 1");
    },
    [updateBeaconStatus]
  );

  // Mark Rescued
  const handleMarkRescued = useCallback(
    (beacon: DistressBeacon) => {
      playConfirmationBeep();
      updateBeaconStatus(beacon.id, "rescued");
    },
    [updateBeaconStatus]
  );

  const pendingCount = distressBeacons.filter((b) => b.status === "pending").length;

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[#070D18] text-slate-100 overflow-hidden relative">
      {/* 1. DESKTOP BENTO COMMAND CENTER (lg and above) */}
      <div className="hidden lg:flex flex-1 flex-row min-h-0 overflow-hidden">
        {/* LEFT COLUMN: SAR Tactical Queue & Aviation Fleet Sidebar (~380px) */}
        <aside className="w-[360px] xl:w-[410px] shrink-0 h-full flex flex-col bg-[#0A1224] border-r border-[#1E293B] overflow-hidden">
          {/* Tactical Header */}
          <div className="p-3.5 border-b border-[#1E293B] bg-[#070D18]/80 backdrop-blur-sm flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-sm">
                🚁
              </div>
              <div>
                <div className="text-xs font-black text-amber-400 uppercase tracking-wide flex items-center gap-2">
                  <span>SAR Operations Command</span>
                  {pendingCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                  )}
                </div>
                <div className="text-[10px] text-[#64748B] font-mono">
                  {userProfile.station || "Dhunche Forward Helipad Base"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-[#111A2E] p-1 rounded-xl border border-[#1E293B] text-[11px]">
              <button
                onClick={() => setActiveTab("beacons")}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "beacons" ? "bg-amber-600 text-white shadow" : "text-[#94A3B8] hover:text-white"
                }`}
              >
                SOS ({distressBeacons.length})
              </button>
              <button
                onClick={() => setActiveTab("aviation")}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "aviation" ? "bg-amber-600 text-white shadow" : "text-[#94A3B8] hover:text-white"
                }`}
              >
                Aviation
              </button>
              <button
                onClick={() => setActiveTab("dispatches")}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "dispatches" ? "bg-amber-600 text-white shadow" : "text-[#94A3B8] hover:text-white"
                }`}
              >
                Notes ({fieldDispatches.length})
              </button>
            </div>
          </div>

          {/* Sub-Views */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0 custom-scrollbar">
            {/* View 1: Active SAR Incident Cards (Quick Inspection) */}
            {activeTab === "beacons" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-[#94A3B8] px-1">
                  <span>Corridor: {corridor.name}</span>
                  <span className="font-mono text-cyan-300">{pendingCount} Pending Rescue</span>
                </div>

                {distressBeacons.map((beacon) => {
                  const isSelected = selectedBeacon?.id === beacon.id;
                  const isPending = beacon.status === "pending";

                  return (
                    <div
                      key={beacon.id}
                      onClick={() => handleSelectVictim(beacon)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? "bg-[#16294A] border-cyan-400 shadow-xl"
                          : "bg-[#0F1B33]/90 border-[#1E293B] hover:border-[#2A3B5E]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isPending ? "bg-rose-500 animate-ping" : "bg-emerald-400"
                            }`}
                          />
                          <span className="font-bold text-white text-xs">{beacon.name}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                            beacon.priority >= 90
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/50"
                          }`}
                        >
                          {beacon.priority}% SOS
                        </span>
                      </div>

                      <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed mb-2.5">
                        {beacon.detail}
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-[#1E293B]/70">
                        <span className="text-cyan-300">
                          {beacon.lat.toFixed(4)}°N, {beacon.lng.toFixed(4)}°E
                        </span>
                        <span className="text-amber-400">
                          {beacon.altitude ? `${beacon.altitude}m ASL` : "2,780m"}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectVictim(beacon);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#16233F] hover:bg-cyan-600 hover:text-white text-cyan-300 text-[10px] font-bold border border-[#2A3B5E] transition-all cursor-pointer"
                        >
                          <Crosshair className="w-3 h-3" />
                          <span>Focus Map</span>
                        </button>
                        {isPending && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDispatch(beacon);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Dispatch Team
                          </button>
                        )}
                        {beacon.status === "dispatched" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRescued(beacon);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Mark Extracted
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* View 2: Aviation Helipads & Fleet Readiness */}
            {activeTab === "aviation" && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#0F1B33]/90 border border-[#1E293B] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Plane className="w-4 h-4 text-amber-400" />
                      <span>Air Evac Squadron Readiness</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      Standby 100%
                    </span>
                  </div>
                  <div className="text-[11px] text-[#94A3B8] leading-tight">
                    Simrik Air AS350 B3e stationed at Dhunche Forward Helipad. Ready for high-altitude winch extraction up to 7,000m.
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider px-1">
                    Designated Mountain Helipads
                  </div>
                  {forwardBases.map((base, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-[#0F1B33]/90 border border-[#1E293B] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">🚁</span>
                        <div>
                          <div className="font-bold text-white">{base.name}</div>
                          <div className="text-[10px] text-[#64748B]">Capacity: 2 Helicopters</div>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-cyan-300 font-bold block">{base.elevation}m</span>
                        <span className="text-[9px] text-emerald-400">Pad Clear</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View 3: Ground Observations & Voice Transcripts */}
            {activeTab === "dispatches" && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider px-1">
                  Field Observer SITREPs
                </div>
                {fieldDispatches.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-2xl bg-[#0F1B33]/90 border border-[#1E293B] space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{d.senderName}</span>
                      </span>
                      <span className="text-[10px] text-[#64748B] font-mono">{d.time}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">"{d.note}"</p>
                    {d.aiClassification && (
                      <div className="text-[9px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                        {d.aiClassification}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: Upper Framed Map + Lower High-Density Incident Table */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#070D18]">
          {/* UPPER PANE: Framed High-Performance GIS Map */}
          <div className="flex-1 min-h-[360px] p-2.5 sm:p-3 pb-1.5 flex flex-col">
            <div className="w-full h-full rounded-2xl overflow-hidden border border-[#1E293B] shadow-2xl relative bg-[#0A1224] flex flex-col">
              {/* Sleek Command Frame Bar */}
              <div className="px-3 py-1.5 bg-[#090F1D]/90 border-b border-[#1E293B] flex items-center justify-between gap-2 shrink-0 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    <span>SAR Mountain Operations Grid</span>
                  </span>
                  <span className="text-[10px] text-[#64748B] font-mono hidden sm:inline">
                    • Live GPS Coordinates
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
                  <span className="text-amber-400 font-mono font-bold">{corridor.name}</span>
                  {selectedBeacon && (
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/40 font-mono animate-pulse">
                      Focus: {selectedBeacon.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Map Canvas */}
              <div className="flex-1 relative w-full h-full min-h-0">
                <FullScreenHazardMap
                  corridor={corridor}
                  assets={assets}
                  mode="rescuer"
                  userPosition={userPosition}
                  distressBeacons={distressBeacons}
                  selectedBeacon={selectedBeacon}
                  onSelectBeacon={handleSelectVictim}
                  onDispatchBeacon={handleDispatch}
                  onResolveBeacon={handleMarkRescued}
                  simulatedWaterRise={waterSurge}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>

          {/* LOWER PANE: Structured High-Density Incidents Table */}
          <div className="h-[270px] xl:h-[310px] shrink-0 p-2.5 sm:p-3 pt-1.5 flex flex-col">
            <div className="w-full h-full rounded-2xl overflow-hidden border border-[#1E293B] shadow-2xl bg-[#0A1224] flex flex-col">
              <IncidentQueueTable
                beacons={distressBeacons}
                selectedBeacon={selectedBeacon}
                onSelectBeacon={handleSelectVictim}
                onDispatchBeacon={handleDispatch}
                onResolveBeacon={handleMarkRescued}
                corridorName={corridor.name}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. MOBILE VIEWPORT (<1024px) WITH DRAGGABLE BOTTOM SHEET & MAP */}
      <div className="lg:hidden flex-1 relative w-full h-full min-h-0">
        <FullScreenHazardMap
          corridor={corridor}
          assets={assets}
          mode="rescuer"
          selectedBeacon={selectedBeacon}
          userPosition={userPosition}
          distressBeacons={distressBeacons}
          onSelectBeacon={(beacon) => {
            setSelectedBeacon(beacon);
            setSheetPosition("half");
          }}
          onDispatchBeacon={(beacon) => handleDispatch(beacon)}
          onResolveBeacon={(beacon) => handleMarkRescued(beacon)}
          simulatedWaterRise={waterSurge}
          className="w-full h-full"
        />

        {/* Mobile Draggable Bottom Sheet */}
        <MobileBottomSheet
          position={sheetPosition}
          onChangePosition={setSheetPosition}
          title="SAR Tactical Queue"
          badge={
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                pendingCount > 0
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {pendingCount > 0 ? `${pendingCount} Urgent SOS` : "All Clear"}
            </span>
          }
          peekContent={
            selectedBeacon ? (
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-1.5 text-rose-300 font-bold truncate">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block shrink-0" />
                  <span className="truncate">Focused: {selectedBeacon.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSheetPosition("half");
                  }}
                  className="text-[11px] text-cyan-400 underline font-semibold shrink-0 cursor-pointer pl-2"
                >
                  Expand
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                <span className="font-mono text-cyan-300">{corridor.name}</span>
                <span className="text-amber-400 font-bold">{distressBeacons.length} Incidents</span>
              </div>
            )
          }
        >
          <div className="p-3 space-y-2 bg-[#0F1B33] min-h-0">
            {distressBeacons.map((b) => (
              <div
                key={b.id}
                onClick={() => handleSelectVictim(b)}
                className="p-3 rounded-xl bg-[#16233F] border border-[#2A3B5E] text-xs space-y-1 cursor-pointer"
              >
                <div className="flex justify-between font-bold text-white">
                  <span>{b.name}</span>
                  <span className="text-rose-400 font-mono">{b.priority}% SOS</span>
                </div>
                <p className="text-[#94A3B8] text-[11px] line-clamp-2">{b.detail}</p>
                <div className="flex justify-end pt-1 gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectVictim(b);
                    }}
                    className="px-2 py-0.5 rounded bg-cyan-600 text-white font-bold text-[10px]"
                  >
                    Focus Map
                  </button>
                  {b.status === "pending" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDispatch(b);
                      }}
                      className="px-2 py-0.5 rounded bg-amber-600 text-white font-bold text-[10px]"
                    >
                      Dispatch
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </MobileBottomSheet>
      </div>
    </div>
  );
}
