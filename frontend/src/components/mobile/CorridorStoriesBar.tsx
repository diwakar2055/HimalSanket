import React from "react";
import { motion } from "motion/react";
import { Language } from "../../data/localization";

interface CorridorStory {
  id: string;
  name: string;
  region: string;
  rainfall: number;
  seismic: number;
  lakeChange: number;
  tier?: "Low" | "Moderate" | "High" | "Critical";
}

interface CorridorStoriesBarProps {
  corridors: CorridorStory[];
  selectedId: string;
  onSelectCorridor: (id: string) => void;
  language: Language;
}

const RING_GRADIENTS: Record<string, string> = {
  Low: "from-emerald-400 via-teal-500 to-cyan-500",
  Moderate: "from-amber-400 via-orange-500 to-yellow-500",
  High: "from-orange-500 via-rose-500 to-amber-500",
  Critical: "from-rose-500 via-red-600 to-pink-600 animate-pulse",
};

const CORRIDOR_EMOJIS: Record<string, string> = {
  langtang: "🏔️",
  khumbu: "❄️",
  annapurna: "⛰️",
  manaslu: "🧗",
  rolwaling: "🏕️",
};

export function CorridorStoriesBar({
  corridors,
  selectedId,
  onSelectCorridor,
  language,
}: CorridorStoriesBarProps) {
  return (
    <div className="w-full bg-[#070D18]/90 backdrop-blur-xl border-b border-white/10 px-3 py-2 overflow-x-auto no-scrollbar select-none z-20">
      <div className="flex items-center gap-3 min-w-max">
        {corridors.map((c) => {
          const isSelected = c.id === selectedId;
          const tier = c.tier || (c.rainfall > 70 ? "High" : c.rainfall > 40 ? "Moderate" : "Low");
          const gradient = RING_GRADIENTS[tier] || RING_GRADIENTS.Low;
          const emoji = CORRIDOR_EMOJIS[c.id] || "🏔️";

          return (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => onSelectCorridor(c.id)}
              className="flex flex-col items-center gap-1 cursor-pointer group focus:outline-none"
            >
              {/* Instagram-style Gradient Story Ring */}
              <div
                className={`relative p-[2px] rounded-full transition-all duration-300 ${
                  isSelected
                    ? "bg-gradient-to-tr " + gradient + " shadow-lg shadow-cyan-500/20 scale-105"
                    : "bg-white/15 hover:bg-white/30"
                }`}
              >
                <div className="w-13 h-13 rounded-full bg-[#0D1526] p-0.5 flex items-center justify-center border-2 border-[#070D18]">
                  <span className="text-xl select-none group-hover:scale-110 transition-transform">
                    {emoji}
                  </span>
                </div>

                {/* Live Alert Dot for Elevated Risk */}
                {tier !== "Low" && (
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#070D18] ${
                      tier === "Critical"
                        ? "bg-rose-500 animate-ping"
                        : tier === "High"
                        ? "bg-orange-500"
                        : "bg-amber-400"
                    }`}
                  />
                )}
              </div>

              {/* Story Title & Metric */}
              <div className="text-center leading-tight">
                <span
                  className={`block text-[11px] font-bold max-w-[76px] truncate ${
                    isSelected ? "text-cyan-300" : "text-slate-300 group-hover:text-white"
                  }`}
                >
                  {c.name.split(" ")[0]}
                </span>
                <span className="block text-[9px] font-mono text-[#64748B]">
                  {c.rainfall}mm
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
