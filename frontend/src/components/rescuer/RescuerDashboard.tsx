import React, { useState, useMemo, useCallback } from "react";
import { FullScreenHazardMap } from "../map/FullScreenHazardMap";
import { MapAsset, CORRIDOR_RESCUE_BASES } from "../../data/hazardMapData";
import { Language } from "../../data/localization";
import { useUserRole, DistressBeacon } from "../../context/UserRoleContext";
import { playConfirmationBeep, playEmergencyChime } from "../../utils/audioAlert";
import {
  Radio,
  Crosshair,
  ShieldAlert,
  Send,
  CheckCircle2,
  Clock,
  Compass,
  AlertTriangle,
  Plane,
  Users,
  MapPin,
  ChevronRight,
  Filter,
  Mic,
  Maximize2,
  Minimize2,
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
  const [activeTab, setActiveTab] = useState<"beacons" | "dispatches" | "aviation">("beacons");

  // Filter beacons
  const filteredBeacons = useMemo(() => {
    return distressBeacons.filter((b) => {
      if (filterStatus === "active") return b.status !== "rescued";
      if (filterStatus === "rescued") return b.status === "rescued";
      return true;
    });
  }, [distressBeacons, filterStatus]);

  // Helicopter Forward Bases for this corridor
  const forwardBases = useMemo(() => {
    return CORRIDOR_RESCUE_BASES[corridor.id] || CORRIDOR_RESCUE_BASES.langtang || [];
  }, [corridor.id]);

  // Quick Dispatch Handler
  const handleDispatch = useCallback(
    (beaconId: string | number, unitName: string) => {
      playConfirmationBeep();
      updateBeaconStatus(beaconId, "dispatched", unitName);
    },
    [updateBeaconStatus]
  );

  // Mark Rescued
  const handleMarkRescued = useCallback(
    (beaconId: string | number) => {
      playConfirmationBeep();
      updateBeaconStatus(beaconId, "rescued");
    },
    [updateBeaconStatus]
  );

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-[#0A1224] text-slate-100 overflow-hidden relative">
      {/* 1. TACTICAL SAR HEADER BANNER */}
      <div className="p-3 bg-[#0F1B33]/95 border-b border-[#2A3B5E] backdrop-blur-md z-10 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-400 flex items-center justify-center font-black">
            🚁
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-700/60">
                SAR TACTICAL COMMAND
              </span>
              <span className="text-xs text-[#94A3B8] font-mono">
                Call Sign: <strong className="text-white">{userProfile.callSign || "EAGLE-SAR-3"}</strong>
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Station: <strong className="text-white">{userProfile.station || "Dhunche Helipad Post"}</strong> &bull; Corridor: <strong className="text-cyan-400">{corridor.name}</strong>
            </p>
          </div>
        </div>

        {/* Quick Triage Statistics Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-3 py-1 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 font-bold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>{distressBeacons.filter((b) => b.status === "pending").length} Pending SOS</span>
          </div>
          <div className="px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-bold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>{distressBeacons.filter((b) => b.status === "dispatched").length} Teams Dispatched</span>
          </div>
          <div className="px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{distressBeacons.filter((b) => b.status === "rescued").length} Extracted</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN SPLIT TACTICAL STAGE */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Triage Incident Queue & Ground Feeds (42% width) */}
        <div className="w-full lg:w-[460px] xl:w-[500px] flex flex-col bg-[#111A2E] border-r border-[#2A3B5E] overflow-hidden shrink-0">
          {/* Sub-Tabs: Beacons | Ground Dispatches | Aviation Clearance */}
          <div className="p-2 bg-[#0F1B33] border-b border-[#2A3B5E] flex items-center justify-between gap-1 text-xs">
            <button
              onClick={() => setActiveTab("beacons")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "beacons" ? "bg-amber-600 text-white shadow" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Distress Beacons ({distressBeacons.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("dispatches")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "dispatches" ? "bg-amber-600 text-white shadow" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Notes ({fieldDispatches.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("aviation")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "aviation" ? "bg-amber-600 text-white shadow" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              <span>Heli Window</span>
            </button>
          </div>

          {/* TAB 1: Distress Beacons Triage Queue */}
          {activeTab === "beacons" && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Filter Sub-bar */}
              <div className="px-3 py-2 bg-[#16233F]/70 border-b border-[#2A3B5E] flex items-center justify-between text-xs text-[#94A3B8]">
                <span>Triage Priority Queue</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFilterStatus("active")}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                      filterStatus === "active" ? "bg-rose-600 text-white" : "hover:text-white"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setFilterStatus("all")}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                      filterStatus === "all" ? "bg-cyan-600 text-white" : "hover:text-white"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStatus("rescued")}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                      filterStatus === "rescued" ? "bg-emerald-600 text-white" : "hover:text-white"
                    }`}
                  >
                    Rescued
                  </button>
                </div>
              </div>

              {/* Beacon Cards List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {filteredBeacons.map((b) => {
                  const isSelected = selectedBeacon?.id === b.id;
                  const isCrit = b.priority >= 90;

                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBeacon(b)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#1C2C4C] border-cyan-400 shadow-xl"
                          : "bg-[#0F1B33] border-[#2A3B5E] hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                            b.status === "rescued"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : isCrit
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          }`}
                        >
                          P{isCrit ? "0 CRITICAL" : "1 URGENT"} &bull; {b.priority}% Triage
                        </span>
                        <span className="text-[10px] text-[#64748B] font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{b.time}</span>
                        </span>
                      </div>

                      <div className="mt-2 text-sm font-bold text-white flex items-center justify-between">
                        <span>{b.name}</span>
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            b.status === "rescued"
                              ? "text-emerald-400"
                              : b.status === "dispatched"
                              ? "text-cyan-400"
                              : "text-amber-400"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed line-clamp-2">{b.detail}</p>

                      <div className="mt-2.5 pt-2 border-t border-[#2A3B5E] flex items-center justify-between text-xs">
                        <span className="text-[11px] font-mono text-[#64748B]">
                          GPS: {b.lat.toFixed(4)}°N, {b.lng.toFixed(4)}°E
                        </span>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center gap-1.5">
                          {b.status !== "rescued" && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDispatch(b.id, "APF High-Altitude Squad 1");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] cursor-pointer"
                              >
                                Dispatch
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkRescued(b.id);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] cursor-pointer"
                              >
                                Rescued
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredBeacons.length === 0 && (
                  <div className="text-center py-10 text-xs text-[#64748B]">
                    No distress beacons matching current filter.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Field Voice Notes Stream */}
          {activeTab === "dispatches" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] pb-1 border-b border-[#2A3B5E]">
                Crowd & Guide Voice Observations
              </div>
              {fieldDispatches.map((d) => (
                <div key={d.id} className="p-3 rounded-2xl bg-[#0F1B33] border border-[#2A3B5E] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{d.senderName}</span>
                    </span>
                    <span className="text-[10px] text-[#64748B] font-mono">{d.time}</span>
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">"{d.note}"</p>
                  {d.aiClassification && (
                    <div className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                      {d.aiClassification}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Helicopter Aviation Clearance Card */}
          {activeTab === "aviation" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-[#0F1B33] border border-emerald-500/40 space-y-2 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Plane className="w-4 h-4 text-emerald-400" />
                    <span>Air Evac Weather Status</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-900 px-2 py-0.5 rounded-full">
                    GO 🟢
                  </span>
                </div>
                <div className="text-sm font-bold text-white">Eurocopter AS350 B3e (Squirrel)</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-[#64748B]">Operational Ceiling:</span>
                    <div className="font-bold text-white">4,200m ASL</div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Current Cloud Base:</span>
                    <div className="font-bold text-white">3,850m (Marginal ⚠️)</div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Wind Gusts:</span>
                    <div className="font-bold text-emerald-400">14 kts (Clear)</div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Daylight Remaining:</span>
                    <div className="font-bold text-white">02h 45m</div>
                  </div>
                </div>
              </div>

              {/* Forward Rescue Bases */}
              <div className="space-y-2">
                <div className="font-bold uppercase tracking-wider text-[#94A3B8] text-[11px]">
                  Forward Staging Helipads:
                </div>
                {forwardBases.map((base, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#0F1B33] border border-[#2A3B5E] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{base.name}</div>
                      <div className="text-[10px] text-[#64748B]">{base.agency} &bull; {base.elevation}m</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-cyan-300">~{base.heliFlightMin} min flight</div>
                      <div className="text-[10px] text-[#64748B] font-mono">{base.contact}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Full-Screen Tactical GIS SAR Map */}
        <div className="flex-1 relative h-full min-h-[350px]">
          <FullScreenHazardMap
            corridor={corridor}
            assets={assets}
            mode="rescuer"
            userPosition={userPosition}
            distressBeacons={distressBeacons}
            onSelectBeacon={(beacon) => {
              setSelectedBeacon(beacon);
              setActiveTab("beacons");
            }}
            simulatedWaterRise={waterSurge}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
