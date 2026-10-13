import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Loader2,
  Minimize2,
  Maximize2,
  Bot,
  User,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  Navigation,
  AlertTriangle,
  Compass,
} from "lucide-react";
import { playHazardVoiceBroadcast } from "../utils/speechSynthesizer";
import { MAP_ASSETS } from "../data/hazardMapData";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  source?: "gemini-2.0-flash" | "himal-synthesizer";
  isStreaming?: boolean;
}

interface GeminiChatbotProps {
  activeCorridor?: {
    name: string;
    region: string;
    rainfall: number;
    seismic: number;
    lakeChange: number;
    [key: string]: any;
  };
  allCorridors?: any[];
  userPosition?: { lat: number; lng: number; accuracy?: number; altitude?: number } | null;
  geofenceStatus?: string;
  distanceToHazard?: number | null;
  activeScenario?: string;
  waterSurge?: number;
}

const PROMPT_CATEGORIES = [
  {
    category: "🚨 Safety",
    prompts: [
      "Am I safe at my current location?",
      "Where is the nearest safe haven or rescue base?",
      "What is the emergency escape route in Langtang?",
    ],
  },
  {
    category: "🌧️ Weather",
    prompts: [
      "Will 24h rainfall exceed the 144mm threshold?",
      "What is the current catchment precipitation rate?",
    ],
  },
  {
    category: "🛰️ GLOF",
    prompts: [
      "How fast is the glacial lake expanding?",
      "What causes Glacial Lake Outburst Floods (GLOF)?",
    ],
  },
  {
    category: "🇳🇵 नेपाली",
    prompts: [
      "पहिरोको जोखिम हुँदा के गर्नुपर्छ?",
      "के अहिले लाङटाङ क्षेत्रमा हिँड्न सुरक्षित छ?",
    ],
  },
];

