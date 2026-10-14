import React, { useState, useEffect } from "react";
import { Language } from "../data/localization";
import { useUserRole } from "../context/UserRoleContext";
import {
  ShieldAlert,
  Radio,
  Languages,
  HelpCircle,
  Volume2,
  VolumeX,
  Compass,
  Download,
  Users,
  Shield,
  Plane,
  ChevronDown,
  Activity,
  CheckCircle2,
  RefreshCw,
  MapPin,
} from "lucide-react";

interface CommandHeaderProps {
  activeTier: "Low" | "Moderate" | "High" | "Critical";
  activeCorridor: any;
  allCorridors: any[];
  onSelectCorridor: (corridorId: string) => void;
  language: Language;
  onToggleLanguage: () => void;
  onOpenGuide: () => void;
  audioMuted: boolean;
  onToggleAudioMute: () => void;
  onOpenPersonaSwitcher?: () => void;
  isSyncing?: boolean;
}

const TIER_CONFIG = {
  Low: {
    border: "border-emerald-500/40",
    text: "text-emerald-400",
    bg: "bg-emerald-950/40",
    dot: "bg-emerald-400",
    labelEn: "Baseline Normal",
    labelNe: "सामान्य अवस्था",
    icon: CheckCircle2,
  },
  Moderate: {
    border: "border-amber-500/40",
    text: "text-amber-400",
    bg: "bg-amber-950/40",
    dot: "bg-amber-400",
    labelEn: "Moderate Watch",
    labelNe: "सतर्कता आवश्यक",
    icon: Activity,
  },
  High: {
    border: "border-orange-500/50",
    text: "text-orange-400",
    bg: "bg-orange-950/40",
    dot: "bg-orange-500",
    labelEn: "Elevated Risk",
    labelNe: "उच्च जोखिम",
    icon: ShieldAlert,
  },
  Critical: {
    border: "border-rose-500/80",
    text: "text-rose-400",
    bg: "bg-rose-950/60",
    dot: "bg-rose-500 animate-ping",
    labelEn: "Critical Emergency",
    labelNe: "आपतकालीन संकट",
    icon: ShieldAlert,
  },
};

