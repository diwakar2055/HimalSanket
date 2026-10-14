import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
  VolumeX,
  X,
  Copy,
  Check,
  ChevronRight,
  BookOpen,
  MessageSquare,
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

function formatDistanceDisplay(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return "350m";
  if (meters > 50000) return "> 50 km";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)}m`;
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
  const [activeTab, setActiveTab] = useState<"chat" | "refuges">("chat");
  const [isFullscreenChat, setIsFullscreenChat] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Gemini AI Chat state with rich conversation thread
  const [chatInput, setChatInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: "user" | "ai"; text: string; time: string }>
  >([
    {
      sender: "ai",
      text:
        language === "ne"
          ? `नमस्ते! म हिमालसंकेत सुरक्षा सहायक हुँ। तपाईं ${corridor.name} क्षेत्रमा हुनुहुन्छ। बाटोको अवस्था, नजिकको सुरक्षित ठाउँ वा मौसमबारे केही सोध्न सक्नुहुन्छ।`
          : `Hello! I am your HimalSanket Safety Copilot. You are in the ${corridor.name} corridor. Feel free to ask about trail safety, nearest safe high-ground shelters, or weather conditions.`,
      time: "Just now",
    },
  ]);

  // Auto-scroll chat to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAiThinking]);

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
    const lat = userPosition?.lat || corridor.center?.lat || 28.214;
    const lng = userPosition?.lng || corridor.center?.lng || 85.495;
    const alt = userPosition?.altitude || 2780;

    broadcastSOS({
      name: `Trekker SOS — ${corridor.name}`,
      lat,
      lng,
      altitude: alt,
      detail: `Emergency civilian distress triggered at ${lat.toFixed(4)}°N, ${lng.toFixed(
        4
      )}°E. Altitude: ~${Math.round(alt)}m ASL. Distance to surge: ${formatDistanceDisplay(
        distanceToHazard
      )}.`,
      priority: 98,
      corridorId: corridor.id,
    });

    onTriggerSOS("Emergency SOS Broadcasted to APF Search & Rescue Base!");
    setSosSuccess(true);
    setTimeout(() => setSosSuccess(false), 5000);
  }, [userPosition, corridor, distanceToHazard, broadcastSOS, onTriggerSOS]);

  // Speak AI message out loud
  const handleSpeakMessage = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Copy message
  const handleCopy = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }, []);

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
            {
              sender: "ai",
              text: data.reply || "Stay on high ground and proceed uphill safely.",
              time: "Just now",
            },
          ]);
        } else {
          setChatMessages((p) => [
            ...p,
            {
              sender: "ai",
              text: isDanger
                ? "⚠️ Warning: You are close to the river surge bed. Climb immediately at least 30 meters uphill onto solid granite terraces. Do not cross wooden footbridges."
                : `🟢 Your current position appears safe (~${formatDistanceDisplay(
                    distanceToHazard
                  )} from river bed). Continue monitoring and head toward ${
                    nearestRefuge?.asset?.name || "high ground"
                  }.`,
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
              : `🟢 You are currently in a safe refuge zone (~${formatDistanceDisplay(
                  distanceToHazard
                )}). Keep radio and phone in battery-saving mode.`,
            time: "Just now",
          },
        ]);
      } finally {
        setIsAiThinking(false);
      }
    },
    [
      chatInput,
      isAiThinking,
      corridor,
      userPosition,
      geofenceStatus,
      distanceToHazard,
      activeScenario,
      isDanger,
      nearestRefuge,
      sheetPosition,
    ]
  );

  return (
    <div className="w-full h-full flex flex-col lg:flex-row min-h-0 bg-[#070D18] text-slate-100 overflow-hidden relative">
      {/* 1. INTERACTIVE DRAGGABLE BOTTOM SHEET (Mobile) / SIDEBAR (Desktop) */}
      <MobileBottomSheet
        position={sheetPosition}
        onChangePosition={setSheetPosition}
        title={language === "ne" ? "सुरक्षा ककपाइलट" : "Safety Copilot"}
        badge={
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
              isDanger
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 glow-rose animate-pulse"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 glow-emerald"
            }`}
          >
            {isDanger ? "⚠️ Danger Zone" : "🟢 Safe Haven"}
          </span>
        }
        peekContent={
          <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
            <span>
              Refuge: <strong>{nearestRefuge?.asset.name || "High Ground"}</strong>
            </span>
            <span className="text-emerald-400 font-bold">
              ~{formatDistanceDisplay(nearestRefuge?.distance)}
            </span>
          </div>
        }
      >
        <div className="flex-1 flex flex-col min-h-0 bg-[#0A1224] overflow-hidden">
          {/* COMPACT UNIFIED SAFETY & SOS COMMAND BAR (Saves 200px of height!) */}
          <div className="p-2.5 sm:p-3 bg-[#070D18] border-b border-[#1E293B] flex flex-col gap-2 shrink-0">
            {/* Status & Nearest Refuge Row */}
            <div className="flex items-center justify-between gap-2 text-xs">
              {/* Status Badge */}
              <div
                className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${
                  isDanger
                    ? "bg-rose-950/40 border-rose-500/50 text-rose-300 glow-rose animate-pulse"
                    : "bg-[#0F1B33] border-emerald-500/40 text-emerald-300 glow-emerald"
                }`}
              >
                {isDanger ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>
                  {isDanger
                    ? "DANGER ZONE: CLIMB UPHILL"
                    : `SAFE • ~${formatDistanceDisplay(distanceToHazard)} clear`}
                </span>
              </div>

              {/* Nearest Haven Tag */}
              {nearestRefuge && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0F1B33] border border-white/10 text-[11px] text-slate-300 truncate max-w-[190px]">
                  <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">{nearestRefuge.asset.name}</span>
                  <span className="text-emerald-400 font-mono text-[10px] shrink-0 font-bold">
                    ~{formatDistanceDisplay(nearestRefuge.distance)}
                  </span>
                </div>
              )}
            </div>

            {/* Quick 1-Click SOS Action & Voice Note Row */}
            <div className="flex items-center gap-2">
              {sosSuccess ? (
                <div className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600/30 border border-emerald-500 text-emerald-200 text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>SOS Sent! SAR Squad Notified.</span>
                </div>
              ) : (
                <button
                  onClick={handleConfirmSOS}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 active:scale-98 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all border border-rose-400/40 glow-rose"
                >
                  <Radio className="w-3.5 h-3.5 animate-ping" />
                  <span>1-CLICK SOS DISTRESS</span>
                </button>
              )}

              {/* Voice Note Modal Trigger */}
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="p-1.5 px-2.5 rounded-xl bg-[#16233F] hover:bg-[#1C2C4C] text-cyan-400 border border-[#2A3B5E] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                title="Record Ground Voice Note"
              >
                <Mic className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">Voice Note</span>
              </button>
            </div>
          </div>

          {/* VIEW SUB-TABS: AI Safety Copilot vs Refuge Directory */}
          <div className="px-3 py-1.5 bg-[#090F1D] border-b border-white/5 flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-1 bg-[#0F1B33] p-0.5 rounded-xl border border-white/5">
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "chat"
                    ? "bg-cyan-600 text-white shadow glow-cyan"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                <span>AI Safety Copilot</span>
              </button>
              <button
                onClick={() => setActiveTab("refuges")}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "refuges"
                    ? "bg-cyan-600 text-white shadow glow-cyan"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>Refuge Guide</span>
              </button>
            </div>

            {/* Maximize to Full Reading Mode */}
            {activeTab === "chat" && (
              <button
                onClick={() => setIsFullscreenChat(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#16233F] hover:bg-[#1C2C4C] text-cyan-300 border border-[#2A3B5E] text-[10px] font-bold cursor-pointer transition-all shadow-sm"
                title="Expand to Full Reading View"
              >
                <Maximize2 className="w-3 h-3" />
                <span className="hidden sm:inline">Expand View</span>
              </button>
            )}
          </div>

          {/* TAB 1: FULL-HEIGHT GEMINI AI CHAT & READING WORKSPACE */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col min-h-0 bg-[#0A1224] overflow-hidden">
              {/* Scrollable Messages Container (Now has full available height!) */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0 custom-scrollbar text-xs">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl p-3 leading-relaxed text-xs shadow-md ${
                        msg.sender === "user"
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-sm shadow-cyan-950/40"
                          : "bg-[#111A2E] text-slate-100 border border-white/10 rounded-bl-sm shadow-xl"
                      }`}
                    >
                      <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>

                      {/* AI Response Action Tools (Audio Listen & Copy) */}
                      {msg.sender === "ai" && (
                        <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-white/10 text-[10px] text-[#8CA0BE]">
                          <button
                            onClick={() => handleSpeakMessage(msg.text)}
                            className="flex items-center gap-1 text-cyan-300 hover:text-white cursor-pointer"
                            title="Listen to response out loud"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Listen</span>
                          </button>
                          <span>•</span>
                          <button
                            onClick={() => handleCopy(msg.text, idx)}
                            className="flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer"
                          >
                            {copiedIdx === idx ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedIdx === idx ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-[#64748B] mt-1 px-1 font-mono">{msg.time}</span>
                  </div>
                ))}

                {isAiThinking && (
                  <div className="flex items-center gap-2 text-xs text-cyan-400 p-2.5 rounded-xl bg-[#111A2E]/80 border border-cyan-500/30 w-fit">
                    <Bot className="w-4 h-4 animate-spin text-cyan-400" />
                    <span className="font-mono">Gemini analyzing mountain slope telemetry...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Quick Prompt Stickers */}
              <div className="p-2 bg-[#070D18] border-t border-white/10 flex items-center gap-1.5 overflow-x-auto text-[11px] custom-scrollbar shrink-0">
                <button
                  onClick={() => handleSendChat("Is it safe to walk forward right now?")}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#131F37] hover:bg-[#1C2C4C] text-cyan-300 border border-[#2A3B5E] cursor-pointer transition-colors shadow-sm font-semibold"
                >
                  🚶 Trail safe?
                </button>
                <button
                  onClick={() => handleSendChat("Where is the highest ground near me?")}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#131F37] hover:bg-[#1C2C4C] text-emerald-300 border border-[#2A3B5E] cursor-pointer transition-colors shadow-sm font-semibold"
                >
                  🛡️ High ground?
                </button>
                <button
                  onClick={() => handleSendChat("What is the cloudburst forecast?")}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#131F37] hover:bg-[#1C2C4C] text-sky-300 border border-[#2A3B5E] cursor-pointer transition-colors shadow-sm font-semibold"
                >
                  🌧️ Weather?
                </button>
                <button
                  onClick={() => handleSendChat("खोलामा बाढी आउँदा के गर्ने?")}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#131F37] hover:bg-[#1C2C4C] text-amber-300 border border-[#2A3B5E] cursor-pointer transition-colors shadow-sm font-semibold"
                >
                  🇳🇵 बाढी सुरक्षा?
                </button>
              </div>

              {/* Chat Input Bar */}
              <div className="p-2.5 bg-[#0A1224] border-t border-white/10 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder={
                    language === "ne" ? "सुरक्षा प्रश्न सोध्नुहोस्..." : "Ask safety question..."
                  }
                  className="flex-1 bg-[#131F37] text-xs text-white px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-500 placeholder:text-slate-500 shadow-inner"
                />
                <button
                  onClick={() => handleSendChat()}
                  disabled={!chatInput.trim() || isAiThinking}
                  className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white cursor-pointer transition-all shadow-md glow-cyan"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: REFUGE & TRAIL SAFETY DIRECTORY */}
          {activeTab === "refuges" && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-0 custom-scrollbar text-xs">
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider font-mono">
                Designated Safe Havens in {corridor.name}
              </div>

              {assets
                .filter((a) => a.type === "safeZone")
                .map((refuge, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-[#070D18] border border-white/10 space-y-1 hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{refuge.name}</span>
                      </span>
                      <span className="text-[10px] font-mono text-cyan-300 font-bold">
                        {refuge.elevation}m ASL
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8CA0BE]">{refuge.description || refuge.riskNote}</p>
                    <div className="text-[10px] font-mono text-slate-400 pt-1 flex justify-between">
                      <span>GPS: {refuge.lat.toFixed(4)}°N, {refuge.lng.toFixed(4)}°E</span>
                      <span className="text-emerald-400 font-bold">Solid Granite Ridge</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
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

      {/* 3. EXPANDED / FULLSCREEN CHAT READING MODAL (Spacious Studio View) */}
      {isFullscreenChat && (
        <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="w-full max-w-3xl h-[88vh] bg-[#0A1224] border border-[#2A3B5E] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
            {/* Header */}
            <div className="p-4 bg-[#070D18] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center glow-cyan">
                  <Bot className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>Gemini Safety Copilot • Full Reading Console</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  </h3>
                  <p className="text-xs text-[#8CA0BE] font-mono">
                    {corridor.name} Trail Guidance • Google Cloud Vertex AI
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFullscreenChat(false)}
                className="p-2 rounded-xl text-[#8CA0BE] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages in Large, Readable Typography */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm custom-scrollbar bg-[#070D18]">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    msg.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-sm shadow-md text-sm"
                        : "bg-[#111A2E] text-slate-100 border border-white/10 rounded-bl-sm shadow-xl text-sm leading-relaxed"
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>

                    {msg.sender === "ai" && (
                      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/10 text-xs text-[#8CA0BE]">
                        <button
                          onClick={() => handleSpeakMessage(msg.text)}
                          className="flex items-center gap-1.5 text-cyan-300 hover:text-white cursor-pointer font-bold"
                        >
                          <Volume2 className="w-4 h-4" />
                          <span>Listen Out Loud</span>
                        </button>
                        <span>•</span>
                        <button
                          onClick={() => handleCopy(msg.text, idx)}
                          className="flex items-center gap-1.5 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {copiedIdx === idx ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          <span>{copiedIdx === idx ? "Copied" : "Copy Text"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-[#64748B] mt-1 px-1 font-mono">{msg.time}</span>
                </div>
              ))}
              {isAiThinking && (
                <div className="flex items-center gap-2 text-sm text-cyan-400 p-3 rounded-2xl bg-[#111A2E] border border-cyan-500/30 w-fit">
                  <Bot className="w-4 h-4 animate-spin" />
                  <span>Gemini is synthesizing live trail recommendations...</span>
                </div>
              )}
            </div>

            {/* Input Bar in Modal */}
            <div className="p-3 bg-[#0A1224] border-t border-white/10 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                placeholder="Ask any question about safety, shelters, weather..."
                className="flex-1 bg-[#131F37] text-sm text-white px-4 py-3 rounded-2xl border border-white/10 focus:outline-none focus:border-cyan-500 placeholder:text-slate-500"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={!chatInput.trim() || isAiThinking}
                className="px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm cursor-pointer transition-all shadow-md glow-cyan flex items-center gap-2"
              >
                <span>Send</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

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
              aiClassification: `Detected keywords: ${
                report.hazardKeywords?.join(", ") || "water surge"
              }`,
              corridorId: corridor.id,
            });
            setIsVoiceModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
