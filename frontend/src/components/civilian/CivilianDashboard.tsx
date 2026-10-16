import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ModernHazardMap } from "../map/ModernHazardMap";
import { VoiceRecorderModal } from "../VoiceRecorderModal";
import { MapAsset } from "../../data/hazardMapData";
import { Language } from "../../data/localization";
import { useUserRole } from "../../context/UserRoleContext";
import { playEmergencyChime, playConfirmationBeep } from "../../utils/audioAlert";
import { MarkdownMessage } from "../common/MarkdownMessage";
import { GeminiWebChatWindow } from "./GeminiWebChatWindow";
import {
  Shield,
  AlertTriangle,
  Radio,
  Mic,
  Bot,
  Send,
  MapPin,
  CheckCircle2,
  Volume2,
  Copy,
  Check,
  Crosshair,
  X,
  MessageSquare,
  Maximize2,
  Minimize2,
  Sparkles,
  ArrowRight,
  Map,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { HelicopterIcon } from "../common/HelicopterIcon";

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

function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return "350m";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)}m`;
}

function formatEtaSeconds(seconds: number): string {
  if (seconds <= 0) return "ON-SITE";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins < 10 ? "0" : ""}${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
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
  const {
    broadcastSOS,
    submitFieldDispatch,
    dispatchedTeams,
    userProfile,
    distressBeacons,
  } = useUserRole();

  // Civilian view mode: "map" (Live Map & Shelters) or "chat" (Dedicated Gemini Web Window)
  const [civilianView, setCivilianView] = useState<"map" | "chat">("map");

  // Tab mode for civilian view: "ai" (AI Trail Assistant) or "shelters" (Safe Shelters)
  const [activeTab, setActiveTab] = useState<"ai" | "shelters">("shelters");

  // Chat expansion state for comfortable, immersive guidance reading
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );

  // Active distress beacon created by this civilian session
  const [myActiveBeaconId, setMyActiveBeaconId] = useState<string | number | null>(null);

  // Collapsible state for floating rescue tracking HUD (flight tracker bar mode)
  // Default mode: Collapsed so it only shows the flight tracker progress bar without covering the map
  const [isRescueHudCollapsed, setIsRescueHudCollapsed] = useState(true);

  // Strictly filter: The civilian must ONLY see the rescue team dispatched for them
  const myRescueTeam = useMemo(() => {
    return (
      dispatchedTeams.find((team) => {
        // Direct link to civilian ID
        if (team.civilianId && team.civilianId === userProfile.id) return true;
        // Direct link to current beacon
        if (myActiveBeaconId && String(team.targetBeaconId) === String(myActiveBeaconId)) return true;
        // Linked via beacon ownership
        const targetBeacon = distressBeacons.find((b) => String(b.id) === String(team.targetBeaconId));
        if (targetBeacon && targetBeacon.civilianId === userProfile.id) return true;
        return false;
      }) || null
    );
  }, [dispatchedTeams, userProfile.id, myActiveBeaconId, distressBeacons]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Invalidate and refresh Leaflet canvas whenever chat expands or collapses
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 320);
    return () => clearTimeout(timer);
  }, [isChatExpanded]);

  // Selected shelter to pan map
  const [selectedShelter, setSelectedShelter] = useState<MapAsset | null>(null);

  // SOS state
  const [sosSuccess, setSosSuccess] = useState(false);
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modals & Panels
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<"water" | "crack" | "sound" | "other">("water");
  const [reportNote, setReportNote] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Chatbot State
  const [chatInput, setChatInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: "user" | "ai"; text: string; time: string }>
  >([
    {
      sender: "ai",
      text:
        language === "ne"
          ? `नमस्ते! म हिमालसंकेत सुरक्षा सहायक हुँ। तपाईं ${corridor.name} क्षेत्रमा हुनुहुन्छ। बाटोको अवस्था, नजिकको सुरक्षित ठाउँ वा मौसमबारे केही सोध्न सक्नुहुन्छ।`
          : `Hello! I am your HimalSanket Safety Assistant for ${corridor.name}. I can guide you to high-ground shelters, answer route questions, and help you stay clear of flood surges.`,
      time: "Now",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAiThinking]);

  // Nearest safe shelters
  const safeShelters = useMemo(() => {
    return assets
      .filter((a) => a.type === "safeZone")
      .map((sz) => {
        let dist = 350;
        if (userPosition) {
          dist = Math.round(
            Math.hypot((userPosition.lat - sz.lat) * 111000, (userPosition.lng - sz.lng) * 102000)
          );
        }
        return { ...sz, dist };
      })
      .sort((a, b) => a.dist - b.dist);
  }, [assets, userPosition]);

  const nearestRefuge = safeShelters[0] || null;

  const isDanger =
    geofenceStatus === "DANGER" ||
    (distanceToHazard !== null && distanceToHazard < 150) ||
    waterSurge > 1.5;

  // Handle SOS Broadcast
  const handleConfirmSOS = useCallback(() => {
    playEmergencyChime();
    const lat = userPosition?.lat || corridor.center?.lat || 28.214;
    const lng = userPosition?.lng || corridor.center?.lng || 85.495;
    const alt = userPosition?.altitude || 2780;

    const newBeacon = broadcastSOS({
      name: `Civilian Distress — ${corridor.name} (${formatDistance(distanceToHazard)} from River)`,
      lat,
      lng,
      altitude: alt,
      detail: `Civilian caught near surge path at elevation ~${Math.round(alt)}m ASL. Distance to river: ${formatDistance(distanceToHazard)}. Immediate tactical extraction requested.`,
      priority: 98,
      contact: "+977 9841-892100 (Pasang Sherpa)",
      corridorId: corridor.id,
    });

    setMyActiveBeaconId(newBeacon.id);
    onTriggerSOS("Emergency SOS Broadcasted to APF Search & Rescue Base!");
    setSosSuccess(true);
    setTimeout(() => setSosSuccess(false), 9000);
  }, [userPosition, corridor, distanceToHazard, broadcastSOS, onTriggerSOS]);

  // 3-Second Countdown Safeguard
  const startSosCountdown = useCallback(() => {
    playEmergencyChime();
    setSosCountdown(3);
  }, []);

  const cancelSosCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setSosCountdown(null);
  }, []);

  useEffect(() => {
    if (sosCountdown === null) return;
    if (sosCountdown === 0) {
      handleConfirmSOS();
      setSosCountdown(null);
      return;
    }
    countdownTimerRef.current = setTimeout(() => {
      setSosCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [sosCountdown, handleConfirmSOS]);

  // Handle Quick Hazard Report Submission
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    playConfirmationBeep();
    submitFieldDispatch({
      senderName: "Citizen Report",
      type: reportType,
      note: reportNote || `Hazard observed along ${corridor.name} trail.`,
      lat: userPosition?.lat,
      lng: userPosition?.lng,
      hasVoice: false,
      aiClassification: `Category: ${reportType.toUpperCase()}`,
      corridorId: corridor.id,
    });
    setReportSubmitted(true);
    setTimeout(() => {
      setReportSubmitted(false);
      setIsReportModalOpen(false);
      setReportNote("");
    }, 2000);
  };

  // Chat with Gemini
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
              geofenceStatus: isDanger ? "DANGER" : "SAFE",
              isDanger,
              distanceToHazard,
              activeScenario,
              waterSurge,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setChatMessages((p) => [
            ...p,
            {
              sender: "ai",
              text: data.reply || "Move to higher ground and stay clear of river banks.",
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
                : `🟢 Monitored reach appears normal (~${formatDistance(
                    distanceToHazard
                  )} from river channel). Continue monitoring conditions and identify high ground near ${
                    nearestRefuge?.name || "your location"
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
              ? "⚠️ Warning: River surge risk detected upstream. Climb uphill at least 30m away from canyon gorge!"
              : `🟢 Current position is clear of hazard channels (~${formatDistance(
                  distanceToHazard
                )} buffer). Keep your phone charged.`,
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
    ]
  );

  // Text to Speech
  const handleSpeak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    window.speechSynthesis.speak(u);
  };

  // Copy text
  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (civilianView === "chat") {
    return (
      <GeminiWebChatWindow
        corridor={corridor}
        userPosition={userPosition}
        distanceToHazard={distanceToHazard}
        geofenceStatus={geofenceStatus}
        isDanger={isDanger}
        waterSurge={waterSurge}
        activeScenario={activeScenario}
        language={language}
        onBackToMap={() => setCivilianView("map")}
        onTriggerSOS={onTriggerSOS}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Civilian Top Mode Bar: Clean Segmented Mode Switcher */}
      <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setCivilianView("map")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer bg-zinc-800 text-zinc-100 font-medium shadow-sm"
          >
            <Map className="w-3.5 h-3.5" />
            <span>Interactive Map & Shelters</span>
          </button>

          <button
            onClick={() => {
              playConfirmationBeep();
              setCivilianView("chat");
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-zinc-400 hover:text-zinc-200 font-normal"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span>AI Safety Copilot</span>
          </button>
        </div>

        <div className="text-xs text-zinc-500 hidden sm:flex items-center gap-2">
          <span>Corridor:</span>
          <span className="text-zinc-300 font-medium">{corridor.name}</span>
          <span>•</span>
          <span>{safeShelters.length} Shelters Monitored</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Clean, Focused Civilian Sidebar (~400px) */}
        <aside className="w-full lg:w-[400px] xl:w-[420px] shrink-0 h-full flex flex-col bg-zinc-950 border-r border-zinc-800 overflow-hidden z-10">
          {/* LIVE RESCUE TEAM DISPATCHED BANNER */}
          {myRescueTeam && (
            <div className="p-3.5 border-b border-zinc-800 shrink-0">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span className="text-xs font-mono font-medium text-zinc-200">
                      SAR Rescue Inbound ({myRescueTeam.callSign})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 capitalize">
                    {myRescueTeam.status.replace("_", " ")}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-0.5">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase block">Countdown ETA</span>
                    <span className="text-lg font-bold font-mono text-zinc-100">
                      {formatEtaSeconds(myRescueTeam.etaSeconds)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase block">Remaining</span>
                    <span className="text-xs font-mono text-zinc-300">
                      {formatDistance(myRescueTeam.distanceRemainingMeters)}
                    </span>
                  </div>
                </div>

                <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(5, myRescueTeam.progress * 100))}%` }}
                  />
                </div>

                <div className="pt-1.5 border-t border-zinc-800 text-[10px] text-zinc-400 flex items-center justify-between font-mono">
                  <span className="truncate max-w-[180px]">{myRescueTeam.name}</span>
                  <span>{myRescueTeam.contact}</span>
                </div>
              </div>
            </div>
          )}

          {/* 1. COMPACT SAFETY STATUS BANNER */}
          <div className="p-3.5 border-b border-zinc-800 shrink-0">
            <div
              className={`p-3.5 rounded-xl border transition-colors ${
                isDanger
                  ? "bg-red-950/20 border-red-900/40 text-red-200"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isDanger ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                    }`}
                  />
                  <span className="font-medium text-xs sm:text-sm text-zinc-100">
                    {isDanger
                      ? language === "ne"
                        ? "उच्च जोखिम: सुरक्षित उचाइमा जानुहोस्"
                        : "Hazard Nearby — Move Uphill"
                      : language === "ne"
                      ? "तपाईं सुरक्षित क्षेत्रमा हुनुहुन्छ"
                      : "Normal Valley Conditions"}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">
                  ~{formatDistance(distanceToHazard)} to river
                </span>
              </div>

              <div className="mt-2.5 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="text-zinc-500">Nearest High Ground:</span>
                <span className="text-zinc-200 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{nearestRefuge?.name || "High Terrace"}</span>
                  <span className="text-zinc-400 shrink-0">(~{formatDistance(nearestRefuge?.dist)})</span>
                </span>
              </div>
            </div>
          </div>

          {/* 2. EMERGENCY ACTION BUTTONS */}
          <div className="px-3.5 py-3 border-b border-zinc-800 space-y-2 shrink-0">
            {/* A. SOS Button with 3-Second Safeguard */}
            {sosSuccess ? (
              <div className="p-3 rounded-lg bg-zinc-900 border border-emerald-800/50 text-emerald-300 text-xs font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>SOS Broadcasted! Rescuers notified.</span>
                </div>
              </div>
            ) : sosCountdown !== null ? (
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-red-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-mono text-xs">
                    {sosCountdown}
                  </span>
                  <span>Broadcasting SOS in {sosCountdown}s...</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={cancelSosCountdown}
                    className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      cancelSosCountdown();
                      handleConfirmSOS();
                    }}
                    className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-medium cursor-pointer"
                  >
                    Send Now
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={startSosCountdown}
                className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <Radio className="w-4 h-4" />
                <span>
                  {language === "ne" ? "आपतकालीन उद्धार (SOS) पठाउनुहोस्" : "Send Emergency SOS Alert"}
                </span>
              </button>
            )}

            {/* B. Secondary Action: Report Hazard & Voice Note */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-zinc-100 border border-zinc-800 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
                <span>Report Hazard</span>
              </button>

              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-zinc-100 border border-zinc-800 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Mic className="w-3.5 h-3.5 text-zinc-400" />
                <span>Voice Note</span>
              </button>
            </div>
          </div>

          {/* 4. SAFE SHELTERS DIRECTORY (Full Vertical Space Available!) */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 custom-scrollbar min-h-0 bg-zinc-950">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-300">Safe High-Ground Shelters</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800">
                {safeShelters.length} Available
              </span>
            </div>

            {safeShelters.map((shelter) => {
              const isSelected = selectedShelter?.id === shelter.id;

              return (
                <div
                  key={shelter.id}
                  onClick={() => setSelectedShelter(shelter)}
                  className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-zinc-800/90 border-zinc-600 shadow-sm"
                      : "bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center justify-center shrink-0">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-zinc-200 leading-tight">
                          {shelter.name}
                        </h4>
                        <span className="text-[11px] text-zinc-500">
                          Elevation: {shelter.elevation}m ASL
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-medium text-zinc-300 block">
                        ~{formatDistance(shelter.dist)}
                      </span>
                      <span className="text-[11px] text-zinc-500 block">Uphill</span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    {shelter.description || "Designated high ground evacuation terrace clear of flood surge channels."}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="font-mono">
                      {shelter.lat.toFixed(4)}°N, {shelter.lng.toFixed(4)}°E
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedShelter(shelter);
                      }}
                      className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 cursor-pointer text-xs font-medium transition-colors"
                    >
                      <Crosshair className="w-3 h-3 text-zinc-400" />
                      <span>Locate</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* RIGHT STAGE: Pure, Distraction-Free Modern Map */}
        <main className="flex-1 h-full min-h-[350px] relative bg-zinc-950">
          <ModernHazardMap
            corridor={corridor}
            assets={assets}
            mode="civilian"
            selectedShelter={selectedShelter}
            userPosition={userPosition}
            onLocateMe={onLocateMe}
            isLocating={isLocating}
            simulatedWaterRise={waterSurge}
            dispatchedTeams={dispatchedTeams}
            currentCivilianId={userProfile.id}
            myBeaconId={myActiveBeaconId || (corridor.id === "langtang" ? "sos-101" : undefined)}
            className="w-full h-full"
          />

          {/* FLOATING INBOUND SAR RESCUE TRACKING HUD (COLLAPSIBLE FLIGHT TRACKER) */}
          <AnimatePresence mode="wait">
            {myRescueTeam && (
              isRescueHudCollapsed ? (
                /* COLLAPSED FLIGHT TRACKER MODE: Sleek, calm, minimal pill bar */
                <motion.div
                  key="hud-collapsed"
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  onClick={() => setIsRescueHudCollapsed(false)}
                  className="absolute top-4 left-4 z-[1000] px-3.5 py-2 rounded-full bg-zinc-900/90 hover:bg-zinc-850/95 border border-zinc-800 shadow-xl backdrop-blur-xl text-zinc-100 cursor-pointer flex items-center gap-3 select-none group"
                  title="Click to expand rescue flight details"
                >
                  {/* Callsign + Radar Pulse + Helicopter Icon */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
                    </span>
                    <HelicopterIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-xs font-mono font-medium text-zinc-200">
                      {myRescueTeam.callSign}
                    </span>
                  </div>

                  {/* Center Mini Track */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">Base</span>
                    <div className="w-20 sm:w-28 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-sky-400 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(100, Math.max(5, myRescueTeam.progress * 100))}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">You</span>
                  </div>

                  {/* Right ETA & Expand */}
                  <div className="flex items-center gap-2 shrink-0 pl-1 border-l border-zinc-800 text-xs font-mono">
                    <span className="font-semibold text-zinc-100">
                      {formatEtaSeconds(myRescueTeam.etaSeconds)}
                    </span>
                    <span className="text-zinc-400 hidden sm:inline">
                      ({formatDistance(myRescueTeam.distanceRemainingMeters)})
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                  </div>
                </motion.div>
              ) : (
                /* EXPANDED FULL TELEMETRY MODE: Clean, Calm & Non-stressful */
                <motion.div
                  key="hud-expanded"
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute top-4 left-4 right-4 sm:right-auto sm:w-[380px] z-[1000] p-4 rounded-2xl bg-zinc-900/95 border border-zinc-800 shadow-2xl backdrop-blur-xl text-zinc-100 space-y-3"
                >
                  {/* Header Badge */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                            myRescueTeam.status === "arrived" || myRescueTeam.status === "evacuating"
                              ? "bg-emerald-400 opacity-60"
                              : "bg-sky-400 opacity-60"
                          }`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${
                            myRescueTeam.status === "arrived" || myRescueTeam.status === "evacuating"
                              ? "bg-emerald-400"
                              : "bg-sky-400"
                          }`}></span>
                        </span>
                        <HelicopterIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-medium">
                          Search & Rescue
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700/60">
                          {myRescueTeam.callSign}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-100">
                        {myRescueTeam.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium capitalize ${
                        myRescueTeam.status === "arrived" || myRescueTeam.status === "evacuating"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                      }`}>
                        {myRescueTeam.status.replace("_", " ")}
                      </span>
                      <button
                        onClick={() => setIsRescueHudCollapsed(true)}
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Minimize to flight tracker bar"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metrics Box */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/60">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                        Estimated Arrival
                      </span>
                      <span className="text-xl font-bold font-mono text-zinc-100 tracking-tight block mt-0.5">
                        {formatEtaSeconds(myRescueTeam.etaSeconds)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                        Distance
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-xl font-bold font-mono text-zinc-100">
                          {formatDistance(myRescueTeam.distanceRemainingMeters)}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          @{myRescueTeam.speedKmH}km/h
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Flight Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                      <span className="truncate max-w-[130px]">{myRescueTeam.startBaseName}</span>
                      <span className="text-zinc-400">{Math.round(myRescueTeam.progress * 100)}%</span>
                      <span>Your Location</span>
                    </div>
                    <div className="relative w-full h-1.5 rounded-full bg-zinc-800 overflow-visible">
                      <div
                        className="h-full bg-sky-400 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(100, Math.max(5, myRescueTeam.progress * 100))}%` }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700 ease-out pointer-events-none"
                        style={{ left: `${Math.min(96, Math.max(4, myRescueTeam.progress * 100))}%` }}
                      >
                        <div className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700 shadow-md flex items-center justify-center text-sky-400">
                          <HelicopterIcon className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reassuring Guidance & Radio */}
                  <div className="pt-2 border-t border-zinc-800/60 text-xs text-zinc-400 space-y-1.5">
                    <div className="flex items-start gap-2 text-zinc-400">
                      <Shield className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        Stay on open high ground. Keep clear line-of-sight with sky for helicopter approach.
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-800/40">
                      <span>Radio: <strong className="text-zinc-300 font-semibold">{myRescueTeam.contact}</strong></span>
                      <span>Signal: Bright clothing / light</span>
                    </div>
                  </div>

                  {/* Explicit Collapse Action Button */}
                  <button
                    onClick={() => setIsRescueHudCollapsed(true)}
                    className="w-full mt-2 py-1.5 px-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-800"
                    title="Collapse to minimal flight tracker bar"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Collapse to Flight Tracker Bar</span>
                  </button>
                </motion.div>
              )
            )}
          </AnimatePresence>

          {/* Minimal Floating Action Pill to Open AI Safety Copilot */}
          <button
            onClick={() => {
              playConfirmationBeep();
              setCivilianView("chat");
            }}
            className="absolute bottom-6 right-6 z-[1000] px-4 py-2.5 rounded-full bg-zinc-900/95 hover:bg-zinc-850 border border-zinc-700/80 text-zinc-100 font-medium text-xs shadow-lg flex items-center gap-2 cursor-pointer backdrop-blur-md transition-colors"
          >
            <Sparkles className="w-4 h-4 text-zinc-300" />
            <span>AI Safety Copilot</span>
          </button>
        </main>
      </div>

      {/* CITIZEN HAZARD REPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-5 text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-zinc-400" />
                <h3 className="font-semibold text-sm">Report Trail Hazard</h3>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSubmitted ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-semibold text-sm text-zinc-100">Report Submitted</h4>
                <p className="text-xs text-zinc-400">
                  Transmitted to APF Search & Rescue and NDRRMA operations center.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 mb-1.5 font-medium">Hazard Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "water", label: "River Surge / High Water" },
                      { id: "crack", label: "Landslide / Ground Crack" },
                      { id: "sound", label: "Rockfall / Rumbling Sound" },
                      { id: "other", label: "Bridge / Trail Damage" },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setReportType(opt.id as any)}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                          reportType === opt.id
                            ? "bg-zinc-800 border-zinc-600 text-zinc-100 font-medium"
                            : "bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1.5 font-medium">
                    Description (Optional)
                  </label>
                  <textarea
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder="Describe what you see (e.g. muddy water surging, bridge impassable)..."
                    rows={3}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs cursor-pointer transition-colors shadow-sm"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* VOICE RECORDER MODAL */}
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
              aiClassification: `Keywords: ${report.hazardKeywords?.join(", ") || "water surge"}`,
              corridorId: corridor.id,
            });
            setIsVoiceModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
