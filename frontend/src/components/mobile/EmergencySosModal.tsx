import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { playEmergencyChime, playConfirmationBeep } from "../../utils/audioAlert";
import {
  Radio,
  AlertTriangle,
  X,
  CheckCircle2,
  PhoneCall,
  Satellite,
  Compass,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface EmergencySosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSOS: (customNote?: string) => void;
  userPosition?: { lat: number; lng: number; altitude?: number } | null;
  corridorName: string;
}

export function EmergencySosModal({
  isOpen,
  onClose,
  onConfirmSOS,
  userPosition,
  corridorName,
}: EmergencySosModalProps) {
  const [countdown, setCountdown] = useState<number>(3);
  const [isCounting, setIsCounting] = useState<boolean>(true);
  const [isSent, setIsSent] = useState<boolean>(false);
  const [incidentType, setIncidentType] = useState<string>("Flash Flood / Trapped on Riverbed");

  useEffect(() => {
    if (!isOpen) {
      setCountdown(3);
      setIsCounting(true);
      setIsSent(false);
      return;
    }

    playEmergencyChime();

    let timer: NodeJS.Timeout;
    if (isCounting && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((p) => p - 1);
      }, 1000);
    } else if (isCounting && countdown === 0) {
      handleTriggerEmergency();
    }

    return () => clearTimeout(timer);
  }, [isOpen, isCounting, countdown]);

  const handleTriggerEmergency = () => {
    setIsCounting(false);
    setIsSent(true);
    playEmergencyChime();
    onConfirmSOS(`Emergency SOS: ${incidentType}`);
  };

  const handleCancelCountdown = () => {
    setIsCounting(false);
    playConfirmationBeep();
    onClose();
  };

  if (!isOpen) return null;

  const lat = userPosition?.lat || 28.2140;
  const lng = userPosition?.lng || 85.4950;
  const alt = Math.round(userPosition?.altitude || 2780);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xl">
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full sm:max-w-md bg-[#101A2A] border-t sm:border border-[#27364B] rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl text-white relative overflow-hidden"
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close / Cancel Button */}
          <button
            onClick={handleCancelCountdown}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {!isSent ? (
            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              {/* Apple Emergency SOS Radar Animation */}
              <div className="relative flex items-center justify-center my-2">
                <span className="absolute w-28 h-28 rounded-full bg-rose-600/30 animate-ping" />
                <span className="absolute w-20 h-20 rounded-full bg-rose-600/40 animate-pulse" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-red-700 flex items-center justify-center shadow-xl shadow-rose-600/50 border-2 border-white">
                  <span className="text-2xl font-black">{countdown}</span>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center justify-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  <span>Emergency SOS Beacon</span>
                </h2>
                <p className="text-xs text-rose-300 font-medium mt-1">
                  Transmitting distress beacon in <strong>{countdown} seconds</strong>
                </p>
              </div>

              {/* Satellite Transmission Uplink Telemetry */}
              <div className="w-full bg-[#090F1D] border border-white/10 rounded-2xl p-3 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400 border-b border-white/10 pb-1.5 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Satellite className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Satellite & Radio Relay</span>
                  </span>
                  <span className="text-emerald-400 font-bold uppercase text-[9px] bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Online
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 block text-[9px]">CORRIDOR</span>
                    <strong className="text-white">{corridorName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">GPS COORDINATES</span>
                    <strong className="text-cyan-300">
                      {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">ALTITUDE</span>
                    <strong className="text-white">{alt}m ASL</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">DESPATCH BASE</span>
                    <strong className="text-amber-300">APF Base 3 (Dhunche)</strong>
                  </div>
                </div>
              </div>

              {/* Incident Type Selector */}
              <div className="w-full text-left space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Emergency Nature
                </label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full bg-[#16233F] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="Flash Flood / Trapped on Riverbed">Flash Flood / Trapped on Riverbed</option>
                  <option value="Active Landslide / Trail Blocked">Active Landslide / Trail Blocked</option>
                  <option value="Medical Emergency / Injured Trekker">Medical Emergency / Injured Trekker</option>
                  <option value="Hypothermia / Severe High Altitude Sickness">Hypothermia / Severe Altitude</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex gap-3 pt-2">
                <button
                  onClick={handleCancelCountdown}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold rounded-2xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTriggerEmergency}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-rose-600/40 transition-all cursor-pointer active:scale-95"
                >
                  Send Immediately
                </button>
              </div>
            </div>
          ) : (
            /* Broadcast Success View */
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">Emergency SOS Broadcasted!</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                  Your coordinates and incident report have been received by Armed Police Force (APF) and Nepal Army Mountain Rescue Post.
                </p>
              </div>

              <div className="w-full p-3 rounded-2xl bg-[#090F1D] border border-emerald-500/30 text-xs space-y-1.5 text-left">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Incident Ticket:</span>
                  <span className="font-mono font-bold text-cyan-300">#SOS-{Date.now().toString().slice(-4)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Estimated Staging Response:</span>
                  <span className="font-bold text-amber-300">~15–25 mins (Air/Ground Squad)</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Survival Action:</span>
                  <span className="font-bold text-emerald-300">Stay on high granite ground!</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl shadow-lg cursor-pointer transition-all"
              >
                Return to Live Map & Refuge Route
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
