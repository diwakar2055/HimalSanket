import React, { useState, useMemo, useCallback } from "react";
import { ModernHazardMap } from "../map/ModernHazardMap";
import { MapAsset, CORRIDOR_RESCUE_BASES } from "../../data/hazardMapData";
import { Language } from "../../data/localization";
import { useUserRole, DistressBeacon } from "../../context/UserRoleContext";
import { playConfirmationBeep, playEmergencyChime } from "../../utils/audioAlert";
import {
  Radio,
  CheckCircle2,
  Clock,
  MapPin,
  Shield,
  Activity,
  AlertTriangle,
  Users,
  Compass,
  Phone,
  Crosshair,
  Building2,
  GraduationCap,
  HeartPulse,
  RotateCcw,
  Plane,
  Home,
  ChevronRight,
  Info,
  Globe2,
} from "lucide-react";
import { HelicopterIcon } from "../common/HelicopterIcon";

interface RescuerDashboardProps {
  corridor: any;
  userPosition: { lat: number; lng: number; accuracy?: number; altitude?: number } | null;
  onLocateMe: () => void;
  language: Language;
  assets: MapAsset[];
  activeScenario?: string;
  waterSurge?: number;
}

function formatEtaSeconds(seconds: number): string {
  if (seconds <= 0) return "ON-SITE";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins < 10 ? "0" : ""}${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
}

