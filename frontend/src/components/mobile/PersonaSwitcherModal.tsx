import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useUserRole, UserRole, UserProfile } from "../../context/UserRoleContext";
import { playConfirmationBeep } from "../../utils/audioAlert";
import {
  Check,
  X,
  Shield,
  Plane,
  Users,
  Compass,
  Building2,
  Sparkles,
} from "lucide-react";

interface PersonaSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLES_METADATA: Record<
  UserRole,
  {
    name: string;
    roleTitle: string;
    organization: string;
    station: string;
    avatarEmoji: string;
    badgeColor: string;
    ringColor: string;
    tagline: string;
  }
> = {
  civilian: {
    name: "Pasang Sherpa",
    roleTitle: "Civilian / Trekker",
    organization: "Trekker & Mountain Resident",
    station: "Kyanjin Gompa (3,870m)",
    avatarEmoji: "👤",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    ringColor: "ring-cyan-500",
    tagline: "Uncluttered safety status, nearest high ground refuge, and bilingual Gemini Safety Copilot.",
  },
  rescuer: {
    name: "Inspector Bikram Thapa",
    roleTitle: "Search & Rescue (SAR)",
    organization: "Armed Police Force (APF) Disaster Base 3",
    station: "Dhunche Helipad Command Post",
    avatarEmoji: "🚁",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    ringColor: "ring-amber-500",
    tagline: "P0–P3 incident triage board, 1-click team dispatch, and helicopter flight weather clearance.",
  },
  admin: {
    name: "Dr. Ramesh Adhikari",
    roleTitle: "National Command Admin",
    organization: "NDRRMA Emergency Operations Center (Level 4)",
    station: "Singha Durbar, Kathmandu",
    avatarEmoji: "🛡️",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    ringColor: "ring-blue-500",
    tagline: "Full GIS spatial overlays, dynamic surge simulation slider, Sentinel-2 analysis, and SITREP.",
  },
};

export function PersonaSwitcherModal({ isOpen, onClose }: PersonaSwitcherModalProps) {
  const { currentRole, setCurrentRole } = useUserRole();

  if (!isOpen) return null;

  const handleSelectRole = (role: UserRole) => {
    playConfirmationBeep();
    setCurrentRole(role);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="w-full sm:max-w-lg bg-[#0F172A] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl text-white relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Switch Presentation Persona</span>
                <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40">
                  AI Summit
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Experience tailored workflows designed specifically for each role
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Cards (Instagram / Meta Style) */}
          <div className="space-y-3 mt-4">
            {(["civilian", "rescuer", "admin"] as UserRole[]).map((role) => {
              const meta = ROLES_METADATA[role];
              const isSelected = currentRole === role;

              return (
                <motion.div
                  key={role}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectRole(role)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected
                      ? "bg-[#16233F] border-cyan-500/70 shadow-xl shadow-cyan-500/10 ring-2 " +
                        meta.ringColor
                      : "bg-[#090F1D]/80 border-white/10 hover:border-white/25 hover:bg-[#111A2E]"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Big Avatar */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 border border-white/20 flex items-center justify-center text-xl shadow-md">
                        {meta.avatarEmoji}
                      </div>
                      {isSelected && (
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 text-black flex items-center justify-center text-[10px] font-black border-2 border-[#0F172A]">
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-white">{meta.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeColor}`}
                        >
                          {meta.roleTitle}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {meta.organization} &bull;{" "}
                        <span className="text-slate-300 font-mono">{meta.station}</span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] leading-snug pt-0.5">
                        {meta.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Radio / Check Circle */}
                  <div className="pt-1">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-400 text-black"
                          : "border-slate-600"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-center text-[11px] text-slate-400">
            Switching personas dynamically updates the Google Maps layers, triage feeds, and tools.
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
