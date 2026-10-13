import React, { useState } from "react";
import { X, TrendingDown, Waves, ShieldCheck, Mountain, AlertCircle } from "lucide-react";

interface ProfileStation {
  name: string;
  distanceKm: number;
  elevationM: number;
  type: "lake" | "settlement" | "bridge" | "dam" | "safeZone";
  safeClearanceM: number;
  riskNote: string;
}

const CORRIDOR_PROFILES: Record<string, { corridorName: string; riverName: string; stations: ProfileStation[] }> = {
  langtang: {
    corridorName: "Langtang Valley",
    riverName: "Langtang Khola ➔ Trishuli River",
    stations: [
      { name: "Upper Moraine Lake", distanceKm: 0, elevationM: 4950, type: "lake", safeClearanceM: 0, riskNote: "GLOF Breach Source" },
      { name: "Kyanjin Gompa", distanceKm: 7.5, elevationM: 3870, type: "settlement", safeClearanceM: 45, riskNote: "Lodges & cheese factory" },
      { name: "Langtang Village", distanceKm: 13.0, elevationM: 3430, type: "settlement", safeClearanceM: 60, riskNote: "Debris avalanche runout" },
      { name: "Ghora Tabela", distanceKm: 18.5, elevationM: 2970, type: "settlement", safeClearanceM: 35, riskNote: "Army post & checkpoint" },
      { name: "Lama Hotel Gorge", distanceKm: 24.0, elevationM: 2470, type: "bridge", safeClearanceM: 25, riskNote: "Narrow canyon choke" },
      { name: "Bamboo Trailhead", distanceKm: 29.5, elevationM: 1970, type: "settlement", safeClearanceM: 20, riskNote: "River terrace teahouses" },
      { name: "Syabrubesi Bazaar", distanceKm: 36.0, elevationM: 1460, type: "bridge", safeClearanceM: 15, riskNote: "Bhote Koshi confluence" },
      { name: "Mailung Hydro Dam", distanceKm: 42.0, elevationM: 1120, type: "dam", safeClearanceM: 12, riskNote: "Intake radial gates" },
      { name: "Betrawati Highway", distanceKm: 48.5, elevationM: 620, type: "bridge", safeClearanceM: 10, riskNote: "Nuwakot arterial bridge" },
    ],
  },
  khumbu: {
    corridorName: "Everest / Khumbu",
    riverName: "Imja Khola ➔ Dudh Koshi River",
    stations: [
      { name: "Imja Tsho Lake", distanceKm: 0, elevationM: 5010, type: "lake", safeClearanceM: 0, riskNote: "Terminal moraine spillway" },
      { name: "Chhukung Basin", distanceKm: 4.2, elevationM: 4730, type: "settlement", safeClearanceM: 40, riskNote: "Alpine expedition base" },
      { name: "Dingboche Terraces", distanceKm: 9.5, elevationM: 4410, type: "settlement", safeClearanceM: 35, riskNote: "Wide river outwash fan" },
      { name: "Pangboche Gorge", distanceKm: 15.0, elevationM: 3930, type: "bridge", safeClearanceM: 30, riskNote: "Historic monastery cliff" },
      { name: "Phunki Thenga Bridge", distanceKm: 22.5, elevationM: 3250, type: "bridge", safeClearanceM: 18, riskNote: "River crossing below Tengboche" },
      { name: "Hillary Twin Bridges", distanceKm: 30.0, elevationM: 2835, type: "bridge", safeClearanceM: 65, riskNote: "Larja Dobhan gorge" },
      { name: "Phakding Riverside", distanceKm: 36.0, elevationM: 2610, type: "settlement", safeClearanceM: 20, riskNote: "Primary trekking lodges" },
      { name: "Surke / Lukla Base", distanceKm: 44.0, elevationM: 2290, type: "bridge", safeClearanceM: 25, riskNote: "Lower valley trailhead" },
    ],
  },
  annapurna: {
    corridorName: "Annapurna Circuit",
    riverName: "Marsyangdi River",
    stations: [
      { name: "Gangapurna Lake", distanceKm: 0, elevationM: 3540, type: "lake", safeClearanceM: 0, riskNote: "Moraine breach watchpoint" },
      { name: "Manang Village", distanceKm: 1.8, elevationM: 3519, type: "settlement", safeClearanceM: 40, riskNote: "Upper valley hub" },
      { name: "Pisang Confluence", distanceKm: 14.0, elevationM: 3200, type: "bridge", safeClearanceM: 30, riskNote: "Wide gravel braiding" },
      { name: "Chame District HQ", distanceKm: 28.0, elevationM: 2670, type: "settlement", safeClearanceM: 25, riskNote: "Administrative checkpoint" },
      { name: "Dharapani Bridge", distanceKm: 41.0, elevationM: 1860, type: "bridge", safeClearanceM: 20, riskNote: "Vehicular road terminus" },
      { name: "Chamje Highway Gorge", distanceKm: 52.0, elevationM: 1430, type: "bridge", safeClearanceM: 15, riskNote: "Narrow canyon road" },
    ],
  },
  manaslu: {
    corridorName: "Manaslu Circuit",
    riverName: "Budhi Gandaki River",
    stations: [
      { name: "Birendra Tal Lake", distanceKm: 0, elevationM: 3691, type: "lake", safeClearanceM: 0, riskNote: "Glacial calving front" },
      { name: "Samagaun Village", distanceKm: 3.5, elevationM: 3530, type: "settlement", safeClearanceM: 35, riskNote: "Dense stone lodges" },
      { name: "Shyala Forest Bench", distanceKm: 8.0, elevationM: 3500, type: "settlement", safeClearanceM: 30, riskNote: "Larch forest terrace" },
      { name: "Lho Canyon Gorge", distanceKm: 15.5, elevationM: 3180, type: "bridge", safeClearanceM: 45, riskNote: "Monastery promontory" },
      { name: "Namrung Gate Bridge", distanceKm: 25.0, elevationM: 2660, type: "bridge", safeClearanceM: 20, riskNote: "Choke point entrance" },
      { name: "Philim Bridge", distanceKm: 38.0, elevationM: 1590, type: "bridge", safeClearanceM: 18, riskNote: "Sirdibas crossing" },
      { name: "Jagat Checkpost", distanceKm: 46.0, elevationM: 1340, type: "settlement", safeClearanceM: 15, riskNote: "Police checkpoint" },
    ],
  },
  rolwaling: {
    corridorName: "Rolwaling Valley",
    riverName: "Rolwaling Khola ➔ Tama Koshi River",
    stations: [
      { name: "Tsho Rolpa Siphon", distanceKm: 0, elevationM: 4580, type: "lake", safeClearanceM: 0, riskNote: "85M m³ moraine dam" },
      { name: "Na Pasture Village", distanceKm: 5.2, elevationM: 4180, type: "settlement", safeClearanceM: 50, riskNote: "Direct flood outwash fan" },
      { name: "Beding Sherpa Village", distanceKm: 14.0, elevationM: 3690, type: "settlement", safeClearanceM: 45, riskNote: "Primary valley settlement" },
      { name: "Kyalche Rock Chasm", distanceKm: 23.0, elevationM: 2850, type: "bridge", safeClearanceM: 35, riskNote: "Vertical scree canyon" },
      { name: "Simigaun Cliff Base", distanceKm: 31.0, elevationM: 2020, type: "bridge", safeClearanceM: 55, riskNote: "Gorge staircase entrance" },
      { name: "Chetchet Main Bridge", distanceKm: 38.0, elevationM: 1377, type: "bridge", safeClearanceM: 20, riskNote: "Arterial steel suspension" },
      { name: "Gongar Hydro Intake", distanceKm: 52.0, elevationM: 1150, type: "dam", safeClearanceM: 15, riskNote: "456MW Upper Tamakoshi" },
    ],
  },
};

