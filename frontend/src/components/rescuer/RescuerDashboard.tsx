import React, { useState, useMemo, useCallback } from "react";
import { FullScreenHazardMap } from "../map/FullScreenHazardMap";
import { MobileBottomSheet } from "../mobile/MobileBottomSheet";
import { MapAsset, CORRIDOR_RESCUE_BASES } from "../../data/hazardMapData";
import { Language } from "../../data/localization";
import { useUserRole, DistressBeacon } from "../../context/UserRoleContext";
import { playConfirmationBeep, playEmergencyChime } from "../../utils/audioAlert";
import {
  Radio,
  CheckCircle2,
  Clock,
  Compass,
  AlertTriangle,
  Plane,
  Users,
  MapPin,
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
  const [sheetPosition, setSheetPosition] = useState<"peek" | "half" | "full">("half");

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

  const pendingCount = distressBeacons.filter((b) => b.status === "pending").length;

  return (
    <div className="w-full h-full flex flex-col lg:flex-row min-h-0 bg-[#0A1224] text-slate-100 overflow-hidden relative">
      {/* 1. INTERACTIVE DRAGGABLE BOTTOM SHEET (Mobile) / SIDEBAR (Desktop) */}
      <MobileBottomSheet
        position={sheetPosition}
        onChangePosition={setSheetPosition}
        title="SAR Incident Command"
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
          <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
            <span className="font-mono text-cyan-300">{corridor.name}</span>
            <span className="text-amber-400 font-bold">{distressBeacons.length} Active Incidents</span>
          </div>
        }
      >
        <div className="flex-1 flex flex-col min-h-0 bg-[#111A2E]">
          {/* Tactical SAR Header Bar */}
          <div className="p-3 bg-[#0F1B33] border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-sm">
                🚁
              </div>
              <div className="leading-tight">
                <div className="text-xs font-black text-amber-400 uppercase tracking-wide">
                  SAR TACTICAL QUEUE
                </div>
                <div className="text-[10px] text-slate-400">
                  {userProfile.station || "Dhunche Helipad Command"}
                </div>
              </div>
            </div>

            {/* Sub-Tabs: Beacons | Ground Notes | Aviation */}
            <div className="flex items-center bg-[#090F1D] p-1 rounded-xl border border-white/10 text-[11px]">
              <button
                onClick={() => setActiveTab("beacons")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "beacons" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                SOS ({distressBeacons.length})
              </button>
              <button
                onClick={() => setActiveTab("aviation")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "aviation" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Air Evac
              </button>
              <button
                onClick={() => setActiveTab("dispatches")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeTab === "dispatches" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Notes
              </button>
            </div>
          </div>

          {/* TAB 1: Distress Beacons Queue */}
          {activeTab === "beacons" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
              {/* Filter Pills */}
              <div className="flex items-center justify-between gap-2 pb-1 text-xs">
                <div className="flex items-center gap-1">
                  {(["active", "all", "rescued"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                        filterStatus === st
                          ? "bg-[#1C2C4C] text-cyan-300 border border-cyan-500/40"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {filteredBeacons.length} Incident{filteredBeacons.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Beacon Cards */}
              {filteredBeacons.map((b) => {
                const isCritical = b.priority >= 90;
                const isPending = b.status === "pending";
                const isSelected = selectedBeacon?.id === b.id;

                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBeacon(b)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "bg-[#16233F] border-amber-500 shadow-xl"
                        : "bg-[#0F1B33]/80 border-white/10 hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            b.status === "rescued"
                              ? "bg-emerald-400"
                              : isCritical
                              ? "bg-rose-500 animate-ping"
                              : "bg-amber-400"
                          }`}
                        />
                        <span className="font-black text-xs text-white">{b.name}</span>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          b.status === "rescued"
                            ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                            : isCritical
                            ? "bg-rose-950 text-rose-300 border-rose-500/40"
                            : "bg-amber-950 text-amber-300 border-amber-500/40"
                        }`}
                      >
                        {b.priority}% Urgency
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-snug">{b.detail}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5 font-mono">
                      <span>
                        GPS: {b.lat.toFixed(4)}°, {b.lng.toFixed(4)}°
                      </span>
                      <span>Elev: ~{b.altitude || 2780}m</span>
                      <span>{b.time}</span>
                    </div>

                    {/* Action Buttons: 44px touch targets */}
                    {b.status !== "rescued" && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDispatch(b.id, "APF Mountain Rescue Squad 1");
                          }}
                          className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer shadow transition-all active:scale-95"
                        >
                          Dispatch Team
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRescued(b.id);
                          }}
                          className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer shadow transition-all active:scale-95"
                        >
                          Mark Extracted
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredBeacons.length === 0 && (
                <div className="text-center py-12 text-xs text-slate-500">
                  No distress incidents matching filter.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Aviation Weather Clearance */}
          {activeTab === "aviation" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 text-xs">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/50 to-[#0F1B33] border border-emerald-500/40 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                    <Plane className="w-4 h-4 text-emerald-400" />
                    <span>AS350 B3e Helie-Ceiling</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                    VFR OPEN
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Valley density altitude permits mountain hover out-of-ground-effect up to 6,800m ASL. Wind speed in canyon mouth: 14 kts.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-[11px] font-mono">
                  <div>Cloud Base: <strong>4,200m ASL</strong></div>
                  <div>Visibility: <strong>&gt;8 km</strong></div>
                  <div>Turbulence: <strong>Light Ridge Wave</strong></div>
                  <div>Helipad: <strong>Dhunche Clear</strong></div>
                </div>
              </div>

              {/* Forward Helipads */}
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                  Staging Helipads:
                </div>
                {forwardBases.map((base, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#0F1B33] border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-xs">{base.name}</div>
                      <div className="text-[10px] text-slate-400">{base.agency} &bull; {base.elevation}m</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-cyan-300 text-xs">~{base.heliFlightMin} min</div>
                      <div className="text-[10px] text-slate-400 font-mono">{base.contact}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Ground Observations */}
          {activeTab === "dispatches" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 text-xs">
              {fieldDispatches.map((d) => (
                <div key={d.id} className="p-3 rounded-2xl bg-[#0F1B33] border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                      <Mic className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{d.senderName}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{d.time}</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">"{d.note}"</p>
                  {d.aiClassification && (
                    <div className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                      {d.aiClassification}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </MobileBottomSheet>

      {/* 2. FULL-SCREEN GOOGLE MAP BASE (ALWAYS VISIBLE IN BACKGROUND) */}
      <div className="flex-1 relative w-full h-full min-h-[350px]">
        <FullScreenHazardMap
          corridor={corridor}
          assets={assets}
          mode="rescuer"
          userPosition={userPosition}
          distressBeacons={distressBeacons}
          onSelectBeacon={(beacon) => {
            setSelectedBeacon(beacon);
            setSheetPosition("half");
          }}
          simulatedWaterRise={waterSurge}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
