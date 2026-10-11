import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Users,
  GraduationCap,
  HeartPulse,
  Route,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  MapPin,
  Shield,
  Info,
  X,
  SlidersHorizontal,
  Navigation,
  Globe2,
} from "lucide-react";
import {
  MapAsset,
  MAP_ASSETS,
  CORRIDOR_CONFIGS,
  CORRIDOR_OPTIONS,
} from "../data/hazardMapData";
import { GoogleHazardMap } from "./GoogleHazardMap";
import { LeafletHazardMap } from "./LeafletHazardMap";

export function HazardMap() {
  const [selectedCorridorId, setSelectedCorridorId] = useState("langtang");
  const [selectedAsset, setSelectedAsset] = useState<MapAsset | null>(null);
  const [viewMode, setViewMode] = useState<"satellite" | "google" | "vector">("satellite");

  const [activeLayers, setActiveLayers] = useState({
    people: true,
    school: true,
    bridge: true,
    hospital: true,
    hazardZone: true,
    contours: true,
  });

  const [simulatedWaterRise, setSimulatedWaterRise] = useState<number>(0); // 0 to 5 meters

  // API Key management (mock key by default, with custom key persistence)
  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      localStorage.getItem("himal_gmaps_key") ||
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      "AIzaSy_MOCK_DEMO_KEY"
    );
  });

  const handleUpdateApiKey = (newKey: string) => {
    const trimmed = newKey.trim();
    if (trimmed) {
      localStorage.setItem("himal_gmaps_key", trimmed);
      setApiKey(trimmed);
    } else {
      localStorage.removeItem("himal_gmaps_key");
      setApiKey("AIzaSy_MOCK_DEMO_KEY");
    }
  };

  // Vector map zoom & pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const currentCorridorConfig = useMemo(() => {
    return CORRIDOR_CONFIGS[selectedCorridorId] || CORRIDOR_CONFIGS.langtang;
  }, [selectedCorridorId]);

  // Filter assets for corridor and layer visibility
  const corridorAssets = useMemo(() => {
    return MAP_ASSETS.filter((a) => a.corridorId === selectedCorridorId);
  }, [selectedCorridorId]);

  const visibleAssets = useMemo(() => {
    return corridorAssets.filter((a) => activeLayers[a.type]);
  }, [corridorAssets, activeLayers]);

  // Dynamically compute status based on simulated water rise
  const getDynamicStatus = (asset: MapAsset): "safe" | "advisory" | "critical" => {
    if (simulatedWaterRise === 0) return asset.status;
    const buffer = asset.hazardThresholdMeters - simulatedWaterRise;
    if (buffer <= 0) return "critical"; // inundated or cut off
    if (buffer <= 1.2) return "critical";
    if (buffer <= 2.5) return "advisory";
    return "safe";
  };

  const counts = useMemo(() => {
    const list = corridorAssets;
    return {
      people: list.filter((a) => a.type === "people").length,
      school: list.filter((a) => a.type === "school").length,
      bridge: list.filter((a) => a.type === "bridge").length,
      hospital: list.filter((a) => a.type === "hospital").length,
      threatened: list.filter((a) => getDynamicStatus(a) === "critical").length,
    };
  }, [corridorAssets, simulatedWaterRise]);

  const toggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(Math.max(prev + delta, 0.8), 2.6));
  };

  const resetVectorView = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
    setSelectedAsset(null);
  };

  // Mouse pan handlers for vector view
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || viewMode !== "vector") return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || viewMode !== "vector") return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0F1B33] text-[#ECF1F6] overflow-hidden select-none">
      {/* Top Map Control Bar */}
      <div className="px-6 py-3.5 bg-[#16233F] border-b border-[#2A3B5E] flex items-center justify-between flex-wrap gap-4 z-20">
        {/* Left: View Mode Toggle & Corridor Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Map Engine Mode Switcher */}
          <div className="flex items-center bg-[#0F1B33] p-1 rounded-lg border border-[#2A3B5E]">
            <button
              onClick={() => setViewMode("satellite")}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                viewMode === "satellite"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-[#8CA0BE] hover:text-white"
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              Live Satellite (Default)
            </button>
            <button
              onClick={() => setViewMode("google")}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                viewMode === "google"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-[#8CA0BE] hover:text-white"
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              Google Maps Engine
            </button>
            <button
              onClick={() => setViewMode("vector")}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                viewMode === "vector"
                  ? "bg-[#2E86AB] text-white shadow-sm"
                  : "text-[#8CA0BE] hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Topo Schematic
            </button>
          </div>

          {/* Corridor buttons */}
          <div className="flex items-center gap-1 bg-[#0F1B33] p-1 rounded-lg border border-[#2A3B5E]">
            {CORRIDOR_OPTIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCorridorId(c.id);
                  setSelectedAsset(null);
                }}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  selectedCorridorId === c.id
                    ? "bg-[#2E86AB] text-white shadow-sm"
                    : "text-[#8CA0BE] hover:text-white hover:bg-white/5"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Hazard Water Level Surge Simulator */}
        <div className="flex items-center gap-3 bg-[#0F1B33] px-3.5 py-1.5 rounded-lg border border-[#2A3B5E]">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#E4572E]" />
          <span className="text-xs font-medium text-[#8CA0BE]">
            Simulate Surge / Flood:
          </span>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={simulatedWaterRise}
            onChange={(e) => setSimulatedWaterRise(parseFloat(e.target.value))}
            className="w-24 accent-[#E4572E] cursor-pointer"
          />
          <span
            className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
              simulatedWaterRise > 0
                ? "bg-[#E4572E]/20 text-[#E4572E] border border-[#E4572E]/40"
                : "text-[#8CA0BE]"
            }`}
          >
            +{simulatedWaterRise.toFixed(1)}m
          </span>
          {counts.threatened > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#9B2C22] text-white animate-pulse">
              {counts.threatened} In Danger
            </span>
          )}
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#5E729A] font-semibold uppercase tracking-wider hidden xl:inline">
            Layers:
          </span>

          {/* People */}
          <button
            onClick={() => toggleLayer("people")}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
              activeLayers.people
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                : "bg-transparent border-[#2A3B5E] text-[#5E729A] opacity-50"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>People ({counts.people})</span>
          </button>

          {/* School */}
          <button
            onClick={() => toggleLayer("school")}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
              activeLayers.school
                ? "bg-blue-500/15 border-blue-500/40 text-blue-300"
                : "bg-transparent border-[#2A3B5E] text-[#5E729A] opacity-50"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Schools ({counts.school})</span>
          </button>

          {/* Bridge */}
          <button
            onClick={() => toggleLayer("bridge")}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
              activeLayers.bridge
                ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                : "bg-transparent border-[#2A3B5E] text-[#5E729A] opacity-50"
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>Bridges ({counts.bridge})</span>
          </button>

          {/* Hospital */}
          <button
            onClick={() => toggleLayer("hospital")}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
              activeLayers.hospital
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-transparent border-[#2A3B5E] text-[#5E729A] opacity-50"
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Hospitals ({counts.hospital})</span>
          </button>

          {/* Hazard Inundation Layer */}
          <button
            onClick={() => toggleLayer("hazardZone")}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
              activeLayers.hazardZone
                ? "bg-orange-500/20 border-orange-500/50 text-orange-400 font-semibold"
                : "bg-transparent border-[#2A3B5E] text-[#5E729A] opacity-50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Hazard Buffer</span>
          </button>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="flex-1 relative overflow-hidden bg-[#0A1222]">
        {viewMode === "satellite" ? (
          /* Live High-Res Real Satellite & Topo Map (No API Key Required) */
          <LeafletHazardMap
            corridor={currentCorridorConfig}
            assets={visibleAssets}
            selectedAsset={selectedAsset}
            onSelectAsset={setSelectedAsset}
            activeLayers={activeLayers}
            simulatedWaterRise={simulatedWaterRise}
            getDynamicStatus={getDynamicStatus}
            onSwitchToGoogleView={() => setViewMode("google")}
            hasGoogleKey={!apiKey.includes("MOCK") && apiKey.length > 10}
          />
        ) : viewMode === "google" ? (
          /* Google Maps Platform (Requires Valid Cloud Key) */
          <GoogleHazardMap
            corridor={currentCorridorConfig}
            assets={visibleAssets}
            selectedAsset={selectedAsset}
            onSelectAsset={setSelectedAsset}
            activeLayers={activeLayers}
            simulatedWaterRise={simulatedWaterRise}
            getDynamicStatus={getDynamicStatus}
            apiKey={apiKey}
            onUpdateApiKey={handleUpdateApiKey}
            onSwitchToSatelliteView={() => setViewMode("satellite")}
          />
        ) : (
          /* Vector Topo Schematic View */
          <div
            className="w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="absolute inset-0 transition-transform duration-75 origin-center"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
              }}
            >
              <svg
                viewBox="0 0 1000 600"
                className="w-full h-full min-w-[1000px] min-h-[600px]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="valleyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0B162C" />
                    <stop offset="50%" stopColor="#101F3B" />
                    <stop offset="100%" stopColor="#0D182E" />
                  </linearGradient>

                  <linearGradient id="riverGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1F6E8C" />
                    <stop offset="50%" stopColor="#2E86AB" />
                    <stop offset="100%" stopColor="#4FB2E0" />
                  </linearGradient>

                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1A2D4C" strokeWidth="0.5" opacity="0.6" />
                  </pattern>
                </defs>

                <rect width="1000" height="600" fill="url(#valleyGrad)" />
                <rect width="1000" height="600" fill="url(#grid)" />

                {/* Topographical Contour Ridges */}
                {activeLayers.contours && (
                  <g opacity="0.35" stroke="#2A436B" strokeWidth="1" fill="none">
                    <path d="M 50 120 Q 250 80 500 130 T 950 90" strokeDasharray="3,3" />
                    <path d="M 40 180 Q 280 140 520 200 T 960 160" />
                    <path d="M 60 250 Q 320 220 540 260 T 940 240" strokeDasharray="4,2" />
                    <path d="M 50 480 Q 350 420 620 460 T 950 430" />
                    <path d="M 70 540 Q 380 490 680 520 T 960 510" strokeDasharray="3,3" />
                  </g>
                )}

                {/* Dynamic Hazard Inundation Buffer */}
                {activeLayers.hazardZone && (
                  <g>
                    <path
                      d="M 90 460 Q 250 410 390 340 T 780 200"
                      fill="none"
                      stroke="#E4572E"
                      strokeWidth={28 + simulatedWaterRise * 16}
                      strokeLinecap="round"
                      opacity={0.22 + simulatedWaterRise * 0.08}
                    />
                    <path
                      d="M 90 460 Q 250 410 390 340 T 780 200"
                      fill="none"
                      stroke="#C9A227"
                      strokeWidth={14 + simulatedWaterRise * 8}
                      strokeLinecap="round"
                      opacity={0.35}
                    />
                  </g>
                )}

                {/* Main River Course */}
                <path
                  d="M 90 460 Q 250 410 390 340 T 780 200"
                  fill="none"
                  stroke="url(#riverGrad)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />

                {/* Vector Map Asset Markers */}
                {visibleAssets.map((asset) => {
                  const status = getDynamicStatus(asset);
                  const isSelected = selectedAsset?.id === asset.id;

                  const color =
                    status === "critical"
                      ? "#9B2C22"
                      : status === "advisory"
                      ? "#C9A227"
                      : "#2E86AB";

                  const stroke = status === "critical" ? "#ff8e80" : "#ffffff";

                  return (
                    <g
                      key={asset.id}
                      transform={`translate(${asset.x}, ${asset.y})`}
                      className="cursor-pointer group"
                      onClick={() => setSelectedAsset(asset)}
                    >
                      {status === "critical" && (
                        <circle r="18" fill="#9B2C22" opacity="0.35" className="animate-ping" />
                      )}
                      <circle
                        r={isSelected ? "14" : "11"}
                        fill={color}
                        stroke={stroke}
                        strokeWidth={isSelected ? "3" : "1.5"}
                        className="transition-all duration-200 shadow-md"
                      />
                      <text
                        textAnchor="middle"
                        dy="3.5"
                        fill="#FFFFFF"
                        fontSize="9"
                        fontWeight="bold"
                        pointerEvents="none"
                      >
                        {asset.type === "people" && "P"}
                        {asset.type === "school" && "S"}
                        {asset.type === "bridge" && "B"}
                        {asset.type === "hospital" && "+"}
                      </text>
                      <text
                        x="0"
                        y="23"
                        textAnchor="middle"
                        fill="#ECF1F6"
                        fontSize="10"
                        fontWeight="500"
                        className="opacity-90 group-hover:opacity-100"
                      >
                        {asset.name.split(" ")[0]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Vector View Zoom Controls */}
            <div className="absolute top-5 right-5 z-20 flex flex-col gap-1.5 bg-[#16233F] p-1.5 rounded-xl border border-[#2A3B5E] shadow-xl">
              <button
                onClick={() => handleZoom(0.2)}
                className="p-2 hover:bg-[#1C2C4C] text-[#8CA0BE] hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleZoom(-0.2)}
                className="p-2 hover:bg-[#1C2C4C] text-[#8CA0BE] hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="h-[1px] bg-[#2A3B5E] my-0.5" />
              <button
                onClick={resetVectorView}
                className="p-2 hover:bg-[#1C2C4C] text-[#8CA0BE] hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Reset View"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Selected Asset Detail Inspector Panel */}
        {selectedAsset && (
          <div className="absolute top-16 left-5 z-30 w-80 sm:w-96 bg-[#16233F]/95 backdrop-blur-md rounded-2xl border border-[#2A3B5E] shadow-2xl p-5 animate-in fade-in slide-in-from-left-4 duration-200">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    selectedAsset.type === "people"
                      ? "bg-amber-500/20 text-amber-300"
                      : selectedAsset.type === "school"
                      ? "bg-blue-500/20 text-blue-300"
                      : selectedAsset.type === "bridge"
                      ? "bg-rose-500/20 text-rose-300"
                      : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  {selectedAsset.type === "people" && <Users className="w-5 h-5" />}
                  {selectedAsset.type === "school" && <GraduationCap className="w-5 h-5" />}
                  {selectedAsset.type === "bridge" && <Route className="w-5 h-5" />}
                  {selectedAsset.type === "hospital" && <HeartPulse className="w-5 h-5" />}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8CA0BE]">
                    {selectedAsset.type}
                  </span>
                  <h3 className="text-sm font-bold text-white leading-snug">
                    {selectedAsset.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-1 text-[#8CA0BE] hover:text-white hover:bg-white/5 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dynamic Status Badge */}
            {(() => {
              const currentStatus = getDynamicStatus(selectedAsset);
              return (
                <div
                  className={`px-3 py-2 rounded-xl mb-3 flex items-center justify-between border ${
                    currentStatus === "critical"
                      ? "bg-[#9B2C22]/20 border-[#9B2C22] text-[#ff9f8f]"
                      : currentStatus === "advisory"
                      ? "bg-[#C9A227]/20 border-[#C9A227] text-amber-300"
                      : "bg-[#2E86AB]/20 border-[#2E86AB] text-[#4FB2E0]"
                  }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Status: {currentStatus.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-mono">
                    {simulatedWaterRise > 0
                      ? `Surge: +${simulatedWaterRise}m`
                      : "Normal baseline"}
                  </span>
                </div>
              );
            })()}

            {/* Metric Details */}
            <div className="space-y-2 py-2 border-y border-[#2A3B5E] text-xs">
              <div className="flex justify-between">
                <span className="text-[#8CA0BE]">Elevation:</span>
                <span className="font-mono text-white">{selectedAsset.elevation} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8CA0BE]">GPS Coordinates:</span>
                <span className="font-mono text-white">{selectedAsset.gps}</span>
              </div>
              {selectedAsset.population && (
                <div className="flex justify-between">
                  <span className="text-[#8CA0BE]">Residents / Capacity:</span>
                  <span className="font-semibold text-amber-300">
                    {selectedAsset.population} people
                  </span>
                </div>
              )}
              {selectedAsset.capacity && (
                <div className="flex justify-between">
                  <span className="text-[#8CA0BE]">Shelter / Bed Capacity:</span>
                  <span className="font-semibold text-white">
                    {selectedAsset.capacity} units
                  </span>
                </div>
              )}
              {selectedAsset.contact && (
                <div className="flex justify-between">
                  <span className="text-[#8CA0BE]">Emergency Link:</span>
                  <span className="font-mono text-[#2E86AB]">{selectedAsset.contact}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#8CA0BE]">Flood Threat Threshold:</span>
                <span className="font-mono text-[#E4572E]">
                  +{selectedAsset.hazardThresholdMeters}m rise
                </span>
              </div>
            </div>

            {/* Description & Hazard Note */}
            <div className="mt-3 space-y-2 text-xs">
              <p className="text-[#ECF1F6] leading-relaxed">
                {selectedAsset.description}
              </p>
              <div className="p-2.5 rounded-lg bg-[#0F1B33] border border-[#2A3B5E] text-[11px] leading-relaxed">
                <span className="text-[#E4572E] font-bold block mb-1">
                  Hazard Context:
                </span>
                <span className="text-[#8CA0BE]">{selectedAsset.riskNote}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-3 border-t border-[#2A3B5E] flex gap-2">
              <button
                onClick={() =>
                  alert(`Alert broadcast sent to ${selectedAsset.name} via VHF radio/SMS network.`)
                }
                className="flex-1 bg-[#2E86AB] hover:bg-[#287394] text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer"
              >
                Send Hazard Ping
              </button>
              <button
                onClick={() =>
                  alert(`Evacuation protocol initiated for ${selectedAsset.name}. High-ground trail flagged.`)
                }
                className="bg-[#E4572E] hover:bg-[#c94922] text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer"
              >
                Trigger Evac
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
