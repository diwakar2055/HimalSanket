import React, { useState, useRef } from "react";
import { X, Satellite, AlertTriangle, Sliders } from "lucide-react";
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
  const status = lake.water_mask_status || lake.waterMaskStatus || "EXPANDING RAPIDLY";

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] bg-[#18191E] text-slate-100 font-sans">
        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.08] bg-[#111215]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/[0.06] text-white border border-white/10">
              <Satellite className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{lakeName}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/[0.08] text-slate-300 border border-white/10 font-bold">
                  {elevation}m ASL
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {region} • {gps}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle
                className={`w-5 h-5 shrink-0 ${isRapid ? "text-rose-400" : "text-amber-400"}`}
              />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-white">
                  {status}
                </div>
                <div className="text-xs text-slate-400">
                  ESA Sentinel-2 surface water difference detected +{areaChangePct}% moraine dam swell
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 font-mono">
              <div
                className={`text-2xl font-bold ${
                  isRapid ? "text-rose-400" : "text-amber-400"
                } tabular-nums`}
              >
                +{areaChangePct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Surface Area Delta</div>
            </div>
          </div>

          {/* INTERACTIVE BEFORE / AFTER SATELLITE SPLIT SLIDER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] font-mono flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>Multi-Temporal Satellite Surface Comparison</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
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
              className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl select-none cursor-ew-resize touch-none bg-[#111215]"
            >
              {/* Layer 1: After / Current NDWI Infrared Water Mask */}
              <div className="absolute inset-0 bg-[#16171B] flex items-center justify-center overflow-hidden">
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="w-56 h-36 rounded-[45%_55%_60%_40%/50%_45%_55%_50%] bg-emerald-600/70 border-2 border-emerald-400" />
                  <div className="absolute bottom-4 right-4 bg-[#111215]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono text-emerald-300">
                    <div>NEW SWELL: {currentDate}</div>
                    <div className="font-bold">{currentArea} km² (+{areaChangePct}%)</div>
                  </div>
                </div>
              </div>

              {/* Layer 2: Before / Baseline Optical Image (Clipped by slider position) */}
              <div
                className="absolute inset-0 bg-[#111215] flex items-center justify-center overflow-hidden border-r-2 border-white shadow-2xl"
                style={{ width: `${sliderPos}%` }}
              >
                <div className="relative w-full h-full flex items-center justify-center min-w-[300px]">
                  <div className="w-40 h-24 rounded-[40%_60%_50%_50%/45%_50%_50%_55%] bg-slate-700/80 border-2 border-slate-500" />
                  <div className="absolute bottom-4 left-4 bg-[#111215]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono text-slate-300">
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
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shadow-xl border-2 border-slate-800 text-xs font-bold">
                  ⟷
                </div>
              </div>

              {/* Watermark Badges */}
              <div className="absolute top-3 left-3 bg-[#111215]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[9px] font-mono text-slate-400">
                ESA Sentinel-2 MSI Level-2A
              </div>
              <div className="absolute top-3 right-3 bg-[#111215]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[9px] font-mono text-slate-300">
                NDWI &gt; 0.30 Water Mask
              </div>
            </div>
          </div>

          {/* Dual Observation Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Baseline */}
            <div className="p-4 rounded-2xl border border-white/10 bg-[#111215] space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Baseline Reference Observation
              </div>
              <div className="text-xl font-bold font-mono text-white tabular-nums">
                {baselineArea} km²
              </div>
              <div className="text-xs text-slate-400 font-mono">Captured: {baselineDate}</div>
              <div className="text-[10px] text-slate-500 pt-1">
                Dry pre-monsoon equilibrium surface water extent.
              </div>
            </div>

            {/* Current */}
            <div className="p-4 rounded-2xl border border-white/10 bg-[#111215] space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Current Rapid Expansion
              </div>
              <div className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                {currentArea} km²
              </div>
              <div className="text-xs text-slate-400 font-mono">Captured: {currentDate}</div>
              <div className="text-[10px] text-slate-500 pt-1">
                Supraglacial meltwater surging behind unstable moraine wall.
              </div>
            </div>
          </div>

          {/* Sensor & Formula Explanation Card */}
          <div className="p-4 rounded-2xl bg-[#111215] border border-white/10 space-y-2 text-xs">
            <div className="font-bold uppercase tracking-wider text-[10px] font-mono text-slate-400">
              Remote Sensing Formulation
            </div>
            <div className="p-2.5 rounded-xl bg-[#18191E] font-mono text-[11px] text-slate-300 border border-white/10">
              NDWI = (Band 3 [Green] - Band 8 [NIR]) / (Band 3 [Green] + Band 8 [NIR]) &gt; 0.30
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Pure water absorbs Near-Infrared wavelengths while surrounding rock and snow reflect them.
              Pixels exceeding 0.30 threshold are classified as active water surface to calculate dam breach
              probability.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.08] bg-[#111215] flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono text-[11px]">
            Sensor: {sensor} · 10m Pixel Ground Resolution
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-black font-bold transition-all cursor-pointer shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
