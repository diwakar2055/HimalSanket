import React, { useState, useCallback } from "react";
import { Radio, Mic, Compass, AlertOctagon, CheckCircle2, Shield, Volume2 } from "lucide-react";
import { VoiceRecorderModal } from "./VoiceRecorderModal";
import { Language, getTranslation } from "../data/localization";
import { playEmergencyChime, playConfirmationBeep } from "../utils/audioAlert";

const SIGNAL_LEVELS = [
  { id: "none", label: "No signal (0 bars)", desc: "Store & Forward mode" },
  { id: "weak", label: "Weak signal (1 bar)", desc: "Burst GPS ping only" },
  { id: "strong", label: "Strong signal (3G/4G)", desc: "Full voice & imagery" },
];

const SEVERITY_KEYWORDS = ["injured", "hurt", "bleeding", "blood", "can't move", "cannot move", "leg", "trapped", "pain", "broken", "पहिरो", "घाइते", "च्यापिएको"];

interface SOSBeaconPanelProps {
  addSOSReport: (r: any) => void;
  userPosition: { lat: number; lng: number; accuracy?: number; altitude?: number } | null;
  onLocateMe?: () => void;
  audioMuted?: boolean;
  language?: Language;
}

export function SOSBeaconPanel({
  addSOSReport,
  userPosition,
  onLocateMe,
  audioMuted = false,
  language = "en",
}: SOSBeaconPanelProps) {
  const [corridorName, setCorridorName] = useState("Langtang Valley");
  const [transcript, setTranscript] = useState("");
  const [photoAttached, setPhotoAttached] = useState(false);
  const [signal, setSignal] = useState("weak");
  const [log, setLog] = useState<string[]>([]);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const currentGpsStr = userPosition
    ? `${userPosition.lat.toFixed(4)}° N, ${userPosition.lng.toFixed(4)}° E (~${Math.round(userPosition.altitude || 2780)}m)`
    : "28.2140° N, 85.4950° E (~2780m)";

  const send = useCallback(() => {
    if (!audioMuted) {
      playEmergencyChime();
    }

    const time = new Date().toLocaleTimeString();
    const entries: string[] = [];

    entries.push(`[${time}] 🚨 High-Priority SOS Beacon transmitted (${currentGpsStr})`);
    if (signal === "none") {
      entries.push(`[${time}] Offline mesh mode — voice transcript and photo queued locally in offline storage`);
    } else if (signal === "weak") {
      entries.push(`[${time}] Weak 2G cell — coordinates delivered to APF command. Voice payload queued for burst transmission`);
    } else {
      if (transcript.trim()) entries.push(`[${time}] Full voice dispatch delivered (${transcript.trim().split(/\s+/).length} words)`);
      if (photoAttached) entries.push(`[${time}] Hazard photo attachment transmitted`);
    }
    setLog((prev) => [...entries, ...prev]);

    const severityHit = SEVERITY_KEYWORDS.some((k) => transcript.toLowerCase().includes(k));
    const gotFullPayload = signal === "strong";
    let priority = 85;
    if (severityHit) priority += 10;
    if (!gotFullPayload) priority -= 10;
    priority = Math.min(priority, 100);

    const detailParts = [`GPS: ${currentGpsStr}`];
    detailParts.push(gotFullPayload ? "full report received" : signal === "weak" ? "location only — media queued" : "mesh retrying");
    if (transcript.trim()) detailParts.push(`"${transcript.trim().slice(0, 60)}${transcript.trim().length > 60 ? "…" : ""}"`);

    const coords = userPosition ? { lat: userPosition.lat, lng: userPosition.lng } : { lat: 28.2140, lng: 85.4950 };

    addSOSReport({
      name: `SOS — Trekker in ${corridorName}`,
      detail: detailParts.join(" · "),
      priority,
      lat: coords.lat,
      lng: coords.lng,
    });
  }, [audioMuted, currentGpsStr, signal, transcript, photoAttached, userPosition, corridorName, addSOSReport]);

  return (
    <div className="flex-1 px-4 sm:px-8 py-7 overflow-y-auto space-y-6">
      {/* Alert Header Banner */}
      <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-3.5 shadow-xl">
        <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5">
          <AlertOctagon className="w-5 h-5 animate-pulse" />
        </div>
        <div className="text-xs text-[#ECF1F6] leading-relaxed">
          <strong className="text-rose-300">Tactical Victim Rescue Beacon (Nepal Army &amp; APF Command Relay).</strong>
          {" "}In sudden glacial surges or catastrophic rock avalanches, every second matters. Clicking the emergency SOS button compresses your exact GPS coordinates into a minimal byte payload that transmits even through single-bar 2G cell signals or offline delay-tolerant radio repeaters.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Beacon Controls Card */}
        <div className="p-5 rounded-2xl border border-[#2A3B5E] bg-[#16233F] shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#2A3B5E]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8CA0BE]">
              Telemetry &amp; Coordinates
            </span>
            {onLocateMe && (
              <button
                onClick={() => {
                  playConfirmationBeep();
                  onLocateMe();
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Update GPS</span>
              </button>
            )}
          </div>

          <div className="p-3 rounded-xl bg-[#0F1B33] border border-[#2A3B5E] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-mono text-[#8CA0BE]">Current Coordinates</div>
              <div className="text-sm font-mono font-bold text-cyan-300">📍 {currentGpsStr}</div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              HDOP ±15m
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-[#8CA0BE] uppercase tracking-wider">
                Voice Note / Emergency Description
              </label>
              <button
                onClick={() => {
                  playConfirmationBeep();
                  setIsVoiceModalOpen(true);
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>🎙️ Record Voice Note</span>
              </button>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Describe injuries, trapped persons, landmarks (e.g. 'Avlanche blocked trail, 2 injured near bamboo lodge')..."
              className="w-full text-xs p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 bg-[#0F1B33] text-white border border-[#2A3B5E] resize-none"
              rows={3}
            />
          </div>

          <div>
            <button
              onClick={() => {
                playConfirmationBeep();
                setPhotoAttached((v) => !v);
              }}
              className={`w-full text-xs p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                photoAttached
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-semibold"
                  : "bg-[#0F1B33] border-[#2A3B5E] text-[#8CA0BE] hover:text-white"
              }`}
            >
              <span>{photoAttached ? "✓ Photo of Surroundings Attached (Camera Sensed)" : "○ Attach Photo of Surroundings"}</span>
              <span className="text-[10px] font-mono text-[#5E729A]">{photoAttached ? "Ready" : "Optional"}</span>
            </button>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#8CA0BE] uppercase tracking-wider block mb-1.5">
              Simulated Field Connectivity Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SIGNAL_LEVELS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    playConfirmationBeep();
                    setSignal(s.id);
                  }}
                  className={`p-2.5 rounded-xl text-center border text-xs transition-all cursor-pointer ${
                    signal === s.id
                      ? "bg-orange-500/20 border-orange-500 text-white font-bold"
                      : "bg-[#0F1B33] border-[#2A3B5E] text-[#8CA0BE] hover:text-white"
                  }`}
                >
                  <div>{s.label}</div>
                  <div className="text-[9px] text-[#8CA0BE] mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={send}
            className="w-full text-sm font-black py-4 rounded-xl cursor-pointer hover:opacity-95 transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-2xl shadow-rose-950/80 active:scale-[0.99]"
          >
            <Radio className="w-5 h-5 animate-ping" />
            <span>BROADCAST EMERGENCY SOS BEACON NOW</span>
          </button>
        </div>

        {/* Transmission Terminal Log Card */}
        <div className="p-5 rounded-2xl border border-[#2A3B5E] bg-[#16233F] shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#2A3B5E]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8CA0BE]">
                Satellite / Cellular Transmission Log
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                Encrypted SOS Channel
              </span>
            </div>

            {log.length === 0 ? (
              <div className="py-20 text-center text-xs text-[#8CA0BE]">
                No emergency signals dispatched yet. Click the red SOS button to test transmission logging.
              </div>
            ) : (
              <div className="space-y-2 mt-3 max-h-[360px] overflow-y-auto">
                {log.map((entry, i) => (
                  <div
                    key={i}
                    className="text-xs p-2.5 rounded-lg font-mono border border-[#2A3B5E] bg-[#0F1B33] text-emerald-400"
                  >
                    {entry}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-[#0F1B33] border border-[#2A3B5E] text-[11px] text-[#8CA0BE] flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Automatic fallback to VHF Radio 144.390 MHz &amp; Inmarsat D+ satellite burst if no cell towers found.</span>
          </div>
        </div>
      </div>

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSubmitVoiceReport={(report) => {
          setTranscript(report.transcript);
          setIsVoiceModalOpen(false);
        }}
        corridorName={corridorName}
      />
    </div>
  );
}
