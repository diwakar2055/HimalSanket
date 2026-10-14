import React, { useState, useRef } from "react";
import { X, Satellite, AlertTriangle, CheckCircle2, Waves, Sliders, ExternalLink } from "lucide-react";
import { Language } from "../data/localization";

interface SentinelLakeModalProps {
  lake: any;
  onClose: () => void;
  language?: Language;
}

export function SentinelLakeModal({
  lake,
  onClose,
  language = "en",
}: SentinelLakeModalProps) {
  if (!lake) return null;

  const [sliderPos, setSliderPos] = useState<number>(50); // 0 to 100 percentage
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const lakeName = lake.lake_name || lake.lakeName || "Glacial Lake";
  const elevation = lake.elevation_m || lake.elevationM || 4950;
  const region = lake.region || "Himalayan Region";
  const gps = lake.gps || "28.2415° N, 85.5890° E";
  const baselineDate = lake.baseline_date || lake.baselineDate || "2026-08-05";
  const currentDate = lake.current_date || lake.currentDate || "2026-08-25";
  const baselineArea = lake.baseline_area_km2 || lake.baselineAreaKm2 || 0.88;
  const currentArea = lake.current_area_km2 || lake.currentAreaKm2 || 1.01;
  const areaChangePct = lake.area_change_pct ?? lake.areaChangePct ?? 14.8;
  const sensor = lake.sensor || "Sentinel-2 MSI Level-2A";
  const bandCombo = lake.band_combination || lake.bandRatio || "B03 (Green) / B08 (Near-Infrared NDWI > 0.30)";
  const status = lake.water_mask_status || lake.waterMaskStatus || "EXPANDING RAPIDLY";
  const description = lake.description || "Supraglacial meltwater lake expanding behind unstable moraine dam.";

  const isRapid = areaChangePct > 10;

  // Handle pointer drag for the Before / After split slider
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl border border-[#2A3B5E] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] bg-[#0A1224] text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#1E293B] bg-[#070D18]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 glow-cyan">
              <Satellite className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{lakeName}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  {elevation}m ASL
                </span>
              </div>
              <p className="text-xs text-[#8CA0BE] font-mono">
                {region} • {gps}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8CA0BE] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm custom-scrollbar">
          {/* Status banner */}
          <div
            className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 border ${
              isRapid
                ? "bg-rose-500/15 border-rose-500/40 glow-rose"
                : "bg-cyan-500/15 border-cyan-500/40 glow-cyan"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle
                className={`w-5 h-5 shrink-0 ${isRapid ? "text-rose-400 animate-pulse" : "text-cyan-400"}`}
              />
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-white">
                  {status}
                </div>
                <div className="text-xs text-[#8CA0BE]">
                  ESA Sentinel-2 surface water difference detected +{areaChangePct}% moraine dam swell
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 font-mono">
              <div
                className={`text-2xl font-black ${
                  isRapid ? "text-rose-400" : "text-cyan-400"
                } tabular-nums`}
              >
                +{areaChangePct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-[#8CA0BE] uppercase tracking-wider">Surface Area Delta</div>
            </div>
          </div>

          {/* INTERACTIVE BEFORE / AFTER SATELLITE SPLIT SLIDER (Awwwards Grade) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] font-mono flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Multi-Temporal Satellite Surface Comparison</span>
              </span>
              <span className="text-[10px] text-[#8CA0BE] font-mono">
                Drag divider to reveal NDWI water expansion
              </span>
            </div>

            <div
              ref={containerRef}
              onPointerDown={(e) => {
                setIsDragging(true);
                handlePointerMove(e);
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={() => setIsDragging(false)}
              className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-[#1E293B] shadow-2xl select-none cursor-ew-resize touch-none bg-[#050B14]"
            >
              {/* Layer 1: After / Current NDWI Infrared Water Mask (Full background) */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0c1e33] to-[#041221] flex items-center justify-center overflow-hidden">
                {/* Simulated High-Res NDWI Water Swell Polygon */}
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="w-56 h-36 rounded-[45%_55%_60%_40%/50%_45%_55%_50%] bg-gradient-to-tr from-cyan-600 to-sky-400 opacity-90 blur-sm shadow-[0_0_50px_rgba(6,182,212,0.6)] animate-pulse" />
                  <div className="absolute w-52 h-32 rounded-[45%_55%_60%_40%/50%_45%_55%_50%] bg-cyan-400/80 border-2 border-cyan-300" />
                  <div className="absolute bottom-4 right-4 bg-[#070D18]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/40 text-[10px] font-mono text-cyan-300">
                    <div>NEW SWELL: {currentDate}</div>
                    <div className="font-bold">{currentArea} km² (+{areaChangePct}%)</div>
                  </div>
                </div>
              </div>

              {/* Layer 2: Before / Baseline Optical Image (Clipped by slider position) */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-[#121c2b] to-[#090f19] flex items-center justify-center overflow-hidden border-r-2 border-white shadow-2xl"
                style={{ width: `${sliderPos}%` }}
              >
                <div className="relative w-full h-full flex items-center justify-center min-w-[300px]">
                  {/* Smaller Baseline Lake Polygon */}
                  <div className="w-40 h-24 rounded-[40%_60%_50%_50%/45%_50%_50%_55%] bg-blue-800/80 border-2 border-blue-400/70" />
                  <div className="absolute bottom-4 left-4 bg-[#070D18]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono text-slate-300">
                    <div>BASELINE: {baselineDate}</div>
                    <div className="font-bold">{baselineArea} km² (Reference)</div>
                  </div>
                </div>
              </div>

              {/* Draggable Divider Handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize z-20"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-xl border-2 border-white text-xs font-black">
                  ⟷
                </div>
              </div>

              {/* Watermark Badges */}
              <div className="absolute top-3 left-3 bg-[#070D18]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[9px] font-mono text-[#8CA0BE]">
                ESA Sentinel-2 MSI Level-2A
              </div>
              <div className="absolute top-3 right-3 bg-[#070D18]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-cyan-500/30 text-[9px] font-mono text-cyan-300">
                NDWI &gt; 0.30 Water Mask
              </div>
            </div>
          </div>

          {/* Dual Observation Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Baseline */}
            <div className="p-4 rounded-2xl border border-white/10 bg-[#070D18]/80 space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#8CA0BE]">
                Baseline Reference Observation
              </div>
              <div className="text-xl font-bold font-mono text-white tabular-nums">
                {baselineArea} km²
              </div>
              <div className="text-xs text-[#8CA0BE] font-mono">Captured: {baselineDate}</div>
              <div className="text-[10px] text-slate-400 pt-1">
                Dry pre-monsoon equilibrium surface water extent.
              </div>
            </div>

            {/* Current */}
            <div className="p-4 rounded-2xl border border-cyan-500/40 bg-cyan-950/20 space-y-1 glow-cyan">
              <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                Current Rapid Expansion
              </div>
              <div className="text-xl font-bold font-mono text-cyan-300 tabular-nums">
                {currentArea} km²
              </div>
              <div className="text-xs text-cyan-400 font-mono">Captured: {currentDate}</div>
              <div className="text-[10px] text-cyan-200/80 pt-1">
                Supraglacial meltwater surging behind unstable moraine wall.
              </div>
            </div>
          </div>

          {/* Sensor & Formula Explanation Card */}
          <div className="p-4 rounded-2xl bg-[#070D18]/90 border border-white/10 space-y-2 text-xs">
            <div className="font-bold text-white uppercase tracking-wider text-[10px] font-mono text-[#8CA0BE]">
              Remote Sensing Formulation
            </div>
            <div className="p-2.5 rounded-xl bg-[#050B14] font-mono text-[11px] text-cyan-300 border border-cyan-900/50">
              NDWI = (Band 3 [Green] - Band 8 [NIR]) / (Band 3 [Green] + Band 8 [NIR]) &gt; 0.30
            </div>
            <p className="text-[#8CA0BE] text-xs leading-relaxed">
              Pure water absorbs Near-Infrared wavelengths while surrounding rock and snow reflect them.
              Pixels exceeding 0.30 threshold are classified as active water surface to calculate dam breach
              probability.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#1E293B] bg-[#070D18] flex items-center justify-between text-xs">
          <span className="text-[#8CA0BE] font-mono text-[11px]">
            Sensor: {sensor} · 10m Pixel Ground Resolution
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all cursor-pointer shadow-md glow-cyan"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
