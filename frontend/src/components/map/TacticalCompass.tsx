import React, { useState, useRef, useCallback } from "react";
import { Compass, RotateCcw, RotateCw, Mountain, ChevronDown, ChevronUp, Navigation2 } from "lucide-react";
import { playConfirmationBeep } from "../../utils/audioAlert";

export interface TacticalCompassProps {
  heading: number;
  tilt: number;
  onHeadingChange: (heading: number) => void;
  onTiltChange: (tilt: number) => void;
  onResetNorth: () => void;
  className?: string;
}

export function getCardinalDirection(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return "N";
  if (normalized >= 22.5 && normalized < 67.5) return "NE";
  if (normalized >= 67.5 && normalized < 112.5) return "E";
  if (normalized >= 112.5 && normalized < 157.5) return "SE";
  if (normalized >= 157.5 && normalized < 202.5) return "S";
  if (normalized >= 202.5 && normalized < 247.5) return "SW";
  if (normalized >= 247.5 && normalized < 292.5) return "W";
  return "NW";
}

export function TacticalCompass({
  heading,
  tilt,
  onHeadingChange,
  onTiltChange,
  onResetNorth,
  className = "",
}: TacticalCompassProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const compassRef = useRef<HTMLDivElement>(null);

  const normalizedHeading = ((Math.round(heading) % 360) + 360) % 360;
  const cardinal = getCardinalDirection(normalizedHeading);
  // When camera heading is H, True North on the screen is rotated by -H degrees
  const needleRotation = -normalizedHeading;

  // Pointer drag on the compass dial to rotate heading
  const updateHeadingFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!compassRef.current) return;
      const rect = compassRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      // 0 deg is UP (North), 90 is RIGHT (East), 180 is DOWN (South), 270 is LEFT (West)
      const rad = Math.atan2(dx, -dy);
      let deg = Math.round((rad * 180) / Math.PI);
      if (deg < 0) deg += 360;
      onHeadingChange(deg);
    },
    [onHeadingChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateHeadingFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateHeadingFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    playConfirmationBeep();
  };

  const handleStepRotate = (delta: number) => {
    playConfirmationBeep();
    const next = (normalizedHeading + delta + 360) % 360;
    onHeadingChange(next);
  };

  const handlePresetHeading = (deg: number) => {
    playConfirmationBeep();
    onHeadingChange(deg);
  };

  const handleToggleTilt = () => {
    playConfirmationBeep();
    // Cycle tilt: 0° -> 45° -> 60° -> 0°
    if (tilt < 10) onTiltChange(45);
    else if (tilt < 55) onTiltChange(60);
    else onTiltChange(0);
  };

  return (
    <div
      className={`flex flex-col items-end pointer-events-auto select-none ${className}`}
      aria-label="Tactical North Compass & Map Angle HUD"
    >
      {/* 1. COMPACT HUD COMPASS CONTROLLER */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0B1528]/90 backdrop-blur-xl border border-cyan-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        {/* Quick Stepper: Turn Left 45° */}
        <button
          onClick={() => handleStepRotate(-45)}
          className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-all cursor-pointer text-xs"
          title="Rotate Map Counter-Clockwise 45°"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Tactical Dial: Interactive Drag & Click-to-Reset-North */}
        <div
          ref={compassRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-12 h-12 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center bg-gradient-to-br from-[#132238] to-[#080E1A] border-2 border-cyan-500/40 shadow-inner group"
          title={`Compass: ${normalizedHeading}° ${cardinal}. Drag to rotate map angle or double-click to reset North.`}
          onDoubleClick={onResetNorth}
        >
          {/* Bezel Cardinal Markers (Static on dial) */}
          <span className="absolute top-0.5 text-[8px] font-black text-rose-500 leading-none">N</span>
          <span className="absolute bottom-0.5 text-[7px] font-bold text-slate-500 leading-none">S</span>
          <span className="absolute right-1 text-[7px] font-bold text-slate-500 leading-none">E</span>
          <span className="absolute left-1 text-[7px] font-bold text-slate-500 leading-none">W</span>

          {/* Rotating True North Needle */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-150 ease-out pointer-events-none"
            style={{ transform: `rotate(${needleRotation}deg)` }}
          >
            {/* North Arrow Tip (Vivid Crimson with luminous glow) */}
            <div className="relative w-2 h-5 -mt-3.5 flex flex-col items-center">
              <div
                className="w-0 h-0 border-x-4 border-x-transparent border-b-[14px] border-b-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.9)]"
                title="True North"
              />
            </div>
            {/* South Arrow Tip (Subtle Slate/Silver) */}
            <div className="relative w-2 h-5 mt-3.5 flex flex-col items-center">
              <div className="w-0 h-0 border-x-4 border-x-transparent border-t-[12px] border-t-slate-400 opacity-60" />
            </div>
            {/* Central Gyro Pivot */}
            <div className="absolute w-2 h-2 rounded-full bg-cyan-400 border border-black shadow" />
          </div>
        </div>

        {/* Quick Stepper: Turn Right 45° */}
        <button
          onClick={() => handleStepRotate(45)}
          className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-all cursor-pointer text-xs"
          title="Rotate Map Clockwise 45°"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Digital Bearing Readout & 1-Click Reset to North */}
        <button
          onClick={onResetNorth}
          className={`flex flex-col items-center justify-center px-2 py-1 rounded-xl transition-all cursor-pointer border ${
            normalizedHeading === 0
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20"
              : "bg-cyan-500/15 border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/25 animate-pulse"
          }`}
          title="Click to Reset Heading to True North (0°)"
        >
          <span className="text-[11px] font-black font-mono leading-none">
            {normalizedHeading.toString().padStart(3, "0")}°
          </span>
          <span className="text-[9px] font-black uppercase text-amber-300 tracking-wider">
            {cardinal}
          </span>
        </button>

        {/* 3D Alpine Tilt Perspective Toggle */}
        <button
          onClick={handleToggleTilt}
          className={`px-2 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            tilt > 0
              ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow"
              : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
          }`}
          title={`Map 3D Perspective Tilt: currently ${Math.round(tilt)}°. Click to cycle 0° / 45° / 60°.`}
        >
          <Mountain className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-mono font-bold">
            {tilt > 0 ? `${Math.round(tilt)}° 3D` : "2D"}
          </span>
        </button>

        {/* Expand / Collapse Controls Drawer */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={isExpanded ? "Collapse rotation tools" : "Expand fine angle slider & presets"}
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 2. EXPANDABLE ROTATION & ANGLE CONTROL PANEL */}
      {isExpanded && (
        <div className="mt-2 w-64 p-3 rounded-2xl bg-[#0B1528]/95 backdrop-blur-2xl border border-cyan-500/40 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 text-xs text-white">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
              <Navigation2 className="w-3 h-3 text-cyan-400" />
              <span>Camera Angle & Bearing</span>
            </span>
            <button
              onClick={onResetNorth}
              className="text-[10px] text-rose-400 hover:underline font-bold cursor-pointer"
            >
              Reset North (0°)
            </button>
          </div>

          {/* Smooth Bearing Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Bearing Slider</span>
              <strong className="text-cyan-300">{normalizedHeading}° ({cardinal})</strong>
            </div>
            <input
              type="range"
              min="0"
              max="359"
              value={normalizedHeading}
              onChange={(e) => onHeadingChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>0° N</span>
              <span>90° E</span>
              <span>180° S</span>
              <span>270° W</span>
            </div>
          </div>

          {/* Quick Cardinal Direction Presets */}
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 font-semibold">Cardinal Presets:</div>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              {[
                { label: "N (0°)", deg: 0, color: "hover:border-rose-500 hover:text-rose-300" },
                { label: "E (90°)", deg: 90, color: "hover:border-cyan-500 hover:text-cyan-300" },
                { label: "S (180°)", deg: 180, color: "hover:border-amber-500 hover:text-amber-300" },
                { label: "W (270°)", deg: 270, color: "hover:border-emerald-500 hover:text-emerald-300" },
              ].map((p) => (
                <button
                  key={p.deg}
                  onClick={() => handlePresetHeading(p.deg)}
                  className={`py-1 rounded-xl text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    normalizedHeading === p.deg
                      ? "bg-cyan-500/25 border-cyan-400 text-white shadow"
                      : `bg-[#0F1C30] border-white/10 text-slate-300 ${p.color}`
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fine Tuning Buttons (15° increments) */}
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 font-semibold">Fine Nudge:</div>
            <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
              <button
                onClick={() => handleStepRotate(-15)}
                className="py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
              >
                -15°
              </button>
              <button
                onClick={() => handleStepRotate(-5)}
                className="py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
              >
                -5°
              </button>
              <button
                onClick={() => handleStepRotate(5)}
                className="py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
              >
                +5°
              </button>
              <button
                onClick={() => handleStepRotate(15)}
                className="py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
              >
                +15°
              </button>
            </div>
          </div>

          {/* 3D Oblique Alpine Tilt Levels */}
          <div className="space-y-1 pt-1 border-t border-white/10">
            <div className="text-[10px] text-slate-400 font-semibold">3D Terrain Tilt:</div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {[
                { label: "2D Flat (0°)", val: 0 },
                { label: "Alpine 3D (45°)", val: 45 },
                { label: "Steep Ridge (60°)", val: 60 },
              ].map((t) => (
                <button
                  key={t.val}
                  onClick={() => {
                    playConfirmationBeep();
                    onTiltChange(t.val);
                  }}
                  className={`py-1 px-1 rounded-xl text-[9px] font-bold border transition-all cursor-pointer ${
                    Math.abs(tilt - t.val) < 5
                      ? "bg-amber-500/25 border-amber-400 text-amber-200 shadow"
                      : "bg-[#0F1C30] border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
