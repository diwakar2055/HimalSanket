import React, { useState } from "react";
import {
  X,
  TrendingDown,
  Waves,
  ShieldCheck,
  Mountain,
  AlertCircle,
  Sliders,
  Clock,
  MapPin,
  CheckCircle2,
} from "lucide-react";

interface ProfileStation {
  name: string;
  distanceKm: number;
  elevationM: number;
  type: "lake" | "settlement" | "bridge" | "dam" | "safeZone";
  safeClearanceM: number;
  riskNote: string;
}

const CORRIDOR_PROFILES: Record<
  string,
  { corridorName: string; riverName: string; stations: ProfileStation[] }
> = {
  langtang: {
    corridorName: "Langtang Valley",
    riverName: "Langtang Khola ➔ Trishuli River",
    stations: [
      { name: "Upper Moraine Lake", distanceKm: 0, elevationM: 4950, type: "lake", safeClearanceM: 0, riskNote: "GLOF Breach Source" },
      { name: "Kyanjin Gompa", distanceKm: 7.5, elevationM: 3870, type: "settlement", safeClearanceM: 45, riskNote: "Lodges & cheese factory" },
      { name: "Langtang Village", distanceKm: 13.0, elevationM: 3430, type: "settlement", safeClearanceM: 60, riskNote: "Debris avalanche runout" },
      { name: "Ghora Tabela", distanceKm: 18.5, elevationM: 2970, type: "settlement", safeClearanceM: 35, riskNote: "Army post & checkpoint" },
      { name: "Lama Hotel Gorge", distanceKm: 24.0, elevationM: 2470, type: "bridge", safeClearanceM: 25, riskNote: "Narrow canyon choke point" },
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
  mardi: {
    corridorName: "Mardi Himal Trek",
    riverName: "Mardi Khola ➔ Seti River",
    stations: [
      { name: "Mardi Base Camp", distanceKm: 0, elevationM: 4500, type: "lake", safeClearanceM: 50, riskNote: "High glacial scree ridge beneath Machapuchare" },
      { name: "Upper Viewpoint", distanceKm: 3.5, elevationM: 4200, type: "safeZone", safeClearanceM: 60, riskNote: "Narrow arête crest; high wind exposure" },
      { name: "High Camp", distanceKm: 6.8, elevationM: 3580, type: "safeZone", safeClearanceM: 40, riskNote: "Highest teahouse haven on ridge" },
      { name: "Badal Danda", distanceKm: 11.2, elevationM: 3250, type: "settlement", safeClearanceM: 35, riskNote: "Cloudburst & lightning alert point" },
      { name: "Low Camp", distanceKm: 15.0, elevationM: 2970, type: "settlement", safeClearanceM: 30, riskNote: "Rhododendron canopy transition" },
      { name: "Forest Camp", distanceKm: 19.5, elevationM: 2550, type: "settlement", safeClearanceM: 25, riskNote: "Gully runoff chokepoint" },
      { name: "Siding Village Riverbank", distanceKm: 25.0, elevationM: 1750, type: "bridge", safeClearanceM: 12, riskNote: "Mardi Khola suspension bridge" },
      { name: "Kalimati River Terrace", distanceKm: 29.5, elevationM: 1500, type: "settlement", safeClearanceM: 18, riskNote: "River terrace farming basin" },
      { name: "Mardi Hydro Intake", distanceKm: 41.0, elevationM: 1020, type: "dam", safeClearanceM: 10, riskNote: "Seti River confluence headworks" },
    ],
  },
  poonhill: {
    corridorName: "Ghorepani Poon Hill",
    riverName: "Bhurungdi Khola ➔ Kali Gandaki / Modi",
    stations: [
      { name: "Poon Hill Tower", distanceKm: 0, elevationM: 3210, type: "safeZone", safeClearanceM: 120, riskNote: "Highest panoramic ridge summit" },
      { name: "Ghorepani Pass", distanceKm: 1.5, elevationM: 2874, type: "settlement", safeClearanceM: 65, riskNote: "Primary stone lodge mountain pass" },
      { name: "Nangethanti Forest", distanceKm: 5.0, elevationM: 2430, type: "settlement", safeClearanceM: 30, riskNote: "Stream ravine lodge bench" },
      { name: "Banthanti Stream Ravine", distanceKm: 7.8, elevationM: 2210, type: "settlement", safeClearanceM: 25, riskNote: "Deep rhododendron gorge bridge" },
      { name: "Ulleri 3,300 Steps", distanceKm: 11.2, elevationM: 1960, type: "settlement", safeClearanceM: 25, riskNote: "Steep staircase cliff instability" },
      { name: "Tikhedhunga River", distanceKm: 14.5, elevationM: 1540, type: "bridge", safeClearanceM: 14, riskNote: "Bhurungdi suspension bridge" },
      { name: "Hile Riverside", distanceKm: 16.2, elevationM: 1480, type: "settlement", safeClearanceM: 18, riskNote: "Riverside lodge street" },
      { name: "Birethanti Confluence", distanceKm: 21.0, elevationM: 1070, type: "bridge", safeClearanceM: 12, riskNote: "Modi Khola river crossing" },
      { name: "Nayapul Trailhead", distanceKm: 23.5, elevationM: 1040, type: "dam", safeClearanceM: 10, riskNote: "Highway river bridge" },
    ],
  },
  abc: {
    corridorName: "Annapurna Base Camp (ABC)",
    riverName: "Modi Khola Glacial Canyon",
    stations: [
      { name: "Annapurna Base Camp", distanceKm: 0, elevationM: 4130, type: "lake", safeClearanceM: 35, riskNote: "Glacial amphitheater cirque" },
      { name: "Machapuchare Base Camp", distanceKm: 4.5, elevationM: 3700, type: "safeZone", safeClearanceM: 30, riskNote: "Sanctuary eastern gateway" },
      { name: "Deurali Gateway", distanceKm: 9.0, elevationM: 3200, type: "settlement", safeClearanceM: 22, riskNote: "Narrow canyon entrance" },
      { name: "Hinku Cave Chute", distanceKm: 12.0, elevationM: 3100, type: "bridge", safeClearanceM: 18, riskNote: "Historical avalanche trajectory" },
      { name: "Himalaya Hotel", distanceKm: 15.5, elevationM: 2920, type: "settlement", safeClearanceM: 25, riskNote: "Cliff terrace lodges" },
      { name: "Dovan Riverbank", distanceKm: 19.5, elevationM: 2600, type: "bridge", safeClearanceM: 15, riskNote: "Modi Khola gorge bottleneck" },
      { name: "Bamboo Camp", distanceKm: 23.0, elevationM: 2310, type: "settlement", safeClearanceM: 18, riskNote: "Riverside forest settlement" },
      { name: "Chhomrong Khola Bridge", distanceKm: 29.5, elevationM: 1900, type: "bridge", safeClearanceM: 15, riskNote: "Deep gorge suspension bridge" },
      { name: "Jhinu Danda Hotsprings", distanceKm: 33.0, elevationM: 1750, type: "bridge", safeClearanceM: 12, riskNote: "Modi Khola suspension bridge" },
      { name: "Birethanti Confluence", distanceKm: 42.0, elevationM: 1070, type: "bridge", safeClearanceM: 12, riskNote: "Modi and Bhurungdi confluence" },
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
  waterSurge: initialSurge = 0,
  onClose,
}: ValleyElevationProfileModalProps) {
  const profile = CORRIDOR_PROFILES[corridorId] || CORRIDOR_PROFILES.langtang;
  const [selectedStation, setSelectedStation] = useState<ProfileStation | null>(null);
  const [surge, setSurge] = useState<number>(initialSurge);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const maxElev = profile.stations[0].elevationM;
  const minElev = profile.stations[profile.stations.length - 1].elevationM;
  const totalDrop = maxElev - minElev;
  const totalDistance = profile.stations[profile.stations.length - 1].distanceKm;
  const averageGradientPct = ((totalDrop / (totalDistance * 1000)) * 100).toFixed(1);

  // Approximate flood wave kinematic celerity based on slope: v = sqrt(g * (h0 + surge)) * S0^(1/6)
  const estFloodWaveSpeedKmh = parseFloat(
    (
      Math.sqrt(9.81 * (2.5 + surge)) *
      Math.pow(parseFloat(averageGradientPct) / 100, 0.16) *
      3.6
    ).toFixed(1)
  );

  // SVG Chart Dimensions
  const svgWidth = 860;
  const svgHeight = 300;
  const paddingX = 65;
  const paddingY = 40;
  const plotWidth = svgWidth - paddingX * 2;
  const plotHeight = svgHeight - paddingY * 2;

  const points = profile.stations.map((s) => {
    const x = paddingX + (s.distanceKm / totalDistance) * plotWidth;
    const y = paddingY + ((maxElev - s.elevationM) / totalDrop) * plotHeight;
    // Calculate travel time from breach source in minutes
    const travelTimeMinutes =
      s.distanceKm > 0 ? Math.round((s.distanceKm / estFloodWaveSpeedKmh) * 60) : 0;
    // Station is at risk if water surge exceeds threshold relative to clearance
    const isInDanger = surge > 0 && surge * 8 > s.safeClearanceM;

    return { ...s, x, y, travelTimeMinutes, isInDanger };
  });

  // Terrain Path
  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  // Base Mountain Terrain Fill
  const areaD = `${pathD} L ${points[points.length - 1].x} ${
    svgHeight - paddingY
  } L ${points[0].x} ${svgHeight - paddingY} Z`;

  // Dynamic Flood Water Surge Path (Rises with surge level)
  const waterOffset = surge * 7;
  const waterPathD = points.reduce((acc, p, idx) => {
    const wy = p.y - waterOffset;
    return idx === 0 ? `M ${p.x} ${wy}` : `${acc} L ${p.x} ${wy}`;
  }, "");
  const waterAreaD = `${waterPathD} L ${points[points.length - 1].x} ${
    svgHeight - paddingY
  } L ${points[0].x} ${svgHeight - paddingY} Z`;

  // Inundated stations count
  const endangeredStations = points.filter((p) => p.isInDanger);

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-3xl bg-[#070D18] border border-[#2A3B5E] shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[94vh] text-slate-100">
        {/* Header */}
        <div className="p-4 bg-[#0A1224] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 glow-cyan">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-wide">
                  Himalayan Valley Profile & Dynamic Flood Inundator
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                  {profile.corridorName}
                </span>
              </div>
              <p className="text-xs text-[#8CA0BE] font-mono mt-0.5">
                {profile.riverName} • 3D Hydraulic Gradient & Inundation Physics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#16233F] hover:bg-[#203358] border border-[#2A3B5E] flex items-center justify-center text-[#8CA0BE] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tactical Key Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-[#050B14] border-b border-[#1E293B] text-xs">
          <div className="p-2.5 rounded-2xl bg-[#0A1224] border border-white/5">
            <div className="text-[10px] uppercase font-bold text-[#64748B] flex items-center gap-1 font-mono">
              <Mountain className="w-3.5 h-3.5 text-cyan-400" /> Total Vertical Drop
            </div>
            <div className="text-base font-black text-cyan-300 font-mono mt-0.5 tabular-nums">
              -{totalDrop.toLocaleString()} m
            </div>
            <div className="text-[10px] text-[#8CA0BE] font-mono">
              {maxElev}m ➔ {minElev}m ASL
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#0A1224] border border-white/5">
            <div className="text-[10px] uppercase font-bold text-[#64748B] flex items-center gap-1 font-mono">
              <TrendingDown className="w-3.5 h-3.5 text-amber-400" /> Channel Gradient
            </div>
            <div className="text-base font-black text-amber-300 font-mono mt-0.5 tabular-nums">
              {averageGradientPct}% Grade
            </div>
            <div className="text-[10px] text-[#8CA0BE] font-mono">
              {(totalDrop / totalDistance).toFixed(0)}m vertical drop / km
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#0A1224] border border-white/5">
            <div className="text-[10px] uppercase font-bold text-[#64748B] flex items-center gap-1 font-mono">
              <Waves className="w-3.5 h-3.5 text-rose-400" /> Wave Velocity
            </div>
            <div className="text-base font-black text-rose-300 font-mono mt-0.5 tabular-nums">
              ~{estFloodWaveSpeedKmh} km/h
            </div>
            <div className="text-[10px] text-[#8CA0BE] font-mono">
              {surge > 0 ? `Simulated +${surge.toFixed(1)}m flood crest` : "Nominal winter baseflow"}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#0A1224] border border-white/5">
            <div className="text-[10px] uppercase font-bold text-[#64748B] flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Evacuation Ridge
            </div>
            <div className="text-base font-black text-emerald-300 font-mono mt-0.5 tabular-nums">
              &ge; 35m Elevation
            </div>
            <div className="text-[10px] text-[#8CA0BE] font-mono">Above active canyon bed</div>
          </div>
        </div>

        {/* DYNAMIC FLOOD SURGE CONTROLLER BAR */}
        <div className="p-3 bg-[#0A1224] border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white flex items-center gap-1.5 font-mono text-[11px]">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Simulate Dynamic Flood Crest:</span>
            </span>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={surge}
              onChange={(e) => setSurge(parseFloat(e.target.value))}
              className="w-40 sm:w-56 accent-cyan-400 cursor-pointer h-2 bg-[#16233F] rounded-lg"
            />
            <span className="font-mono font-bold text-cyan-300 px-2 py-0.5 rounded-md bg-[#16233F] border border-[#2A3B5E] tabular-nums">
              +{surge.toFixed(1)} m
            </span>
          </div>

          {endangeredStations.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold font-mono animate-pulse glow-rose">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>
                CRITICAL INUNDATION: {endangeredStations.length} Landmark(s) Submerged!
              </span>
            </div>
          )}
        </div>

        {/* SVG Longitudinal Profile with Dynamic Water Rise */}
        <div className="p-4 overflow-x-auto bg-[#070D18] flex-1 custom-scrollbar">
          <div className="min-w-[800px]">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none">
              <defs>
                {/* Mountain Canyon Gradient */}
                <linearGradient id="mountainGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E293B" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0B132B" stopOpacity="0.95" />
                </linearGradient>

                {/* Flood Water Wave Gradient */}
                <linearGradient id="waterSurgeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.65" />
                  <stop offset="50%" stopColor="#0284C7" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0369A1" stopOpacity="0.1" />
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
                      stroke="#16233F"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 10}
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

              {/* Base Mountain Terrain */}
              <path d={areaD} fill="url(#mountainGradient)" />

              {/* Dynamic Flood Water Wave Layer (Only visible when surge > 0) */}
              {surge > 0 && (
                <path
                  d={waterAreaD}
                  fill="url(#waterSurgeGradient)"
                  className="transition-all duration-300"
                />
              )}

              {/* River Bed Profile Path */}
              <path d={pathD} fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" />

              {/* Active Water Surface Line */}
              {surge > 0 && (
                <path
                  d={waterPathD}
                  fill="none"
                  stroke="#06B6D4"
                  strokeWidth="3"
                  className="transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.8)]"
                />
              )}

              {/* Station Markers */}
              {points.map((p, idx) => {
                const isSelected = selectedStation?.name === p.name;
                const isLake = p.type === "lake";
                const isDam = p.type === "dam";
                const isBridge = p.type === "bridge";

                const dotColor = p.isInDanger
                  ? "#F43F5E"
                  : isLake
                  ? "#38BDF8"
                  : isDam
                  ? "#F59E0B"
                  : isBridge
                  ? "#FB923C"
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
                      stroke="#1E293B"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      className="opacity-40 group-hover:opacity-100 transition-opacity"
                    />

                    {/* Landmark Circle */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? 7 : p.isInDanger ? 6 : 4.5}
                      fill={dotColor}
                      stroke="#070D18"
                      strokeWidth="2"
                      className={`transition-all ${p.isInDanger ? "animate-ping opacity-75" : ""}`}
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? 6 : 4.5}
                      fill={dotColor}
                      stroke="#070D18"
                      strokeWidth="2"
                      className="transition-all"
                    />

                    {/* Station Name Label */}
                    <text
                      x={p.x}
                      y={p.y - 12}
                      fill={p.isInDanger ? "#FDA4AF" : isSelected ? "#38BDF8" : "#94A3B8"}
                      fontSize={isSelected ? "11" : "9"}
                      fontWeight={p.isInDanger || isSelected ? "bold" : "normal"}
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="group-hover:fill-white transition-colors"
                    >
                      {p.name}
                    </text>

                    {/* Distance / ETA Badge */}
                    <text
                      x={p.x}
                      y={svgHeight - paddingY + 16}
                      fill="#64748B"
                      fontSize="8"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {p.distanceKm}km ({p.travelTimeMinutes}m)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Selected Station Inspector Drawer */}
        {selectedStation && (
          <div className="p-3.5 bg-[#0A1224] border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-300 font-bold">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  <span>{selectedStation.name}</span>
                  <span className="text-[10px] font-mono text-cyan-300">
                    {selectedStation.elevationM}m ASL
                  </span>
                </div>
                <div className="text-[11px] text-[#8CA0BE]">{selectedStation.riskNote}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 font-mono text-[11px]">
              <div>
                <span className="text-[#64748B] block text-[9px]">DIST FROM LAKE</span>
                <span className="text-white font-bold">{selectedStation.distanceKm} km</span>
              </div>
              <div>
                <span className="text-[#64748B] block text-[9px]">WAVE ARRIVAL ETA</span>
                <span className="text-amber-400 font-bold">
                  ~{Math.round((selectedStation.distanceKm / estFloodWaveSpeedKmh) * 60)} mins
                </span>
              </div>
              <div>
                <span className="text-[#64748B] block text-[9px]">SAFE CLEARANCE</span>
                <span className="text-emerald-400 font-bold">
                  {selectedStation.safeClearanceM}m Ridge
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
