import React from "react";
import {
  X,
  Shield,
  Activity,
  Plane,
  Radio,
  ExternalLink,
  MapPin,
  Compass,
  AlertTriangle,
  Waves,
} from "lucide-react";

export interface TraefikNodeData {
  title: string;
  subtitle?: string;
  statusText: string;
  statusVariant: "safe" | "warning" | "danger" | "info";
  metrics: Array<{
    label: string;
    value: string | number;
    highlight?: boolean;
    color?: string;
  }>;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

interface TraefikNodeCardProps {
  data: TraefikNodeData;
  onClose: () => void;
  className?: string;
}

const BADGE_STYLES = {
  safe: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  danger: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  info: "bg-white/[0.08] text-slate-300 border-white/20",
};

export function TraefikNodeCard({ data, onClose, className = "" }: TraefikNodeCardProps) {
  const badgeStyle = BADGE_STYLES[data.statusVariant] || BADGE_STYLES.info;

  return (
    <div
      className={`w-72 sm:w-80 rounded-2xl bg-[#18191E] border border-white/[0.12] shadow-2xl p-4 text-white z-30 select-none animate-in fade-in zoom-in-95 duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h4 className="text-sm font-black text-white tracking-tight leading-snug">
            {data.title}
          </h4>
          {data.subtitle && (
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{data.subtitle}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Status Pill */}
      <div className="mb-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border font-mono ${badgeStyle}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          <span>{data.statusText}</span>
        </span>
      </div>

      {/* Traefik 2x2 Metric Grid */}
      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#111215] border border-white/[0.06] mb-3">
        {data.metrics.map((metric, idx) => (
          <div key={idx} className="space-y-0.5 min-w-0">
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block truncate">
              {metric.label}
            </span>
            <span
              className={`text-xs font-mono font-bold block truncate ${
                metric.highlight
                  ? metric.color || "text-rose-400"
                  : "text-white"
              }`}
            >
              {metric.value}
            </span>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      {(data.primaryAction || data.secondaryAction) && (
        <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
          {data.primaryAction && (
            <button
              onClick={data.primaryAction.onClick}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-white hover:bg-slate-200 active:scale-95 text-black font-bold text-xs transition-all cursor-pointer font-sans"
            >
              {data.primaryAction.icon}
              <span>{data.primaryAction.label}</span>
            </button>
          )}
          {data.secondaryAction && (
            <button
              onClick={data.secondaryAction.onClick}
              className="py-1.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 text-slate-300 hover:text-white font-semibold text-xs border border-white/[0.08] transition-all cursor-pointer font-sans"
            >
              {data.secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
