import React, { useState, useMemo } from "react";
import { DistressBeacon } from "../../context/UserRoleContext";
import {
  Search,
  Crosshair,
  AlertTriangle,
  CheckCircle2,
  Plane,
  Clock,
  MapPin,
  Filter,
  Users,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

interface IncidentQueueTableProps {
  beacons: DistressBeacon[];
  selectedBeacon: DistressBeacon | null;
  onSelectBeacon: (beacon: DistressBeacon) => void;
  onDispatchBeacon?: (beacon: DistressBeacon) => void;
  onResolveBeacon?: (beacon: DistressBeacon) => void;
  corridorName?: string;
  className?: string;
}

export function IncidentQueueTable({
  beacons,
  selectedBeacon,
  onSelectBeacon,
  onDispatchBeacon,
  onResolveBeacon,
  corridorName,
  className = "",
}: IncidentQueueTableProps) {
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "dispatched" | "rescued">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Counts
  const counts = useMemo(() => {
    return {
      all: beacons.length,
      pending: beacons.filter((b) => b.status === "pending").length,
      dispatched: beacons.filter((b) => b.status === "dispatched" || b.status === "en_route").length,
      rescued: beacons.filter((b) => b.status === "rescued").length,
    };
  }, [beacons]);

  // Filtered Beacons
  const filteredBeacons = useMemo(() => {
    return beacons.filter((b) => {
      // Tab filter
      if (activeTab === "pending" && b.status !== "pending") return false;
      if (activeTab === "dispatched" && b.status !== "dispatched" && b.status !== "en_route") return false;
      if (activeTab === "rescued" && b.status !== "rescued") return false;

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = b.name.toLowerCase().includes(query);
        const matchesDetail = b.detail.toLowerCase().includes(query);
        const matchesId = String(b.id).toLowerCase().includes(query);
        return matchesName || matchesDetail || matchesId;
      }
      return true;
    });
  }, [beacons, activeTab, searchQuery]);

  return (
    <div
      className={`flex flex-col bg-[#070D18] border-t lg:border-t-0 border-[#1E293B] overflow-hidden select-none ${className}`}
    >
      {/* 1. Header Toolbar with Filter Tabs and Search Bar */}
      <div className="p-3 border-b border-[#1E293B] bg-[#0A1224]/80 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold shadow-inner">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <span>SAR Distress Incidents Queue</span>
              {counts.pending > 0 && (
                <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 glow-rose animate-pulse">
                  {counts.pending} Urgent
                </span>
              )}
            </h3>
            <p className="text-[10px] text-[#64748B] font-mono">
              High-precision mountain distress coordinates & APF evacuation status
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center bg-[#090F1D] p-1 rounded-xl border border-white/10 text-[11px]">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-[#1E293B] text-white shadow-sm border border-white/5"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-rose-600/90 text-white shadow-sm glow-rose"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              SOS ({counts.pending})
            </button>
            <button
              onClick={() => setActiveTab("dispatched")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "dispatched"
                  ? "bg-amber-600/90 text-white shadow-sm glow-amber"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              Dispatched ({counts.dispatched})
            </button>
            <button
              onClick={() => setActiveTab("rescued")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "rescued"
                  ? "bg-emerald-600/90 text-white shadow-sm glow-emerald"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              Extracted ({counts.rescued})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search trekker, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-[#090F1D] border border-white/10 rounded-xl text-xs text-white placeholder-[#64748B] w-36 sm:w-44 focus:outline-none focus:border-cyan-500 transition-all font-mono"
            />
          </div>
        </div>
      </div>

      {/* 2. Structured Transcope High-Density Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#090F1D] text-[#64748B] font-mono text-[9px] uppercase tracking-widest sticky top-0 z-10 border-b border-white/5">
            <tr>
              <th className="py-2.5 px-3">Incident ID</th>
              <th className="py-2.5 px-3">Distress Party</th>
              <th className="py-2.5 px-3">Coordinates & Elevation</th>
              <th className="py-2.5 px-3">Urgency Score</th>
              <th className="py-2.5 px-3">Evac Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredBeacons.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-mono text-xs">
                  No distress incidents in this category. All trail sectors report nominal status.
                </td>
              </tr>
            ) : (
              filteredBeacons.map((beacon) => {
                const isSelected = selectedBeacon?.id === beacon.id;
                const isPending = beacon.status === "pending";
                const isDispatched = beacon.status === "dispatched" || beacon.status === "en_route";
                const isRescued = beacon.status === "rescued";

                return (
                  <tr
                    key={beacon.id}
                    onClick={() => onSelectBeacon(beacon)}
                    className={`transition-all duration-200 cursor-pointer group ${
                      isSelected
                        ? "bg-[#142646] border-l-4 border-l-cyan-400 shadow-inner"
                        : "hover:bg-[#0E1A33]/70"
                    }`}
                  >
                    {/* 1. Incident ID */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-[#090F1D] border border-[#2A3B5E] text-cyan-300 font-bold text-[11px] tabular-nums">
                        #SOS-{String(beacon.id).slice(-4)}
                      </span>
                    </td>

                    {/* 2. Distress Party Details */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-white text-xs group-hover:text-cyan-300 transition-colors">
                        {beacon.name}
                      </div>
                      <div className="text-[10px] text-[#94A3B8] line-clamp-1 max-w-[200px] sm:max-w-[320px]">
                        {beacon.detail}
                      </div>
                    </td>

                    {/* 3. Coordinates & Elevation */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] tabular-nums">
                      <div className="text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>
                          {beacon.lat.toFixed(4)}°N, {beacon.lng.toFixed(4)}°E
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-400/90 pl-4 font-bold">
                        {beacon.altitude ? `${beacon.altitude}m ASL` : "2,780m ASL"}
                      </div>
                    </td>

                    {/* 4. Urgency Score */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono border tabular-nums ${
                            beacon.priority >= 90
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/50 glow-rose"
                              : beacon.priority >= 70
                              ? "bg-orange-500/20 text-orange-300 border-orange-500/50"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/50"
                          }`}
                        >
                          {beacon.priority}% SOS
                        </span>
                      </div>
                    </td>

                    {/* 5. Evac Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          Pending Evac
                        </span>
                      )}
                      {isDispatched && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 glow-amber">
                          <Plane className="w-3 h-3 text-amber-400" />
                          {beacon.assignedUnit || "SAR Team En-Route"}
                        </span>
                      )}
                      {isRescued && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 glow-emerald">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Extracted
                        </span>
                      )}
                    </td>

                    {/* 6. Actions */}
                    <td className="py-3 px-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Focus Map Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBeacon(beacon);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#111A2E] hover:bg-cyan-600 hover:text-white text-cyan-300 border border-[#2A3B5E] text-[11px] font-semibold transition-all cursor-pointer shadow-sm hover:scale-105"
                          title="Focus Google Map on victim location"
                        >
                          <Crosshair className="w-3 h-3 text-cyan-400 group-hover:text-white" />
                          <span>Focus Map</span>
                        </button>

                        {/* Quick Dispatch / Resolve */}
                        {isPending && onDispatchBeacon && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDispatchBeacon(beacon);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow-sm hover:scale-105"
                            title="Dispatch APF Mountain Rescue Squad"
                          >
                            Dispatch
                          </button>
                        )}

                        {isDispatched && onResolveBeacon && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onResolveBeacon(beacon);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow-sm hover:scale-105"
                            title="Mark as Safely Extracted"
                          >
                            Mark Extracted
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