interface ValleyElevationProfileModalProps {
  corridorId: string;
  waterSurge?: number;
  onClose: () => void;
}

export function ValleyElevationProfileModal({
  corridorId,
  waterSurge = 0,
  onClose,
}: ValleyElevationProfileModalProps) {
  const profile = CORRIDOR_PROFILES[corridorId] || CORRIDOR_PROFILES.langtang;
  const [selectedStation, setSelectedStation] = useState<ProfileStation | null>(null);

  const maxElev = profile.stations[0].elevationM;
  const minElev = profile.stations[profile.stations.length - 1].elevationM;
  const totalDrop = maxElev - minElev;
  const totalDistance = profile.stations[profile.stations.length - 1].distanceKm;
  const averageGradientPct = ((totalDrop / (totalDistance * 1000)) * 100).toFixed(1);

  // Approximate flood wave kinematic celerity based on slope
  // v = sqrt(g * (h0 + surge)) * S0^(1/6)
  const estFloodWaveKmh = (
    Math.sqrt(9.81 * (2.5 + waterSurge)) *
    Math.pow(parseFloat(averageGradientPct) / 100, 0.16) *
    3.6
  ).toFixed(1);

  // SVG Chart Dimensions
  const svgWidth = 840;
  const svgHeight = 280;
  const paddingX = 60;
  const paddingY = 40;
  const plotWidth = svgWidth - paddingX * 2;
  const plotHeight = svgHeight - paddingY * 2;

  const points = profile.stations.map((s) => {
    const x = paddingX + (s.distanceKm / totalDistance) * plotWidth;
    const y = paddingY + ((maxElev - s.elevationM) / totalDrop) * plotHeight;
    return { ...s, x, y };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl bg-[#0B132B] border border-[#2A3B5E] shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-[#0F1B33] border-b border-[#2A3B5E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-700/80 flex items-center justify-center text-cyan-400">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Longitudinal Valley Elevation & Flood Velocity Profile
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {profile.corridorName}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                {profile.riverName} &bull; Hydrological Hydraulic Gradient Analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#16233F] hover:bg-[#203358] border border-[#2A3B5E] flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tactical Key Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#070D1B] border-b border-[#1E293B] text-xs">
          <div className="p-2.5 rounded-xl bg-[#0F1B33] border border-[#2A3B5E]/60">
            <div className="text-[10px] uppercase font-bold text-[#64748B] flex items-center gap-1">
              <Mountain className="w-3 h-3 text-cyan-400" /> Total Altitude Drop
            </div>
            <div className="text-sm font-bold text-cyan-300 font-mono mt-0.5">
              -{totalDrop.toLocaleString()} m
            </div>
            <div className="text-[10px] text-[#94A3B8]">
              {maxElev}m ➔ {minElev}m ASL
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0F1B33] border border-[#2A3B5E]/60">
            <div className="text-[10px] uppercase font-bold text-[#64748B] flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-amber-400" /> Average Channel Slope
            </div>
            <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">
              {averageGradientPct}% Grade
            </div>
            <div className="text-[10px] text-[#94A3B8]">
              {(totalDrop / totalDistance).toFixed(0)}m vertical drop / km
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0F1B33] border border-[#2A3B5E]/60">
            <div className="text-[10px] uppercase font-bold text-[#64748B] flex items-center gap-1">
              <Waves className="w-3 h-3 text-rose-400" /> Wave Kinematic Speed
            </div>
            <div className="text-sm font-bold text-rose-300 font-mono mt-0.5">
              ~{estFloodWaveKmh} km/h
            </div>
            <div className="text-[10px] text-[#94A3B8]">
              {waterSurge > 0 ? `Simulated +${waterSurge.toFixed(1)}m surge` : "Baseline discharge"}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0F1B33] border border-[#2A3B5E]/60">
            <div className="text-[10px] uppercase font-bold text-[#64748B] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Minimum Safe Clearance
            </div>
            <div className="text-sm font-bold text-emerald-300 font-mono mt-0.5">
              &ge; 35m Uphill Ridge
            </div>
            <div className="text-[10px] text-[#94A3B8]">Above active gorge bed</div>
          </div>
        </div>

        {/* SVG Longitudinal Profile */}
        <div className="p-4 overflow-x-auto bg-[#0A1224] flex-1">
          <div className="min-w-[760px]">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto select-none"
            >
              <defs>
                <linearGradient id="profileGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                const elevVal = Math.round(maxElev - frac * totalDrop);
                const yPos = paddingY + frac * plotHeight;
                return (
                  <g key={idx}>
                    <line
                      x1={paddingX}
                      y1={yPos}
                      x2={svgWidth - paddingX}
                      y2={yPos}
                      stroke="#1E293B"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 8}
                      y={yPos + 4}
                      fill="#64748B"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {elevVal}m
                    </text>
                  </g>
                );
              })}

              {/* Area Under Curve */}
              <path d={areaD} fill="url(#profileGradient)" />

              {/* River Bed Profile Path */}
              <path d={pathD} fill="none" stroke="#06B6D4" strokeWidth="3" />

              {/* Station Markers */}
              {points.map((p, idx) => {
                const isSelected = selectedStation?.name === p.name;
                const isLake = p.type === "lake";
                const isDam = p.type === "dam";
                const isBridge = p.type === "bridge";

                const dotColor = isLake
                  ? "#38BDF8"
                  : isDam
                  ? "#F59E0B"
                  : isBridge
                  ? "#F43F5E"
                  : "#10B981";

                return (
                  <g
                    key={idx}
                    onClick={() => setSelectedStation(p)}
                    className="cursor-pointer group"
                  >
                    {/* Vertical guideline */}
                    <line
                      x1={p.x}
                      y1={p.y}
                      x2={p.x}
                      y2={svgHeight - paddingY}
                      stroke="#2A3B5E"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      className="opacity-40 group-hover:opacity-100 transition-opacity"
                    />

                    {/* Landmark Circle */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? 6 : 4.5}
                      fill={dotColor}
                      stroke="#0B132B"
                      strokeWidth="2"
                      className="transition-all"
                    />

                    {/* Distance label on X Axis */}
                    <text
                      x={p.x}
                      y={svgHeight - paddingY + 16}
                      fill="#64748B"
                      fontSize="8.5"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {p.distanceKm}km
                    </text>

                    {/* Landmark Name Label */}
                    <text
                      x={p.x}
                      y={p.y - 10}
                      fill={isSelected ? "#38BDF8" : "#E2E8F0"}
                      fontSize="9"
                      fontWeight={isSelected ? "bold" : "normal"}
                      textAnchor="middle"
                      className="group-hover:fill-cyan-300 transition-colors"
                    >
                      {p.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Selected Station Inspector Drawer */}
        <div className="p-3.5 bg-[#0F1B33] border-t border-[#2A3B5E] text-xs">
          {selectedStation ? (
            <div className="flex items-center justify-between flex-wrap gap-2 animate-in fade-in duration-150">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">
                    {selectedStation.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {selectedStation.elevationM}m ASL &bull; {selectedStation.distanceKm} km downstream
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8]">
                  {selectedStation.riskNote} &bull; Evacuation clearance: &ge;{selectedStation.safeClearanceM}m vertical rise
                </p>
              </div>
              <button
                onClick={() => setSelectedStation(null)}
                className="text-[11px] text-[#64748B] hover:text-white underline cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Click on any station node along the cross-section above to inspect its local hydraulic clearance and hazard vulnerability.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
