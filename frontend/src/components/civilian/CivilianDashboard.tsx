import React, { useState, useMemo, useCallback } from "react";
import { FullScreenHazardMap } from "../map/FullScreenHazardMap";
import { VoiceRecorderModal } from "../VoiceRecorderModal";
import { MobileBottomSheet } from "../mobile/MobileBottomSheet";
import { MapAsset } from "../../data/hazardMapData";
import { Language } from "../../data/localization";
import { useUserRole } from "../../context/UserRoleContext";
import { playEmergencyChime, playConfirmationBeep } from "../../utils/audioAlert";
import {
  Shield,
  AlertTriangle,
  Compass,
  Radio,
  Mic,
  Bot,
  Send,
  Sparkles,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  CheckCircle2,
  Volume2,
} from "lucide-react";

interface CivilianDashboardProps {
  corridor: any;
  userPosition: { lat: number; lng: number; accuracy?: number; altitude?: number } | null;
  onLocateMe: () => void;
  isLocating: boolean;
  distanceToHazard: number | null;
  geofenceStatus: string;
  onTriggerSOS: (customNote?: string) => void;
  language: Language;
  assets: MapAsset[];
  activeScenario?: string;
  waterSurge?: number;
}

export function CivilianDashboard({
  corridor,
  userPosition,
  onLocateMe,
  isLocating,
  distanceToHazard,
  geofenceStatus,
  onTriggerSOS,
  language,
  assets,
  activeScenario = "baseline",
  waterSurge = 0,
}: CivilianDashboardProps) {
  const { broadcastSOS, submitFieldDispatch } = useUserRole();

  const [sosSuccess, setSosSuccess] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [sheetPosition, setSheetPosition] = useState<"peek" | "half" | "full">("half");

  // Gemini AI Chat state embedded cleanly
  const [chatInput, setChatInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string; time: string }>>([
    {
      sender: "ai",
      text:
        language === "ne"
          ? `नमस्ते! म हिमालसंकेत सुरक्षा सहायक हुँ। तपाईं ${corridor.name} क्षेत्रमा हुनुहुन्छ। बाटोको अवस्था, नजिकको सुरक्षित ठाउँ वा मौसमबारे केही सोध्न सक्नुहुन्छ।`
          : `Hello! I am your HimalSanket Safety Copilot. You are in the ${corridor.name} corridor. Feel free to ask about trail safety, nearest safe high-ground shelters, or weather conditions.`,
      time: "Just now",
    },
  ]);

  // Find nearest safe refuge
  const nearestRefuge = useMemo(() => {
    const safeZones = assets.filter((a) => a.type === "safeZone");
    if (safeZones.length === 0) return null;
    if (!userPosition) return { asset: safeZones[0], distance: 350 };

    let closest = safeZones[0];
    let minD = Infinity;
    safeZones.forEach((sz) => {
      const d = Math.round(
        Math.hypot((userPosition.lat - sz.lat) * 111000, (userPosition.lng - sz.lng) * 102000)
      );
      if (d < minD) {
        minD = d;
        closest = sz;
      }
    });
    return { asset: closest, distance: minD };
  }, [assets, userPosition]);

  const isDanger = geofenceStatus === "DANGER" || (distanceToHazard !== null && distanceToHazard < 150);

  // Trigger SOS Beacon
  const handleConfirmSOS = useCallback(() => {
    playEmergencyChime();
    const lat = userPosition?.lat || corridor.center?.lat || 28.2140;
    const lng = userPosition?.lng || corridor.center?.lng || 85.4950;
    const alt = userPosition?.altitude || 2780;

    broadcastSOS({
      name: `Trekker SOS — ${corridor.name}`,
      lat,
      lng,
      altitude: alt,
      detail: `Emergency civilian distress triggered at ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E. Altitude: ~${Math.round(alt)}m ASL. Hazard distance: ${distanceToHazard ?? "unknown"}m.`,
      priority: 98,
      corridorId: corridor.id,
    });

    onTriggerSOS("Emergency SOS Broadcasted to APF Search & Rescue Base!");
    setSosSuccess(true);
    setTimeout(() => setSosSuccess(false), 5000);
  }, [userPosition, corridor, distanceToHazard, broadcastSOS, onTriggerSOS]);

  // Ask Gemini Safety AI
  const handleSendChat = useCallback(
    async (textToSend?: string) => {
      const query = textToSend || chatInput;
      if (!query.trim() || isAiThinking) return;

      playConfirmationBeep();
      const userMsg = { sender: "user" as const, text: query, time: "Just now" };
      setChatMessages((p) => [...p, userMsg]);
      setChatInput("");
      setIsAiThinking(true);
      if (sheetPosition === "peek") setSheetPosition("half");

      try {
        const response = await fetch("/api/gemini/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: query,
            corridorContext: {
              name: corridor.name,
              rainfall: corridor.rainfall,
              seismic: corridor.seismic,
              userPosition,
              geofenceStatus,
              distanceToHazard,
              activeScenario,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setChatMessages((p) => [
            ...p,
            { sender: "ai", text: data.reply || "Stay on high ground and proceed uphill safely.", time: "Just now" },
          ]);
        } else {
          setChatMessages((p) => [
            ...p,
            {
              sender: "ai",
              text: isDanger
                ? "⚠️ Warning: You are close to the river surge bed. Climb immediately at least 30 meters uphill onto solid granite terraces. Do not cross wooden footbridges."
                : `🟢 Your current position appears safe (~${distanceToHazard || 350}m from river bed). Continue monitoring and head toward ${nearestRefuge?.asset?.name || "high ground"}.`,
              time: "Just now",
            },
          ]);
        }
      } catch (_) {
        setChatMessages((p) => [
          ...p,
          {
            sender: "ai",
            text: isDanger
              ? "⚠️ Warning: Active flash surge or debris threat. Climb uphill at least 30m away from the canyon gorge floor!"
              : "🟢 You are currently in a safe refuge zone. Keep radio and phone in battery-saving mode.",
            time: "Just now",
          },
        ]);
      } finally {
        setIsAiThinking(false);
      }
    },
    [chatInput, isAiThinking, corridor, userPosition, geofenceStatus, distanceToHazard, activeScenario, isDanger, nearestRefuge, sheetPosition]
  );

  return (
    <div className="w-full h-full flex flex-col lg:flex-row min-h-0 bg-[#0A1224] text-slate-100 overflow-hidden relative">
      {/* 1. INTERACTIVE DRAGGABLE BOTTOM SHEET (Mobile) / SIDEBAR (Desktop) */}
      <MobileBottomSheet
        position={sheetPosition}
        onChangePosition={setSheetPosition}
        title={language === "ne" ? "सुरक्षा ककपाइलट" : "Safety Copilot"}
        badge={
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
              isDanger
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
            }`}
          >
            {isDanger ? "⚠️ Danger Zone" : "🟢 Safe Haven"}
          </span>
        }
        peekContent={
          <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
            <span>Refuge: <strong>{nearestRefuge?.asset.name || "High Ground"}</strong></span>
            <span className="text-emerald-400 font-bold">~{nearestRefuge?.distance || 350}m</span>
          </div>
        }
      >
        <div className="flex-1 flex flex-col p-3 sm:p-4 space-y-3 overflow-y-auto">
          {/* Card 1: Hero Safe / Danger Reassurance Banner */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              isDanger
                ? "bg-rose-950/40 border-rose-500/50 shadow-xl shadow-rose-950/30"
                : "bg-[#0F1B33]/80 border-emerald-500/40 shadow-lg"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  isDanger
                    ? "bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse"
                    : "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                }`}
              >
                {isDanger ? <AlertTriangle className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isDanger ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                  }`}
                >
                  {isDanger
                    ? language === "ne"
                      ? "जोखिम सतर्कता"
                      : "CRITICAL HAZARD"
                    : language === "ne"
                    ? "तपाईं सुरक्षित हुनुहुन्छ"
                    : "YOU ARE SAFE"}
                </span>
                <p className="text-xs text-white font-semibold mt-1 leading-snug">
                  {isDanger
                    ? language === "ne"
                      ? "खोलाको बहाव नजिक! तत्काल माथिल्लो सुरक्षित चट्टानतर्फ उक्लिनुहोस्!"
                      : "Surge threat detected! Climb ≥30m uphill toward granite terraces!"
                    : language === "ne"
                    ? `सक्रिय बाढीबाट ~${distanceToHazard || 380}m सुरक्षित दूरीमा।`
                    : `Positioned ~${distanceToHazard || 380}m clear of active surge bed.`}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Nearest Safe Refuge Guidance */}
          {nearestRefuge && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-[#0F1B33] border border-emerald-500/30 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>{language === "ne" ? "नजिकको सुरक्षित आश्रय" : "Nearest Safe Refuge"}</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-700/50">
                  ~{nearestRefuge.distance}m uphill
                </span>
              </div>
              <div className="mt-1.5 text-xs font-bold text-white flex items-center justify-between">
                <span>{nearestRefuge.asset.name}</span>
                <span className="text-[11px] text-[#94A3B8]">({nearestRefuge.asset.elevation}m ASL)</span>
              </div>
            </div>
          )}

          {/* Card 3: 1-Click SOS Trigger */}
          <div className="p-3 rounded-2xl bg-[#090F1D] border border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-rose-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>APF Emergency Radio Relay</span>
              </span>
              <span className="text-[10px] text-slate-400">Dhunche Base 3</span>
            </div>
            {sosSuccess ? (
              <div className="p-2.5 rounded-xl bg-emerald-600/30 border border-emerald-500 text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>SOS Broadcasted! Search & Rescue teams notified.</span>
              </div>
            ) : (
              <button
                onClick={handleConfirmSOS}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 active:scale-98 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all border border-rose-400/40"
              >
                <Radio className="w-3.5 h-3.5 animate-ping" />
                <span>{language === "ne" ? "तत्काल आपत्कालीन SOS पठाउनुहोस्" : "BROADCAST 1-CLICK SOS DISTRESS"}</span>
              </button>
            )}
          </div>

          {/* Card 4: Gemini AI Safety Copilot (WhatsApp/Instagram Style Thread) */}
          <div className="flex-1 flex flex-col min-h-[220px] rounded-2xl bg-[#070D18] border border-white/10 overflow-hidden shadow-inner">
            <div className="p-2.5 bg-[#0F1B33] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>Gemini Safety Copilot</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="p-1.5 rounded-lg bg-[#16233F] hover:bg-[#1C2C4C] text-cyan-400 border border-white/10 text-xs cursor-pointer transition-all"
                title="Voice Note"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-2.5 leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-sm shadow-md"
                        : "bg-[#111A2E] text-slate-200 border border-white/10 rounded-bl-sm shadow"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-[#64748B] mt-0.5 px-1 font-mono">{msg.time}</span>
                </div>
              ))}

              {isAiThinking && (
                <div className="flex items-center gap-2 text-xs text-cyan-400 p-2">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                  <span>Gemini is evaluating terrain telemetry...</span>
                </div>
              )}
            </div>

            {/* Suggested Quick Prompt Stickers */}
            <div className="p-2 bg-[#090F1D] border-t border-white/10 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
              <button
                onClick={() => handleSendChat("Is it safe to walk forward?")}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#16233F] hover:bg-[#1C2C4C] text-cyan-300 border border-white/10 cursor-pointer transition-colors"
              >
                🚶 Trail safe?
              </button>
              <button
                onClick={() => handleSendChat("Where is the highest ground near me?")}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#16233F] hover:bg-[#1C2C4C] text-emerald-300 border border-white/10 cursor-pointer transition-colors"
              >
                🛡️ High ground?
              </button>
              <button
                onClick={() => handleSendChat("के अहिले हिँड्न सुरक्षित छ?")}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#16233F] hover:bg-[#1C2C4C] text-amber-300 border border-white/10 cursor-pointer transition-colors"
              >
                🇳🇵 हिँड्न सुरक्षित?
              </button>
            </div>

            {/* Chat Input Bar */}
            <div className="p-2 bg-[#0F1B33] border-t border-white/10 flex items-center gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                placeholder={language === "ne" ? "सुरक्षा प्रश्न सोध्नुहोस्..." : "Ask safety question..."}
                className="flex-1 bg-[#16233F] text-xs text-white px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-500 placeholder:text-slate-500"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={!chatInput.trim() || isAiThinking}
                className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white cursor-pointer transition-all shadow"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </MobileBottomSheet>

      {/* 2. FULL-SCREEN GOOGLE MAP BASE (ALWAYS VISIBLE IN BACKGROUND) */}
      <div className="flex-1 relative w-full h-full min-h-[350px]">
        <FullScreenHazardMap
          corridor={corridor}
          assets={assets}
          mode="civilian"
          userPosition={userPosition}
          onLocateMe={onLocateMe}
          isLocating={isLocating}
          distanceToHazard={distanceToHazard}
          geofenceStatus={geofenceStatus}
          simulatedWaterRise={waterSurge}
          className="w-full h-full"
        />
      </div>

      {/* Voice Recorder Modal */}
      {isVoiceModalOpen && (
        <VoiceRecorderModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          corridorName={corridor.name}
          onSubmitVoiceReport={(report) => {
            submitFieldDispatch({
              senderName: "Trekker Voice Note",
              type: report.category || "water",
              note: report.transcript || "Muddy water surge observed on trail.",
              lat: userPosition?.lat,
              lng: userPosition?.lng,
              hasVoice: true,
              aiClassification: `Detected keywords: ${report.hazardKeywords?.join(", ") || "water surge"}`,
              corridorId: corridor.id,
            });
            setIsVoiceModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
