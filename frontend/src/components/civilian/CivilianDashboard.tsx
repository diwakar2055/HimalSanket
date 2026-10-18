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
  ChevronRight,
  Mountain,
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
  mobileTab?: "shelters" | "map";
  onMobileTabChange?: (tab: "shelters" | "map") => void;
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
  mobileTab: externalMobileTab,
  onMobileTabChange,
}: CivilianDashboardProps) {
  const [internalMobileTab, setInternalMobileTab] = useState<"shelters" | "map">("shelters");
  const mobileTab = externalMobileTab ?? internalMobileTab;
  const setMobileTab = (tab: "shelters" | "map") => {
    setInternalMobileTab(tab);
    onMobileTabChange?.(tab);
  };

  const {
    broadcastSOS,
    cancelSOS,
    activeCivilianBeaconId,
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

  // Active distress beacon for this civilian (persisted across tab switches in UserRoleContext)
  const activeBeacon = useMemo(() => {
    if (activeCivilianBeaconId) {
      const found = distressBeacons.find((b) => String(b.id) === String(activeCivilianBeaconId));
      if (found && found.status !== "rescued") return found;
    }
    // Fallback: check if there is an active distress beacon in this corridor owned by civilian
    const userBeacon = distressBeacons.find(
      (b) =>
        (!b.corridorId || b.corridorId === corridor.id) &&
        b.civilianId === userProfile.id &&
        b.status !== "rescued"
    );
    return userBeacon || null;
  }, [distressBeacons, activeCivilianBeaconId, corridor.id, userProfile.id]);

  // Strictly filter: The civilian must see the rescue team dispatched for them or in their corridor
  const myRescueTeam = useMemo(() => {
    return (
      dispatchedTeams.find((team) => {
        // Direct link to active beacon
        if (activeBeacon && String(team.targetBeaconId) === String(activeBeacon.id)) return true;
        if (activeCivilianBeaconId && String(team.targetBeaconId) === String(activeCivilianBeaconId)) return true;
        // Direct link to civilian ID
        if (team.civilianId && team.civilianId === userProfile.id) return true;
        // Linked via beacon ownership
        const targetBeacon = distressBeacons.find((b) => String(b.id) === String(team.targetBeaconId));
        if (targetBeacon && targetBeacon.civilianId === userProfile.id) return true;
        // Or if responding in current corridor and not completed
        if ((!team.corridorId || team.corridorId === corridor.id) && team.status !== "completed") return true;
        return false;
      }) || null
    );
  }, [dispatchedTeams, userProfile.id, activeCivilianBeaconId, activeBeacon, distressBeacons, corridor.id]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Trigger window resize event to refresh map layout whenever chat expands or collapses
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
    waterSurge >= 1.5 ||
    (waterSurge >= 0.5 && distanceToHazard !== null && distanceToHazard < (25 + waterSurge * 40));

  // Handle SOS Broadcast
  const handleConfirmSOS = useCallback(() => {
    playEmergencyChime();
    const lat = userPosition?.lat || corridor.center?.lat || 28.214;
    const lng = userPosition?.lng || corridor.center?.lng || 85.495;
    const alt = userPosition?.altitude || 2780;

    broadcastSOS({
      name: `Civilian Distress — ${corridor.name} (${formatDistance(distanceToHazard)} from River)`,
      lat,
      lng,
      altitude: alt,
      detail: `Civilian caught near surge path at elevation ~${Math.round(alt)}m ASL. Distance to river: ${formatDistance(distanceToHazard)}. Immediate tactical extraction requested.`,
      priority: 98,
      contact: "+977 9841-892100 (Pasang Sherpa)",
      corridorId: corridor.id,
    });

    onTriggerSOS("Emergency SOS Broadcasted to APF Search & Rescue Base!");
    setSosSuccess(true);
    setTimeout(() => setSosSuccess(false), 9000);
  }, [userPosition, corridor, distanceToHazard, broadcastSOS, onTriggerSOS]);

  // Handle Cancel SOS
  const handleCancelSOS = useCallback(() => {
    playConfirmationBeep();
    cancelSOS(activeBeacon?.id || activeCivilianBeaconId || undefined);
    setSosSuccess(false);
  }, [cancelSOS, activeBeacon, activeCivilianBeaconId]);

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

      const history = chatMessages.slice(-6).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      try {
        const response = await fetch("/api/gemini/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: query,
            history,
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
    <div className="w-full h-full flex flex-col min-h-0 bg-[#0b1320] text-[#f1f5f9] overflow-hidden font-sans">
      {/* Civilian Sub-Navigation Underline Tabs (Matches Reference Picture 2) */}
      <div className="px-4 border-b border-[#1c2536] bg-[#0b1320] flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setCivilianView("map")}
            className="flex items-center gap-2 pt-3 pb-2.5 text-xs font-semibold cursor-pointer transition-colors relative text-sky-400 border-b-2 border-sky-400 -mb-[1px]"
          >
            <Map className="w-4 h-4 text-sky-400" />
            <span>Interactive Map & Shelters</span>
          </button>

          <button
            onClick={() => {
              playConfirmationBeep();
              setCivilianView("chat");
            }}
            className="flex items-center gap-2 pt-3 pb-2.5 text-xs font-semibold cursor-pointer transition-colors relative text-[#8fa0b5] hover:text-[#f1f5f9]"
          >
            <Shield className="w-4 h-4 text-[#8fa0b5]" />
            <span>AI Safety Copilot</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation View Switcher (Only visible on < lg) */}
      <div className="lg:hidden flex items-center bg-[#0b1320] p-2 border-b border-[#1c2536] shrink-0 z-20">
        <div className="flex w-full bg-[#111c2e] p-1 rounded-xl border border-[#1e2c44]">
          <button
            onClick={() => {
              playConfirmationBeep();
              setMobileTab("shelters");
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              mobileTab === "shelters"
                ? "bg-[#1c2e4a] text-sky-400 border border-[#2a456c] shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Shelters & Status</span>
          </button>
          <button
            onClick={() => {
              playConfirmationBeep();
              setMobileTab("map");
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              mobileTab === "map"
                ? "bg-[#1c2e4a] text-sky-400 border border-[#2a456c] shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Live Hazard Map</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Clean, Focused Civilian Sidebar (~400px) */}
        <aside className={`w-full lg:w-[400px] xl:w-[420px] shrink-0 h-full flex-col bg-[#0b1320] border-r border-[#1c2536] overflow-hidden z-10 ${
          mobileTab === "shelters" ? "flex" : "hidden lg:flex"
        }`}>

          {/* 1. CINEMATIC MOUNTAIN SAFETY STATUS CARD (Matches Reference Picture 2) */}
          <div className="p-3.5 border-b border-[#1c2536] shrink-0">
            <div
              className={`p-4 rounded-2xl border transition-all relative overflow-hidden shadow-xl ${
                isDanger
                  ? "border-red-900/50 bg-red-950/40 text-red-100"
                  : "border-[#1e2c44] text-white"
              }`}
              style={{
                backgroundImage: isDanger
                  ? "linear-gradient(to right, rgba(45, 10, 15, 0.96) 0%, rgba(45, 10, 15, 0.85) 50%, rgba(45, 10, 15, 0.4) 100%), url('/images/mountain-card-bg.jpg')"
                  : "linear-gradient(to right, rgba(11, 19, 32, 0.96) 0%, rgba(11, 19, 32, 0.85) 48%, rgba(11, 19, 32, 0.35) 100%), url('/images/mountain-card-bg.jpg')",
                backgroundPosition: "center right",
                backgroundSize: "cover",
              }}
            >
              {/* Top Row: Status Title and Subtitle */}
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isDanger ? "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.7)]" : "bg-[#27c68c] shadow-[0_0_8px_rgba(39,198,140,0.6)]"
                  }`}
                />
                <h3 className="font-bold text-base sm:text-lg tracking-tight text-white leading-tight">
                  {isDanger
                    ? language === "ne"
                      ? "उच्च जोखिम: सुरक्षित उचाइमा जानुहोस्"
                      : "Hazard Nearby — Move Uphill"
                    : language === "ne"
                    ? "तपाईं सुरक्षित क्षेत्रमा हुनुहुन्छ"
                    : "Normal Valley Conditions"}
                </h3>
              </div>
              <p className="text-xs text-[#8c96af] mt-1 pl-5">
                {isDanger
                  ? "Active surge or debris chute in vicinity. Move to high ground immediately."
                  : "No immediate risk. Stay alert and follow updates."}
              </p>

              {/* Card Divider */}
              <div className="border-t border-white/10 my-3.5" />

              {/* Bottom Metrics: 2 Columns */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Column 1: Nearest High Ground */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-[#8fa0b5] mb-1">
                    <MapPin className="w-3.5 h-3.5 text-[#8fa0b5] shrink-0" />
                    <span className="truncate">Nearest High Ground</span>
                  </div>
                  <span className="text-xs font-semibold text-[#f1f5f9] truncate block">
                    {nearestRefuge?.name || "Badal Danda Alpine Promontory Haven"}
                  </span>
                  <span className="text-xs text-[#8fa0b5] block mt-0.5">
                    (~{formatDistance(nearestRefuge?.dist || 0)})
                  </span>
                </div>

                {/* Column 2: Distance */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[#8fa0b5] mb-1">
                    <Mountain className="w-3.5 h-3.5 text-[#8fa0b5] shrink-0" />
                    <span>Distance</span>
                  </div>
                  <span className="text-xs font-semibold text-[#f1f5f9] block">
                    ~{formatDistance(nearestRefuge?.dist || 0)}{" "}
                    <span className="text-[#8fa0b5] font-normal">(uphill)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. EMERGENCY ACTION BUTTONS & QUICK ACTIONS */}
          <div className="px-3.5 py-3 border-b border-[#1c2536] space-y-2.5 shrink-0">
            {/* A. SOS Button with 3-Second Safeguard */}
            {sosSuccess ? (
              <div className="p-3 rounded-xl bg-[#121c2d] border border-emerald-800/50 text-emerald-300 text-xs font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>SOS Broadcasted! Rescuers notified.</span>
                </div>
              </div>
            ) : sosCountdown !== null ? (
              <div className="p-3 rounded-xl bg-[#111c2e] border border-red-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#f1f5f9]">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-mono text-xs">
                    {sosCountdown}
                  </span>
                  <span>Broadcasting SOS in {sosCountdown}s...</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={cancelSosCountdown}
                    className="px-2.5 py-1 rounded-md bg-[#18253a] hover:bg-[#20304a] text-[#8fa0b5] hover:text-[#f1f5f9] text-xs font-medium cursor-pointer"
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
                className="w-full py-3 px-4 rounded-xl bg-[#84303f] hover:bg-[#963748] active:scale-[0.99] border border-red-500/20 shadow-lg shadow-red-950/30 text-white font-medium text-xs sm:text-sm flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Radio className="w-4 h-4 text-white shrink-0" />
                  <span className="font-semibold tracking-tight text-white">
                    {language === "ne" ? "आपतकालीन उद्धार (SOS) पठाउनुहोस्" : "Send Emergency SOS Alert"}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-white/90 shrink-0" />
              </button>
            )}

            {/* B. Action Row: Single Container split by vertical divider */}
            <div className="grid grid-cols-2 rounded-xl border border-[#1c2536] bg-[#0b1320] divide-x divide-[#1c2536] overflow-hidden">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="py-2.5 px-3 flex items-center justify-center gap-2 text-xs font-medium text-[#c2cbd8] hover:text-white hover:bg-[#121c2d] transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-[#8fa0b5]" />
                <span>Report Hazard</span>
              </button>

              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="py-2.5 px-3 flex items-center justify-center gap-2 text-xs font-medium text-[#c2cbd8] hover:text-white hover:bg-[#121c2d] transition-colors cursor-pointer"
              >
                <Mic className="w-4 h-4 text-[#8fa0b5]" />
                <span>Voice Note</span>
              </button>
            </div>
          </div>

          {/* 3. SAFE SHELTERS DIRECTORY (Matches Reference Picture 2 Exactly) */}
          <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar min-h-0 bg-[#0b1320]">
            {/* Directory Header */}
            <div className="flex items-center justify-between pb-3.5 pt-1">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-[#7ea9df] stroke-[1.8]" />
                <span className="text-[16px] font-bold text-[#eeeff2] tracking-tight">
                  Safe High-Ground Shelters
                </span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#053c2e] text-[#52c7ad] border border-[#16785d]/60">
                {safeShelters.length} Available
              </span>
            </div>

            {/* List with Crisp Divider Lines (Dividers between items, indented text) */}
            <div>
              {safeShelters.map((shelter, idx) => {
                const isSelected = selectedShelter?.id === shelter.id;
                const isEven = idx % 2 === 0;

                return (
                  <div
                    key={shelter.id}
                    onClick={() => {
                      playConfirmationBeep();
                      setSelectedShelter(shelter);
                      setMobileTab("map");
                    }}
                    className={`py-4 border-b border-[#1c2536] transition-colors cursor-pointer group ${
                      isSelected
                        ? "bg-[#111c33]/70 -mx-4 px-4"
                        : "hover:bg-[#111a2d]/50 -mx-4 px-4"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Stylized Badge Icon (Matches Picture 2: 50x50px, rounded-[14px]) */}
                      <div
                        className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 ${
                          isEven
                            ? "bg-[#173f3f]"
                            : "bg-[#45477a]"
                        }`}
                      >
                        {isEven ? (
                          <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#95f8e4]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M 3.5 19.5 L 12 4.5 L 20.5 19.5 Z" />
                            <path d="M 6.5 14.5 L 17.5 14.5" />
                            <path d="M 9 19.5 L 12 14.5 L 15 19.5" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                            <path d="M 12 4.5 L 21 19.5 L 15.5 19.5 L 12 13.5 L 8.5 19.5 L 3 19.5 Z" />
                          </svg>
                        )}
                      </div>

                      {/* Content Column (Title, Elevation & Description perfectly aligned) */}
                      <div className="flex-1 min-w-0">
                        {/* Title & Distance / Chevron Row */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-[15px] font-bold text-[#f1f5f9] tracking-tight leading-snug">
                            {shelter.name}
                          </h4>

                          <div className="flex items-center gap-1.5 shrink-0 text-right">
                            <div>
                              <span className="text-sm font-semibold text-[#f1f5f9] block leading-tight">
                                ↑ ~{formatDistance(shelter.dist)}
                              </span>
                              <span className="text-xs text-[#6d7485] font-normal block mt-0.5">Uphill</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-[#707c9b] shrink-0 ml-1 group-hover:text-[#f1f5f9] transition-colors" />
                          </div>
                        </div>

                        {/* Elevation Row */}
                        <div className="text-xs text-[#8fa0b5] flex items-center gap-1.5 mt-1 font-normal">
                          <Mountain className="w-3.5 h-3.5 text-[#8fa0b5] shrink-0 stroke-[1.8]" />
                          <span>Elevation: {shelter.elevation}m ASL</span>
                        </div>

                        {/* Description (Aligned directly under title and elevation!) */}
                        <p className="text-xs text-[#8c96af] mt-2.5 leading-relaxed">
                          {shelter.description || "Prominent rocky ridge viewpoint and shelter haven rising above the treeline between Low Camp and High Camp."}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* RIGHT STAGE: Pure, Distraction-Free Modern Map */}
        <main className={`flex-1 h-full min-h-[350px] relative bg-[#0b1320] flex-col ${
          mobileTab === "map" ? "flex" : "hidden lg:flex"
        }`}>
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
            myBeaconId={activeBeacon ? activeBeacon.id : (activeCivilianBeaconId || (corridor.id === "langtang" ? "sos-101" : undefined))}
            distressBeacons={distressBeacons}
            className="w-full h-full"
          />

          {/* Minimal Floating Action Pill to Open AI Safety Copilot */}
          <button
            onClick={() => {
              playConfirmationBeep();
              setCivilianView("chat");
            }}
            className="absolute bottom-5 right-5 z-20 px-4 py-2.5 rounded-full bg-[#111c2e]/95 hover:bg-[#15233a] border border-[#1e2c44] hover:border-sky-500/50 text-[#f1f5f9] font-semibold text-xs shadow-xl flex items-center gap-2 cursor-pointer backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-[#38bdf8]" />
            <span>AI Safety Copilot</span>
          </button>
        </main>
      </div>

      {/* CITIZEN HAZARD REPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0b1320] border border-[#1e2c44] rounded-2xl shadow-2xl p-5 text-[#f1f5f9]">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2536]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#fbbf24]" />
                <h3 className="font-bold text-sm text-[#f1f5f9]">Report Trail Hazard</h3>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1 rounded-lg text-[#8fa0b5] hover:text-[#f1f5f9] hover:bg-[#15233a] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSubmitted ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[#52c7ad] mx-auto" />
                <h4 className="font-bold text-sm text-[#f1f5f9]">Report Submitted</h4>
                <p className="text-xs text-[#8c96af]">
                  Transmitted to APF Search & Rescue and NDRRMA operations center.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block text-[#f1f5f9] mb-1.5 font-semibold">Hazard Type</label>
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
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                          reportType === opt.id
                            ? "bg-[#1c2e4a] border-[#2a456c] text-[#38bdf8] font-semibold shadow-sm"
                            : "bg-[#111c2e] border-[#1e2c44] text-[#8fa0b5] hover:bg-[#15233a] hover:text-[#f1f5f9]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[#f1f5f9] mb-1.5 font-semibold">
                    Description (Optional)
                  </label>
                  <textarea
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder="Describe what you see (e.g. muddy water surging, bridge impassable)..."
                    rows={3}
                    className="w-full bg-[#111c2e] border border-[#1e2c44] rounded-xl p-2.5 text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none focus:border-[#38bdf8] text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#111c2e] hover:bg-[#15233a] border border-[#1e2c44] text-[#8fa0b5] hover:text-[#f1f5f9] text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs cursor-pointer transition-colors shadow-md shadow-sky-950/40"
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
