import React from "react";
import { motion } from "motion/react";
import { useUserRole, UserRole } from "../../context/UserRoleContext";
import { playConfirmationBeep } from "../../utils/audioAlert";
import {
  Shield,
  Compass,
  Radio,
  Users,
  SlidersHorizontal,
  Flame,
  AlertTriangle,
} from "lucide-react";

interface MobileBottomNavProps {
  activeTab: "safety" | "map" | "rescue" | "admin";
  onChangeTab: (tab: "safety" | "map" | "rescue" | "admin") => void;
  onOpenSos: () => void;
  pendingSosCount?: number;
}

export function MobileBottomNav({
  activeTab,
  onChangeTab,
  onOpenSos,
  pendingSosCount = 0,
}: MobileBottomNavProps) {
  const { currentRole, setCurrentRole } = useUserRole();

  const handleTabClick = (tab: "safety" | "map" | "rescue" | "admin") => {
    playConfirmationBeep();
    onChangeTab(tab);
    if (tab === "safety" && currentRole !== "civilian") {
      setCurrentRole("civilian");
    } else if (tab === "rescue" && currentRole !== "rescuer") {
      setCurrentRole("rescuer");
    } else if (tab === "admin" && currentRole !== "admin") {
      setCurrentRole("admin");
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A1224]/95 backdrop-blur-2xl border-t border-white/10 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] shadow-2xl flex items-center justify-around select-none">
      {/* 1. SAFETY / REFUGE */}
      <button
        onClick={() => handleTabClick("safety")}
        className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
          activeTab === "safety" ? "text-cyan-400 scale-105" : "text-slate-400 hover:text-white"
        }`}
      >
        <div className="relative">
          <Shield className="w-5 h-5" />
          {activeTab === "safety" && (
            <motion.div
              layoutId="bottomNavDot"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400"
            />
          )}
        </div>
        <span className="text-[10px] font-bold">Safety</span>
      </button>

      {/* 2. FULL MAP */}
      <button
        onClick={() => handleTabClick("map")}
        className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
          activeTab === "map" ? "text-cyan-400 scale-105" : "text-slate-400 hover:text-white"
        }`}
      >
        <div className="relative">
          <Compass className="w-5 h-5" />
          {activeTab === "map" && (
            <motion.div
              layoutId="bottomNavDot"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400"
            />
          )}
        </div>
        <span className="text-[10px] font-bold">Map</span>
      </button>

      {/* 3. CENTER RAISED SOS BUTTON (APPLE SOS STYLE) */}
      <div className="-mt-6">
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={onOpenSos}
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-red-700 border-2 border-white shadow-2xl shadow-rose-600/60 flex flex-col items-center justify-center text-white cursor-pointer active:brightness-125 focus:outline-none"
          title="1-Tap Emergency SOS"
        >
          <span className="absolute -inset-1 rounded-full bg-rose-500 opacity-40 animate-ping" />
          <Radio className="w-5 h-5 animate-pulse relative z-10" />
          <span className="text-[9px] font-black tracking-tighter uppercase relative z-10 mt-0.5">
            SOS
          </span>
        </motion.button>
      </div>

      {/* 4. SAR RESCUE TRIAGE */}
      <button
        onClick={() => handleTabClick("rescue")}
        className={`flex flex-col items-center gap-1 cursor-pointer transition-all relative ${
          activeTab === "rescue" ? "text-amber-400 scale-105" : "text-slate-400 hover:text-white"
        }`}
      >
        <div className="relative">
          <Users className="w-5 h-5" />
          {pendingSosCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-rose-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow">
              {pendingSosCount}
            </span>
          )}
          {activeTab === "rescue" && (
            <motion.div
              layoutId="bottomNavDot"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400"
            />
          )}
        </div>
        <span className="text-[10px] font-bold">Rescue</span>
      </button>

      {/* 5. EOC COMMAND ADMIN */}
      <button
        onClick={() => handleTabClick("admin")}
        className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
          activeTab === "admin" ? "text-blue-400 scale-105" : "text-slate-400 hover:text-white"
        }`}
      >
        <div className="relative">
          <SlidersHorizontal className="w-5 h-5" />
          {activeTab === "admin" && (
            <motion.div
              layoutId="bottomNavDot"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400"
            />
          )}
        </div>
        <span className="text-[10px] font-bold">Command</span>
      </button>
    </nav>
  );
}
