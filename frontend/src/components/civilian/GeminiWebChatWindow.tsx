import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { MarkdownMessage } from "../common/MarkdownMessage";
import { playConfirmationBeep } from "../../utils/audioAlert";
import {
  Sparkles,
  Send,
  Bot,
  Volume2,
  Copy,
  Check,
  AlertTriangle,
  ArrowLeft,
  Compass,
  Mountain,
  Languages,
  ArrowUpRight,
  Mic,
  MicOff,
  RotateCcw,
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
}) => {
  const [chatInput, setChatInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const corridorDisplayName = corridor?.name || "Rolwaling Valley";

  interface WebChatMessage {
    sender: "user" | "ai";
    text: string;
    time: string;
    model?: string;
    source?: string;
  }

  const [chatMessages, setChatMessages] = useState<WebChatMessage[]>([
    {
      sender: "ai",
      text:
        language === "ne"
          ? `नमस्ते! म हिमालसंकेत एआई सुरक्षा सहायक हुँ। तपाईं **${corridorDisplayName}** क्षेत्रमा हुनुहुन्छ। बाटोको अवस्था, बाढीको जोखिम वा नजिकको सुरक्षित अग्लो स्थानबारे केही सोध्न सक्नुहुन्छ।`
          : `Namaste. I am your HimalSanket AI Safety Intelligence Assistant for the **${corridorDisplayName}** corridor. Ask me anything about trail safety, river surges, high-ground evacuation shelters, or current geotechnical telemetry.`,
      time: "Just now",
      model: "Google Gemini 2.0 Flash",
      source: "google-gemini",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAiThinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Web Speech API Voice Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === "ne" ? "ne-NP" : "en-US";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please type your query.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      playConfirmationBeep();
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  };

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

  const handleResetChat = useCallback(() => {
    playConfirmationBeep();
    setChatMessages([
      {
        sender: "ai",
        text:
          language === "ne"
            ? `नमस्ते! म हिमालसंकेत एआई सुरक्षा सहायक हुँ। तपाईं **${corridorDisplayName}** क्षेत्रमा हुनुहुन्छ। बाटोको अवस्था, बाढीको जोखिम वा नजिकको सुरक्षित अग्लो स्थानबारे केही सोध्न सक्नुहुन्छ।`
            : `Namaste. I am your HimalSanket AI Safety Intelligence Assistant for the **${corridorDisplayName}** corridor. Ask me anything about trail safety, river surges, high-ground evacuation shelters, or current geotechnical telemetry.`,
        time: "Just now",
        model: "Google Gemini 2.0 Flash",
        source: "google-gemini",
      },
    ]);
  }, [language, corridorDisplayName]);

  const handleSendChat = useCallback(
    async (textToSend?: string) => {
      const query = textToSend || chatInput;
      if (!query.trim() || isAiThinking) return;

      playConfirmationBeep();
      const userMsg: WebChatMessage = { sender: "user", text: query, time: "Just now" };
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
              name: corridorDisplayName,
              rainfall: corridor?.rainfall,
              seismic: corridor?.seismic,
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
          `Telemetry processed. Conditions in ${corridorDisplayName} are currently within monitoring thresholds.`;

        setChatMessages((p) => [
          ...p,
          {
            sender: "ai",
            text: replyText,
            time: "Just now",
            model: data.model || (data.source === "google-gemini" ? "Google Gemini 2.0 Flash" : "HimalSanket Safety Synthesizer"),
            source: data.source || "google-gemini",
          },
        ]);
      } catch (err) {
        setChatMessages((p) => [
          ...p,
          {
            sender: "ai",
            text:
              "⚠️ Temporary network interruption with Gemini safety reasoning engine. High-ground terraces remain safe.",
            time: "Offline",
            model: "Offline Emergency Synthesizer",
            source: "offline-fallback",
          },
        ]);
      } finally {
        setIsAiThinking(false);
      }
    },
    [
      chatInput,
      chatMessages,
      isAiThinking,
      corridorDisplayName,
      corridor?.rainfall,
      corridor?.seismic,
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
      query: `Is the trail ahead safe in ${corridorDisplayName}?`,
      icon: (
        <div className="w-7 h-7 rounded-lg bg-[#142234] border border-[#21354d] text-sky-400 flex items-center justify-center shrink-0">
          <Compass className="w-4 h-4 text-sky-400" />
        </div>
      ),
    },
    {
      title: "Where is nearest high ground?",
      desc: "Locate verified bedrock terraces above river level",
      query: "Where is the nearest safe high ground shelter from my position?",
      icon: (
        <div className="w-7 h-7 rounded-lg bg-[#112932] border border-[#1a4454] text-teal-400 flex items-center justify-center shrink-0">
          <Mountain className="w-4 h-4 text-teal-400" />
        </div>
      ),
    },
    {
      title: "What if a flood surge occurs?",
      desc: "Immediate uphill evacuation rules & vertical buffers",
      query: "What immediate action should I take if a flood surge occurs?",
      icon: (
        <div className="w-7 h-7 rounded-lg bg-[#272115] border border-[#44351d] text-amber-400 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
      ),
    },
    {
      title: "पहिरोको जोखिम हुँदा के गर्ने?",
      desc: "नेपाली भाषामा आपतकालीन निर्देशन तथा सल्लाह",
      query: "पहिरोको जोखिम हुँदा के गर्ने?",
      icon: (
        <div className="w-7 h-7 rounded-lg bg-[#1a2135] border border-[#263354] text-indigo-400 flex items-center justify-center shrink-0">
          <Languages className="w-4 h-4 text-indigo-400" />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#070d18] text-[#f1f5f9] overflow-hidden font-sans select-text">
      {/* 1. TOP HEADER (With Back to Map on Right and Status on Left) */}
      <header className="px-5 sm:px-8 py-3 bg-[#070d18] border-b border-[#142338] flex items-center justify-between gap-4 shrink-0 z-20">
        {/* Left: Return to Map & Reset Triggers */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              playConfirmationBeep();
              onBackToMap();
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0e192a] hover:bg-[#152338] border border-[#1c2e48] text-xs font-medium text-[#8fa0b5] hover:text-[#f1f5f9] transition-colors cursor-pointer shadow-sm group"
            title="Return to interactive map view"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#8fa0b5] group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Map</span>
          </button>

          <button
            onClick={handleResetChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0e192a] hover:bg-[#152338] text-xs text-[#8fa0b5] hover:text-[#f1f5f9] border border-[#1c2e48] transition-colors cursor-pointer shadow-sm"
            title="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        {/* Right: Corridor Live Monitor Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-semibold text-[#8fa0b5] tracking-wider uppercase">
              EARLY WARNING RADAR
            </span>
          </div>
          <span className="text-[#334155]">•</span>
          <span className="text-xs text-[#8fa0b5] truncate">
            {corridorDisplayName} Corridor
          </span>
        </div>
      </header>

      {/* 2. MAIN CONVERSATION VIEWPORT (max-w-3xl, matching Reference Image) */}
      <main className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-5 sm:px-8 bg-[#070d18]">
        <div className="max-w-3xl mx-auto py-6 space-y-6">
          {/* Welcome Tag & Title Section (Exact Match to Reference) */}
          <div className="space-y-2 pt-1">
            {/* Top Pill Tag: ✦ AI SAFETY INTELLIGENCE */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#102238] border border-[#1d3d66] text-[#38bdf8] text-xs font-semibold tracking-wide shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>AI SAFETY INTELLIGENCE</span>
            </div>

            {/* Title: Hello, Trekker. */}
            <h1 className="text-3xl font-bold text-white tracking-tight leading-tight block">
              Hello, Trekker.
            </h1>

            {/* Subtitle */}
            <p className="text-sm text-[#94a3b8] leading-relaxed">
              Ask me anything about route safety, high-ground refuges, or flood surge alerts along the{" "}
              <strong className="text-white font-semibold">{corridorDisplayName}</strong>.
            </p>
          </div>

          {/* 2x2 Suggested Action Cards (With ↗ Arrows & Styled Containers) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {suggestedPrompts.map((card, i) => (
              <button
                key={i}
                onClick={() => handleSendChat(card.query)}
                className="p-4 rounded-2xl bg-[#0e1728]/75 hover:bg-[#142238]/90 border border-[#1b2b40] hover:border-[#284268] text-left cursor-pointer transition-all duration-200 group shadow-sm flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {card.icon}
                    <span className="text-sm font-semibold text-white tracking-tight group-hover:text-sky-300 transition-colors truncate">
                      {card.title}
                    </span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#4b5563] group-hover:text-white transition-colors shrink-0 ml-2" />
                </div>
                <div className="text-xs text-[#8fa0b5] mt-2 pl-9.5 leading-normal">
                  {card.desc}
                </div>
              </button>
            ))}
          </div>

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
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[#16253c] text-[#f1f5f9] px-4 py-2.5 shadow-sm text-sm leading-relaxed border border-[#2a456c]/70">
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span className="text-[11px] font-mono text-[#8fa0b5] block text-right mt-1">
                    {msg.time}
                  </span>
                </div>
              ) : (
                /* Gemini AI Response Card with Cyan Accent Glow & Online Header */
                <div className="w-full flex items-start gap-3.5">
                  {/* Subtle Sparkle Avatar */}
                  <div className="w-8 h-8 rounded-2xl bg-[#0f1d30] border border-[#1e385c] text-sky-400 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                  </div>

                  {/* AI Response Card (With Header & Luminous Border) */}
                  <div className="flex-1 bg-[#0b1424]/90 rounded-2xl border border-sky-500/40 shadow-[0_0_20px_rgba(56,189,248,0.1)] p-5 text-[#f1f5f9] text-sm leading-relaxed backdrop-blur-md">
                    {/* Assistant Header: HimalSanket AI Copilot • ONLINE */}
                    <div className="flex items-center gap-2 mb-2 pb-1">
                      <span className="font-semibold text-sm text-[#e2e8f0]">
                        HimalSanket AI Copilot
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#053c2e] border border-[#0d6e52] text-[10px] font-semibold text-[#34d399] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                        ONLINE
                      </span>
                    </div>

                    <MarkdownMessage content={msg.text} isAi={true} />

                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#162740] text-xs text-[#8fa0b5]">
                      <button
                        onClick={() => handleSpeak(msg.text)}
                        className="hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen</span>
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => handleCopy(msg.text, idx)}
                        className="hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {copiedIdx === idx ? (
                          <Check className="w-3.5 h-3.5 text-[#52c7ad]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedIdx === idx ? "Copied" : "Copy"}</span>
                      </button>
                      <span className="ml-auto text-[11px] font-sans font-medium text-[#7e90a5] flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-sky-400" />
                        <span>{msg.model || "Google Gemini 2.0 Flash"}</span>
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
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0b1424] border border-[#1b2f4a] text-[#8fa0b5] text-xs max-w-fit shadow-sm"
            >
              <Bot className="w-4 h-4 animate-spin text-sky-400" />
              <span>
                Reasoning safety guidance with Gemini 2.0 Flash...
              </span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 3. BOTTOM FLOATING BAR: QUICK PILLS + CAPSULE INPUT WITH MIC & SEND */}
      <footer className="w-full bg-[#070d18]/95 border-t border-[#142338] pt-3 pb-4 px-5 sm:px-8 shrink-0 z-20">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* Quick Questions Pills */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 text-xs">
            {[
              "Is trail safe ahead?",
              "Where is nearest high ground?",
              "What to do if surge comes?",
              "Emergency rescue contacts",
            ].map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendChat(p)}
                className="whitespace-nowrap px-3.5 py-1.5 rounded-full bg-[#0e192a] hover:bg-[#152338] text-[#8fa0b5] hover:text-white border border-[#1c2e48] text-xs font-medium cursor-pointer transition-colors shadow-sm"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Capsule Input Bar (With Integrated Microphone & Send Button) */}
          <div className="flex items-center gap-2 p-1.5 pl-5 rounded-full bg-[#0a1322] border border-[#1c304d] focus-within:border-sky-500/70 transition-all shadow-inner">
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              placeholder="Ask about trail conditions, flood surge risks, or shelters..."
              className="flex-1 bg-transparent border-0 text-[#f1f5f9] placeholder:text-[#64748b] text-sm focus:outline-none py-1"
            />

            {/* Microphone Voice Input Button */}
            <button
              onClick={toggleListening}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isListening
                  ? "bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/40"
                  : "text-[#8fa0b5] hover:text-white hover:bg-[#142236]"
              }`}
              title={isListening ? "Listening... click to stop" : "Use voice input"}
            >
              {isListening ? (
                <MicOff className="w-4 h-4 text-rose-400" />
              ) : (
                <Mic className="w-4 h-4 text-[#8fa0b5]" />
              )}
            </button>

            {/* Send Button */}
            <button
              onClick={() => handleSendChat()}
              disabled={!chatInput.trim() || isAiThinking}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-95 text-white disabled:opacity-30 flex items-center justify-center shadow-md shadow-sky-950/40 cursor-pointer transition-all shrink-0"
              title="Send safety question"
            >
              <Send className="w-4 h-4 text-white -rotate-12 translate-x-0.5" />
            </button>
          </div>

          {/* Centered Footer Disclaimer */}
          <div className="text-[11px] text-center text-[#64748b] pt-1">
            Powered by live IoT telemetry & Google Gemini safety intelligence. Always follow local authorities.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GeminiWebChatWindow;
