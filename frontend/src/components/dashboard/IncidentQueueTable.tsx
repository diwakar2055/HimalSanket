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
      className={`flex flex-col bg-[#080E19] border-t lg:border-t-0 border-[#27364B] overflow-hidden select-none ${className}`}
    >
      {/* 1. Header Toolbar with Filter Tabs and Search Bar */}
      <div className="p-3 border-b border-[#27364B] bg-[#101A2A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-[#DC2626]/40 flex items-center justify-center text-rose-400 font-bold shadow-inner">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#F8FAFC] tracking-wide flex items-center gap-2">
              <span>Distress incident queue</span>
              {counts.pending > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#DC2626]/20 text-rose-300 border border-[#DC2626]/40 animate-pulse">
                  {counts.pending} urgent SOS
                </span>
              )}
            </h3>
            <p className="text-[10px] text-[#A7B4C8] font-mono">
              High-precision mountain distress coordinates & APF evacuation status
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center bg-[#080E19] p-0.5 rounded-lg border border-[#27364B] text-[11px]">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                activeTab === "all"
                  ? "bg-[#152238] text-[#F8FAFC] border border-[#27364B] shadow-sm"
                  : "text-[#A7B4C8] hover:text-[#F8FAFC]"
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                activeTab === "pending"
                  ? "bg-[#DC2626] text-white shadow-sm"
                  : "text-[#A7B4C8] hover:text-[#F8FAFC]"
              }`}
            >
              Pending ({counts.pending})
            </button>
            <button
              onClick={() => setActiveTab("dispatched")}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                activeTab === "dispatched"
                  ? "bg-[#EAB308] text-slate-900 shadow-sm"
                  : "text-[#A7B4C8] hover:text-[#F8FAFC]"
              }`}
            >
              Dispatched ({counts.dispatched})
            </button>
            <button
              onClick={() => setActiveTab("rescued")}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                activeTab === "rescued"
                  ? "bg-[#22C55E] text-white shadow-sm"
                  : "text-[#A7B4C8] hover:text-[#F8FAFC]"
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
              className="pl-8 pr-3 py-1 bg-[#152238] border border-[#27364B] rounded-lg text-xs text-[#F8FAFC] placeholder-[#64748B] w-36 sm:w-44 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
            />
          </div>
        </div>
      </div>

      {/* 2. Structured Transcope High-Density Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#101A2A] text-[#A7B4C8] font-mono text-[9px] uppercase tracking-widest sticky top-0 z-10 border-b border-[#27364B]">
            <tr>
              <th className="py-2.5 px-3">Incident ID</th>
              <th className="py-2.5 px-3">Distress Party</th>
              <th className="py-2.5 px-3">Coordinates & Elevation</th>
              <th className="py-2.5 px-3">Urgency Score</th>
              <th className="py-2.5 px-3">Evac Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27364B]/60">
            {filteredBeacons.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#64748B] font-mono text-xs">
                  No distress incidents in this category. All monitored trail sectors report nominal status.
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
                    className={`transition-colors cursor-pointer group ${
                      isSelected
                        ? "bg-[#152238] border-l-4 border-l-cyan-400 shadow-inner"
                        : "hover:bg-[#101A2A]"
                    }`}
                  >
                    {/* 1. Incident ID */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-[#080E19] border border-[#27364B] text-cyan-300 font-bold text-[11px] tabular-nums">
                        #SOS-{String(beacon.id).slice(-4)}
                      </span>
                    </td>

                    {/* 2. Distress Party Details */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#F8FAFC] text-xs group-hover:text-cyan-300 transition-colors">
                        {beacon.name}
                      </div>
                      <div className="text-[10px] text-[#A7B4C8] line-clamp-1 max-w-[200px] sm:max-w-[320px]">
                        {beacon.detail}
                      </div>
                    </td>

                    {/* 3. Coordinates & Elevation */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] tabular-nums">
                      <div className="text-[#F8FAFC] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>
                          {beacon.lat.toFixed(4)}°N, {beacon.lng.toFixed(4)}°E
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-400 pl-4 font-bold">
                        {beacon.altitude ? `${beacon.altitude}m ASL` : "2,780m ASL"}
                      </div>
                    </td>

                    {/* 4. Urgency Score */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border tabular-nums ${
                            beacon.priority >= 90
                              ? "bg-[#DC2626]/20 text-rose-300 border-[#DC2626]/50"
                              : beacon.priority >= 70
                              ? "bg-[#F97316]/20 text-orange-300 border-[#F97316]/50"
                              : "bg-[#EAB308]/20 text-amber-300 border-[#EAB308]/50"
                          }`}
                        >
                          {beacon.priority}% SOS
                        </span>
                      </div>
                    </td>

                    {/* 5. Evac Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DC2626]/20 text-rose-300 border border-[#DC2626]/40 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                          Pending evac
                        </span>
                      )}
                      {isDispatched && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAB308]/20 text-amber-300 border border-[#EAB308]/40">
                          <Plane className="w-3 h-3 text-amber-400" />
                          {beacon.assignedUnit || "SAR team en-route"}
                        </span>
                      )}
                      {isRescued && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#22C55E]/20 text-emerald-300 border border-[#22C55E]/40">
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
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#152238] hover:bg-cyan-600 hover:text-white text-cyan-300 border border-[#27364B] text-[11px] font-semibold transition-colors cursor-pointer shadow-sm"
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
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-sm"
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
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-sm"
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
