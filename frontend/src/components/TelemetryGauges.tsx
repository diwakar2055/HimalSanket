import React, { useState } from "react";
import { Language, getTranslation } from "../data/localization";
import {
  CloudRain,
  Activity,
  Satellite,
  Mountain,
  Radio,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface TelemetryGaugesProps {
  corridor: any;
  risk: any;
  language: Language;
  onInspectSentinelLake: () => void;
  defaultCompact?: boolean;
}

export function TelemetryGauges({
  corridor,
  risk,
  language,
  onInspectSentinelLake,
  defaultCompact = true,
}: TelemetryGaugesProps) {
  const [isExpanded, setIsExpanded] = useState(!defaultCompact);

  const rainfall = corridor?.rainfall ?? 55;
  const threshold = corridor?.rainThreshold ?? 144;
  const rainPct = Math.min((rainfall / threshold) * 100, 100);

  const seismic = corridor?.seismic ?? 2.1;
  const seismicPct = Math.min((seismic / 4.5) * 100, 100);

  const lakeChange = corridor?.lakeChange ?? 14.8;
  const isLakeExpanding = lakeChange >= 8;

  const soilMoisture = Math.round(Math.min(rainfall * 0.42 + 15, 88));
  const slopeDegrees = 44; // Himalayan canyon profile

  return (
    <div className="w-full space-y-2">
      {/* 1. Compact HUD Ticker Bar (Takes only ~44px height) */}
      <div className="w-full p-2 rounded-xl bg-[#0F1B33]/90 border border-[#2A3B5E] shadow-lg flex items-center justify-between gap-2 overflow-x-auto text-xs">
        {/* Metric 1: Rainfall */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#16233F] border border-[#2A3B5E]/60 shrink-0">
          <CloudRain className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-white font-mono">{rainfall}</span>
            <span className="text-[10px] text-[#64748B]">/{threshold}mm</span>
          </div>
          <div className="w-10 h-1.5 rounded-full bg-[#1E293B] overflow-hidden shrink-0 hidden sm:block">
            <div
              className={`h-full rounded-full ${rainPct > 70 ? "bg-rose-500" : "bg-cyan-400"}`}
              style={{ width: `${rainPct}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-cyan-300 hidden md:inline">
            ~{(rainfall / 24).toFixed(1)}mm/h
          </span>
        </div>

        {/* Metric 2: Seismic */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#16233F] border border-[#2A3B5E]/60 shrink-0">
          <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-white font-mono">{seismic.toFixed(1)}</span>
            <span className="text-[10px] text-[#64748B]">M</span>
          </div>
          <div className="w-10 h-1.5 rounded-full bg-[#1E293B] overflow-hidden shrink-0 hidden sm:block">
            <div
              className={`h-full rounded-full ${seismic > 3.0 ? "bg-rose-500" : "bg-amber-400"}`}
              style={{ width: `${seismicPct}%` }}
            />
          </div>
          <span className="text-[10px] text-[#64748B] hidden md:inline">USGS 10km</span>
        </div>

        {/* Metric 3: Lake NDWI */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#16233F] border border-[#2A3B5E]/60 shrink-0">
          <Satellite className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className={`font-mono font-bold ${isLakeExpanding ? "text-amber-400" : "text-cyan-300"}`}>
            +{lakeChange}%
          </span>
          <button
            onClick={onInspectSentinelLake}
            className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 cursor-pointer transition-colors"
            title="Inspect Sentinel-2 optical imagery & NDWI water mask"
          >
            Inspect ↗
          </button>
        </div>

        {/* Metric 4: Soil & Slope */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#16233F] border border-[#2A3B5E]/60 shrink-0">
          <Mountain className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-white font-mono">{soilMoisture}%</span>
            <span className="text-[10px] text-[#64748B]">VWC</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 hidden sm:inline">{slopeDegrees}°</span>
        </div>

        {/* Metric 5: Dispatches */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#16233F] border border-[#2A3B5E]/60 shrink-0">
          <Radio className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="font-bold text-white font-mono">{corridor?.reports?.length || 0}</span>
          <span className="text-[10px] text-[#64748B] hidden sm:inline">Dispatches</span>
        </div>

        {/* Expand / Collapse diagnostic toggle */}
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-[#94A3B8] hover:text-white bg-[#1C2C4C] hover:bg-[#2A3B5E] border border-[#2A3B5E] cursor-pointer transition-colors shrink-0"
          title={isExpanded ? "Collapse to compact HUD" : "Expand full diagnostic gauges"}
        >
          <span>{isExpanded ? "Compact HUD" : "Full Gauges"}</span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* 2. Optional Full Diagnostic Gauges (Visible only when expanded) */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1 animate-in fade-in duration-200">
          {/* 1. Rainfall Catchment Gauge */}
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#16233F] to-[#0F1B33] border border-[#2A3B5E] shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <CloudRain className="w-4 h-4 text-cyan-400" />
                <span>{getTranslation(language, "rainfallLabel")}</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${rainPct > 70 ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"}`}>
                {rainPct.toFixed(0)}%
              </span>
            </div>

            <div className="my-1.5 flex items-baseline justify-between">
              <div className="text-xl font-black font-mono text-white">
                {rainfall} <span className="text-xs font-normal text-[#8CA0BE]">mm/24h</span>
              </div>
              <div className="text-[10px] font-mono text-[#8CA0BE]">
                Limit: {threshold}mm
              </div>
            </div>

            <div className="w-full h-1.5 rounded-full bg-[#1E293B] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${rainPct > 70 ? "bg-gradient-to-r from-orange-500 to-rose-500" : "bg-cyan-400"}`}
                style={{ width: `${rainPct}%` }}
              />
            </div>

            <div className="mt-2 pt-1.5 border-t border-[#1E293B] flex items-center justify-between text-[10px] text-[#8CA0BE]">
              <span>{rainfall > 80 ? "⚠️ Saturation Surge" : "Normal"}</span>
              <span className="font-mono text-cyan-300 font-bold">~{(rainfall / 24).toFixed(1)} mm/h</span>
            </div>
          </div>

          {/* 2. Seismic Micro-Tremor Meter */}
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#16233F] to-[#0F1B33] border border-[#2A3B5E] shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>{getTranslation(language, "seismicLabel")}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                USGS
              </span>
            </div>

            <div className="my-1.5 flex items-baseline justify-between">
              <div className="text-xl font-black font-mono text-white">
                {seismic.toFixed(1)} <span className="text-xs font-normal text-[#8CA0BE]">M</span>
              </div>
              <div className="text-[10px] font-mono text-[#8CA0BE]">
                Depth: ~10km
              </div>
            </div>

            <div className="w-full h-1.5 rounded-full bg-[#1E293B] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${seismic > 3.0 ? "bg-gradient-to-r from-amber-500 to-rose-500" : "bg-amber-400"}`}
                style={{ width: `${seismicPct}%` }}
              />
            </div>

            <div className="mt-2 pt-1.5 border-t border-[#1E293B] flex items-center justify-between text-[10px] text-[#8CA0BE]">
              <span>{seismic >= 3.0 ? "⚠️ Tremor Shock" : "Microseismic"}</span>
              <span className="font-mono text-amber-300">PGA: ~0.08g</span>
            </div>
          </div>

          {/* 3. Sentinel-2 NDWI Glacial Lake Gauge */}
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#16233F] to-[#0F1B33] border border-[#2A3B5E] shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Satellite className="w-4 h-4 text-cyan-400" />
                <span>{getTranslation(language, "lakeChangeLabel")}</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${isLakeExpanding ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"}`}>
                NDWI
              </span>
            </div>

            <div className="my-1.5 flex items-baseline justify-between">
              <div className={`text-xl font-black font-mono ${isLakeExpanding ? "text-amber-400" : "text-cyan-300"}`}>
                +{lakeChange}%
              </div>
              <button
                onClick={onInspectSentinelLake}
                className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-200 underline cursor-pointer"
              >
                Inspect ↗
              </button>
            </div>

            <div className="w-full h-1.5 rounded-full bg-[#1E293B] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isLakeExpanding ? "bg-gradient-to-r from-cyan-400 to-rose-500" : "bg-cyan-400"}`}
                style={{ width: `${Math.min(lakeChange * 5, 100)}%` }}
              />
            </div>

            <div className="mt-2 pt-1.5 border-t border-[#1E293B] flex items-center justify-between text-[10px] text-[#8CA0BE]">
              <span>{isLakeExpanding ? "⚠️ Rapid Expansion" : "Dam Stable"}</span>
              <span className="font-mono text-cyan-300">4,950m</span>
            </div>
          </div>

          {/* 4. Slope & Soil Moisture Saturation */}
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#16233F] to-[#0F1B33] border border-[#2A3B5E] shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Mountain className="w-4 h-4 text-emerald-400" />
                <span>{getTranslation(language, "soilMoistureLabel")}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {slopeDegrees}°
              </span>
            </div>

            <div className="my-1.5 flex items-baseline justify-between">
              <div className="text-xl font-black font-mono text-white">
                {soilMoisture}% <span className="text-xs font-normal text-[#8CA0BE]">VWC</span>
              </div>
              <div className="text-[10px] font-mono text-[#8CA0BE]">
                Scree
              </div>
            </div>

            <div className="w-full h-1.5 rounded-full bg-[#1E293B] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${soilMoisture > 65 ? "bg-gradient-to-r from-amber-500 to-rose-500" : "bg-emerald-400"}`}
                style={{ width: `${soilMoisture}%` }}
              />
            </div>

            <div className="mt-2 pt-1.5 border-t border-[#1E293B] flex items-center justify-between text-[10px] text-[#8CA0BE]">
              <span>{soilMoisture > 65 ? "⚠️ Liquefaction" : "Normal"}</span>
              <span className="font-mono text-emerald-300">Gneiss</span>
            </div>
          </div>

          {/* 5. Field Dispatches & Ground Truth */}
          <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#16233F] to-[#0F1B33] border border-[#2A3B5E] shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Radio className="w-4 h-4 text-purple-400" />
                <span>{getTranslation(language, "reportsLabel")}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Field
              </span>
            </div>

            <div className="my-1.5 flex items-baseline justify-between">
              <div className="text-xl font-black font-mono text-white">
                {corridor?.reports?.length || 0} <span className="text-xs font-normal text-[#8CA0BE]">dispatches</span>
              </div>
              <div className="text-[10px] font-mono text-purple-300">
                Verified
              </div>
            </div>

            <div className="w-full h-1.5 rounded-full bg-[#1E293B] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-700"
                style={{ width: `${Math.min((corridor?.reports?.length || 1) * 25, 100)}%` }}
              />
            </div>

            <div className="mt-2 pt-1.5 border-t border-[#1E293B] flex items-center justify-between text-[10px] text-[#8CA0BE]">
              <span>{corridor?.reports?.length ? "Reports active" : "Baseline"}</span>
              <span className="font-mono text-purple-300">Ward</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
