import React from "react";
import { Waves, Clock, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";

interface CascadeStation {
  name: string;
  elevation: number;
  arrivalMin: number;
  status: "Safe" | "Warning" | "Critical";
  evacuationStatus: string;
}

interface FloodCascadeTimelineProps {
  corridorName: string;
  waterSurgeMeters: number;
  onSelectStation?: (stationName: string) => void;
}

const DEFAULT_STATIONS: Record<string, CascadeStation[]> = {
  langtang: [
    { name: "Moraine Lake Breach (4,950m)", elevation: 4950, arrivalMin: 0, status: "Critical", evacuationStatus: "Origin Epicenter" },
    { name: "Kyanjin Gompa (3,865m)", elevation: 3865, arrivalMin: 8, status: "Critical", evacuationStatus: "Immediate High Ridge Evacuation" },
    { name: "Lama Hotel Gorge (2,470m)", elevation: 2470, arrivalMin: 18, status: "Critical", evacuationStatus: "Evacuate Narrow Canyon Floor" },
    { name: "Bamboo Trailhead (1,970m)", elevation: 1970, arrivalMin: 28, status: "Warning", evacuationStatus: "Halt All Inbound Porters" },
    { name: "Syabrubesi Bazaar (1,460m)", elevation: 1460, arrivalMin: 38, status: "Warning", evacuationStatus: "Sound Bridge & Market Sirens" },
    { name: "Mailung Hydropower Dam (1,120m)", elevation: 1120, arrivalMin: 55, status: "Safe", evacuationStatus: "Open Emergency Sluice Gates" },
  ],
  khumbu: [
    { name: "Imja Tsho Lake (5,010m)", elevation: 5010, arrivalMin: 0, status: "Critical", evacuationStatus: "Glacial Breach Origin" },
    { name: "Dingboche Terraces (4,410m)", elevation: 4410, arrivalMin: 12, status: "Critical", evacuationStatus: "Evacuate Alluvial Floodplain" },
    { name: "Tengboche Valley Foot (3,860m)", elevation: 3860, arrivalMin: 26, status: "Warning", evacuationStatus: "Move to Monastery Ridge" },
    { name: "Phakding Riverbed (2,610m)", elevation: 2610, arrivalMin: 48, status: "Warning", evacuationStatus: "Clear Suspension Bridges" },
    { name: "Lukla Gorges (2,200m)", elevation: 2200, arrivalMin: 65, status: "Safe", evacuationStatus: "Civil Defense Air Alert" },
  ],
};

export function FloodCascadeTimeline({
  corridorName,
  waterSurgeMeters,
  onSelectStation,
}: FloodCascadeTimelineProps) {
  const corridorKey = corridorName.toLowerCase().includes("khumbu") ? "khumbu" : "langtang";
  const stations = DEFAULT_STATIONS[corridorKey] || DEFAULT_STATIONS.langtang;

  const isSurging = waterSurgeMeters > 0;

  return (
    <div className="w-full bg-[#131d2a] rounded-xl border border-white/10 p-4 shadow-xl text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide uppercase">
              Downstream Flood Wave Propagation &amp; Evacuation Windows
            </h4>
            <p className="text-[11px] text-slate-400">
              Estimated hydraulic arrival travel times from headwater breach origin to lower civil settlements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] text-slate-400">Current River Surge:</span>
          <span className={`font-bold font-mono px-2 py-0.5 rounded ${isSurging ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-teal-500/10 text-teal-300"}`}>
            +{waterSurgeMeters.toFixed(1)}m Stage
          </span>
        </div>
      </div>

      {/* Timeline Cascade Chain */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {stations.map((stn, i) => {
          const isCritical = isSurging && stn.arrivalMin <= 20;
          const isWarning = isSurging && stn.arrivalMin > 20 && stn.arrivalMin <= 45;

          const badgeColor = isCritical
            ? "bg-red-500/20 border-red-500/40 text-red-300"
            : isWarning
            ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";

          return (
            <div
              key={i}
              onClick={() => onSelectStation?.(stn.name)}
              className={`p-3 rounded-lg border bg-[#0b131e] flex flex-col justify-between transition-all cursor-pointer hover:border-white/30 ${
                isCritical ? "border-red-500/50 shadow-red-950/30 shadow-lg" : "border-white/5"
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                  <span className="text-slate-400">Step {i + 1}</span>
                  <span className="flex items-center gap-1 font-bold text-cyan-400">
                    <Clock className="w-3 h-3" />
                    {stn.arrivalMin === 0 ? "0 min (Origin)" : `+${stn.arrivalMin}m`}
                  </span>
                </div>
                <div className="text-xs font-bold text-white line-clamp-2 leading-tight">
                  {stn.name}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Elevation: {stn.elevation}m
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-white/5">
                <span className={`text-[10px] px-2 py-0.5 rounded block text-center font-semibold border ${badgeColor}`}>
                  {isCritical ? "🚨 EVACUATE" : isWarning ? "⚠️ ALERT SIREN" : "✓ MONITOR"}
                </span>
                <span className="text-[9px] text-slate-400 block text-center mt-1 line-clamp-1">
                  {stn.evacuationStatus}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
