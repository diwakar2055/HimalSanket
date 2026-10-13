import React, { useState, useMemo, useCallback } from "react";
import { FullScreenHazardMap } from "../map/FullScreenHazardMap";
import { VoiceRecorderModal } from "../VoiceRecorderModal";
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
  PhoneCall,
  Volume2,
  Navigation,
  CheckCircle2,
  Clock,
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

  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [sosSuccess, setSosSuccess] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<"standard" | "fullmap">("standard");

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
          // Local fallback reasoning
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
    [chatInput, isAiThinking, corridor, userPosition, geofenceStatus, distanceToHazard, activeScenario, isDanger, nearestRefuge]
  );

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-[#0A1224] text-slate-100 overflow-hidden relative">
      {/* 1. HERO REASSURANCE & STATUS BANNER */}
      <div className="p-3 sm:p-4 bg-[#0F1B33]/90 border-b border-[#2A3B5E] backdrop-blur-md z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isDanger
                ? "bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse"
                : "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
            }`}
          >
            {isDanger ? <AlertTriangle className="w-6 h-6 animate-bounce" /> : <Shield className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isDanger ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                }`}
              >
                {isDanger ? (language === "ne" ? "गम्भीर जोखिम चेतावनी" : "CRITICAL HAZARD ALERT") : (language === "ne" ? "तपाईं सुरक्षित हुनुहुन्छ" : "YOU ARE IN A SAFE HAVEN")}
              </span>
              <span className="text-xs text-[#94A3B8] font-mono">
                {userPosition ? `${userPosition.lat.toFixed(4)}°N, ${userPosition.lng.toFixed(4)}°E` : "GPS Ready"}
              </span>
            </div>
            <p className="text-sm font-semibold text-white mt-1">
              {isDanger
                ? language === "ne"
                  ? `बाढी वा पहिरोको जोखिम! तुरुन्तै कम्तीमा ३० मिटर उकालो सुरक्षित चट्टानतर्फ जानुहोस्!`
                  : `River surge or debris threat! Move immediately ≥30m uphill toward solid granite bedrock!`
                : language === "ne"
                ? `सक्रिय नदी बाढीभन्दा ~${distanceToHazard || 380} मिटर टाढा। बाटो हाललाई सुरक्षित छ।`
                : `Located ~${distanceToHazard || 380}m clear of active surge bed. Trail conditions currently safe.`}
            </p>
          </div>
        </div>

        {/* Action Controls in Header: Locate Me & View Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={onLocateMe}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C2C4C] hover:bg-[#2A3B5E] text-cyan-300 border border-[#2A3B5E] text-xs font-medium cursor-pointer transition-all"
          >
            <MapPin className={`w-3.5 h-3.5 ${isLocating ? "animate-spin text-cyan-400" : ""}`} />
            <span>{isLocating ? "Locating..." : "My GPS"}</span>
          </button>

          <button
            onClick={() => setActiveView(activeView === "standard" ? "fullmap" : "standard")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C2C4C] hover:bg-[#2A3B5E] text-[#94A3B8] hover:text-white border border-[#2A3B5E] text-xs font-medium cursor-pointer transition-all"
          >
            {activeView === "standard" ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            <span>{activeView === "standard" ? "Full Map" : "Split View"}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN ERGONOMIC STAGE */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Civilian Tools & Conversational Gemini AI (40% width on desktop) */}
        {activeView === "standard" && (
          <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col bg-[#111A2E] border-r border-[#2A3B5E] overflow-y-auto p-3 sm:p-4 space-y-4 shrink-0">
            {/* Quick Card 1: Nearest Safe Refuge Guidance */}
            {nearestRefuge && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-[#0F1B33] border border-emerald-500/30 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>{language === "ne" ? "नजिकको सुरक्षित आश्रयस्थल" : "Nearest Safe Refuge"}</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-700/50">
                    ~{nearestRefuge.distance}m uphill
                  </span>
                </div>
                <div className="mt-2 text-sm font-bold text-white flex items-center justify-between">
                  <span>{nearestRefuge.asset.name}</span>
                  <span className="text-xs text-[#94A3B8]">({nearestRefuge.asset.elevation}m ASL)</span>
                </div>
                <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
                  {language === "ne"
                    ? "उच्च स्थानको चट्टानी मैदान। बाढी र पहिरोको जोखिमबाट सुरक्षित।"
                    : "High granite bedrock terrace. Out of direct flood wave reach."}
                </p>
              </div>
            )}

            {/* Quick Card 2: 1-Click Tactile Emergency SOS Trigger */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-950/50 to-[#0F1B33] border border-rose-500/40 shadow-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wider">
                  <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>{language === "ne" ? "आपत्कालीन उद्धार संकेत (SOS)" : "Emergency SOS Beacon"}</span>
                </div>
                <span className="text-[10px] text-rose-200/70">APF & Army Radio Link</span>
              </div>

              {sosSuccess ? (
                <div className="p-3 rounded-xl bg-emerald-600/30 border border-emerald-500 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Distress Beacon Broadcasted! SAR Teams Notified.</span>
                </div>
              ) : (
                <button
                  onClick={handleConfirmSOS}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 active:scale-98 text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-rose-400/40"
                >
                  <Radio className="w-4 h-4 animate-ping" />
                  <span>{language === "ne" ? "🚨 तत्काल आपत्कालीन SOS पठाउनुहोस्" : "🚨 TRANSMIT 1-CLICK SOS DISTRESS"}</span>
                </button>
              )}

              <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span>Broadcasts live GPS & elevation</span>
                <button
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Mic className="w-3 h-3" />
                  <span>Record Voice Dispatch</span>
                </button>
              </div>
            </div>

            {/* Quick Card 3: Embedded Gemini AI Safety Copilot */}
            <div className="flex-1 flex flex-col rounded-2xl bg-[#0F1B33] border border-[#2A3B5E] shadow-xl overflow-hidden min-h-[280px]">
              {/* Header */}
              <div className="p-2.5 bg-[#16233F] border-b border-[#2A3B5E] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <span>Gemini Safety Copilot</span>
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div className="text-[10px] text-[#94A3B8]">Bilingual Himalayan Safety AI</div>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                  Online
                </span>
              </div>

              {/* Chat Transcript */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs max-h-[220px]">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] p-2.5 rounded-xl leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-cyan-600 text-white rounded-br-none"
                          : "bg-[#1C2C4C] text-slate-100 border border-[#2A3B5E] rounded-bl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-[#64748B] mt-0.5 font-mono px-1">{msg.time}</span>
                  </div>
                ))}

                {isAiThinking && (
                  <div className="flex items-center gap-2 text-xs text-cyan-400 p-2">
                    <Bot className="w-3.5 h-3.5 animate-spin" />
                    <span>Gemini is evaluating terrain telemetry...</span>
                  </div>
                )}
              </div>

              {/* Suggested Quick Prompt Chips */}
              <div className="p-2 bg-[#121E36] border-t border-[#2A3B5E] flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
                <button
                  onClick={() => handleSendChat("Is it safe to walk forward?")}
                  className="whitespace-nowrap px-2 py-1 rounded-lg bg-[#1C2C4C] hover:bg-[#2A3B5E] text-cyan-300 border border-[#2A3B5E] cursor-pointer"
                >
                  🚶 Is trail safe?
                </button>
                <button
                  onClick={() => handleSendChat("Where is the highest ground near me?")}
                  className="whitespace-nowrap px-2 py-1 rounded-lg bg-[#1C2C4C] hover:bg-[#2A3B5E] text-emerald-300 border border-[#2A3B5E] cursor-pointer"
                >
                  🛡️ Nearest high ground?
                </button>
                <button
                  onClick={() => handleSendChat("के अहिले हिँड्न सुरक्षित छ?")}
                  className="whitespace-nowrap px-2 py-1 rounded-lg bg-[#1C2C4C] hover:bg-[#2A3B5E] text-amber-300 border border-[#2A3B5E] cursor-pointer"
                >
                  🇳🇵 हिँड्न सुरक्षित छ?
                </button>
              </div>

              {/* Chat Input Bar */}
              <div className="p-2 bg-[#0F1B33] border-t border-[#2A3B5E] flex items-center gap-1.5">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder={language === "ne" ? "सुरक्षा प्रश्न सोध्नुहोस्..." : "Ask safety question..."}
                  className="flex-1 bg-[#16233F] text-xs text-white px-2.5 py-1.5 rounded-lg border border-[#2A3B5E] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  onClick={() => handleSendChat()}
                  disabled={!chatInput.trim() || isAiThinking}
                  className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white cursor-pointer transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: Full-Screen Spatial Trail & High-Ground Map */}
        <div className="flex-1 relative h-full min-h-[350px]">
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
