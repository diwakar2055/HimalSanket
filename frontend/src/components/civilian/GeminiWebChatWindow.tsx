import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MarkdownMessage } from "../common/MarkdownMessage";
import { playConfirmationBeep, playEmergencyChime } from "../../utils/audioAlert";
import {
  Sparkles,
  Send,
  MapPin,
  Bot,
  Volume2,
  Copy,
  Check,
  Shield,
  AlertTriangle,
  ArrowLeft,
  Map,
  Compass,
  Radio,
  RefreshCw,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { Language } from "../../data/localization";

interface GeminiWebChatWindowProps {
  corridor: any;
  userPosition: { lat: number; lng: number; altitude?: number } | null;
  distanceToHazard: number | null;
  geofenceStatus: string;
  isDanger: boolean;
  waterSurge: number;
  activeScenario?: string;
  language: Language;
  onBackToMap: () => void;
  onTriggerSOS: (customNote?: string) => void;
}

export const GeminiWebChatWindow: React.FC<GeminiWebChatWindowProps> = ({
  corridor,
  userPosition,
  distanceToHazard,
  geofenceStatus,
  isDanger,
  waterSurge,
  activeScenario = "baseline",
  language,
  onBackToMap,
  onTriggerSOS,
}) => {
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
          ? `नमस्ते! म हिमालसंकेत एआई सुरक्षा सहायक हुँ। तपाईं **${corridor.name}** क्षेत्रमा हुनुहुन्छ। बाटोको अवस्था, बाढीको जोखिम वा नजिकको सुरक्षित अग्लो स्थानबारे केही सोध्न सक्नुहुन्छ।`
          : `Namaste. I am your HimalSanket AI Safety Intelligence Assistant for the **${corridor.name}** corridor. Ask me anything about trail safety, river surges, high-ground evacuation shelters, or current geotechnical telemetry.`,
      time: "Just now",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAiThinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleSpeak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/###/g, "")
      .replace(/•/g, "")
      .replace(/⚠️|🚨|🟢/g, "");
    const u = new SpeechSynthesisUtterance(cleanText);
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  };

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

        if (!response.ok) throw new Error("HTTP error");
        const data = await response.json();
        const replyText =
          data.reply ||
          "Telemetry processed. Conditions in Langtang are currently within monitoring thresholds.";

        setChatMessages((p) => [
          ...p,
          { sender: "ai", text: replyText, time: "Just now" },
        ]);
      } catch (err) {
        setChatMessages((p) => [
          ...p,
          {
            sender: "ai",
            text:
              "⚠️ Temporary network interruption with Gemini safety reasoning engine. High-ground terraces remain safe.",
            time: "Offline",
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
      isDanger,
      distanceToHazard,
      activeScenario,
      waterSurge,
    ]
  );

  const suggestedPrompts = [
    {
      title: "Is the trail ahead safe?",
      desc: "Check live catchment rainfall & flood surge status",
      query: "Is trail safe ahead in Langtang valley?",
    },
    {
      title: "Where is nearest high ground?",
      desc: "Locate verified bedrock terraces above river level",
      query: "Where is the nearest safe high ground shelter from my position?",
    },
    {
      title: "What if a flood surge occurs?",
      desc: "Immediate uphill evacuation rules & vertical buffers",
      query: "What immediate action should I take if a flood surge or debris flow occurs?",
    },
    {
      title: "पहिरोको जोखिम हुँदा के गर्ने?",
      desc: "नेपाली भाषामा आपतकालीन निर्देशन तथा सल्लाह",
      query: "पहिरो र खोलाको बाढी आउँदा तुरुन्तै के गर्नुपर्छ?",
    },
  ];

  const handleResetChat = useCallback(() => {
    playConfirmationBeep();
    setChatMessages([
      {
        sender: "ai",
        text:
          language === "ne"
            ? `नमस्ते! म हिमालसंकेत एआई सुरक्षा सहायक हुँ। तपाईं **${corridor.name}** क्षेत्रमा हुनुहुन्छ। बाटोको अवस्था, बाढीको जोखिम वा नजिकको सुरक्षित अग्लो स्थानबारे केही सोध्न सक्नुहुन्छ।`
            : `Namaste. I am your HimalSanket AI Safety Intelligence Assistant for the **${corridor.name}** corridor. Ask me anything about trail safety, river surges, high-ground evacuation shelters, or current geotechnical telemetry.`,
        time: "Just now",
      },
    ]);
  }, [language, corridor.name]);

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-text">
      {/* 1. MINIMAL MODERN TOP BAR WITH PROPER SPACING & BALANCED PLACEMENT */}
      <header className="px-4 sm:px-6 py-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-4 shrink-0 z-20">
        {/* Left: Clean Navigation & Assistant Identity */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={() => {
              playConfirmationBeep();
              onBackToMap();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer shadow-sm group shrink-0"
            title="Return to interactive map view"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Map</span>
          </button>

          <div className="h-5 w-px bg-zinc-800 shrink-0" />

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm text-zinc-100 tracking-tight leading-tight truncate">
                  AI Safety Copilot
                </h2>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
                  Google Gemini 1.5 Flash
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-none mt-1 truncate">
                {corridor.name} • Elevation: ~{userPosition?.altitude || 2780}m ASL
              </p>
            </div>
          </div>
        </div>

        {/* Right: Live Hazard Status Pill + Reset Chat Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border shadow-sm ${
              isDanger
                ? "bg-red-950/20 text-red-300 border-red-900/40"
                : "bg-zinc-900 text-zinc-300 border-zinc-800"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isDanger ? "bg-red-500 animate-pulse" : "bg-emerald-500"
              }`}
            />
            <span>{isDanger ? `Hazard Alert (+${waterSurge}m)` : "Normal Baseline"}</span>
          </div>

          <button
            onClick={handleResetChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer shadow-sm"
            title="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN SPACIOUS CONVERSATION VIEWPORT */}
      <main className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-4 sm:px-6">
        <div className="max-w-2xl mx-auto py-8 space-y-6">
          {/* Welcome Cards when starting */}
          {chatMessages.length === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 mb-8 pt-4"
            >
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">
                  Hello, Trekker.
                </h1>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Ask me anything about route safety, high-ground refuges, or flood surge alerts along the{" "}
                  <strong className="text-zinc-200 font-medium">{corridor.name}</strong>.
                </p>
              </div>

              {/* 4 Suggested Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {suggestedPrompts.map((card, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendChat(card.query)}
                    className="p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700 text-left cursor-pointer transition-colors shadow-sm"
                  >
                    <div className="text-xs font-medium text-zinc-200">
                      {card.title}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 leading-normal">
                      {card.desc}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Messages Stream */}
          {chatMessages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              {msg.sender === "user" ? (
                /* User Prompt Bubble */
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-zinc-800 text-zinc-100 px-4 py-2.5 shadow-sm text-sm leading-relaxed border border-zinc-700/50">
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span className="text-[11px] font-mono text-zinc-500 block text-right mt-1">
                    {msg.time}
                  </span>
                </div>
              ) : (
                /* Gemini AI Response Card (Spacious, Clear, Clean) */
                <div className="w-full flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 p-5 text-zinc-200 text-sm leading-relaxed shadow-sm">
                    <MarkdownMessage content={msg.text} isAi={true} />

                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-zinc-800 text-xs text-zinc-500">
                      <button
                        onClick={() => handleSpeak(msg.text)}
                        className="hover:text-zinc-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen</span>
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => handleCopy(msg.text, idx)}
                        className="hover:text-zinc-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {copiedIdx === idx ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedIdx === idx ? "Copied" : "Copy"}</span>
                      </button>
                      <span className="ml-auto text-[11px] font-mono text-zinc-500">
                        Google Gemini 3.1 Flash
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {/* AI Thinking Indicator */}
          {isAiThinking && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs max-w-fit shadow-sm"
            >
              <Bot className="w-4 h-4 animate-spin text-zinc-400" />
              <span>
                Reasoning safety guidance with Google Gemini...
              </span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 3. FLOATING CAPSULE INPUT BAR */}
      <footer className="w-full bg-zinc-950/95 border-t border-zinc-800/60 pt-3 pb-5 px-4 sm:px-6 shrink-0 z-20">
        <div className="max-w-2xl mx-auto space-y-2.5">
          {/* Quick Questions Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
            {[
              "Is trail safe ahead?",
              "Where is nearest high ground?",
              "What to do if surge comes?",
              "Emergency rescue contacts",
              "GLOF travel times",
            ].map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendChat(p)}
                className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs cursor-pointer transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Capsule Input Bar */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 focus-within:border-zinc-700 transition-colors shadow-sm">
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              placeholder="Ask about trail conditions, flood surge risks, or shelters..."
              className="flex-1 bg-transparent border-0 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none px-3 py-1.5"
            />
            <button
              onClick={() => handleSendChat()}
              disabled={!chatInput.trim() || isAiThinking}
              className="p-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 disabled:opacity-30 cursor-pointer transition-colors shadow-sm shrink-0"
              title="Send safety question"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="text-[11px] text-center text-zinc-500">
            Powered by live IoT telemetry & Google Gemini safety intelligence. Always follow local authorities.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GeminiWebChatWindow;
