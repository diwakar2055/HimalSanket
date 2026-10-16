import React, { useState, useEffect } from "react";
import { Language } from "../data/localization";
import { useUserRole } from "../context/UserRoleContext";
import { BrandLogo } from "./common/BrandLogo";
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
  Mountain,
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
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    dot: "bg-emerald-400",
    labelEn: "Safe baseline",
    labelNe: "सामान्य अवस्था",
    icon: CheckCircle2,
  },
  Moderate: {
    border: "border-amber-500/30",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    dot: "bg-amber-400",
    labelEn: "Moderate watch",
    labelNe: "सतर्कता आवश्यक",
    icon: Activity,
  },
  High: {
    border: "border-orange-500/40",
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    dot: "bg-orange-400",
    labelEn: "Elevated risk",
    labelNe: "उच्च जोखिम",
    icon: ShieldAlert,
  },
  Critical: {
    border: "border-rose-500/50",
    text: "text-rose-400",
    bg: "bg-rose-500/15",
    dot: "bg-rose-500 animate-ping",
    labelEn: "Critical emergency",
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
    <header className="w-full bg-[#090D16]/95 border-b border-white/[0.08] shadow-2xl sticky top-0 z-40 backdrop-blur-xl select-none font-sans">
      <div className="w-full px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        {/* LEFT: Traefik / Transcope Brand + Corridor Picker + Sensor Status */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Brand Logo with Traefik/Transcope aesthetic */}
          <BrandLogo size="md" />

          {/* Active Corridor Selector Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F172A] border border-white/[0.08] text-xs font-semibold text-white shadow-sm">
            <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-mono text-cyan-300 font-bold">{activeCorridor.name}</span>
            <span className="text-slate-400 text-[10px] hidden sm:inline font-mono">
              ({activeCorridor.region})
            </span>
          </div>

          {/* Active Hazard Status Badge */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-medium shadow-sm ${tierConfig.bg} ${tierConfig.border}`}
            title={`Multi-Hazard Risk Status: ${activeTier}`}
          >
            <span className={`w-2 h-2 rounded-full ${tierConfig.dot}`} />
            <TierIcon className={`w-3.5 h-3.5 ${tierConfig.text}`} />
            <span className={`font-bold tracking-tight text-[11px] ${tierConfig.text}`}>
              {language === "ne" ? tierConfig.labelNe : tierConfig.labelEn}
            </span>
          </div>

          {/* Traefik Hub Style "18 Sensors Live" Status Indicator */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0F172A] border border-white/[0.08] text-[10px] font-mono text-slate-300 shadow-sm">
            {isSyncing ? (
              <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            )}
            <span className="text-white font-semibold">
              {isSyncing ? "Syncing Sensors" : "18 Relays Connected"}
            </span>
          </div>
        </div>

        {/* CENTER: Modern Minimal Role Switcher (Civilian / Rescuer / Command) */}
        <nav
          aria-label="User Persona Navigation"
          className="hidden md:flex items-center bg-[#0F172A] p-1 rounded-xl border border-white/[0.08] shadow-inner text-xs"
        >
          <button
            onClick={() => setCurrentRole("civilian")}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-lg font-bold transition-all cursor-pointer focus:outline-none ${
              currentRole === "civilian"
                ? "bg-white/[0.12] text-white border border-white/[0.15] shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
            title="Civilian & Trekker Safety View"
          >
            <Users className="w-3.5 h-3.5" />
            <span>{language === "ne" ? "नागरिक" : "Civilian"}</span>
          </button>

          <button
            onClick={() => setCurrentRole("rescuer")}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-lg font-bold transition-all cursor-pointer focus:outline-none ${
              currentRole === "rescuer"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
            title="Search & Rescue Incident Response View"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{language === "ne" ? "उद्धार" : "Rescuer"}</span>
          </button>

          <button
            onClick={() => setCurrentRole("admin")}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-lg font-bold transition-all cursor-pointer focus:outline-none ${
              currentRole === "admin"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
            title="National Command Center & GIS View"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{language === "ne" ? "कमान्ड" : "Command"}</span>
          </button>
        </nav>

        {/* RIGHT: Language, Audio, Guide, PWA Install & Clickable Profile Avatar */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 text-xs font-semibold cursor-pointer transition-colors"
              title="Install HimalSanket PWA"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          {/* Language Toggle */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0F172A] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-bold text-white cursor-pointer transition-colors focus:outline-none"
            title="Toggle Nepali / English"
          >
            <Languages className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono">{language === "en" ? "नेपाली" : "EN"}</span>
          </button>

          {/* Audio Alert Toggle */}
          <button
            onClick={onToggleAudioMute}
            className="p-2 rounded-xl bg-[#0F172A] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white cursor-pointer transition-colors focus:outline-none"
            title={audioMuted ? "Unmute audio chime" : "Mute audio alerts"}
            aria-label={audioMuted ? "Unmute audio chime" : "Mute audio alerts"}
          >
            {audioMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>

          {/* System Tour Modal Button */}
          <button
            onClick={onOpenGuide}
            className="p-2 rounded-xl bg-[#0F172A] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white cursor-pointer transition-colors focus:outline-none"
            title="System Architecture Guide"
            aria-label="System Architecture Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          {/* Clickable Profile Avatar (Meta/Instagram Style Persona Switcher) */}
          <button
            onClick={onOpenPersonaSwitcher}
            className="flex items-center gap-2 pl-2 border-l border-white/[0.08] hover:opacity-90 cursor-pointer transition-all focus:outline-none"
            title="Switch user profile"
          >
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-cyan-800 border border-emerald-400/50 flex items-center justify-center text-xs font-black text-white shadow-md">
                {userProfile.name.charAt(0)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-[#090D16]" />
            </div>
            <div className="hidden lg:block text-left text-[11px] leading-tight">
              <div className="font-bold text-white truncate max-w-[90px] font-sans">
                {userProfile.name}
              </div>
              <div className="text-[9px] text-slate-400 capitalize font-mono">
                {userProfile.role}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-500 hidden lg:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