function formatMeters(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)}m`;
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
  const {
    distressBeacons,
    updateBeaconStatus,
    fieldDispatches,
    userProfile,
    resetBeaconsToDefault,
    dispatchedTeams,
    dispatchRescueTeam,
    cancelRescueTeam,
  } = useUserRole();

  const [selectedBeacon, setSelectedBeacon] = useState<DistressBeacon | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<MapAsset | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "dispatched" | "rescued">("all");
  const [activeTab, setActiveTab] = useState<"incidents" | "units" | "facilities" | "reports">("incidents");
  const [facilityFilter, setFacilityFilter] = useState<"all" | "health" | "school" | "village" | "base">("all");

  // Filter dispatched teams for this corridor
  const corridorDispatchedTeams = useMemo(() => {
    return dispatchedTeams.filter((t) => !t.corridorId || t.corridorId === corridor.id);
  }, [dispatchedTeams, corridor.id]);

  // Filter beacons for this corridor or overall
  const corridorBeacons = useMemo(() => {
    return distressBeacons.filter(
      (b) => !b.corridorId || b.corridorId === corridor.id
    );
  }, [distressBeacons, corridor.id]);

  const displayedBeacons = useMemo(() => {
    if (filterStatus === "all") return corridorBeacons;
    return corridorBeacons.filter((b) => b.status === filterStatus);
  }, [corridorBeacons, filterStatus]);

  // Corridor facilities: Health Posts, Schools, Villages, Safe Zones
  const healthPosts = useMemo(() => assets.filter((a) => a.type === "hospital"), [assets]);
  const schools = useMemo(() => assets.filter((a) => a.type === "school"), [assets]);
  const villages = useMemo(() => assets.filter((a) => a.type === "people"), [assets]);
  const safeShelters = useMemo(() => assets.filter((a) => a.type === "safeZone"), [assets]);
  const forwardBases = useMemo(
    () => CORRIDOR_RESCUE_BASES[corridor.id] || CORRIDOR_RESCUE_BASES.langtang || [],
    [corridor.id]
  );

  // Filtered facilities list
  const displayedFacilities = useMemo(() => {
    if (facilityFilter === "health") return healthPosts;
    if (facilityFilter === "school") return schools;
    if (facilityFilter === "village") return villages;
    if (facilityFilter === "base") return [];
    return [...healthPosts, ...schools, ...villages, ...safeShelters];
  }, [facilityFilter, healthPosts, schools, villages, safeShelters]);

  // Counts
  const pendingCount = corridorBeacons.filter((b) => b.status === "pending").length;
  const dispatchedCount = corridorBeacons.filter((b) => b.status === "dispatched").length;
  const rescuedCount = corridorBeacons.filter((b) => b.status === "rescued").length;

  // Actions
  const handleSelectVictim = useCallback((beacon: DistressBeacon) => {
    playConfirmationBeep();
    setSelectedAsset(null);
    setSelectedBeacon(beacon);
  }, []);

  const handleLocateAsset = useCallback((asset: MapAsset) => {
    playConfirmationBeep();
    setSelectedBeacon(null);
    setSelectedAsset(asset);
  }, []);

  const handleLocateBase = useCallback(
    (base: any) => {
      playConfirmationBeep();
      setSelectedBeacon(null);
      setSelectedAsset({
        id: base.id,
        name: base.name,
        type: "safeZone",
        corridorId: corridor.id,
        lat: base.lat,
        lng: base.lng,
        x: 0,
        y: 0,
        elevation: 1950,
        gps: `${base.lat}° N, ${base.lng}° E`,
        status: "safe",
        hazardThresholdMeters: 10,
        description: `${base.agency} Forward Base & Helipad`,
        riskNote: "Dedicated search and rescue forward operating base with all-weather helipad and emergency medical logistics.",
      });
    },
    [corridor.id]
  );

  const handleDispatch = useCallback(
    (beacon: DistressBeacon) => {
      playConfirmationBeep();
      dispatchRescueTeam(beacon.id);
    },
    [dispatchRescueTeam]
  );

  const handleMarkRescued = useCallback(
    (beacon: DistressBeacon) => {
      playConfirmationBeep();
      updateBeaconStatus(beacon.id, "rescued");
    },
    [updateBeaconStatus]
  );

  return (
    <div className="w-full h-full flex flex-col lg:flex-row min-h-0 bg-[#0b1320] text-[#f1f5f9] overflow-hidden font-sans">
      {/* LEFT COLUMN: SAR Tactical Queue (~420px) */}
      <aside className="w-full lg:w-[420px] xl:w-[450px] shrink-0 h-full flex flex-col bg-[#0b1320] border-r border-[#1c2536] overflow-hidden">
        {/* Header & Stats Banner */}
        <div className="p-4 border-b border-[#17253b] bg-[#0b1320]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#142134] border border-[#22354e] flex items-center justify-center text-[#7ea9df] shadow-sm">
                <Radio className="w-5 h-5 text-[#7ea9df]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight leading-tight">
                  Tactical SAR Command
                </h2>
                <p className="text-xs text-[#8fa0b5] mt-0.5 font-normal">
                  APF & Nepal Army Mountain Rescue Forward Base
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playConfirmationBeep();
                  resetBeaconsToDefault();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#142134] hover:bg-[#1a2c44] border border-[#22354e] text-xs font-medium text-[#8fa0b5] hover:text-white transition-colors cursor-pointer shadow-sm"
                title="Reset test distress beacons to simulation state"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#063b2c] border border-[#0d6e52] shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_#10b981]" />
                <div className="text-[11px] leading-tight font-semibold text-[#34d399]">
                  <div>Live</div>
                  <div>Relay</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar (Pixel-Accurate 3 KPI Cards) */}
          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            {/* PENDING SOS */}
            <div className="py-3 px-2 rounded-2xl bg-[#0d1626]/90 border border-[#2a1d2e] shadow-md flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-rose-500/5 pointer-events-none" />
              <span className="text-[10px] font-semibold tracking-wider text-rose-300/80 uppercase">
                PENDING SOS
              </span>
              <span className="text-3xl font-bold text-rose-500 mt-1 leading-none">
                {pendingCount}
              </span>
            </div>

            {/* IN PROGRESS */}
            <div className="py-3 px-2 rounded-2xl bg-[#0d1626]/90 border border-[#2e2a1e] shadow-md flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-amber-500/5 pointer-events-none" />
              <span className="text-[10px] font-semibold tracking-wider text-amber-300/80 uppercase">
                IN PROGRESS
              </span>
              <span className="text-3xl font-bold text-amber-400 mt-1 leading-none">
                {dispatchedCount}
              </span>
            </div>

            {/* EVACUATED */}
            <div className="py-3 px-2 rounded-2xl bg-[#0d1626]/90 border border-[#1a332a] shadow-md flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
              <span className="text-[10px] font-semibold tracking-wider text-emerald-300/80 uppercase">
                EVACUATED
              </span>
              <span className="text-3xl font-bold text-emerald-400 mt-1 leading-none">
                {rescuedCount}
              </span>
            </div>
          </div>
        </div>

        {/* Primary View Mode Tabs (Segmented Control Track) */}
        <div className="px-4 py-3 border-b border-[#17253b] bg-[#0b1320]">
          <div className="flex items-center gap-1 bg-[#09111e] p-1.5 rounded-2xl border border-[#17253b]">
            <button
              onClick={() => setActiveTab("incidents")}
              className={`flex-1 py-2 px-1 rounded-xl text-xs font-medium transition-all cursor-pointer text-center ${
                activeTab === "incidents"
                  ? "bg-[#14233c] text-white font-semibold border border-[#284268] shadow-md"
                  : "text-[#8fa0b5] hover:text-white"
              }`}
            >
              Distress SOS ({corridorBeacons.length})
            </button>
            <button
              onClick={() => setActiveTab("units")}
              className={`flex-1 py-2 px-1 rounded-xl text-xs font-medium transition-all cursor-pointer text-center ${
                activeTab === "units"
                  ? "bg-[#14233c] text-white font-semibold border border-[#284268] shadow-md"
                  : "text-[#8fa0b5] hover:text-white"
              }`}
            >
              SAR Fleet ({corridorDispatchedTeams.length})
            </button>
            <button
              onClick={() => setActiveTab("facilities")}
              className={`flex-1 py-2 px-1 rounded-xl text-xs font-medium transition-all cursor-pointer text-center ${
                activeTab === "facilities"
                  ? "bg-[#14233c] text-white font-semibold border border-[#284268] shadow-md"
                  : "text-[#8fa0b5] hover:text-white"
              }`}
            >
              Facilities ({assets.length})
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`flex-1 py-2 px-1 rounded-xl text-xs font-medium transition-all cursor-pointer text-center ${
                activeTab === "reports"
                  ? "bg-[#14233c] text-white font-semibold border border-[#284268] shadow-md"
                  : "text-[#8fa0b5] hover:text-white"
              }`}
            >
              Reports ({fieldDispatches.length})
            </button>
          </div>
        </div>

        {/* Sub-Filters: Incident Status or Facility Category */}
        {activeTab === "incidents" && (
          <div className="px-4 py-2.5 border-b border-[#17253b] bg-[#0b1320] flex items-center justify-between text-xs">
            <span className="text-[11px] text-[#8fa0b5] uppercase font-mono tracking-wider">
              Filter Status:
            </span>
            <div className="flex items-center gap-1.5 text-xs">
              {(["all", "pending", "dispatched", "rescued"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 rounded-full cursor-pointer transition-all text-xs font-medium capitalize ${
                    filterStatus === st
                      ? "bg-[#1b2b45] text-white font-semibold border border-[#2b446a] shadow-sm"
                      : "bg-[#0d1627] text-[#8fa0b5] hover:text-white border border-[#1c2c44]"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "facilities" && (
          <div className="px-4 py-2.5 border-b border-[#17253b] bg-[#0b1320] flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs">
            <button
              onClick={() => setFacilityFilter("all")}
              className={`px-3.5 py-1.5 rounded-full cursor-pointer transition-all text-xs font-medium whitespace-nowrap ${
                facilityFilter === "all"
                  ? "bg-[#1b2b45] text-white font-semibold border border-[#2b446a] shadow-sm"
                  : "bg-[#0d1627] text-[#8fa0b5] hover:text-white border border-[#1c2c44]"
              }`}
            >
              All ({assets.length + forwardBases.length})
            </button>
            <button
              onClick={() => setFacilityFilter("health")}
              className={`px-3.5 py-1.5 rounded-full cursor-pointer transition-all text-xs font-medium whitespace-nowrap flex items-center gap-1.5 ${
                facilityFilter === "health"
                  ? "bg-[#1b2b45] text-white font-semibold border border-[#2b446a] shadow-sm"
                  : "bg-[#0d1627] text-[#8fa0b5] hover:text-white border border-[#1c2c44]"
              }`}
            >
              <span>🧰</span>
              <span>Health ({healthPosts.length})</span>
            </button>
            <button
              onClick={() => setFacilityFilter("school")}
              className={`px-3.5 py-1.5 rounded-full cursor-pointer transition-all text-xs font-medium whitespace-nowrap flex items-center gap-1.5 ${
                facilityFilter === "school"
                  ? "bg-[#1b2b45] text-white font-semibold border border-[#2b446a] shadow-sm"
                  : "bg-[#0d1627] text-[#8fa0b5] hover:text-white border border-[#1c2c44]"
              }`}
            >
              <span>🏫</span>
              <span>Schools ({schools.length})</span>
            </button>
            <button
              onClick={() => setFacilityFilter("village")}
              className={`px-3.5 py-1.5 rounded-full cursor-pointer transition-all text-xs font-medium whitespace-nowrap flex items-center gap-1.5 ${
                facilityFilter === "village"
                  ? "bg-[#1b2b45] text-white font-semibold border border-[#2b446a] shadow-sm"
                  : "bg-[#0d1627] text-[#8fa0b5] hover:text-white border border-[#1c2c44]"
              }`}
            >
              <span>🏕️</span>
              <span>Villages ({villages.length})</span>
            </button>
            <button
              onClick={() => setFacilityFilter("base")}
              className={`px-3.5 py-1.5 rounded-full cursor-pointer transition-all text-xs font-medium whitespace-nowrap flex items-center gap-1.5 ${
                facilityFilter === "base"
                  ? "bg-[#1b2b45] text-white font-semibold border border-[#2b446a] shadow-sm"
                  : "bg-[#0d1627] text-[#8fa0b5] hover:text-white border border-[#1c2c44]"
              }`}
            >
              <span>🚁</span>
              <span>Bases ({forwardBases.length})</span>
            </button>
          </div>
        )}

        {/* Scrollable Items Container with Top Padding to Prevent Clipping */}
        <div className="flex-1 overflow-y-auto p-4 pt-3 space-y-3 custom-scrollbar bg-[#0b1320]">
          {/* TAB 1: INCIDENTS / DISTRESS SOS */}
          {activeTab === "incidents" && (
            displayedBeacons.length === 0 ? (
              <div className="p-8 text-center text-[#8c96af] text-xs">
                No active distress beacons matching status: <span className="font-mono">{filterStatus}</span>.
              </div>
            ) : (
              displayedBeacons.map((beacon) => {
                const isSelected = selectedBeacon?.id === beacon.id;
                const isRescued = beacon.status === "rescued";
                const isDispatched = beacon.status === "dispatched";

                return (
                  <div
                    key={beacon.id}
                    onClick={() => handleSelectVictim(beacon)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-md ${
                      isSelected
                        ? "bg-[#13233c] border-[#38bdf8]/60 shadow-lg shadow-sky-950/40 ring-1 ring-[#38bdf8]/30"
                        : "bg-[#111c2e] hover:bg-[#15233a] border-[#1c2536] hover:border-[#263750]"
                    }`}
                  >
                    {/* Top Row: Status badge + priority + time */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
                            isRescued
                              ? "bg-[#053c2e] text-[#52c7ad] border border-[#16785d]/60"
                              : isDispatched
                              ? "bg-[#3b2308] text-[#fbbf24] border border-[#78350f]/60"
                              : "bg-[#3b0f19] text-[#fb7185] border border-[#9f1239]/60"
                          }`}
                        >
                          {isRescued ? "Rescued" : isDispatched ? "Squad Dispatched" : "Pending Action"}
                        </span>
                        <span className="text-[#6d7485] text-xs">{beacon.time}</span>
                      </div>

                      <span className="text-xs font-mono font-bold text-[#8fa0b5]">
                        PRIORITY {beacon.priority}
                      </span>
                    </div>

                    {/* Victim Name & Landmark */}
                    <div className="mt-2.5">
                      <h4 className="font-bold text-[#f1f5f9] text-[15px] leading-snug">
                        {beacon.name}
                      </h4>
                      <p className="text-xs text-[#8c96af] mt-1.5 leading-relaxed">
                        {beacon.detail}
                      </p>
                    </div>

                    {/* Coordinates & Assigned Unit */}
                    <div className="mt-3 pt-2.5 border-t border-[#1c2536] flex flex-wrap items-center justify-between text-xs text-[#8fa0b5] gap-1.5">
                      <span className="flex items-center gap-1 font-mono text-[#8fa0b5]">
                        <MapPin className="w-3.5 h-3.5 text-[#8fa0b5] shrink-0" />
                        {beacon.lat.toFixed(4)}°N, {beacon.lng.toFixed(4)}°E
                        {beacon.altitude && <span> • ~{Math.round(beacon.altitude)}m</span>}
                      </span>

                      {beacon.contact && (
                        <span className="flex items-center gap-1 text-[#8fa0b5]">
                          <Phone className="w-3 h-3 text-[#707c9b] shrink-0" />
                          <span>{beacon.contact}</span>
                        </span>
                      )}
                    </div>

                    {isDispatched && (
                      (() => {
                        const liveTeam = dispatchedTeams.find((t) => String(t.targetBeaconId) === String(beacon.id));
                        if (liveTeam) {
                          const isTeamArrived = liveTeam.status === "arrived" || liveTeam.status === "evacuating" || liveTeam.etaSeconds <= 0;
                          return (
                            <div className="mt-3 p-3 rounded-xl bg-[#0b1320] border border-[#1c2536] space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono text-xs text-[#f1f5f9] font-medium uppercase flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${isTeamArrived ? "bg-[#34d399]" : "bg-[#38bdf8]"}`} />
                                  {liveTeam.name} ({liveTeam.callSign})
                                </span>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border capitalize font-semibold ${
                                  isTeamArrived
                                    ? "bg-[#053c2e] text-[#52c7ad] border-[#16785d]/60"
                                    : "bg-[#1c2e4a] text-[#38bdf8] border-[#2a456c]"
                                }`}>
                                  {liveTeam.status.replace("_", " ")}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <div className="text-[11px] font-mono text-[#8fa0b5]">
                                  ETA: <strong className="text-[#f1f5f9] font-semibold">{isTeamArrived ? "On-Site" : formatEtaSeconds(liveTeam.etaSeconds)}</strong>
                                </div>
                                <div className="text-[11px] font-mono text-[#8fa0b5]">
                                  {formatMeters(liveTeam.distanceRemainingMeters)} • {liveTeam.speedKmH}km/h
                                </div>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-[#1c2536] overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-700"
                                  style={{ width: `${Math.min(100, Math.max(5, liveTeam.progress * 100))}%` }}
                                />
                              </div>
                            </div>
                          );
                        }
                        if (beacon.assignedUnit) {
                          return (
                            <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-[#0b1320] border border-[#1c2536] text-xs text-amber-300 flex items-center justify-between">
                              <span>Squad: {beacon.assignedUnit}</span>
                              <span className="text-[10px] text-[#8fa0b5] font-mono">En Route</span>
                            </div>
                          );
                        }
                        return null;
                      })()
                    )}

                    {/* Actions Row */}
                    <div className="mt-3.5 pt-3 border-t border-[#1c2536] flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectVictim(beacon);
                        }}
                        className="group px-4 py-1.5 rounded-full bg-[#0b1626] hover:bg-[#12233c] active:scale-[0.97] text-xs font-semibold text-slate-200 hover:text-white border border-[#22446f] hover:border-sky-500/60 shadow-sm shadow-black/40 flex items-center gap-1.5 cursor-pointer transition-all duration-200"
                      >
                        <Crosshair className="w-3.5 h-3.5 text-sky-400 group-hover:text-sky-300 group-hover:rotate-45 transition-transform duration-300" />
                        <span>Locate on Map</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {!isRescued && !isDispatched && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDispatch(beacon);
                            }}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] text-white text-xs font-semibold shadow-lg shadow-sky-950/50 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            Dispatch Rescue Squad
                          </button>
                        )}

                        {isDispatched && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRescued(beacon);
                            }}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white text-xs font-semibold shadow-lg shadow-emerald-950/50 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            Mark Rescued
                          </button>
                        )}

                        {isRescued && (
                          <span className="text-xs text-[#34d399] font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#34d399]" />
                            <span>Evacuated to Clinic</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}

          {/* TAB 2: ACTIVE RESCUE UNITS (Live SAR Fleet Simulation) */}
          {activeTab === "units" && (
            corridorDispatchedTeams.length === 0 ? (
              <div className="p-8 text-center text-[#8fa0b5] text-xs space-y-2">
                <HelicopterIcon className="w-8 h-8 mx-auto text-[#707c9b] opacity-60" />
                <p>No active airborne or ground rescue teams deployed in {corridor.name}.</p>
                <p className="text-[11px] text-[#8c96af]">
                  Select an SOS Distress beacon in the queue and click <strong>Dispatch Rescue Squad</strong> to launch a simulated live SAR helicopter with real-time ETA tracking.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#111c2e] border border-[#1c2536] text-xs text-[#cbd5e1] leading-snug flex items-center justify-between">
                  <span>Tracking {corridorDispatchedTeams.length} Airborne / Ground Units</span>
                  <span className="font-mono text-[10px] text-[#8fa0b5]">1-sec telemetry sync</span>
                </div>

                {corridorDispatchedTeams.map((team) => {
                  const isArrived = team.status === "arrived" || team.status === "evacuating";

                  return (
                    <div
                      key={team.id}
                      className="p-4 rounded-2xl border border-[#1c2536] bg-[#111c2e] shadow-md space-y-3"
                    >
                      {/* Unit Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400"></span>
                          </span>
                          <div>
                            <span className="text-[10px] font-mono text-[#8fa0b5] uppercase tracking-wide">
                              {team.callSign} • {team.agency}
                            </span>
                            <h4 className="font-bold text-[#f1f5f9] text-[15px] leading-tight">
                              {team.name}
                            </h4>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono capitalize font-semibold ${
                            isArrived
                              ? "bg-[#053c2e] text-[#52c7ad] border border-[#16785d]/60"
                              : "bg-[#1c2e4a] text-[#38bdf8] border border-[#2a456c]"
                          }`}
                        >
                          {team.status.replace("_", " ")}
                        </span>
                      </div>

                      {/* Target Info */}
                      <div className="text-xs text-[#8c96af] bg-[#0b1320] p-2.5 rounded-xl border border-[#1c2536]">
                        <span className="text-[10px] font-mono uppercase text-[#8fa0b5] block">Mission Target</span>
                        <strong className="text-[#f1f5f9] text-xs">{team.targetCivilianName}</strong>
                      </div>

                      {/* Dynamic Metrics Grid */}
                      <div className="grid grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-[#0b1320] border border-[#1c2536]">
                        <div>
                          <span className="text-[9px] font-mono uppercase text-[#8fa0b5] block">Countdown ETA</span>
                          <strong className="text-base font-bold font-mono text-[#f1f5f9]">
                            {formatEtaSeconds(team.etaSeconds)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono uppercase text-[#8fa0b5] block">Remaining Distance</span>
                          <strong className="text-sm font-bold font-mono text-[#f1f5f9]">
                            {formatMeters(team.distanceRemainingMeters)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono uppercase text-[#8fa0b5] block">Ground Speed</span>
                          <span className="text-xs font-mono text-[#cbd5e1]">
                            {team.speedKmH} km/h
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono uppercase text-[#8fa0b5] block">Forward Base</span>
                          <span className="text-xs text-[#cbd5e1] truncate block">
                            {team.startBaseName}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-[#8fa0b5]">
                          <span>Departed</span>
                          <span className="text-[#f1f5f9] font-medium">{Math.round(team.progress * 100)}% Complete</span>
                          <span>Target</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#1c2536] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, Math.max(5, team.progress * 100))}%` }}
                          />
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2.5 border-t border-[#1c2536] flex items-center justify-between text-xs">
                        <span className="font-mono text-[#8fa0b5] text-[10px]">
                          VHF: {team.contact}
                        </span>
                        <button
                          onClick={() => cancelRescueTeam(team.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#162338] hover:bg-[#1d2f4c] text-xs text-[#cbd5e1] hover:text-white border border-[#223552] transition-colors cursor-pointer"
                        >
                          Recall Unit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 3: FACILITIES & SHELTERS (Schools, Health Posts, Villages, Helipads) */}
          {activeTab === "facilities" && (
            <div className="space-y-3">
              {/* Context Summary Banner */}
              <div className="p-3.5 rounded-2xl bg-[#0f1828]/85 border border-[#1b2b40] flex items-start gap-2.5 text-xs text-[#8fa0b5] leading-relaxed shadow-sm">
                <Info className="w-4 h-4 text-[#64748b] shrink-0 mt-0.5" />
                <span>
                  Schools serve as reinforced assembly shelters, Health Posts handle medical triage, and Villages are vulnerable riverside zones.
                </span>
              </div>

              {/* Bases Section (if filtered) */}
              {(facilityFilter === "all" || facilityFilter === "base") &&
                forwardBases.map((base: any) => (
                  <div
                    key={base.id}
                    onClick={() => handleLocateBase(base)}
                    className="p-4 rounded-2xl border border-[#1c2e48] bg-[#0d1728]/80 hover:bg-[#122036] transition-all cursor-pointer shadow-lg shadow-black/25 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase bg-[#132742] text-[#38bdf8] border border-[#1d3d66] flex items-center gap-1.5 font-bold tracking-wider">
                        <HelicopterIcon className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>SAR FORWARD BASE & HELIPAD</span>
                      </span>
                      <span className="text-xs font-mono text-[#8fa0b5]">
                        {base.heliFlightMin}m Flight Lag
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-base tracking-tight leading-snug">
                        {base.name}
                      </h4>
                      <div className="text-xs text-[#8fa0b5] mt-1">
                        Agency: <strong className="text-slate-100 font-bold">{base.agency}</strong>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[#17253b] flex items-center justify-between">
                      <span className="text-xs font-mono text-[#8fa0b5] flex items-center gap-1.5">
                        <Globe2 className="w-3.5 h-3.5 text-[#64748b]" />
                        <span>{base.lat.toFixed(4)}°N, {base.lng.toFixed(4)}°E</span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLocateBase(base);
                        }}
                        className="group px-4 py-1.5 rounded-full bg-[#0b1626] hover:bg-[#12233c] active:scale-[0.97] text-xs font-semibold text-slate-200 hover:text-white border border-[#22446f] hover:border-sky-500/60 shadow-sm shadow-black/40 flex items-center gap-1.5 cursor-pointer transition-all duration-200"
                      >
                        <Crosshair className="w-3.5 h-3.5 text-sky-400 group-hover:text-sky-300 group-hover:rotate-45 transition-transform duration-300" />
                        <span>Locate on Map</span>
                      </button>
                    </div>
                  </div>
                ))}

              {/* Assets Section (Health Posts, Schools, Villages, Shelters) */}
              {displayedFacilities.map((asset) => {
                const isSelected = selectedAsset?.id === asset.id;
                const isHealth = asset.type === "hospital";
                const isSchool = asset.type === "school";
                const isVillage = asset.type === "people";
                const isShelter = asset.type === "safeZone";

                return (
                  <div
                    key={asset.id}
                    onClick={() => handleLocateAsset(asset)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-lg shadow-black/25 space-y-3 ${
                      isSelected
                        ? "bg-[#13233c] border-[#38bdf8]/60 shadow-sky-950/40 ring-1 ring-[#38bdf8]/30"
                        : "bg-[#0d1728]/80 hover:bg-[#122036] border-[#1c2e48]"
                    }`}
                  >
                    {/* Badge Row */}
                    <div className="flex items-center justify-between text-xs">
                      {isHealth && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase bg-rose-950/50 text-rose-300 border border-rose-900/60 flex items-center gap-1.5 font-bold tracking-wider">
                          <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                          <span>EMERGENCY MEDICAL CLINIC</span>
                        </span>
                      )}
                      {isSchool && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase bg-sky-950/50 text-sky-300 border border-sky-900/60 flex items-center gap-1.5 font-bold tracking-wider">
                          <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                          <span>COMMUNITY SCHOOL EVAC SHELTER</span>
                        </span>
                      )}
                      {isVillage && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase bg-indigo-950/50 text-indigo-300 border border-indigo-900/60 flex items-center gap-1.5 font-bold tracking-wider">
                          <Home className="w-3.5 h-3.5 text-indigo-400" />
                          <span>VULNERABLE RIVERSIDE SETTLEMENT</span>
                        </span>
                      )}
                      {isShelter && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase bg-[#053c2e] text-[#52c7ad] border border-[#16785d]/60 flex items-center gap-1.5 font-bold tracking-wider">
                          <Shield className="w-3.5 h-3.5 text-[#34d399]" />
                          <span>VERIFIED SAFE REFUGE</span>
                        </span>
                      )}

                      <span className="text-xs font-mono text-[#8fa0b5]">
                        {asset.elevation}m ASL
                      </span>
                    </div>

                    {/* Facility Name */}
                    <div>
                      <h4 className="font-bold text-white text-base tracking-tight leading-snug">
                        {asset.name}
                      </h4>

                      {/* Metrics: Population or Shelter Capacity or Surge */}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {asset.population && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#0b1320] border border-[#1c2536] text-[#cbd5e1] text-xs">
                            Population: <strong className="text-white">{asset.population}</strong>
                          </span>
                        )}
                        {asset.capacity && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#0b1320] border border-[#1c2536] text-[#cbd5e1] text-xs">
                            Assembly Cap: <strong className="text-white">{asset.capacity}</strong>
                          </span>
                        )}
                        {asset.hazardThresholdMeters && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#0b1320] border border-[#1c2536] text-amber-400 text-xs font-medium">
                            Surge Alert: <strong>+{asset.hazardThresholdMeters}m</strong>
                          </span>
                        )}
                      </div>

                      {/* Description or Risk Note */}
                      <p className="text-xs text-[#8fa0b5] mt-2 leading-relaxed">
                        {asset.riskNote || asset.description}
                      </p>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="pt-2.5 border-t border-[#17253b] flex items-center justify-between">
                      <span className="text-xs font-mono text-[#8fa0b5] flex items-center gap-1.5">
                        <Globe2 className="w-3.5 h-3.5 text-[#64748b]" />
                        <span>{asset.lat.toFixed(4)}°N, {asset.lng.toFixed(4)}°E</span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLocateAsset(asset);
                        }}
                        className="group px-4 py-1.5 rounded-full bg-[#0b1626] hover:bg-[#12233c] active:scale-[0.97] text-xs font-semibold text-slate-200 hover:text-white border border-[#22446f] hover:border-sky-500/60 shadow-sm shadow-black/40 flex items-center gap-1.5 cursor-pointer transition-all duration-200"
                      >
                        <Crosshair className="w-3.5 h-3.5 text-sky-400 group-hover:text-sky-300 group-hover:rotate-45 transition-transform duration-300" />
                        <span>Locate on Map</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: FIELD REPORTS / CITIZEN DISPATCHES */}
          {activeTab === "reports" && (
            fieldDispatches.length === 0 ? (
              <div className="p-8 text-center text-[#8fa0b5] text-xs">
                No ground reports filed yet.
              </div>
            ) : (
              fieldDispatches.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-2xl bg-[#111c2e] border border-[#1c2536] shadow-md space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#f1f5f9] capitalize text-sm">
                      Field Observation: {report.type}
                    </span>
                    <span className="text-[#6d7485] text-xs">{report.time}</span>
                  </div>

                  <div className="text-xs text-[#cbd5e1] leading-relaxed">{report.note}</div>

                  <div className="text-xs text-[#8fa0b5] flex items-center justify-between pt-2 border-t border-[#1c2536]">
                    <span>Sender: {report.senderName}</span>
                    {report.aiClassification && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#3b2308] border border-[#78350f]/60 text-[#fbbf24] font-semibold">
                        {report.aiClassification}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </aside>

      {/* RIGHT STAGE: Tactical Rescue Map */}
      <main className="flex-1 h-full min-h-[350px] relative bg-[#0b1320]">
        <ModernHazardMap
          corridor={corridor}
          assets={assets}
          mode="rescuer"
          distressBeacons={corridorBeacons}
          dispatchedTeams={dispatchedTeams}
          selectedBeacon={selectedBeacon}
          selectedShelter={selectedAsset}
          onSelectBeacon={handleSelectVictim}
          onDispatchBeacon={handleDispatch}
          onResolveBeacon={handleMarkRescued}
          userPosition={userPosition}
          onLocateMe={onLocateMe}
          simulatedWaterRise={waterSurge}
          className="w-full h-full"
        />
      </main>
    </div>
  );
}