export function CommandHeader({
  activeTier,
  activeCorridor,
  allCorridors,
  onSelectCorridor,
  language,
  onToggleLanguage,
  onOpenGuide,
  audioMuted,
  onToggleAudioMute,
  onOpenPersonaSwitcher,
  isSyncing = false,
}: CommandHeaderProps) {
  const { currentRole, setCurrentRole, userProfile } = useUserRole();
  const tierConfig = TIER_CONFIG[activeTier] || TIER_CONFIG.Low;
  const TierIcon = tierConfig.icon;

  // PWA install prompt handler
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [corridorDropdownOpen, setCorridorDropdownOpen] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
  };

  return (
    <header className="w-full bg-[#080E19]/95 border-b border-[#27364B] shadow-2xl sticky top-0 z-40 backdrop-blur-xl select-none">
      <div className="w-full px-3 sm:px-5 py-2 flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
        {/* LEFT: Brand + Corridor Picker + Risk Level + Telemetry Status */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* Brand Emblem */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-sm border border-cyan-400/40">
              🏔️
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold tracking-tight text-[#F8FAFC] text-sm sm:text-base">
                  HimalSanket
                </span>
                <span className="text-[10px] text-cyan-400 font-semibold hidden md:inline">
                  (हिमाल संकेत)
                </span>
              </div>
              <div className="text-[9px] text-[#A7B4C8] font-mono leading-none mt-0.5">
                AI Early Warning System
              </div>
            </div>
          </div>

          {/* Corridor Dropdown Selector */}
          <div className="relative">
            <button
              onClick={() => setCorridorDropdownOpen(!corridorDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#101A2A] hover:bg-[#152238] border border-[#27364B] text-xs font-semibold text-[#F8FAFC] shadow-sm cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
              aria-label="Select Himalayan Corridor"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate max-w-[110px] sm:max-w-[140px] font-mono">{activeCorridor.name}</span>
              <ChevronDown className="w-3 h-3 text-[#A7B4C8]" />
            </button>

            {corridorDropdownOpen && (
              <div className="absolute left-0 top-10 w-56 rounded-xl bg-[#101A2A] border border-[#27364B] shadow-2xl py-1 text-xs text-[#F8FAFC] z-50">
                <div className="px-3 py-1.5 text-[9px] font-mono font-bold text-[#A7B4C8] uppercase tracking-wider border-b border-[#27364B]">
                  Himalayan Corridors
                </div>
                {allCorridors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCorridor(c.id);
                      setCorridorDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#152238] cursor-pointer transition-colors ${
                      activeCorridor.id === c.id ? "text-cyan-400 font-bold bg-[#152238]" : "text-slate-200"
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] text-[#A7B4C8] font-mono">{c.region}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Hazard Status Badge (Semantic Color + Icon + Readable Label) */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium shadow-sm ${tierConfig.bg} ${tierConfig.border}`}
            title={`Multi-Hazard Risk Status: ${activeTier}`}
          >
            <span className={`w-2 h-2 rounded-full ${tierConfig.dot}`} />
            <TierIcon className={`w-3 h-3 ${tierConfig.text}`} />
            <span className={`font-bold tracking-tight text-[11px] ${tierConfig.text}`}>
              {language === "ne" ? tierConfig.labelNe : tierConfig.labelEn}
            </span>
          </div>

          {/* Real-time Telemetry Data Freshness Indicator */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#101A2A] border border-[#27364B] text-[10px] font-mono text-[#A7B4C8] shadow-sm">
            {isSyncing ? (
              <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            )}
            <span className="text-[#F8FAFC] font-semibold">
              {isSyncing ? "Syncing Feed" : "Telemetry Live"}
            </span>
            <span className="text-[#64748B]">• 200 OK</span>
          </div>
        </div>

        {/* CENTER: Linear / Stripe Style Role Segmented Switcher (Desktop) */}
        <nav
          aria-label="User Persona Navigation"
          className="hidden md:flex items-center bg-[#101A2A] p-1 rounded-xl border border-[#27364B] shadow-inner text-xs"
        >
          <button
            onClick={() => setCurrentRole("civilian")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
              currentRole === "civilian"
                ? "bg-[#152238] text-cyan-400 border border-cyan-500/40 shadow-sm"
                : "text-[#A7B4C8] hover:text-[#F8FAFC]"
            }`}
            title="Civilian & Trekker Safety View"
          >
            <span>👤</span>
            <span>{language === "ne" ? "नागरिक" : "Civilian"}</span>
          </button>

          <button
            onClick={() => setCurrentRole("rescuer")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
              currentRole === "rescuer"
                ? "bg-[#152238] text-amber-400 border border-amber-500/40 shadow-sm"
                : "text-[#A7B4C8] hover:text-[#F8FAFC]"
            }`}
            title="Search & Rescue Incident Response View"
          >
            <span>🚁</span>
            <span>{language === "ne" ? "उद्धार" : "Rescuer"}</span>
          </button>

          <button
            onClick={() => setCurrentRole("admin")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
              currentRole === "admin"
                ? "bg-[#152238] text-blue-400 border border-blue-500/40 shadow-sm"
                : "text-[#A7B4C8] hover:text-[#F8FAFC]"
            }`}
            title="National Command Center & GIS View"
          >
            <span>🛡️</span>
            <span>{language === "ne" ? "कमान्ड" : "Command"}</span>
          </button>
        </nav>

        {/* RIGHT: Language, Audio, Guide, PWA Install & Clickable Profile Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* PWA Install Button */}
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 text-xs font-semibold cursor-pointer transition-colors"
              title="Install HimalSanket PWA"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          {/* Language Toggle */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#101A2A] hover:bg-[#152238] border border-[#27364B] text-xs font-bold text-[#F8FAFC] cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
            title="Toggle Nepali / English"
          >
            <Languages className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono">{language === "en" ? "नेपाली" : "EN"}</span>
          </button>

          {/* Audio Alert Toggle */}
          <button
            onClick={onToggleAudioMute}
            className="p-1.5 rounded-lg bg-[#101A2A] hover:bg-[#152238] border border-[#27364B] text-[#A7B4C8] hover:text-[#F8FAFC] cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
            title={audioMuted ? "Unmute audio chime" : "Mute audio alerts"}
            aria-label={audioMuted ? "Unmute audio chime" : "Mute audio alerts"}
          >
            {audioMuted ? <VolumeX className="w-3.5 h-3.5 text-[#64748B]" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          {/* System Tour Modal Button */}
          <button
            onClick={onOpenGuide}
            className="p-1.5 rounded-lg bg-[#101A2A] hover:bg-[#152238] border border-[#27364B] text-[#A7B4C8] hover:text-[#F8FAFC] cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none"
            title="System Architecture Guide"
            aria-label="System Architecture Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          {/* Clickable Profile Avatar (Meta/Instagram Style Persona Switcher) */}
          <button
            onClick={onOpenPersonaSwitcher}
            className="flex items-center gap-2 pl-2 border-l border-[#27364B] hover:opacity-90 cursor-pointer transition-all focus:outline-none"
            title="Switch user profile"
          >
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-600 to-blue-800 border border-cyan-400/50 flex items-center justify-center text-xs font-black text-white shadow-md">
                {userProfile.name.charAt(0)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#080E19]" />
            </div>
            <div className="hidden lg:block text-left text-[11px] leading-tight">
              <div className="font-bold text-[#F8FAFC] truncate max-w-[90px]">{userProfile.name}</div>
              <div className="text-[9px] text-[#A7B4C8] capitalize font-mono">{userProfile.role}</div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
