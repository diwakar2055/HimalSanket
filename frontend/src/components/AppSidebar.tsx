import React from "react";
import {
  Activity,
  Compass,
  Satellite,
  FileText,
  BarChart3,
  Bot,
  Mountain,
  Volume2,
  VolumeX,
  Languages,
  HelpCircle,
} from "lucide-react";
import { Language } from "../data/localization";
import { useUserRole } from "../context/UserRoleContext";

export type SidebarTab =
  | "dashboard"
  | "map"
  | "lakes"
  | "timesfm"
  | "sitrep"
  | "copilot";

interface AppSidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  language: Language;
  onToggleLanguage: () => void;
  audioMuted: boolean;
  onToggleAudioMute: () => void;
  onOpenTour: () => void;
  onOpenSos: () => void;
  isSyncing?: boolean;
  className?: string;
}

export function AppSidebar({
  activeTab,
  onSelectTab,
  language,
  onToggleLanguage,
  audioMuted,
  onToggleAudioMute,
  onOpenTour,
  onOpenSos,
  isSyncing = false,
  className = "",
}: AppSidebarProps) {
  const { userProfile, distressBeacons } = useUserRole();
  const pendingSosCount = distressBeacons.filter((b) => b.status === "pending").length;

  const NAV_ITEMS = [
    {
      id: "dashboard" as SidebarTab,
      labelEn: "Operations Command",
      labelNe: "कमान्ड सेन्टर",
      icon: Activity,
      badge: pendingSosCount > 0 ? `${pendingSosCount} SOS` : undefined,
      badgeColor: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
    },
    {
      id: "map" as SidebarTab,
      labelEn: "Corridor GIS Map",
      labelNe: "नक्सा",
      icon: Compass,
    },
    {
      id: "lakes" as SidebarTab,
      labelEn: "Glacial Lakes (GLOF)",
      labelNe: "हिमताल निगरानी",
      icon: Satellite,
    },
    {
      id: "timesfm" as SidebarTab,
      labelEn: "Precipitation Forecast",
      labelNe: "वर्षा पूर्वानुमान",
      icon: BarChart3,
    },
    {
      id: "sitrep" as SidebarTab,
      labelEn: "SITREP Briefing",
      labelNe: "विपद् प्रतिवेदन",
      icon: FileText,
    },
    {
      id: "copilot" as SidebarTab,
      labelEn: "AI Safety Copilot",
      labelNe: "एआई सहायक",
      icon: Bot,
      badge: "Gemini",
      badgeColor: "bg-white/[0.08] text-slate-300 border border-white/10",
    },
  ];

  return (
    <aside
      className={`w-64 bg-[#111215] border-r border-white/[0.08] flex flex-col justify-between shrink-0 select-none z-30 font-sans ${className}`}
    >
      {/* Top: Traefik Hub Style Brand & Emblem */}
      <div>
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-slate-200">
              <Mountain className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-white text-base tracking-tight">
                  HimalSanket<span className="text-emerald-400">.</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Multi-Hazard Platform
              </span>
            </div>
          </div>
        </div>

        {/* Primary Navigation Menu (Traefik Hub Vertical Pill Style) */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                  isActive
                    ? "bg-white/[0.08] text-white border border-white/[0.12] shadow-sm font-bold"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? "text-emerald-400"
                        : "text-slate-400 group-hover:text-white"
                    }`}
                  />
                  <span className="truncate">
                    {language === "ne" ? item.labelNe : item.labelEn}
                  </span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Traefik "Agents Connected" + User Info */}
      <div className="p-3 border-t border-white/[0.08] space-y-3 bg-[#111215]">
        {/* Real-time Relays Status (like Traefik Hub Agents connected) */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>18 Sensors Online</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold">100% OK</span>
        </div>

        {/* Quick Toggles: Language, Audio, Guide */}
        <div className="flex items-center justify-between px-1 text-slate-400">
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/[0.06] hover:text-white text-xs font-mono transition-colors cursor-pointer"
            title="Toggle Nepali / English"
          >
            <Languages className="w-3.5 h-3.5 text-slate-400" />
            <span>{language === "en" ? "नेपाली" : "EN"}</span>
          </button>

          <button
            onClick={onToggleAudioMute}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
            title={audioMuted ? "Unmute chimes" : "Mute chimes"}
          >
            {audioMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-slate-300" />
            )}
          </button>

          <button
            onClick={onOpenTour}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
            title="Architecture Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* User Profile Pill */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-white/[0.1] border border-white/20 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {userProfile.name.charAt(0)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#111215]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {userProfile.name}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate capitalize">
                Operations Officer
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
