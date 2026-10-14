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
  X,
  AlertTriangle,
  Send,
  Compass,
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
  const [selectedUnit, setSelectedUnit] = useState<string>("APF Mountain Rescue Squad 1");
  const [activeTab, setActiveTab] = useState<"aviation" | "dispatches">("aviation");
  const [sheetPosition, setSheetPosition] = useState<"peek" | "half" | "full">("half");

  // Helicopter Forward Bases for this corridor
  const forwardBases = useMemo(() => {
    return CORRIDOR_RESCUE_BASES[corridor.id] || CORRIDOR_RESCUE_BASES.langtang || [];
  }, [corridor.id]);

  // Focus victim location on map with slight zoom and collapse sheet to peek on mobile
  const handleSelectVictim = useCallback((beacon: DistressBeacon) => {
    playConfirmationBeep();
    setSelectedBeacon({ ...beacon });
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSheetPosition("half");
    }
  }, []);

  // Dispatch Handler
  const handleDispatch = useCallback(
    (beacon: DistressBeacon, unitName?: string) => {
      playConfirmationBeep();
      updateBeaconStatus(beacon.id, "dispatched", unitName || selectedUnit);
    },
    [updateBeaconStatus, selectedUnit]
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
    <div className="w-full h-full flex flex-col min-h-0 bg-[#080E19] text-[#F8FAFC] overflow-hidden relative">
      {/* 1. DESKTOP BENTO COMMAND CENTER (lg and above) */}
      <div className="hidden lg:flex flex-1 flex-row min-h-0 overflow-hidden">
        {/* LEFT COLUMN: SAR Tactical Queue, Aviation Fleet & Incident Detail Drawer (~380px) */}
        <aside className="w-[360px] xl:w-[410px] shrink-0 h-full flex flex-col bg-[#101A2A] border-r border-[#27364B] overflow-hidden">
          {/* Tactical Header */}
          <div className="p-3.5 border-b border-[#27364B] bg-[#080E19] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-sm">
                🚁
              </div>
              <div>
                <div className="text-xs font-black text-amber-400 uppercase tracking-wide flex items-center gap-2">
                  <span>SAR Tactical Command</span>
                  {pendingCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                  )}
                </div>
                <div className="text-[10px] text-[#A7B4C8] font-mono">
                  {userProfile.station || "Dhunche Forward Base"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-[#152238] p-1 rounded-lg border border-[#27364B] text-[11px]">
              <button
                onClick={() => setActiveTab("aviation")}
                className={`px-2.5 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                  activeTab === "aviation"
                    ? "bg-[#101A2A] text-amber-400 border border-[#27364B] shadow-sm"
                    : "text-[#A7B4C8] hover:text-[#F8FAFC]"
                }`}
              >
                Aviation
              </button>
              <button
                onClick={() => setActiveTab("dispatches")}
                className={`px-2.5 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                  activeTab === "dispatches"
                    ? "bg-[#101A2A] text-cyan-400 border border-[#27364B] shadow-sm"
                    : "text-[#A7B4C8] hover:text-[#F8FAFC]"
                }`}
              >
                SITREPs ({fieldDispatches.length})
              </button>
            </div>
          </div>

          {/* Sub-Views */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0 custom-scrollbar">
            {/* INCIDENT DETAIL & DISPATCH DRAWER (Displays whenever an incident is selected) */}
            {selectedBeacon ? (
              <div className="p-3.5 rounded-xl bg-[#152238] border border-cyan-500/40 space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-[#27364B] pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#080E19] border border-[#27364B] text-cyan-300 font-bold text-[10px] font-mono">
                        #SOS-{String(selectedBeacon.id).slice(-4)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                          selectedBeacon.priority >= 90
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {selectedBeacon.priority}% Urgency
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-[#F8FAFC] mt-1">{selectedBeacon.name}</h4>
                  </div>
                  <button
                    onClick={() => setSelectedBeacon(null)}
                    className="p-1 rounded-md text-[#A7B4C8] hover:text-[#F8FAFC] hover:bg-[#1E2D48] transition-colors cursor-pointer"
                    title="Close detail panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-[#A7B4C8]">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="flex items-center gap-1 text-[#F8FAFC]">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{selectedBeacon.lat.toFixed(4)}°N, {selectedBeacon.lng.toFixed(4)}°E</span>
                    </span>
                    <span className="text-amber-400 font-bold">
                      {selectedBeacon.altitude ? `${selectedBeacon.altitude}m ASL` : "2,780m"}
                    </span>
                  </div>
                  <p className="p-2.5 rounded-lg bg-[#080E19] border border-[#27364B] text-[#F8FAFC] leading-relaxed text-[11px]">
                    {selectedBeacon.detail}
                  </p>
                </div>

                {/* Team Assignment & Action Bar */}
                <div className="space-y-2 pt-1 border-t border-[#27364B]">
                  <label className="text-[10px] font-bold text-[#A7B4C8] uppercase tracking-wider block font-mono">
                    Assign Response Unit
                  </label>
                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-full bg-[#080E19] border border-[#27364B] rounded-lg p-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-cyan-500"
                  >
                    <option value="APF Mountain Rescue Squad 1">APF Mountain Rescue Squad 1 (Ground)</option>
                    <option value="Simrik Air AS350 B3e Winch Squad">Simrik Air AS350 B3e (Air Evac)</option>
                    <option value="Nepal Red Cross Mountain Triage Unit">Red Cross Mountain Triage</option>
                  </select>

                  <div className="flex items-center gap-2 pt-1">
                    {selectedBeacon.status === "pending" && (
                      <button
                        onClick={() => handleDispatch(selectedBeacon, selectedUnit)}
                        className="flex-1 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md"
                      >
                        <Plane className="w-3.5 h-3.5" />
                        <span>Dispatch Squad</span>
                      </button>
                    )}

                    {selectedBeacon.status === "dispatched" && (
                      <button
                        onClick={() => handleMarkRescued(selectedBeacon)}
                        className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-md"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Extracted</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleSelectVictim(selectedBeacon)}
                      className="py-2 px-3 rounded-lg bg-[#080E19] hover:bg-[#152238] text-cyan-300 border border-[#27364B] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Re-center map"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Re-center</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* View 1: Aviation Helipads & Fleet Readiness */}
            {activeTab === "aviation" && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#152238] border border-[#27364B] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#F8FAFC] flex items-center gap-1.5">
                      <Plane className="w-4 h-4 text-amber-400" />
                      <span>Air Evac Squadron Readiness</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      Standby 100%
                    </span>
                  </div>
                  <div className="text-[11px] text-[#A7B4C8] leading-tight">
                    Simrik Air AS350 B3e stationed at Dhunche Forward Base. Ready for winch extraction up to 7,000m ASL.
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-[#A7B4C8] uppercase tracking-wider px-1 font-mono">
                    Designated Mountain Helipads ({corridor.name})
                  </div>
                  {forwardBases.map((base, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#152238] border border-[#27364B] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">🚁</span>
                        <div>
                          <div className="font-bold text-[#F8FAFC]">{base.name}</div>
                          <div className="text-[10px] text-[#A7B4C8]">Capacity: 2 Aircraft</div>
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

            {/* View 2: Ground Observations & Voice Transcripts */}
            {activeTab === "dispatches" && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-[#A7B4C8] uppercase tracking-wider px-1 font-mono">
                  Field Observer SITREPs
                </div>
                {fieldDispatches.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl bg-[#152238] border border-[#27364B] space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#F8FAFC] flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{d.senderName}</span>
                      </span>
                      <span className="text-[10px] text-[#A7B4C8] font-mono">{d.time}</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed text-[11px]">"{d.note}"</p>
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

        {/* RIGHT COLUMN: Upper Framed GIS Map + Lower Structured High-Density Table */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#080E19]">
          {/* UPPER PANE: Framed High-Performance GIS Map */}
          <div className="flex-1 min-h-[360px] p-2.5 sm:p-3 pb-1.5 flex flex-col">
            <div className="w-full h-full rounded-2xl overflow-hidden border border-[#27364B] shadow-2xl relative bg-[#101A2A] flex flex-col">
              {/* Frame Bar */}
              <div className="px-3 py-1.5 bg-[#080E19] border-b border-[#27364B] flex items-center justify-between gap-2 shrink-0 z-10">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    <span>SAR Mountain Operations Grid</span>
                  </span>
                  <span className="text-[10px] text-[#A7B4C8] font-mono hidden sm:inline">
                    • Live GPS Coordinates
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#A7B4C8]">
                  <span className="text-amber-400 font-mono font-bold">{corridor.name}</span>
                  {selectedBeacon && (
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40 font-mono animate-pulse">
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
                  onDispatchBeacon={(beacon) => handleDispatch(beacon)}
                  onResolveBeacon={(beacon) => handleMarkRescued(beacon)}
                  simulatedWaterRise={waterSurge}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>

          {/* LOWER PANE: Structured High-Density Incident Table */}
          <div className="h-[270px] xl:h-[310px] shrink-0 p-2.5 sm:p-3 pt-1.5 flex flex-col">
            <div className="w-full h-full rounded-2xl overflow-hidden border border-[#27364B] shadow-2xl bg-[#101A2A] flex flex-col">
              <IncidentQueueTable
                beacons={distressBeacons}
                selectedBeacon={selectedBeacon}
                onSelectBeacon={handleSelectVictim}
                onDispatchBeacon={(beacon) => handleDispatch(beacon)}
                onResolveBeacon={(beacon) => handleMarkRescued(beacon)}
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
                <span className="text-amber-400 font-mono font-bold text-[10px]">
                  {selectedBeacon.priority}% SOS
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-[#A7B4C8] pt-1">
                <span>Total Distress Queue:</span>
                <span className="font-mono text-cyan-300 font-bold">{distressBeacons.length} Active Beacons</span>
              </div>
            )
          }
        >
          <div className="flex-1 flex flex-col min-h-0 bg-[#101A2A] overflow-hidden">
            <IncidentQueueTable
              beacons={distressBeacons}
              selectedBeacon={selectedBeacon}
              onSelectBeacon={(beacon) => {
                setSelectedBeacon(beacon);
                setSheetPosition("peek");
              }}
              onDispatchBeacon={(beacon) => handleDispatch(beacon)}
              onResolveBeacon={(beacon) => handleMarkRescued(beacon)}
              corridorName={corridor.name}
              className="w-full h-full"
            />
          </div>
        </MobileBottomSheet>
      </div>
    </div>
  );
}
