import React, { useState, useEffect } from "react";
import { Language, getTranslation } from "../data/localization";
import { useUserRole, UserRole } from "../context/UserRoleContext";
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
}

const TIER_COLORS = {
  Low: { border: "border-emerald-500/50", text: "text-emerald-400", dot: "bg-emerald-400" },
  Moderate: { border: "border-amber-500/50", text: "text-amber-400", dot: "bg-amber-400" },
  High: { border: "border-orange-500/50", text: "text-orange-400", dot: "bg-orange-400" },
  Critical: { border: "border-rose-500/80", text: "text-rose-400", dot: "bg-rose-500 animate-ping" },
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
}: CommandHeaderProps) {
  const { currentRole, setCurrentRole, userProfile } = useUserRole();
  const tierStyle = TIER_COLORS[activeTier] || TIER_COLORS.Low;

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
    <header className="w-full bg-[#0A1224]/95 border-b border-[#1E293B] shadow-2xl sticky top-0 z-40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
        {/* LEFT: HimalSanket Brand + Corridor Picker + Hazard Indicator */}
        <div className="flex items-center gap-3">
          {/* Brand Emblem */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-sm border border-cyan-400/40">
              🏔️
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold tracking-tight text-white text-sm sm:text-base">
                  HimalSanket
                </span>
                <span className="text-[10px] text-cyan-400 font-semibold hidden md:inline">
                  (हिमाल संकेत)
                </span>
              </div>
              <div className="text-[9px] text-[#64748B] font-mono leading-none mt-0.5">
                AI Early Warning System
              </div>
            </div>
          </div>

          {/* Corridor Dropdown Selector */}
          <div className="relative">
            <button
              onClick={() => setCorridorDropdownOpen(!corridorDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#16233F] hover:bg-[#1C2C4C] border border-[#2A3B5E] text-xs font-semibold text-white shadow-sm cursor-pointer transition-all"
            >
              <Compass className="w-3 h-3 text-cyan-400" />
              <span className="truncate max-w-[110px] sm:max-w-[140px]">{activeCorridor.name}</span>
              <ChevronDown className="w-3 h-3 text-[#64748B]" />
            </button>

            {corridorDropdownOpen && (
              <div className="absolute left-0 top-9 w-48 rounded-xl bg-[#0F1B33]/95 backdrop-blur-xl border border-[#2A3B5E] shadow-2xl py-1 text-xs text-white z-50 animate-in fade-in">
                <div className="px-3 py-1 text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#2A3B5E]">
                  Select River Corridor
                </div>
                {allCorridors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCorridor(c.id);
                      setCorridorDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-[#1C2C4C] cursor-pointer ${
                      activeCorridor.id === c.id ? "text-cyan-400 font-bold bg-[#16233F]" : "text-slate-200"
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] text-[#64748B] font-mono">{c.region}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Hazard Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#16233F] border border-[#2A3B5E] text-[11px]">
            <span className={`w-2 h-2 rounded-full ${tierStyle.dot}`} />
            <span className={`font-black uppercase tracking-wider text-[10px] ${tierStyle.text}`}>
              {activeTier}
            </span>
          </div>
        </div>

        {/* CENTER: Presentation Persona / User Role Switcher */}
        <div className="flex items-center bg-[#111A2E] p-1 rounded-2xl border border-[#2A3B5E] shadow-inner text-xs order-last md:order-none w-full md:w-auto justify-center">
          <button
            onClick={() => setCurrentRole("civilian")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              currentRole === "civilian"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                : "text-[#94A3B8] hover:text-white"
            }`}
            title="Civilian & Trekker Safety View"
          >
            <span>👤</span>
            <span>{language === "ne" ? "नागरिक / पदयात्री" : "Civilian / Trekker"}</span>
          </button>

          <button
            onClick={() => setCurrentRole("rescuer")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              currentRole === "rescuer"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                : "text-[#94A3B8] hover:text-white"
            }`}
            title="Search & Rescue Incident Response View"
          >
            <span>🚁</span>
            <span>{language === "ne" ? "उद्धार टोली (SAR)" : "SAR Rescuer"}</span>
          </button>

          <button
            onClick={() => setCurrentRole("admin")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              currentRole === "admin"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-[#94A3B8] hover:text-white"
            }`}
            title="National Command Center & GIS View"
          >
            <span>🛡️</span>
            <span>{language === "ne" ? "विपद् कमान्ड" : "Command Admin"}</span>
          </button>
        </div>

        {/* RIGHT: Language, Audio, Guide, PWA Install & Profile */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button (if available) */}
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/50 text-xs font-semibold cursor-pointer animate-pulse"
              title="Install HimalSanket PWA on your device"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {/* Language Toggle */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#16233F] hover:bg-[#1C2C4C] border border-[#2A3B5E] text-xs font-bold text-slate-200 cursor-pointer transition-all"
            title="Toggle Nepali / English"
          >
            <Languages className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === "en" ? "नेपाली" : "EN"}</span>
          </button>

          {/* Audio Alert Toggle */}
          <button
            onClick={onToggleAudioMute}
            className="p-1.5 rounded-xl bg-[#16233F] hover:bg-[#1C2C4C] border border-[#2A3B5E] text-slate-300 hover:text-white cursor-pointer transition-all"
            title={audioMuted ? "Unmute audio chime" : "Mute audio alerts"}
          >
            {audioMuted ? <VolumeX className="w-3.5 h-3.5 text-[#64748B]" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          {/* System Tour Modal Button */}
          <button
            onClick={onOpenGuide}
            className="p-1.5 rounded-xl bg-[#16233F] hover:bg-[#1C2C4C] border border-[#2A3B5E] text-slate-300 hover:text-white cursor-pointer transition-all"
            title="System Architecture Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          {/* Active User Avatar & Role */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-[#2A3B5E]">
            <div className="w-7 h-7 rounded-full bg-cyan-900 border border-cyan-400/50 flex items-center justify-center text-xs font-bold text-cyan-200">
              {userProfile.name.charAt(0)}
            </div>
            <div className="text-left text-[11px] leading-tight">
              <div className="font-bold text-white truncate max-w-[100px]">{userProfile.name}</div>
              <div className="text-[9px] text-[#64748B] capitalize">{userProfile.role}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