// Helper: Format in-line bold and coordinate chips
function renderInlineText(line: string) {
  // Split on bold markdown **...**
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldContent = part.slice(2, -2);

      // Check if it's a coordinate or elevation
      if (/\d+\.\d+°\s*[NSEW]|\d+m\s*ASL|\d+\s*mm|\d+\.\d+\s*M/i.test(boldContent)) {
        return (
          <span
            key={i}
            className="font-mono text-cyan-300 font-bold bg-cyan-950/70 px-1 py-0.5 rounded border border-cyan-800/80 mx-0.5 text-[11px]"
          >
            {boldContent}
          </span>
        );
      }

      // Check if it's an emergency alert keyword
      if (/DANGER|WARNING|URGENT|CRITICAL|SAFE|IMMEDIATE/i.test(boldContent)) {
        const isRed = /DANGER|WARNING|URGENT|CRITICAL/i.test(boldContent);
        return (
          <span
            key={i}
            className={`font-black px-1.5 py-0.5 rounded text-[11px] uppercase tracking-wider mx-0.5 ${
              isRed
                ? "bg-rose-500/25 text-rose-300 border border-rose-500/40"
                : "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
            }`}
          >
            {boldContent}
          </span>
        );
      }

      return (
        <strong key={i} className="font-bold text-amber-300">
          {boldContent}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// Rich Markdown Formatter Component for Chat Responses
function FormattedMessageContent({ text }: { text: string }) {
  const lines = useMemo(() => text.split("\n"), [text]);

  const isNepali = /[\u0900-\u097F]/.test(text);

  return (
    <div className={`space-y-2 text-xs text-[#F8FAFC] ${isNepali ? "leading-relaxed" : "leading-normal"}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // 1. High-priority Warning Banner Line
        if (trimmed.startsWith("🚨") || trimmed.includes("URGENT GEOFENCE WARNING")) {
          return (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-gradient-to-r from-rose-950/80 to-red-950/60 border border-rose-500/70 shadow-lg text-rose-100 flex items-start gap-2 animate-in fade-in duration-200"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="font-bold text-xs leading-snug">{renderInlineText(trimmed)}</div>
            </div>
          );
        }

        // 2. Section Heading Line (e.g. ### or **HEADING:** or lines ending with :)
        if (trimmed.startsWith("###") || (/^\*\*[A-Z\s]{4,}\*\*:?$/.test(trimmed))) {
          const headingText = trimmed.replace(/^###\s*/, "");
          return (
            <div
              key={idx}
              className="text-[11px] font-black uppercase tracking-wider text-cyan-300 pt-2 pb-1 border-b border-[#2A3B5E]/60 flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>{renderInlineText(headingText)}</span>
            </div>
          );
        }

        // 3. Numbered Action Steps (e.g. 1. Move Uphill, 2. Proceed...)
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          const num = numberedMatch[1];
          const content = numberedMatch[2];
          return (
            <div key={idx} className="flex items-start gap-2 my-1 pl-1">
              <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold font-mono flex items-center justify-center shrink-0 mt-0.5">
                {num}
              </span>
              <div className="flex-1 leading-relaxed text-slate-200">{renderInlineText(content)}</div>
            </div>
          );
        }

        // 4. Bullet Points (e.g. • or -)
        if (trimmed.startsWith("•") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const content = trimmed.replace(/^[•\-\*]\s*/, "");
          return (
            <div key={idx} className="flex items-start gap-2 my-1 pl-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
              <div className="flex-1 leading-relaxed text-slate-200">{renderInlineText(content)}</div>
            </div>
          );
        }

        // 5. Standard paragraph line
        return (
          <div key={idx} className="leading-relaxed">
            {renderInlineText(trimmed)}
          </div>
        );
      })}
    </div>
  );
}

// Progressive Typewriter Text Component
function TypewriterMessage({
  fullText,
  isStreaming,
  onComplete,
}: {
  fullText: string;
  isStreaming: boolean;
  onComplete: () => void;
}) {
  const [displayedText, setDisplayedText] = useState(() => (isStreaming ? "" : fullText));
  const isDoneRef = useRef(!isStreaming);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(fullText);
      isDoneRef.current = true;
      return;
    }

    isDoneRef.current = false;
    let currentIdx = 0;
    const words = fullText.split(" ");
    const totalWords = words.length;

    const interval = setInterval(() => {
      if (isDoneRef.current) {
        clearInterval(interval);
        return;
      }

      currentIdx = Math.min(currentIdx + 2, totalWords);
      setDisplayedText(words.slice(0, currentIdx).join(" "));

      if (currentIdx >= totalWords) {
        clearInterval(interval);
        isDoneRef.current = true;
        onComplete();
      }
    }, 22);

    return () => clearInterval(interval);
  }, [fullText, isStreaming, onComplete]);

  // Click to reveal all instantly
  const handleSkip = () => {
    if (!isDoneRef.current) {
      isDoneRef.current = true;
      setDisplayedText(fullText);
      onComplete();
    }
  };

  return (
    <div onClick={handleSkip} className="cursor-text" title={!isDoneRef.current ? "Click to reveal immediately" : ""}>
      <FormattedMessageContent text={displayedText} />
      {isStreaming && !isDoneRef.current && (
        <span className="inline-block w-2 h-3.5 bg-cyan-400 ml-1 animate-pulse align-middle rounded-sm" />
      )}
    </div>
  );
}

export function GeminiChatbot({
  activeCorridor,
  allCorridors,
  userPosition,
  geofenceStatus,
  distanceToHazard,
  activeScenario,
  waterSurge = 0,
}: GeminiChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTacticalExpanded, setIsTacticalExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(0);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      text: "Namaste! I am your HimalSanket AI Hazard Intelligence Copilot. I analyze live DHM automated rainfall stations, USGS seismicity, and Sentinel-2 NDWI lake growth. How can I assist you with mountain safety today?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isStreaming: false,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  // Speech Synthesis Read Aloud
  const handleToggleSpeech = (text: string, msgId: string) => {
    if (!("speechSynthesis" in window)) return;

    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    const isNepali = /[\u0900-\u097F]/.test(text);
    playHazardVoiceBroadcast({
      text,
      isNepali,
      onStart: () => setSpeakingId(msgId),
      onEnd: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  };

  // Copy Message to Clipboard
  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear Chat History
  const handleClearHistory = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        text: "Chat cleared. Active environmental telemetry for " + (activeCorridor?.name || "Langtang Valley") + " is synchronized. Ask any hazard or safety question.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isStreaming: false,
      },
    ]);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
  };

  const handleSend = async (userPrompt?: string) => {
    const textToSend = userPrompt || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!userPrompt) setInput("");
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const corridorAssets = MAP_ASSETS.filter((a) => a.corridorId === activeCorridor?.id);
      const submergedList = corridorAssets
        .filter((a) => waterSurge > 0 && a.hazardThresholdMeters - waterSurge <= 0)
        .map((a) => `${a.name} (${a.type}, elev ${a.elevation}m)`);
      const safeZonesList = corridorAssets
        .filter((a) => a.type === "safeZone")
        .map((a) => `${a.name} (elev ${a.elevation}m, cap ${a.capacity || 100})`);

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          corridorContext: activeCorridor
            ? {
                name: activeCorridor.name,
                region: activeCorridor.region,
                rainfall_mm: activeCorridor.rainfall,
                rain_threshold_mm: activeCorridor.rainThreshold || 144,
                seismic_magnitude: activeCorridor.seismic,
                lake_expansion_pct: activeCorridor.lakeChange,
                gps: activeCorridor.gps,
                ground_reports: activeCorridor.reports?.length || 0,
                userPosition: userPosition || undefined,
                geofenceStatus: geofenceStatus || (distanceToHazard && distanceToHazard < 150 ? "DANGER" : "SAFE"),
                distanceToHazard: distanceToHazard !== null && distanceToHazard !== undefined ? distanceToHazard : undefined,
                activeScenario: activeScenario || "baseline",
                waterSurge,
                submerged_assets_count: submergedList.length,
                submerged_assets: submergedList,
                safe_evacuation_zones: safeZonesList,
                all_monitored_corridors: allCorridors?.map((c) => ({
                  name: c.name,
                  region: c.region,
                  rainfall_mm: c.rainfall,
                  threshold_mm: c.rainThreshold,
                  seismic_magnitude: c.seismic,
                  lake_expansion_pct: c.lakeChange,
                })),
              }
            : undefined,
        }),
      });

      const data = await res.json();
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text:
          data?.reply ||
          "Namaste! Active corridor telemetry is within baseline. Maintain routine weather awareness along high river terraces.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        source: data?.source || "gemini-2.0-flash",
        isStreaming: true,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text:
          "Namaste! Monitoring live telemetry for " +
          (activeCorridor?.name || "Himalayan Region") +
          ". Catchment rainfall is " +
          (activeCorridor?.rainfall || 55) +
          "mm vs 144mm threshold. Observe standard DHM monsoon cautions.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const corridorName = activeCorridor?.name || "Langtang Valley";
  const isGeofenceDanger = geofenceStatus === "DANGER" || (distanceToHazard !== null && distanceToHazard < 150);

  return (
    <aside aria-label="HimalSanket AI Assistant" className="fixed bottom-5 right-5 z-[99999] flex flex-col items-end font-sans">
      {/* Expanded Chat Box */}
      {isOpen && (
        <section
          aria-label="Chat window"
          className={`mb-3 flex flex-col rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden border border-[#2A3B5E] bg-[#0B132B] backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-5 duration-200 transition-all ${
            isTacticalExpanded ? "w-[92vw] sm:w-[540px] h-[640px]" : "w-[360px] sm:w-[420px] h-[520px]"
          }`}
        >
          {/* Header */}
          <header className="px-4 py-2.5 bg-gradient-to-r from-[#16233F] via-[#101A30] to-[#0A1224] border-b border-[#2A3B5E] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 border border-cyan-400/40 flex items-center justify-center text-white shadow-md shadow-cyan-600/30">
                <Sparkles className="w-4 h-4 text-cyan-200" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Gemini 2.0 Flash</h3>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Live Grounded
                  </span>
                </div>
                {/* Active Corridor & Geofence Status Ribbon */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-[#94A3B8]">📍 {corridorName}</span>
                  <span className="text-[9px] text-[#64748B]">&bull;</span>
                  <span
                    className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded ${
                      isGeofenceDanger
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse"
                        : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {isGeofenceDanger ? `🚨 ${distanceToHazard ?? 85}m to Hazard` : "🟢 Safe Zone"}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1 text-[#94A3B8]">
              {/* Clear History */}
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Clear chat history"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Expand / Minimize Window Size */}
              <button
                type="button"
                onClick={() => setIsTacticalExpanded((prev) => !prev)}
                className="p-1.5 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer hidden sm:block"
                title={isTacticalExpanded ? "Compact size" : "Expanded tactical mode"}
              >
                {isTacticalExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Close Chat */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Messages Stream Container */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-[#2A3B5E] text-xs">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {/* Assistant Bot Icon */}
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-300">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Message Bubble Container */}
                <div
                  className={`max-w-[88%] rounded-2xl p-3 shadow-md transition-all ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-br-none ml-auto"
                      : "bg-[#16233F] text-[#F8FAFC] border border-[#2A3B5E] rounded-bl-none"
                  }`}
                >
                  {/* Content: Formatted typography or typewriter stream */}
                  {m.role === "user" ? (
                    <div className="whitespace-pre-wrap font-medium">{m.text}</div>
                  ) : (
                    <TypewriterMessage
                      fullText={m.text}
                      isStreaming={Boolean(m.isStreaming)}
                      onComplete={() => {
                        setMessages((prev) =>
                          prev.map((msg) => (msg.id === m.id ? { ...msg, isStreaming: false } : msg))
                        );
                      }}
                    />
                  )}

                  {/* Message Meta & Action Controls */}
                  <div
                    className={`flex items-center justify-between gap-2 mt-2 pt-1.5 border-t text-[10px] ${
                      m.role === "user" ? "border-white/20 text-white/80" : "border-[#2A3B5E]/60 text-[#94A3B8]"
                    }`}
                  >
                    <span className="font-mono">{m.time}</span>

                    {m.role === "assistant" && (
                      <div className="flex items-center gap-1.5">
                        {/* Audio Speech Read Aloud Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleSpeech(m.text, m.id)}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                            speakingId === m.id
                              ? "bg-cyan-500 text-black font-bold animate-pulse"
                              : "hover:text-white hover:bg-white/10"
                          }`}
                          title="Read aloud via voice synthesis"
                        >
                          {speakingId === m.id ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3 text-cyan-400" />}
                          <span>{speakingId === m.id ? "Stop" : "Listen"}</span>
                        </button>

                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => handleCopy(m.text, m.id)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === m.id ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Avatar */}
                {m.role === "user" && (
                  <div className="w-6 h-6 rounded-lg bg-orange-600/30 border border-orange-500/50 flex items-center justify-center shrink-0 mt-0.5 text-orange-300">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* High-Tech Answering / Reasoning State */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start animate-in fade-in duration-200">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 text-cyan-300">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-[#16233F] text-cyan-300 border border-cyan-500/40 rounded-2xl rounded-bl-none p-3 text-xs space-y-2 shadow-lg max-w-[85%]">
                  <div className="flex items-center gap-2 font-bold">
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Gemini 2.0 Flash synthesizing intelligence...</span>
                  </div>
                  <div className="text-[11px] text-[#94A3B8] font-mono leading-tight">
                    Correlating DHM rain gauges &bull; USGS seismicity &bull; Sentinel-2 NDWI
                  </div>
                  <div className="w-full h-1 rounded-full bg-[#1E293B] overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse w-3/4 rounded-full" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Categorized Quick Suggestions */}
          {messages.length <= 4 && (
            <div className="px-3 py-1.5 border-t border-[#2A3B5E] bg-[#0A1224]/80 space-y-1.5">
              {/* Category selector pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[10px]">
                {PROMPT_CATEGORIES.map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveCategory(i)}
                    className={`px-2 py-0.5 rounded-full whitespace-nowrap cursor-pointer transition-colors ${
                      activeCategory === i
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                        : "text-[#64748B] hover:text-white"
                    }`}
                  >
                    {cat.category}
                  </button>
                ))}
              </div>

              {/* Prompt pills for active category */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {PROMPT_CATEGORIES[activeCategory].prompts.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="text-[11px] whitespace-nowrap bg-[#16233F] hover:bg-[#1C2C4C] text-[#94A3B8] hover:text-white px-2.5 py-1 rounded-full border border-[#2A3B5E] hover:border-cyan-500/50 transition-all shrink-0 cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Persistent Tactical Action Chips */}
          <div className="px-3 py-1.5 border-t border-[#2A3B5E] bg-[#070D1B] flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10px]">
            <button
              type="button"
              onClick={() => handleSend(`Assess evacuation routes and safe havens for ${corridorName}`)}
              className="whitespace-nowrap px-2 py-0.5 rounded-full bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 transition-colors cursor-pointer shrink-0 font-medium"
            >
              🚨 Evacuation Route
            </button>
            <button
              type="button"
              onClick={() => handleSend(`Which bridges or settlements in ${corridorName} are currently threatened or submerged?`)}
              className="whitespace-nowrap px-2 py-0.5 rounded-full bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors cursor-pointer shrink-0 font-medium"
            >
              🌊 Threatened Infrastructure
            </button>
            <button
              type="button"
              onClick={() => handleSend(`Estimate downstream flood wave arrival times and sirens for ${corridorName}`)}
              className="whitespace-nowrap px-2 py-0.5 rounded-full bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 transition-colors cursor-pointer shrink-0 font-medium"
            >
              ⏱️ Flood Wave ETA
            </button>
            <button
              type="button"
              onClick={() => handleSend(`Draft an urgent APF & Nepal Army disaster dispatch for ${corridorName}`)}
              className="whitespace-nowrap px-2 py-0.5 rounded-full bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 transition-colors cursor-pointer shrink-0 font-medium"
            >
              📡 APF SAR Dispatch
            </button>
          </div>

          {/* Tactical Input Footer */}
          <footer className="p-3 bg-[#0A1224] border-t border-[#2A3B5E]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about live hazards, evacuation, or safety..."
                className="flex-1 bg-[#16233F] border border-[#2A3B5E] rounded-xl px-3 py-2 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white p-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-cyan-950 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </footer>
        </section>
      )}

      {/* Floating Toggle Button (Always visible bottom-right) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close AI Chatbot" : "Open AI Chatbot"}
        className="group relative w-12 h-12 rounded-full bg-gradient-to-tr from-[#16233F] to-[#1C2C4C] hover:from-cyan-950 hover:to-blue-950 text-[#F8FAFC] flex items-center justify-center shadow-2xl border border-cyan-500/40 hover:border-cyan-400 hover:shadow-cyan-500/30 transition-all cursor-pointer hover:scale-105"
      >
        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform">
          <Sparkles className="w-4 h-4" />
        </div>
        {!isOpen && (
          <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0A1224] animate-pulse" />
        )}
      </button>
    </aside>
  );
}
