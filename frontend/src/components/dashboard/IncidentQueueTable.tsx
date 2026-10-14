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
      className={`flex flex-col bg-[#0A1224] border-t lg:border-t-0 border-[#1E293B] overflow-hidden select-none ${className}`}
    >
      {/* 1. Header Toolbar with Filter Tabs and Search Bar */}
      <div className="p-3.5 border-b border-[#1E293B] bg-[#070D18]/80 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-white tracking-wide flex items-center gap-2">
              <span>SAR Distress Incidents Queue</span>
              {counts.pending > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                  {counts.pending} Urgent
                </span>
              )}
            </h3>
            <p className="text-[10px] text-[#64748B] font-mono">
              Real-time mountain distress beacons & APF evacuation status
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center bg-[#111A2E] p-1 rounded-xl border border-[#1E293B] text-[11px]">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-[#1E293B] text-white shadow-sm"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-rose-600/80 text-white shadow-sm"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              SOS ({counts.pending})
            </button>
            <button
              onClick={() => setActiveTab("dispatched")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "dispatched"
                  ? "bg-amber-600/80 text-white shadow-sm"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              Dispatched ({counts.dispatched})
            </button>
            <button
              onClick={() => setActiveTab("rescued")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "rescued"
                  ? "bg-emerald-600/80 text-white shadow-sm"
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
              className="pl-8 pr-3 py-1 bg-[#111A2E] border border-[#1E293B] rounded-xl text-xs text-white placeholder-[#64748B] w-36 sm:w-44 focus:outline-none focus:border-cyan-500 transition-all font-mono"
            />
          </div>
        </div>
      </div>

      {/* 2. Structured Transcope High-Density Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#0D1627] text-[#64748B] font-mono text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-[#1E293B]">
            <tr>
              <th className="py-2.5 px-3">Incident ID</th>
              <th className="py-2.5 px-3">Distress Party</th>
              <th className="py-2.5 px-3">Coordinates & Elevation</th>
              <th className="py-2.5 px-3">Urgency Score</th>
              <th className="py-2.5 px-3">Evac Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#16233F]/80">
            {filteredBeacons.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500 font-mono text-xs">
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
                    className={`transition-all duration-150 cursor-pointer group ${
                      isSelected
                        ? "bg-[#16294A] border-l-4 border-l-cyan-400"
                        : "hover:bg-[#0F1B33]"
                    }`}
                  >
                    {/* 1. Incident ID */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-[#111A2E] border border-[#2A3B5E] text-cyan-300 font-bold text-[11px]">
                        #SOS-{String(beacon.id).slice(-4)}
                      </span>
                    </td>

                    {/* 2. Distress Party Details */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-white text-xs group-hover:text-cyan-300 transition-colors">
                        {beacon.name}
                      </div>
                      <div className="text-[10px] text-[#94A3B8] line-clamp-1 max-w-[200px] sm:max-w-[300px]">
                        {beacon.detail}
                      </div>
                    </td>

                    {/* 3. Coordinates & Elevation */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                      <div className="text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>
                          {beacon.lat.toFixed(4)}°N, {beacon.lng.toFixed(4)}°E
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-400/90 pl-4">
                        {beacon.altitude ? `${beacon.altitude}m ASL` : "2,780m ASL"}
                      </div>
                    </td>

                    {/* 4. Urgency Score */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono border ${
                            beacon.priority >= 90
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
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
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Plane className="w-3 h-3 text-amber-400" />
                          {beacon.assignedUnit || "SAR Team En-Route"}
                        </span>
                      )}
                      {isRescued && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
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
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#16233F] hover:bg-cyan-600 hover:text-white text-cyan-300 border border-[#2A3B5E] text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
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
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow-sm"
                            title="Dispatch APF Mountain Rescue"
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
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow-sm"
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
