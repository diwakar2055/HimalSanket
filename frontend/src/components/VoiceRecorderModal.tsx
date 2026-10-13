import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Square, Play, Pause, AlertTriangle, CheckCircle2, X, Volume2 } from "lucide-react";

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitVoiceReport: (report: {
    category: "water" | "crack" | "sound" | "other";
    transcript: string;
    audioDurationSec: number;
    hazardKeywords: string[];
    calculatedBoost: number;
  }) => void;
  corridorName: string;
}

const HAZARD_LEXICON = [
  { keyword: "पहिरो", category: "crack" as const, label: "Landslide (पहिरो)" },
  { keyword: "landslide", category: "crack" as const, label: "Landslide (Trail Collapse)" },
  { keyword: "ढुङ्गा", category: "crack" as const, label: "Rockfall (ढुङ्गा खस्यो)" },
  { keyword: "crack", category: "crack" as const, label: "Fissure / Crack" },
  { keyword: "पानी बढ्यो", category: "water" as const, label: "Water Rising (पानी बढ्यो)" },
  { keyword: "धमिलो", category: "water" as const, label: "Murky Floodwaters (धमिलो खोला)" },
  { keyword: "flood", category: "water" as const, label: "Flash Flood Surge" },
  { keyword: "rising", category: "water" as const, label: "River Stage Swelling" },
  { keyword: "गडगडाएको", category: "sound" as const, label: "Rumbling Acoustic (गडगडाहट)" },
  { keyword: "rumbling", category: "sound" as const, label: "Subterranean Rumbling" },
  { keyword: "sound", category: "sound" as const, label: "Unusual Canyon Acoustic" },
  { keyword: "गुहार", category: "crack" as const, label: "SOS Distress (गुहार)" },
  { keyword: "trapped", category: "crack" as const, label: "Civilians Trapped" },
];

export function VoiceRecorderModal({
  isOpen,
  onClose,
  onSubmitVoiceReport,
  corridorName,
}: VoiceRecorderModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [detectedKeywords, setDetectedKeywords] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<"water" | "crack" | "sound" | "other">("water");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const speechRecognizerRef = useRef<any>(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    if (!isOpen) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = "ne-NP"; // Default to Nepali; handles mixed English gracefully

      recognizer.onresult = (event: any) => {
        let currentText = "";
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + " ";
        }
        setTranscript(currentText.trim());
      };

      speechRecognizerRef.current = recognizer;
    }

    return () => {
      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.stop();
        } catch (_) {}
      }
    };
  }, [isOpen]);

  // Scan transcript for hazard keywords
  useEffect(() => {
    if (!transcript) return;
    const lower = transcript.toLowerCase();
    const hits: string[] = [];
    let detectedCat: "water" | "crack" | "sound" | "other" | null = null;

    HAZARD_LEXICON.forEach((item) => {
      if (lower.includes(item.keyword.toLowerCase())) {
        if (!hits.includes(item.label)) hits.push(item.label);
        if (!detectedCat) detectedCat = item.category;
      }
    });

    setDetectedKeywords(hits);
    if (detectedCat) setSelectedCategory(detectedCat);
  }, [transcript]);

  const startRecording = async () => {
    audioChunksRef.current = [];
    setTranscript("");
    setDetectedKeywords([]);
    setAudioUrl(null);
    setRecordingTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      if (speechRecognizerRef.current) {
        try {
          speechRecognizerRef.current.start();
        } catch (_) {}
      }

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone access permission was denied or not supported on this device. You can type the observation below.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop();
      } catch (_) {}
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
  };

  // Calculated Boost for Risk Engine: Base 0.18 + voice recording bonus (15%) + keyword bonus (10%)
  const calculatedBoost = parseFloat(
    (0.18 * 1.15 * (detectedKeywords.length > 0 ? 1.1 : 1.0)).toFixed(3)
  );

  const handleSubmit = () => {
    onSubmitVoiceReport({
      category: selectedCategory,
      transcript: transcript || "Voice dispatch recorded from mountain field observation.",
      audioDurationSec: recordingTime || 5,
      hazardKeywords: detectedKeywords,
      calculatedBoost,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#16233f] border border-[#2a3b5e] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-[#111c33] border-b border-[#2a3b5e] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Record Audio Hazard Dispatch</h3>
              <p className="text-xs text-slate-400">Porters, Guides &amp; Residents &bull; {corridorName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {/* Microphone Recording Center */}
          <div className="flex flex-col items-center justify-center p-6 bg-[#0f172a] rounded-xl border border-white/10 text-center">
            <div className="relative mb-3">
              {isRecording && (
                <div className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
              )}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer ${
                  isRecording
                    ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                    : "bg-teal-600 hover:bg-teal-500 text-white"
                }`}
              >
                {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-7 h-7" />}
              </button>
            </div>

            <div className="text-sm font-semibold text-white">
              {isRecording ? `Recording Audio... ${recordingTime}s` : audioUrl ? `Recorded (${recordingTime}s)` : "Click to Speak in Nepali or English"}
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {isRecording
                ? "Speak clearly into your microphone about water rise, trail cracks, or unusual rockfall."
                : "Captures instant voice report with speech-to-text keyword extraction."}
            </p>

            {audioUrl && (
              <div className="mt-3 w-full max-w-xs">
                <audio controls src={audioUrl} className="w-full h-8" />
              </div>
            )}
          </div>

          {/* Real-Time Live Transcript */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Live Speech Transcript (Nepali / English):
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="e.g. खोला धमिलो भएर एकदमै तीव्र गतिमा बढ्दै छ, माथिबाट पहिरोको गडगडाएको आवाज आयो... (The river is rising fast with dark mud...)"
              className="w-full bg-[#0b131e] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-400 min-h-[70px] resize-none"
            />
          </div>

          {/* Detected Hazard Keywords */}
          {detectedKeywords.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="text-xs font-bold text-red-400 flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Detected Acute Danger Indicators:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detectedKeywords.map((k, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 font-semibold"
                  >
                    ✓ {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Category Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Observation Category:</label>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {(["water", "crack", "sound", "other"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`py-2 px-1 rounded-lg border text-center font-medium capitalize transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-teal-600 border-teal-400 text-white font-semibold"
                      : "bg-[#0f172a] border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {cat === "water" ? "🌊 Water" : cat === "crack" ? "⚠️ Landslide" : cat === "sound" ? "🔊 Acoustic" : "📝 Other"}
                </button>
              ))}
            </div>
          </div>

          {/* Score Impact Preview */}
          <div className="flex items-center justify-between p-2.5 bg-[#0b131e] rounded-lg border border-white/5 text-xs">
            <span className="text-slate-400">Risk Engine Signal Contribution:</span>
            <span className="font-bold text-emerald-400 font-mono">+{calculatedBoost} Points Boost</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#111c33] border-t border-[#2a3b5e] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!transcript && !audioUrl}
            className={`px-5 py-2 rounded-lg text-xs font-bold text-white shadow-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              transcript || audioUrl
                ? "bg-teal-600 hover:bg-teal-500"
                : "bg-slate-700 opacity-50 cursor-not-allowed"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" /> Submit Verified Voice Dispatch
          </button>
        </div>
      </div>
    </div>
  );
}
