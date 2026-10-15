import React from "react";
import {
  Compass,
  Radio,
  Satellite,
  ShieldAlert,
  Plane,
  Plus,
  RefreshCw,
} from "lucide-react";

interface ExecutiveKpiCardsProps {
  corridorsCount: number;
  activeCorridorName: string;
  onCycleCorridor?: () => void;
  telemetryOnline: number;
  totalTelemetry: number;
  isSyncing?: boolean;
  onSyncTelemetry?: () => void;
  lakeChangePct: number;
  onInspectLake?: () => void;
  distressPendingCount: number;
  totalDistressCount: number;
  onOpenDistressAction?: () => void;
  rescueBasesCount: number;
  onOpenSitrep?: () => void;
  className?: string;
}

export function ExecutiveKpiCards({
  corridorsCount,
  activeCorridorName,
  onCycleCorridor,
  telemetryOnline,
  totalTelemetry,
  isSyncing = false,
  onSyncTelemetry,
  lakeChangePct,
  onInspectLake,
  distressPendingCount,
  totalDistressCount,
  onOpenDistressAction,
  rescueBasesCount,
  onOpenSitrep,
  className = "",
}: ExecutiveKpiCardsProps) {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 select-none ${className}`}
    >
      {/* 1. Monitored Corridors */}
      <div className="bg-[#181A20] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-3.5 flex flex-col justify-between transition-all group">
        <div className="flex items-start justify-between gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-200 group-hover:text-white group-hover:bg-white/[0.08] transition-colors">
            <Compass className="w-4 h-4" />
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Corridors
            </span>
            <span className="text-2xl font-bold text-white tracking-tight tabular-nums font-mono leading-none">
              {corridorsCount}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
          <button
            onClick={onCycleCorridor}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
            <span>Switch Corridor</span>
          </button>
          <span className="text-[10px] font-mono text-slate-500 truncate max-w-[70px]">
            {activeCorridorName.split(" ")[0]}
          </span>
        </div>
      </div>

      {/* 2. IoT Telemetry Relays */}
      <div className="bg-[#181A20] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-3.5 flex flex-col justify-between transition-all group">
        <div className="flex items-start justify-between gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-200 group-hover:text-white group-hover:bg-white/[0.08] transition-colors">
            <Radio className="w-4 h-4" />
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              IoT Relays
            </span>
            <span className="text-2xl font-bold text-white tracking-tight tabular-nums font-mono leading-none">
              {telemetryOnline}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
          <button
            onClick={onSyncTelemetry}
            disabled={isSyncing}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium cursor-pointer transition-colors disabled:opacity-50"
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
            )}
            <span>{isSyncing ? "Syncing..." : "Sync Realtime"}</span>
          </button>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span>100% OK</span>
          </span>
        </div>
      </div>

      {/* 3. Glacial Lake Area Expansion */}
      <div className="bg-[#181A20] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-3.5 flex flex-col justify-between transition-all group">
        <div className="flex items-start justify-between gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-200 group-hover:text-white group-hover:bg-white/[0.08] transition-colors">
            <Satellite className="w-4 h-4" />
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              GLOF Moraine
            </span>
            <span className="text-2xl font-bold text-white tracking-tight tabular-nums font-mono leading-none">
              +{lakeChangePct.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
          <button
            onClick={onInspectLake}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
            <span>Inspect NDWI</span>
          </button>
          <span className="text-[10px] font-mono text-slate-500">Sentinel-2</span>
        </div>
      </div>

      {/* 4. Active Distress SOS */}
      <div className="bg-[#181A20] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-3.5 flex flex-col justify-between transition-all group">
        <div className="flex items-start justify-between gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-200 group-hover:text-white group-hover:bg-white/[0.08] transition-colors">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              SOS Beacons
            </span>
            <span className="text-2xl font-bold text-white tracking-tight tabular-nums font-mono leading-none">
              {totalDistressCount}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
          <button
            onClick={onOpenDistressAction}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
            <span>Broadcast Alert</span>
          </button>
          {distressPendingCount > 0 ? (
            <span className="text-[10px] font-mono font-bold text-rose-400">
              {distressPendingCount} Urgent
            </span>
          ) : (
            <span className="text-[10px] font-mono text-emerald-400">All Safe</span>
          )}
        </div>
      </div>

      {/* 5. SAR Helipads & Forward Bases */}
      <div className="col-span-2 sm:col-span-1 bg-[#181A20] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-3.5 flex flex-col justify-between transition-all group">
        <div className="flex items-start justify-between gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-200 group-hover:text-white group-hover:bg-white/[0.08] transition-colors">
            <Plane className="w-4 h-4" />
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              SAR Bases
            </span>
            <span className="text-2xl font-bold text-white tracking-tight tabular-nums font-mono leading-none">
              {rescueBasesCount}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
          <button
            onClick={onOpenSitrep}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
            <span>Generate SITREP</span>
          </button>
          <span className="text-[10px] font-mono text-slate-500">AS350 B3e</span>
        </div>
      </div>
    </div>
  );
}
