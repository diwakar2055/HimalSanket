import React from "react";
import { Language, getTranslation } from "../data/localization";
import {
  ShieldAlert,
  Radio,
  Map as MapIcon,
  BarChart3,
  Users,
  AlertOctagon,
  Languages,
  HelpCircle,
  Volume2,
  VolumeX,
} from "lucide-react";

interface CommandHeaderProps {
  currentTab: "risk" | "analytics" | "search" | "sos";
  onTabChange: (tab: "risk" | "analytics" | "search" | "sos") => void;
  activeTier: "Low" | "Moderate" | "High" | "Critical";
  activeCorridor: any;
  allCorridors: any[];
  onSelectCorridor: (corridorId: string) => void;
  language: Language;
  onToggleLanguage: () => void;
  onOpenGuide: () => void;
  onTriggerQuickSOS: () => void;
  audioMuted: boolean;
  onToggleAudioMute: () => void;
}

const TIER_COLORS = {
  Low: { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-400", dot: "bg-emerald-400" },
  Moderate: { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-400", dot: "bg-amber-400" },
  High: { bg: "bg-orange-500/15", border: "border-orange-500/40", text: "text-orange-400", dot: "bg-orange-400" },
  Critical: { bg: "bg-rose-500/20", border: "border-rose-500/60", text: "text-rose-400", dot: "bg-rose-500 animate-ping" },
};

export function CommandHeader({
  currentTab,
  onTabChange,
  activeTier,
  activeCorridor,
  allCorridors,
  onSelectCorridor,
  language,
  onToggleLanguage,
  onOpenGuide,
  onTriggerQuickSOS,
  audioMuted,
  onToggleAudioMute,
}: CommandHeaderProps) {
  const tierStyle = TIER_COLORS[activeTier] || TIER_COLORS.Low;

  const getThreatLabel = () => {
    switch (activeTier) {
      case "Critical":
        return getTranslation(language, "statusCritical");
      case "High":
        return getTranslation(language, "statusHigh");
      case "Moderate":
        return getTranslation(language, "statusModerate");
      default:
        return getTranslation(language, "statusNormal");
    }
  };

  return (
    <header className="w-full bg-[#0A1224] border-b border-[#1E293B] shadow-2xl sticky top-0 z-40 backdrop-blur-lg bg-opacity-95">
      {/* Top Threat Ribbon */}
      <div className={`px-4 py-1 border-b ${tierStyle.border} ${tierStyle.bg} flex items-center justify-between transition-colors duration-300`}>
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${tierStyle.dot}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${tierStyle.dot}`} />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-white">
            HIMALAYAN MULTI-HAZARD THREAT LEVEL:
          </span>
          <span className={`text-[11px] font-black uppercase tracking-wider ${tierStyle.text}`}>
            {getThreatLabel()}
          </span>
          <span className="hidden md:inline text-[11px] text-[#64748B]">
            &bull; {activeCorridor?.name || "Langtang Basin"} ({activeCorridor?.region || "Rasuwa District"})
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="hidden sm:flex items-center gap-1.5 text-emerald-400 font-mono">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            {getTranslation(language, "systemOnline")}
          </span>
          <button
            onClick={onToggleAudioMute}
            className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer p-0.5"
            title={audioMuted ? "Unmute audio alerts" : "Mute audio alerts"}
          >
            {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Main Command Bar */}
      <div className="px-4 lg:px-6 py-1.5 flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Brand Identity */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-cyan-600/30 border border-cyan-400/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white font-sans">
                  {getTranslation(language, "brandName")}
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  v2.5 AI
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] hidden sm:block">
                {getTranslation(language, "brandSubtitle")}
              </p>
            </div>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onToggleLanguage}
              className="px-2 py-1 rounded-lg text-xs font-bold bg-[#1E293B] text-white border border-[#334155]"
            >
              {getTranslation(language, "langBtn")}
            </button>
            <button
              onClick={onTriggerQuickSOS}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white shadow"
            >
              SOS
            </button>
          </div>
        </div>

        {/* Center: Segmented Navigation Pills */}
        <nav className="flex items-center bg-[#0F172A] p-1 rounded-xl border border-[#1E293B] shadow-inner overflow-x-auto max-w-full">
          <button
            onClick={() => onTabChange("risk")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === "risk"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30"
                : "text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/50"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>{getTranslation(language, "tabMap")}</span>
          </button>

          <button
            onClick={() => onTabChange("analytics")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === "analytics"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30"
                : "text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/50"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{getTranslation(language, "tabAnalytics")}</span>
          </button>

          <button
            onClick={() => onTabChange("search")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === "search"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30"
                : "text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/50"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{getTranslation(language, "tabSar")}</span>
          </button>

          <button
            onClick={() => onTabChange("sos")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === "sos"
                ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/30"
                : "text-rose-400 hover:text-rose-200 hover:bg-rose-950/30"
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>{getTranslation(language, "tabSos")}</span>
          </button>
        </nav>

        {/* Right Tools: Language Toggle & Tour Guide & Quick SOS */}
        <div className="hidden md:flex items-center gap-2.5">
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-white bg-[#1E293B]/60 hover:bg-[#1E293B] border border-[#334155]/60 transition-colors cursor-pointer"
            title="Open system architecture walkthrough"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>{getTranslation(language, "guideBtn")}</span>
          </button>

          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#1E293B] hover:bg-[#334155] border border-[#334155] transition-all cursor-pointer shadow-sm"
            title="Toggle Language (English / नेपाली)"
          >
            <Languages className="w-3.5 h-3.5 text-amber-400" />
            <span>{getTranslation(language, "langBtn")}</span>
          </button>

          <button
            onClick={onTriggerQuickSOS}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>{getTranslation(language, "quickSosBtn")}</span>
          </button>
        </div>
      </div>

      {/* Corridor Quick-Selector Ribbon */}
      <div className="px-4 lg:px-6 py-1.5 bg-[#080E1C] border-t border-[#1E293B]/60 flex items-center justify-between overflow-x-auto text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] shrink-0">
            {getTranslation(language, "corridorsLabel")}:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {allCorridors.map((c) => {
              const active = c.id === activeCorridor?.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectCorridor(c.id)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap border ${
                    active
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/60 shadow-sm"
                      : "bg-[#0F172A] text-[#94A3B8] border-[#1E293B] hover:border-slate-600 hover:text-white"
                  }`}
                >
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-3 text-[11px] text-[#64748B] shrink-0 font-mono">
          <span>GPS: {activeCorridor?.gps || "28.2096° N, 85.5089° E"}</span>
        </div>
      </div>
    </header>
  );
}
