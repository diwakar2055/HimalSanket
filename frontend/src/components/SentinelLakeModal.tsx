import React from "react";
import { X, Satellite, AlertTriangle, CheckCircle2, Waves } from "lucide-react";
import { Language, getTranslation } from "../data/localization";

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
  const description = lake.description || "Supraglacial meltwater lake expanding behind moraine dam.";

  const isRapid = areaChangePct > 10;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl rounded-2xl border border-[#2A3B5E] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: "#16233F" }}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#2A3B5E] bg-[#0F1B33]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              <Satellite className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{lakeName}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {elevation}m ASL
                </span>
              </div>
              <p className="text-xs text-[#8CA0BE]">{region} · GPS: {gps}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8CA0BE] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Status banner */}
          <div
            className="p-3.5 rounded-xl flex items-center justify-between gap-3 border"
            style={{
              background: isRapid ? "rgba(228, 87, 46, 0.15)" : "rgba(46, 134, 171, 0.15)",
              borderColor: isRapid ? "#E4572E" : "#2E86AB",
            }}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: isRapid ? "#E4572E" : "#2E86AB" }} />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-white">
                  {status}
                </div>
                <div className="text-xs text-[#8CA0BE]">
                  Sentinel-2 multi-temporal surface water difference detected +{areaChangePct}% growth
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-mono font-bold" style={{ color: isRapid ? "#E4572E" : "#2E86AB" }}>
                +{areaChangePct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-[#8CA0BE]">Surface Area Delta</div>
            </div>
          </div>

          {/* Dual Observation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Baseline */}
            <div className="p-4 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8CA0BE] mb-1">
                Baseline Reference Observation
              </div>
              <div className="text-lg font-bold font-mono text-white">
                {baselineArea.toFixed(2)} km²
              </div>
              <div className="text-xs text-[#5E729A] mt-1">Pass Date: {baselineDate}</div>
              <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Stable Moraine Impoundment
              </div>
            </div>

            {/* Current Pass */}
            <div className="p-4 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8CA0BE] mb-1">
                Current Sensed Pass
              </div>
              <div className="text-lg font-bold font-mono text-amber-300">
                {currentArea.toFixed(2)} km²
              </div>
              <div className="text-xs text-[#5E729A] mt-1">Pass Date: {currentDate}</div>
              <div className="text-[11px] text-amber-400 mt-2 flex items-center gap-1">
                <Waves className="w-3.5 h-3.5" /> Rapid Melt Pond Formation
              </div>
            </div>
          </div>

          {/* Satellite NDWI Mask Visualization */}
          <div className="p-4 rounded-xl border border-[#2A3B5E] bg-[#0F1B33] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8CA0BE]">
                Satellite Imagery &amp; NDWI Water Mask
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                {sensor}
              </span>
            </div>

            {/* Satellite View Graphic */}
            <div className="relative h-44 w-full rounded-lg overflow-hidden border border-[#2A3B5E] bg-slate-900 flex items-center justify-center">
              <img
                src={lake.satellite_tile_preview || "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/13/3440/6045"}
                alt="Satellite Lake Tile"
                className="absolute inset-0 w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/70 via-transparent to-blue-900/40 pointer-events-none" />
              <div className="relative z-10 p-3 rounded-lg bg-black/75 backdrop-blur-sm border border-cyan-500/40 text-center max-w-sm">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                  <span className="text-xs font-bold text-cyan-300">NDWI Threshold &gt; 0.30 Water Mask Active</span>
                </div>
                <div className="text-[11px] text-[#ECF1F6]">
                  Supraglacial meltwater boundary expanded by {((currentArea - baselineArea) * 100).toFixed(0)} hectares toward loose frontal moraine debris.
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#8CA0BE] space-y-1">
              <div><strong>Spectral Band Ratio:</strong> {bandCombo}</div>
              <div><strong>Geomorphic Note:</strong> {description}</div>
            </div>
          </div>

          {/* GLOF Breach Hazard Warning */}
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-200">
            <strong>Downstream GLOF (Glacial Lake Outburst Flood) Hazard Path:</strong>
            <div className="mt-1 text-[11px] text-[#ECF1F6]/90">
              Any moraine dam crest collapse discharges down the primary headwaters corridor. Flood arrival at Kyanjin Gompa: ~8 mins; Lama Hotel: ~18 mins; Syabrubesi Highway: ~38 mins.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#2A3B5E] bg-[#0F1B33] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2E86AB] hover:bg-[#2E86AB]/80 text-white transition-colors cursor-pointer"
          >
            {getTranslation(language, "inspectSatelliteBtn") ? "Close Satellite Inspector" : "बन्द गर्नुहोस्"}
          </button>
        </div>
      </div>
    </div>
  );
}
