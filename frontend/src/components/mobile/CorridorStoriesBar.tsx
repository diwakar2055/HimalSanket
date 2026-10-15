import React from "react";
import { motion } from "motion/react";
import { Language } from "../../data/localization";
import {
  Mountain,
  Compass,
  Activity,
  TrendingDown,
  Shield,
  AlertTriangle,
} from "lucide-react";

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

// 4 Semantic Severity Configs
const SEVERITY_CONFIG: Record<
  string,
  { border: string; bg: string; dot: string; text: string; labelEn: string; labelNe: string }
> = {
  Low: {
    border: "border-[#22C55E]/40",
    bg: "bg-[#22C55E]/10",
    dot: "bg-[#22C55E]",
    text: "text-[#22C55E]",
    labelEn: "Safe",
    labelNe: "सुरक्षित",
  },
  Moderate: {
    border: "border-[#EAB308]/40",
    bg: "bg-[#EAB308]/10",
    dot: "bg-[#EAB308]",
    text: "text-[#EAB308]",
    labelEn: "Moderate",
    labelNe: "सतर्क",
  },
  High: {
    border: "border-[#F97316]/50",
    bg: "bg-[#F97316]/10",
    dot: "bg-[#F97316]",
    text: "text-[#F97316]",
    labelEn: "High",
    labelNe: "उच्च",
  },
  Critical: {
    border: "border-[#DC2626]/70",
    bg: "bg-[#DC2626]/15",
    dot: "bg-[#DC2626] animate-ping",
    text: "text-[#DC2626]",
    labelEn: "Critical",
    labelNe: "संकट",
  },
};

const CORRIDOR_ICONS: Record<string, React.ElementType> = {
  langtang: Mountain,
  khumbu: Compass,
  annapurna: Activity,
  manaslu: TrendingDown,
  rolwaling: Shield,
};

export function CorridorStoriesBar({
  corridors,
  selectedId,
  onSelectCorridor,
  language,
}: CorridorStoriesBarProps) {
  return (
    <nav
      aria-label="Himalayan Corridor Selection"
      className="w-full bg-[#080E19] border-b border-[#27364B] px-3 sm:px-4 py-2 overflow-x-auto custom-scrollbar select-none z-20 shrink-0"
    >
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-max">
        <span className="text-[10px] font-mono text-[#A7B4C8] uppercase tracking-wider pl-1 pr-2 hidden md:inline">
          Corridors:
        </span>
        {corridors.map((c) => {
          const isSelected = c.id === selectedId;
          const tier = c.tier || (c.rainfall > 70 ? "High" : c.rainfall > 40 ? "Moderate" : "Low");
          const sev = SEVERITY_CONFIG[tier] || SEVERITY_CONFIG.Low;
          const IconComponent = CORRIDOR_ICONS[c.id] || Mountain;

          return (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelectCorridor(c.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectCorridor(c.id);
                }
              }}
              tabIndex={0}
              aria-pressed={isSelected}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400 focus:outline-none ${
                isSelected
                  ? "bg-[#152238] border-cyan-500/60 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30"
                  : "bg-[#101A2A] border-[#27364B] hover:bg-[#152238] hover:border-[#3D506E]"
              }`}
            >
              {/* Corridor Icon with Severity Ring */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors ${
                  isSelected
                    ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300"
                    : `${sev.bg} ${sev.border} ${sev.text}`
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
              </div>

              {/* Corridor Name & Region */}
              <div className="text-left leading-tight">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? "text-[#F8FAFC]" : "text-[#A7B4C8] group-hover:text-white"
                    }`}
                  >
                    {c.name}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-[#64748B]">
                  <span>{c.region}</span>
                  <span>•</span>
                  <span className={sev.text}>
                    {c.rainfall}mm
                  </span>
                  <span>•</span>
                  <span className={`font-semibold ${sev.text}`}>
                    {language === "ne" ? sev.labelNe : sev.labelEn}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
