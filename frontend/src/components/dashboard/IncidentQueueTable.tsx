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
  Calendar,
  SlidersHorizontal,
  ArrowRight,
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
  corridorName = "Langtang",
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
      className={`flex flex-col bg-[#111215] border-t lg:border-t-0 border-white/[0.08] overflow-hidden select-none ${className}`}
    >
      {/* 1. Header Toolbar (Transcope Orders Table Style) */}
      <div className="p-3 sm:px-4 border-b border-white/[0.08] bg-[#18191E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        {/* Title + Subtitle */}
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-white tracking-wide font-sans flex items-center gap-2">
            <span>Incident Queue & Dispatches</span>
            {counts.pending > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {counts.pending} Urgent SOS
              </span>
            )}
          </h3>
        </div>

        {/* Tab Filters + Search + Control Icons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Transcope Pill Segmented Tabs */}
          <div className="flex items-center bg-[#111215] p-0.5 rounded-xl border border-white/[0.08] text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white/[0.12] text-white shadow-sm font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab("dispatched")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === "dispatched"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Dispatched
            </button>
            <button
              onClick={() => setActiveTab("rescued")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === "rescued"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Rescued
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search party, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-[#111215] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 w-36 sm:w-44 focus:outline-none focus:border-white/30 transition-colors font-mono"
            />
          </div>

          {/* Transcope Calendar / Filter Action Icons */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
              title="Filter by Timestamp"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
            <button
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
              title="Advanced Filter Options"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Structured Transcope High-Density Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#18191E] text-slate-400 font-mono text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-white/[0.06]">
            <tr>
              <th className="py-2.5 px-3.5">Incident ID</th>
              <th className="py-2.5 px-3.5">Distress Party</th>
              <th className="py-2.5 px-3.5">Evacuation Route</th>
              <th className="py-2.5 px-3.5">Elevation & GPS</th>
              <th className="py-2.5 px-3.5">Elapsed / ETA</th>
              <th className="py-2.5 px-3.5">Status</th>
              <th className="py-2.5 px-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {filteredBeacons.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 font-mono text-xs">
                  No distress incidents matching this filter. Monitored trail sectors report nominal safety.
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
                        ? "bg-[#22242D] border-l-4 border-l-white"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    {/* 1. Incident ID with Vehicle / Alert Icon */}
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs">🚨</span>
                        <span className="px-2 py-0.5 rounded-md bg-[#111215] border border-white/[0.08] text-white font-bold text-[11px] tabular-nums">
                          #HS-{String(beacon.id).slice(-4)}
                        </span>
                      </div>
                    </td>

                    {/* 2. Distress Party Details */}
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-white text-xs group-hover:text-slate-200 transition-colors font-sans">
                        {beacon.name}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 max-w-[180px] sm:max-w-[240px] font-sans">
                        {beacon.detail}
                      </div>
                    </td>

                    {/* 3. Transcope Visual Route Connector */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
                        <div className="flex items-center gap-1 text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full border border-slate-400" />
                          <span className="text-[10px]">{corridorName.split(" ")[0]} Trail</span>
                        </div>
                        <div className="flex items-center text-slate-600">
                          <span className="h-[1px] w-6 bg-slate-600 inline-block" />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                        </div>
                        <div className="flex items-center gap-1 text-white font-semibold">
                          <span className="text-[10px]">Helipad Alpha</span>
                        </div>
                      </div>
                    </td>

                    {/* 4. Elevation & GPS */}
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] tabular-nums">
                      <div className="text-white flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>
                          {beacon.lat.toFixed(4)}°, {beacon.lng.toFixed(4)}°
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-400 pl-4 font-bold">
                        {beacon.altitude ? `${Math.round(beacon.altitude)}m ASL` : "2,780m ASL"}
                      </div>
                    </td>

                    {/* 5. Elapsed / ETA */}
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px]">
                      <div className="text-slate-300">
                        {isDispatched ? "ETA ~18 mins" : "14 mins ago"}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {isDispatched ? "Helicopter in-flight" : "Initial distress"}
                      </div>
                    </td>

                    {/* 6. Status Badge Pill */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Pending evac
                        </span>
                      )}
                      {isDispatched && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                          <Plane className="w-3 h-3 text-amber-400" />
                          {beacon.assignedUnit || "SAR en route"}
                        </span>
                      )}
                      {isRescued && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Extracted
                        </span>
                      )}
                    </td>

                    {/* 7. Quick Actions */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBeacon(beacon);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/[0.08] text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Focus map on incident"
                        >
                          <Crosshair className="w-3 h-3 text-slate-400" />
                          <span>Focus</span>
                        </button>

                        {isPending && onDispatchBeacon && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDispatchBeacon(beacon);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-sm"
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
                            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-sm"
                            title="Mark as Safely Extracted"
                          >
                            Mark Rescued
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
