import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Loader2, Minimize2, Bot } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
}

interface GeminiChatbotProps {
  activeCorridor?: {
    name: string;
    region: string;
    rainfall: number;
    seismic: number;
    lakeChange: number;
  };
}

const QUICK_PROMPTS = [
  "Is Langtang Valley safe for trekking right now?",
  "What causes Glacial Lake Outburst Floods (GLOF)?",
  "How should we respond to high rainfall alerts?",
  "पहिरोको जोखिम हुँदा के गर्नुपर्छ?",
];

export function GeminiChatbot({ activeCorridor }: GeminiChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      text: "Namaste! I am your HimalSanket AI Hazard Intelligence Assistant. You can ask me questions about mountain corridor hazards, rainfall, seismic warnings, or safety protocols in English or Nepali.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
  }, [messages, isOpen]);

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

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          corridorContext: activeCorridor,
        }),
      });

      const data = await res.json();
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: data.reply || "Sorry, I encountered an issue processing your query.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: "Error connecting to AI service. Please check your connection.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside aria-label="HimalSanket AI Assistant" className="fixed bottom-5 right-5 z-50 flex flex-col items-end font-sans">
      {/* Expanded Chat Box */}
      {isOpen && (
        <section 
          aria-label="Chat window"
          className="mb-3 w-[340px] sm:w-[380px] h-[480px] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-[#2A3B5E] animate-in fade-in slide-in-from-bottom-5 duration-200"
          style={{ background: "#16233F" }}
        >
          {/* Header */}
          <header className="px-4 py-3 bg-[#1C2C4C] border-b border-[#2A3B5E] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2E86AB]/20 border border-[#2E86AB]/40 flex items-center justify-center text-[#2E86AB]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white leading-tight">Gemini Hazard AI</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-[#8CA0BE]">
                    {activeCorridor ? `Active: ${activeCorridor.name}` : "HimalSanket Assistant"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[#8CA0BE] hover:text-white rounded-md hover:bg-white/5 transition-colors"
                title="Minimize chat"
                aria-label="Minimize chat"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[#8CA0BE] hover:text-white rounded-md hover:bg-white/5 transition-colors"
                title="Close chat"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Messages Container */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-[#2A3B5E]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-[#2E86AB]/20 border border-[#2E86AB]/30 flex items-center justify-center shrink-0 mt-0.5 text-[#2E86AB]">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#E4572E] text-white rounded-br-none"
                      : "bg-[#0F1B33] text-[#ECF1F6] border border-[#2A3B5E] rounded-bl-none"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  <div
                    className={`text-[10px] mt-1.5 text-right ${
                      m.role === "user" ? "text-white/70" : "text-[#5E729A]"
                    }`}
                  >
                    {m.time}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-full bg-[#2E86AB]/20 border border-[#2E86AB]/30 flex items-center justify-center shrink-0 text-[#2E86AB]">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-[#0F1B33] text-[#8CA0BE] border border-[#2A3B5E] rounded-2xl rounded-bl-none px-3.5 py-2.5 text-xs flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2E86AB]" />
                  <span>Analyzing mountain intelligence...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions if few messages */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2 pt-1 border-t border-[#2A3B5E]/50 flex gap-1.5 overflow-x-auto no-scrollbar">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="text-[11px] whitespace-nowrap bg-[#0F1B33] hover:bg-[#1C2C4C] text-[#8CA0BE] hover:text-white px-2.5 py-1 rounded-full border border-[#2A3B5E] transition-colors shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <footer className="p-3 bg-[#1C2C4C] border-t border-[#2A3B5E]">
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
                placeholder="Ask about hazards, safety or conditions..."
                className="flex-1 bg-[#0F1B33] border border-[#2A3B5E] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5E729A] focus:outline-none focus:border-[#2E86AB] transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="bg-[#2E86AB] hover:bg-[#287394] text-white p-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </footer>
        </section>
      )}

      {/* Floating Toggle Button - Just AI logo */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close AI Chatbot" : "Open AI Chatbot"}
        className="group relative w-12 h-12 rounded-full bg-[#16233F] hover:bg-[#1C2C4C] text-[#ECF1F6] flex items-center justify-center shadow-2xl border border-[#2A3B5E] hover:border-[#2E86AB] hover:shadow-[#2E86AB]/25 transition-all cursor-pointer"
      >
        <div className="w-8 h-8 rounded-full bg-[#2E86AB]/20 flex items-center justify-center text-[#2E86AB] group-hover:scale-110 transition-transform">
          <Sparkles className="w-4 h-4" />
        </div>
        {!isOpen && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#16233F]" />
        )}
      </button>
    </aside>
  );
}
