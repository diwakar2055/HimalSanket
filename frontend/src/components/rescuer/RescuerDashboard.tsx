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
  const {
    distressBeacons,
    updateBeaconStatus,
    fieldDispatches,
    userProfile,
    resetBeaconsToDefault,
  } = useUserRole();

  const [selectedBeacon, setSelectedBeacon] = useState<DistressBeacon | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<MapAsset | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "dispatched" | "rescued">("all");
  const [activeTab, setActiveTab] = useState<"incidents" | "facilities" | "reports">("incidents");
  const [facilityFilter, setFacilityFilter] = useState<"all" | "health" | "school" | "village" | "base">("all");

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
      updateBeaconStatus(beacon.id, "dispatched", "APF Mountain Rescue Squad 1");
    },
    [updateBeaconStatus]
  );

  const handleMarkRescued = useCallback(
    (beacon: DistressBeacon) => {
      playConfirmationBeep();
      updateBeaconStatus(beacon.id, "rescued");
    },
    [updateBeaconStatus]
  );

  return (
    <div className="w-full h-full flex flex-col lg:flex-row min-h-0 bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* LEFT COLUMN: SAR Tactical Queue (~420px) */}
      <aside className="w-full lg:w-[420px] xl:w-[450px] shrink-0 h-full flex flex-col bg-zinc-950 border-r border-zinc-800 overflow-hidden">
        {/* Header & Stats Banner */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center font-medium">
                <Radio className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                  Tactical SAR Command
                </h2>
                <p className="text-xs text-zinc-500">
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
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Reset test distress beacons to simulation state"
              >
                <RotateCcw className="w-3 h-3 text-zinc-500" />
                <span>Reset</span>
              </button>

              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Live Relay</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-zinc-800 text-center">
            <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-mono">
                Pending SOS
              </span>
              <strong className="text-base font-semibold text-rose-400">{pendingCount}</strong>
            </div>
            <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-mono">
                In Progress
              </span>
              <strong className="text-base font-semibold text-amber-400">{dispatchedCount}</strong>
            </div>
            <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-mono">
                Evacuated
              </span>
              <strong className="text-base font-semibold text-emerald-400">{rescuedCount}</strong>
            </div>
          </div>
        </div>

        {/* Primary View Mode Tabs */}
        <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs gap-1.5 overflow-x-auto">
          <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 w-full">
            <button
              onClick={() => setActiveTab("incidents")}
              className={`flex-1 px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-xs text-center ${
                activeTab === "incidents"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Distress SOS ({corridorBeacons.length})
            </button>
            <button
              onClick={() => setActiveTab("facilities")}
              className={`flex-1 px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-xs text-center ${
                activeTab === "facilities"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Facilities & Shelters ({assets.length})
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`flex-1 px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-xs text-center ${
                activeTab === "reports"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Reports ({fieldDispatches.length})
            </button>
          </div>
        </div>

        {/* Sub-Filters: Incident Status or Facility Category */}
        {activeTab === "incidents" && (
          <div className="px-3.5 py-2 border-b border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between text-xs">
            <span className="text-[11px] text-zinc-500 uppercase font-mono tracking-wider">
              Filter Status:
            </span>
            <div className="flex items-center gap-1 text-xs">
              {(["all", "pending", "dispatched", "rescued"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors text-[11px] capitalize ${
                    filterStatus === st
                      ? "bg-zinc-800 text-zinc-100 font-medium border border-zinc-700"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "facilities" && (
          <div className="px-3.5 py-2 border-b border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between text-xs overflow-x-auto gap-1">
            <button
              onClick={() => setFacilityFilter("all")}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors text-[11px] whitespace-nowrap ${
                facilityFilter === "all"
                  ? "bg-zinc-800 text-zinc-100 font-medium border border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              All ({assets.length + forwardBases.length})
            </button>
            <button
              onClick={() => setFacilityFilter("health")}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors text-[11px] whitespace-nowrap ${
                facilityFilter === "health"
                  ? "bg-rose-950/50 text-rose-300 border border-rose-900/60 font-medium"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              🏥 Health ({healthPosts.length})
            </button>
            <button
              onClick={() => setFacilityFilter("school")}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors text-[11px] whitespace-nowrap ${
                facilityFilter === "school"
                  ? "bg-sky-950/50 text-sky-300 border border-sky-900/60 font-medium"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              🏫 Schools ({schools.length})
            </button>
            <button
              onClick={() => setFacilityFilter("village")}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors text-[11px] whitespace-nowrap ${
                facilityFilter === "village"
                  ? "bg-indigo-950/50 text-indigo-300 border border-indigo-900/60 font-medium"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              🏘️ Villages ({villages.length})
            </button>
            <button
              onClick={() => setFacilityFilter("base")}
              className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors text-[11px] whitespace-nowrap ${
                facilityFilter === "base"
                  ? "bg-amber-950/50 text-amber-300 border border-amber-900/60 font-medium"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              🚁 Bases ({forwardBases.length})
            </button>
          </div>
        )}

        {/* Scrollable Items Container with Top Padding to Prevent Clipping */}
        <div className="flex-1 overflow-y-auto p-3.5 pt-2.5 space-y-2.5 custom-scrollbar bg-zinc-950">
          {/* TAB 1: INCIDENTS / DISTRESS SOS */}
          {activeTab === "incidents" && (
            displayedBeacons.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
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
                    className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-zinc-900 border-zinc-600 ring-1 ring-zinc-500/30 shadow-md"
                        : "bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/80"
                    }`}
                  >
                    {/* Top Row: Status badge + priority + time */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide uppercase ${
                            isRescued
                              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-900/40"
                              : isDispatched
                              ? "bg-amber-950/40 text-amber-300 border border-amber-900/40"
                              : "bg-rose-950/50 text-rose-300 border border-rose-900/50"
                          }`}
                        >
                          {isRescued ? "Rescued" : isDispatched ? "Squad Dispatched" : "Pending Action"}
                        </span>
                        <span className="text-zinc-500 text-[11px]">{beacon.time}</span>
                      </div>

                      <span className="text-[11px] font-mono font-semibold text-zinc-400">
                        PRIORITY {beacon.priority}
                      </span>
                    </div>

                    {/* Victim Name & Landmark */}
                    <div className="mt-2">
                      <h4 className="font-semibold text-zinc-100 text-sm leading-snug">
                        {beacon.name}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {beacon.detail}
                      </p>
                    </div>

                    {/* Coordinates & Assigned Unit */}
                    <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between text-[11px] text-zinc-400 gap-1.5">
                      <span className="flex items-center gap-1 font-mono text-zinc-500">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        {beacon.lat.toFixed(4)}°N, {beacon.lng.toFixed(4)}°E
                        {beacon.altitude && <span> • ~{Math.round(beacon.altitude)}m</span>}
                      </span>

                      {beacon.contact && (
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Phone className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span>{beacon.contact}</span>
                        </span>
                      )}
                    </div>

                    {isDispatched && beacon.assignedUnit && (
                      <div className="mt-2 px-2.5 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-[11px] text-amber-300/90 flex items-center justify-between">
                        <span>Squad: {beacon.assignedUnit}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">En Route</span>
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectVictim(beacon);
                        }}
                        className="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 flex items-center gap-1.5 cursor-pointer transition-colors font-medium"
                      >
                        <Crosshair className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Locate on Map</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {!isRescued && !isDispatched && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDispatch(beacon);
                            }}
                            className="px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-medium transition-colors cursor-pointer shadow-sm"
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
                            className="px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-800/60 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Mark Rescued
                          </button>
                        )}

                        {isRescued && (
                          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
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

          {/* TAB 2: FACILITIES & SHELTERS (Schools, Health Posts, Villages, Helipads) */}
          {activeTab === "facilities" && (
            <div className="space-y-2.5">
              {/* Context Summary Banner */}
              <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 text-[11px] text-zinc-400 leading-snug">
                Schools serve as reinforced assembly shelters, Health Posts handle medical triage, and Villages are vulnerable riverside zones.
              </div>

              {/* Bases Section (if filtered) */}
              {(facilityFilter === "all" || facilityFilter === "base") &&
                forwardBases.map((base: any) => (
                  <div
                    key={base.id}
                    onClick={() => handleLocateBase(base)}
                    className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-amber-950/40 text-amber-300 border border-amber-900/50 flex items-center gap-1">
                        <Plane className="w-3 h-3 text-amber-400" />
                        <span>SAR Forward Base & Helipad</span>
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {base.heliFlightMin}m Flight Lag
                      </span>
                    </div>

                    <h4 className="font-semibold text-zinc-100 text-sm mt-2 leading-tight">
                      {base.name}
                    </h4>

                    <div className="text-xs text-zinc-400 mt-1">
                      Agency: <strong className="text-zinc-200">{base.agency}</strong>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-zinc-500">
                        {base.lat.toFixed(4)}°N, {base.lng.toFixed(4)}°E
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLocateBase(base);
                        }}
                        className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 flex items-center gap-1 font-medium transition-colors"
                      >
                        <Crosshair className="w-3 h-3 text-zinc-400" />
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
                    className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-zinc-900 border-zinc-600 ring-1 ring-zinc-500/30 shadow-md"
                        : "bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/80"
                    }`}
                  >
                    {/* Badge Row */}
                    <div className="flex items-center justify-between text-xs">
                      {isHealth && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-rose-950/40 text-rose-300 border border-rose-900/50 flex items-center gap-1">
                          <HeartPulse className="w-3 h-3 text-rose-400" />
                          <span>Emergency Medical Clinic</span>
                        </span>
                      )}
                      {isSchool && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-sky-950/40 text-sky-300 border border-sky-900/50 flex items-center gap-1">
                          <GraduationCap className="w-3 h-3 text-sky-400" />
                          <span>Community School Evac Shelter</span>
                        </span>
                      )}
                      {isVillage && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-indigo-950/40 text-indigo-300 border border-indigo-900/50 flex items-center gap-1">
                          <Home className="w-3 h-3 text-indigo-400" />
                          <span>Village Settlement at Risk</span>
                        </span>
                      )}
                      {isShelter && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-emerald-950/40 text-emerald-300 border border-emerald-900/50 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-emerald-400" />
                          <span>Verified Safe Refuge</span>
                        </span>
                      )}

                      <span className="text-[11px] font-mono text-zinc-500">
                        {asset.elevation}m ASL
                      </span>
                    </div>

                    {/* Facility Name */}
                    <h4 className="font-semibold text-zinc-100 text-sm mt-2 leading-snug">
                      {asset.name}
                    </h4>

                    {/* Metrics: Population or Shelter Capacity or Surge */}
                    <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                      {asset.population && (
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px]">
                          Population: <strong className="text-zinc-100">{asset.population}</strong>
                        </span>
                      )}
                      {asset.capacity && (
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px]">
                          Assembly Cap: <strong className="text-zinc-100">{asset.capacity}</strong>
                        </span>
                      )}
                      {asset.hazardThresholdMeters && (
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-400 text-[11px]">
                          Surge Alert: <strong>+{asset.hazardThresholdMeters}m</strong>
                        </span>
                      )}
                    </div>

                    {/* Description or Risk Note */}
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      {asset.riskNote || asset.description}
                    </p>

                    {/* Bottom Action Row */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-zinc-500">
                        {asset.lat.toFixed(4)}°N, {asset.lng.toFixed(4)}°E
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLocateAsset(asset);
                        }}
                        className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 flex items-center gap-1 font-medium transition-colors"
                      >
                        <Crosshair className="w-3 h-3 text-zinc-400" />
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
              <div className="p-8 text-center text-zinc-500 text-xs">
                No ground reports filed yet.
              </div>
            ) : (
              fieldDispatches.map((report) => (
                <div
                  key={report.id}
                  className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-200 capitalize">
                      Field Observation: {report.type}
                    </span>
                    <span className="text-zinc-500 text-[11px]">{report.time}</span>
                  </div>

                  <div className="text-xs text-zinc-300 leading-relaxed">{report.note}</div>

                  <div className="text-xs text-zinc-500 flex items-center justify-between pt-1.5 border-t border-zinc-800/80">
                    <span>Sender: {report.senderName}</span>
                    {report.aiClassification && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-300/90 font-medium">
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
      <main className="flex-1 h-full min-h-[350px] relative bg-zinc-950">
        <ModernHazardMap
          corridor={corridor}
          assets={assets}
          mode="rescuer"
          distressBeacons={corridorBeacons}
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
