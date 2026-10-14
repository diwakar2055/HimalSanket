import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  Sparkles,
  GripHorizontal,
} from "lucide-react";

export type SheetPosition = "peek" | "half" | "full";

interface MobileBottomSheetProps {
  children: React.ReactNode;
  peekContent?: React.ReactNode;
  position?: SheetPosition;
  onChangePosition?: (pos: SheetPosition) => void;
  title?: string;
  badge?: React.ReactNode;
}

export function MobileBottomSheet({
  children,
  peekContent,
  position = "half",
  onChangePosition,
  title,
  badge,
}: MobileBottomSheetProps) {
  const [internalPosition, setInternalPosition] = useState<SheetPosition>(position);

  const activePosition = onChangePosition ? position : internalPosition;
  const setPosition = (pos: SheetPosition) => {
    if (onChangePosition) onChangePosition(pos);
    else setInternalPosition(pos);
  };

  const cyclePosition = () => {
    if (activePosition === "peek") setPosition("half");
    else if (activePosition === "half") setPosition("full");
    else setPosition("half");
  };

  // Height mappings for mobile bottom sheet
  const HEIGHT_CLASSES: Record<SheetPosition, string> = {
    peek: "h-[86px]",
    half: "h-[46vh]",
    full: "h-[86vh]",
  };

  return (
    <>
      {/* 1. MOBILE BOTTOM SHEET (visible on < lg screens) */}
      <motion.div
        layout
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className={`lg:hidden fixed bottom-14 left-0 right-0 z-30 bg-[#0A1224]/95 backdrop-blur-2xl border-t border-white/15 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${HEIGHT_CLASSES[activePosition]}`}
      >
        {/* Drag / Tap Handle Header */}
        <div
          onClick={cyclePosition}
          className="w-full pt-2 pb-1.5 px-4 flex flex-col items-center cursor-pointer select-none border-b border-white/5 shrink-0 bg-[#0F1B33]/60 hover:bg-[#16233F]"
        >
          {/* iOS / Instagram Pull Bar */}
          <div className="w-10 h-1.5 rounded-full bg-slate-500/60 mb-2" />

          {/* Peek Header Content (Title + Status + Expand Icon) */}
          <div className="w-full flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {title && <span className="font-extrabold text-white">{title}</span>}
              {badge}
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-[10px] font-semibold hidden sm:inline">
                {activePosition === "peek"
                  ? "Swipe up for Copilot"
                  : activePosition === "half"
                  ? "Full screen"
                  : "Minimize"}
              </span>
              {activePosition === "peek" ? (
                <ChevronUp className="w-4 h-4 text-cyan-400 animate-bounce" />
              ) : activePosition === "full" ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </div>
          </div>

          {/* Optional Peek Content shown when collapsed */}
          {activePosition === "peek" && peekContent && (
            <div className="w-full mt-1.5">{peekContent}</div>
          )}
        </div>

        {/* Scrollable Sheet Content */}
        {activePosition !== "peek" && (
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 flex flex-col">
            {children}
          </div>
        )}
      </motion.div>

      {/* 2. DESKTOP SIDE PANEL (visible on >= lg screens, studio-grade layout) */}
      <div className="hidden lg:flex w-[480px] xl:w-[520px] h-full flex-col bg-[#0F1B33]/90 backdrop-blur-2xl border-r border-white/10 shrink-0 z-20 overflow-hidden shadow-2xl">
        {children}
      </div>
    </>
  );
}
