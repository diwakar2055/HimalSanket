import React from "react";

interface SegmentedMeterProps {
  value: number; // 0 to 100
  totalSegments?: number;
  color?: "emerald" | "amber" | "rose" | "white";
  className?: string;
}

const COLOR_MAP = {
  emerald: {
    active: "bg-emerald-400",
    inactive: "bg-white/[0.08]",
  },
  amber: {
    active: "bg-amber-400",
    inactive: "bg-white/[0.08]",
  },
  rose: {
    active: "bg-rose-400",
    inactive: "bg-white/[0.08]",
  },
  white: {
    active: "bg-white",
    inactive: "bg-white/[0.08]",
  },
};

export function SegmentedMeter({
  value,
  totalSegments = 22,
  color = "white",
  className = "",
}: SegmentedMeterProps) {
  const activeCount = Math.round((Math.max(0, Math.min(100, value)) / 100) * totalSegments);
  const colorStyles = COLOR_MAP[color] || COLOR_MAP.white;

  return (
    <div className={`flex items-center gap-[2.5px] h-3.5 select-none ${className}`}>
      {Array.from({ length: totalSegments }).map((_, index) => {
        const isActive = index < activeCount;
        return (
          <div
            key={index}
            className={`w-[2.5px] h-3 rounded-[0.5px] transition-all duration-200 ${
              isActive ? colorStyles.active : colorStyles.inactive
            }`}
          />
        );
      })}
    </div>
  );
}
