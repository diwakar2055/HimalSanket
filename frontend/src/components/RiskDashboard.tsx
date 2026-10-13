import React, { useState, useMemo, useCallback } from "react";
import { LeafletHazardMap } from "./LeafletHazardMap";
import { TelemetryGauges } from "./TelemetryGauges";
import { VoiceRecorderModal } from "./VoiceRecorderModal";
import {
  CORRIDOR_CONFIGS,
  MAP_ASSETS,
  MapAsset,
  CORRIDOR_SENTINEL_LAKES,
} from "../data/hazardMapData";
import { LiveTelemetryResponse } from "../services/riskEngineApi";
import { Language, getTranslation } from "../data/localization";
import { playConfirmationBeep } from "../utils/audioAlert";
import { synthesizeDynamicGeminiBriefing } from "../utils/geminiReasoner";
import { playHazardVoiceBroadcast } from "../utils/speechSynthesizer";
import {
  Users,
  GraduationCap,
  Route,
  HeartPulse,
  X,
  Shield,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
  Satellite,
  Waves,
  Activity,
  AlertTriangle,
  Volume2,
  Navigation,
  Radio,
  Mic,
  Compass,
  MapPin,
  Bot,
  MessageSquare,
  TrendingDown,
  FileText,
} from "lucide-react";
import { ValleyElevationProfileModal } from "./ValleyElevationProfileModal";
import { SitrepExportModal } from "./SitrepExportModal";

const TIER: Record<string, { color: string; label: string; ne: string }> = {
  Low: { color: "#10B981", label: "Low", ne: "न्यून" },
  Moderate: { color: "#F59E0B", label: "Moderate", ne: "मध्यम" },
  High: { color: "#F97316", label: "High", ne: "उच्च" },
  Critical: { color: "#EF4444", label: "Critical", ne: "गम्भीर" },
};

const REPORT_TYPES = [
  { id: "water", label: "Water rising" },
  { id: "crack", label: "Trail cracking" },
  { id: "sound", label: "Unusual sound" },
  { id: "other", label: "Other anomaly" },
];

interface RiskDashboardProps {
  corridors: any[];
  setCorridors: React.Dispatch<React.SetStateAction<any[]>>;
  selectedId: string;
  setSelectedId: (id: string) => void;
  selectedRisk: any;
  liveData: LiveTelemetryResponse | null;
  isSensingSyncing: boolean;
  syncLiveTelemetry: (corridorId: string) => Promise<void>;
  handleTriggerScenario: (scenarioId: string) => Promise<void>;
  activeScenario: string;
  waterSurge: number;
  setWaterSurge: (surge: number) => void;
  userPosition: { lat: number; lng: number; accuracy?: number; altitude?: number } | null;
  setUserPosition: React.Dispatch<React.SetStateAction<{ lat: number; lng: number; accuracy?: number; altitude?: number } | null>>;
  sosDistresses: any[];
  onTriggerSOS: (customNote?: string) => void;
  onLocateMe: () => void;
  isLocating: boolean;
  distanceToHazard: number | null;
  geofenceStatus: string;
  onInspectLake: () => void;
  language: Language;
}

export function RiskDashboard({
  corridors,
  setCorridors,
  selectedId,
  setSelectedId,
  selectedRisk,
  liveData,
  isSensingSyncing,
  syncLiveTelemetry,
  handleTriggerScenario,
  activeScenario,
  waterSurge,
  setWaterSurge,
  userPosition,
  setUserPosition,
  sosDistresses,
  onTriggerSOS,
  onLocateMe,
  isLocating,
  distanceToHazard,
  geofenceStatus,
  onInspectLake,
  language,
}: RiskDashboardProps) {
  // Tactical Drawer Active Tab (Corridors | Gemini AI | Field Reports)
  const [activeSideTab, setActiveSideTab] = useState<"corridors" | "gemini" | "reports">("gemini");
  const [reportDraftType, setReportDraftType] = useState<string | null>(null);
  const [reportNote, setReportNote] = useState("");
  const [voiceAttached, setVoiceAttached] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MapAsset | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);
  const [isSpeakingGemini, setIsSpeakingGemini] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showSitrepModal, setShowSitrepModal] = useState<boolean>(false);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);

  const [activeLayers, setActiveLayers] = useState({
    people: true,
    school: true,
    bridge: true,
    hospital: true,
    dam: true,
    safeZone: true,
    hazardZone: true,
  });

  const selected = useMemo(() => {
    return corridors.find((c) => c.id === selectedId) || corridors[0];
  }, [corridors, selectedId]);

  const dynamicGemini = useMemo(() => {
    return synthesizeDynamicGeminiBriefing(selected, selectedRisk, liveData, activeScenario, waterSurge);
  }, [selected, selectedRisk, liveData, activeScenario, waterSurge]);

  const currentCorridorConfig = useMemo(() => {
    return CORRIDOR_CONFIGS[selectedId] || CORRIDOR_CONFIGS.langtang;
  }, [selectedId]);

  const currentCorridorAllAssets = useMemo(() => {
    return MAP_ASSETS.filter((a) => a.corridorId === selectedId);
  }, [selectedId]);

  const currentCorridorAssets = useMemo(() => {
    return currentCorridorAllAssets.filter((a) => activeLayers[a.type as keyof typeof activeLayers] !== false);
  }, [currentCorridorAllAssets, activeLayers]);

  const getDynamicStatus = useCallback(
    (asset: MapAsset): "safe" | "advisory" | "critical" => {
      if (waterSurge === 0) return asset.status;
      const buffer = asset.hazardThresholdMeters - waterSurge;
      if (buffer <= 0) return "critical";
      if (buffer <= 1.2) return "critical";
      if (buffer <= 2.5) return "advisory";
      return "safe";
    },
    [waterSurge]
  );

  const simulateSpike = useCallback((id: string) => {
    playConfirmationBeep();
    setCorridors((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              rainfall: Math.min(c.rainfall + 65, 220),
              lakeChange: c.lakeChange + 6,
              seismic: c.seismic + 1.6,
            }
          : c
      )
    );
    setWaterSurge(2.0);
  }, [setCorridors, setWaterSurge]);

  const resetCorridor = useCallback((id: string) => {
    playConfirmationBeep();
    setWaterSurge(0);
    setSelectedAsset(null);
    handleTriggerScenario("baseline");
  }, [handleTriggerScenario, setWaterSurge]);

  const submitReport = useCallback(() => {
    if (!reportDraftType) return;
    playConfirmationBeep();
    const label = REPORT_TYPES.find((t) => t.id === reportDraftType)?.label;
    setCorridors((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? {
              ...c,
              reports: [
                {
                  id: Date.now(),
                  label,
                  note: reportNote,
                  voice: voiceAttached,
                  time: new Date(),
                },
                ...c.reports,
              ],
            }
          : c
      )
    );
    setReportDraftType(null);
    setReportNote("");
    setVoiceAttached(false);
  }, [reportDraftType, reportNote, voiceAttached, selectedId, setCorridors]);

  const tierKey = (selectedRisk?.tier || "Low") as keyof typeof TIER;
  const tierInfo = TIER[tierKey] || TIER.Low;

  return (
    <div className="flex-1 px-3 sm:px-6 py-3.5 overflow-y-auto space-y-3">
      {/* 1. Ultra-Compact Integrated Top Control Bar (Only ~44px height) */}
      <div className="p-2 rounded-xl border border-[#2A3B5E] bg-[#16233F]/90 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
        {/* Left: Active Corridor Meta & Risk Badge */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white flex items-center gap-1.5">
              <span>📍 {selected.name}</span>
            </span>
            <span className="text-[10px] font-mono text-[#64748B] hidden sm:inline">
              ({selected.region} &bull; {selected.gps})
            </span>
          </div>

          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
            style={{
              background: `${tierInfo.color}20`,
              color: tierInfo.color,
              borderColor: `${tierInfo.color}50`,
            }}
          >
            {tierInfo.label.toUpperCase()} RISK {language === "ne" ? `(${tierInfo.ne})` : ""}
          </span>
        </div>

        {/* Center / Right: 1-Click Presentation Scenario Pills & Quick Controls */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold mr-1 hidden lg:inline">
            Scenarios:
          </span>

          {/* Baseline */}
          <button
            onClick={() => {
              playConfirmationBeep();
              handleTriggerScenario("baseline");
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              activeScenario === "baseline"
                ? "bg-cyan-500/25 border-cyan-400 text-white shadow-sm"
                : "bg-[#0F1B33] border-[#2A3B5E] text-[#94A3B8] hover:text-white"
            }`}
            title="All environmental telemetry normal"
          >
            <span>🔄</span> <span>Baseline</span>
          </button>

          {/* Cloudburst */}
          <button
            onClick={() => {
              playConfirmationBeep();
              handleTriggerScenario("cloudburst_spike");
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              activeScenario === "cloudburst_spike"
                ? "bg-orange-500/25 border-orange-500 text-white shadow-sm"
                : "bg-[#0F1B33] border-[#2A3B5E] text-[#94A3B8] hover:text-white"
            }`}
            title="Simulate 118mm precipitation cloudburst spike"
          >
            <span>🌧️</span> <span>Cloudburst</span>
          </button>

          {/* Seismic */}
          <button
            onClick={() => {
              playConfirmationBeep();
              handleTriggerScenario("seismic_tremor");
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              activeScenario === "seismic_tremor"
                ? "bg-amber-500/25 border-amber-500 text-white shadow-sm"
                : "bg-[#0F1B33] border-[#2A3B5E] text-[#94A3B8] hover:text-white"
            }`}
            title="Simulate USGS 3.6M shallow tremor"
          >
            <span>⚡</span> <span>USGS 3.6M</span>
          </button>

          {/* GLOF */}
          <button
            onClick={() => {
              playConfirmationBeep();
              handleTriggerScenario("glof_lake_expansion");
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              activeScenario === "glof_lake_expansion"
                ? "bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-sm"
                : "bg-[#0F1B33] border-[#2A3B5E] text-[#94A3B8] hover:text-white"
            }`}
            title="Simulate Sentinel-2 +14.8% lake growth"
          >
            <span>🛰️</span> <span>GLOF Surge</span>
          </button>

          {/* Cascade */}
          <button
            onClick={() => {
              playConfirmationBeep();
              handleTriggerScenario("critical_cascade");
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              activeScenario === "critical_cascade"
                ? "bg-rose-500/30 border-rose-500 text-rose-200 shadow-sm"
                : "bg-[#0F1B33] border-[#2A3B5E] text-[#94A3B8] hover:text-white"
            }`}
            title="Simulate combined multi-hazard breach"
          >
            <span>🚨</span> <span>Cascade</span>
          </button>

          {/* Quick Simulate Spike */}
          <button
            onClick={() => simulateSpike(selected.id)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#E4572E] hover:bg-orange-600 text-white shadow cursor-pointer transition-colors"
            title="Spike rainfall by 65mm immediately"
          >
            Spike +65mm
          </button>

          {/* Reset */}
          <button
            onClick={() => resetCorridor(selected.id)}
            className="px-2 py-1 rounded-lg text-xs text-[#94A3B8] hover:text-white bg-[#0F1B33] border border-[#2A3B5E] cursor-pointer transition-colors"
            title="Reset telemetry baseline"
          >
            Reset
          </button>

          {/* Sync Feeds */}
          <button
            onClick={() => {
              playConfirmationBeep();
              syncLiveTelemetry(selectedId);
            }}
            disabled={isSensingSyncing}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1C2C4C] hover:bg-[#2A3B5E] text-white border border-[#2A3B5E] cursor-pointer disabled:opacity-50"
            title="Poll real-time sensor APIs"
          >
            <RefreshCw className={`w-3 h-3 ${isSensingSyncing ? "animate-spin text-cyan-400" : "text-[#94A3B8]"}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* 2. Geofence Danger Banner (Rendered only when trekker < 150m to active hazard) */}
      {distanceToHazard !== null && distanceToHazard < 150 && (
        <div className="p-3 rounded-xl border border-rose-500/80 bg-rose-950/80 shadow-xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-600 text-white shrink-0">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span className="text-rose-300 uppercase tracking-wider font-mono">
                  🚨 GEOFENCE ALERT ({distanceToHazard}m TO PATH)
                </span>
                <span className="text-[#94A3B8] text-[11px] hidden sm:inline">
                  Climb &ge;30m uphill immediately to high granite bedrock terraces!
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onTriggerSOS(`Geofence Alert: Trekker is ${distanceToHazard}m from active hazard path!`)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Radio className="w-3.5 h-3.5 animate-ping" />
            <span>1-Click SOS</span>
          </button>
        </div>
      )}

      {/* 3. Sleek Telemetry HUD Ticker Strip (Only ~44px height) */}
      <TelemetryGauges
        corridor={selected}
        risk={selectedRisk}
        language={language}
        onInspectSentinelLake={onInspectLake}
        defaultCompact={true}
      />

      {/* 4. Main Hero GIS Command Stage (Balanced 4-col / 8-col split & ~530px ergonomic height) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Left Column (4 cols on lg: 33% width): Balanced Tabbed Tactical Drawer */}
        <div className="lg:col-span-4 rounded-2xl border border-[#2A3B5E] bg-[#16233F] shadow-xl flex flex-col h-[480px] sm:h-[510px] lg:h-[530px] xl:h-[540px] overflow-hidden">
          {/* Tactical Drawer Segmented Tabs */}
          <div className="p-2 border-b border-[#2A3B5E] bg-[#0F1B33] flex items-center justify-between gap-1">
            <button
              onClick={() => setActiveSideTab("corridors")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeSideTab === "corridors"
                  ? "bg-[#2E86AB] text-white shadow"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <MapPin className="w-3 h-3" />
              <span>Corridors</span>
            </button>

            <button
              onClick={() => setActiveSideTab("gemini")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeSideTab === "gemini"
                  ? "bg-[#2E86AB] text-white shadow"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Bot className="w-3 h-3 text-cyan-300" />
              <span>Gemini AI</span>
            </button>

            <button
              onClick={() => setActiveSideTab("reports")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeSideTab === "reports"
                  ? "bg-[#2E86AB] text-white shadow"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Dispatches</span>
            </button>
          </div>

          {/* Drawer Body (Scrollable & perfectly framed) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* TAB 1: Corridors Switcher */}
            {activeSideTab === "corridors" && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                  Active Monitoring Corridors (4)
                </div>
                {corridors.map((c) => {
                  const isActive = c.id === selectedId;
                  const r = c.id === selectedId ? selectedRisk : { tier: "Low" };
                  const t = TIER[r.tier] || TIER.Low;

                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        playConfirmationBeep();
                        setSelectedId(c.id);
                        setSelectedAsset(null);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#1C2C4C] border border-cyan-500/60 shadow"
                          : "bg-[#0F1B33]/60 border border-transparent hover:bg-[#1C2C4C]/50"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{c.name}</div>
                        <div className="text-[10px] text-[#64748B]">{c.region} &bull; {c.rainfall}mm rain</div>
                      </div>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
                        style={{
                          background: `${t.color}20`,
                          color: t.color,
                          borderColor: `${t.color}50`,
                        }}
                      >
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB 2: Grounded Gemini 2.0 Flash Reasoning */}
            {activeSideTab === "gemini" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Gemini 2.0 Flash</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border"
                      style={{
                        backgroundColor: `${TIER[dynamicGemini.tier]?.color || "#10B981"}20`,
                        borderColor: `${TIER[dynamicGemini.tier]?.color || "#10B981"}60`,
                        color: TIER[dynamicGemini.tier]?.color || "#10B981",
                      }}
                    >
                      {dynamicGemini.tier.toUpperCase()}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Live Synthesis
                    </span>
                  </div>
                </div>

                {/* Sensed telemetry indicators summary */}
                <div className="flex items-center justify-between text-[10px] font-mono px-2 py-1 rounded bg-[#091122] border border-[#1E2D4A] text-[#8CA0BE]">
                  <span>🌧️ {selected.rainfall}mm</span>
                  <span>⚡ {selected.seismic.toFixed(1)}M</span>
                  <span>🌊 +{selected.lakeChange}%</span>
                  {waterSurge > 0 && <span className="text-cyan-400">💧 +{waterSurge.toFixed(1)}m</span>}
                </div>

                <div className="p-3 rounded-xl bg-[#0F1B33] border border-[#2A3B5E] text-xs text-white leading-relaxed">
                  {language === "ne" ? dynamicGemini.briefing_ne : dynamicGemini.briefing_en}
                </div>

                {dynamicGemini.action_directive && (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-300 leading-snug">
                    ⚡ DIRECTIVE: {dynamicGemini.action_directive}
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (isSpeakingGemini) {
                        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                        setIsSpeakingGemini(false);
                      } else {
                        playHazardVoiceBroadcast({
                          text: language === "ne" ? dynamicGemini.briefing_ne : dynamicGemini.briefing_en,
                          isNepali: language === "ne",
                          rate: voiceSpeed,
                          romanizedFallback: dynamicGemini.sms_alert_romanized,
                          onStart: () => setIsSpeakingGemini(true),
                          onEnd: () => setIsSpeakingGemini(false),
                          onError: () => setIsSpeakingGemini(false),
                        });
                      }
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isSpeakingGemini
                        ? "bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse shadow-lg shadow-rose-900/30"
                        : "bg-cyan-950/80 text-cyan-300 border border-cyan-800 hover:bg-cyan-900"
                    }`}
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${isSpeakingGemini ? "text-rose-300 animate-bounce" : ""}`} />
                    <span>
                      {isSpeakingGemini
                        ? language === "ne"
                          ? "⏹️ प्रसारण रोक्नुहोस्"
                          : "⏹️ Stop Broadcast"
                        : language === "ne"
                        ? "🔊 ध्वनि प्रसारण"
                        : "🔊 Voice Broadcast"}
                    </span>
                  </button>

                  {/* Speech playback speed toggle */}
                  <div className="flex items-center gap-1 px-1.5 py-1 rounded-xl bg-[#0F1B33] border border-[#2A3B5E] text-[10px]">
                    {[0.9, 1.0, 1.1].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setVoiceSpeed(s)}
                        className={`px-1.5 py-0.5 rounded font-mono cursor-pointer transition-colors ${
                          voiceSpeed === s
                            ? "bg-cyan-500 text-slate-950 font-bold"
                            : "text-[#94A3B8] hover:text-white"
                        }`}
                        title={`Playback speed: ${s}x`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Field Ground Dispatches */}
            {activeSideTab === "reports" && (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  Submit Field Dispatch
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {REPORT_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        playConfirmationBeep();
                        setReportDraftType(t.id);
                      }}
                      className={`text-xs px-2 py-1.5 rounded-lg text-left border transition-all cursor-pointer ${
                        reportDraftType === t.id
                          ? "bg-cyan-500/30 border-cyan-400 text-white font-semibold"
                          : "bg-[#0F1B33] border-[#2A3B5E] text-[#94A3B8] hover:text-white"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="Observation notes or record voice..."
                  className="w-full text-xs p-2 rounded-xl bg-[#0F1B33] text-white border border-[#2A3B5E] resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  rows={2}
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      playConfirmationBeep();
                      setIsVoiceModalOpen(true);
                    }}
                    className="flex-1 text-xs py-1.5 px-2 rounded-xl border border-[#2A3B5E] bg-[#0F1B33] hover:bg-[#1C2C4C] text-cyan-300 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Mic className="w-3 h-3" />
                    <span>{voiceAttached ? "● Voice Added" : "🎙️ Voice Note"}</span>
                  </button>

                  <button
                    onClick={submitReport}
                    disabled={!reportDraftType}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E4572E] text-white shadow cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  >
                    Submit
                  </button>
                </div>

                {selected.reports.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-[#2A3B5E]">
                    <div className="text-[10px] uppercase font-bold text-[#64748B]">Recent Crowd Notes:</div>
                    {selected.reports.map((r: any) => (
                      <div key={r.id} className="text-[11px] p-2 rounded-lg bg-[#0F1B33] border border-[#2A3B5E] flex justify-between items-center text-[#94A3B8]">
                        <span className="truncate mr-2">
                          <strong className="text-white">{r.label}</strong>
                          {r.note ? ` — ${r.note}` : ""}
                        </span>
                        <span className="text-[9px] font-mono text-[#64748B] shrink-0">
                          {r.time ? new Date(r.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Hero Leaflet GIS Map: Balanced 67% Width & ~530px Height) */}
        <div className={`lg:col-span-8 rounded-2xl border border-[#2A3B5E] bg-[#16233F] shadow-2xl flex flex-col justify-between overflow-hidden relative ${
          isMapExpanded ? "fixed inset-3 z-50 h-[calc(100vh-24px)]" : "h-[480px] sm:h-[510px] lg:h-[530px] xl:h-[540px]"
        } transition-all duration-300`}>
          {/* Floating Top HUD Bar Over Map: Layer Pills & Surge Slider */}
          <div className="p-2.5 bg-[#0F1B33]/90 border-b border-[#2A3B5E] flex items-center justify-between flex-wrap gap-2 z-10 backdrop-blur-md">
            {/* GIS Layer Toggles */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold mr-1">
                Layers:
              </span>
              <button
                onClick={() => setActiveLayers((p) => ({ ...p, people: !p.people }))}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                  activeLayers.people ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-transparent text-[#64748B] border-[#2A3B5E]"
                }`}
              >
                <Users className="w-2.5 h-2.5" /> Settlements
              </button>
              <button
                onClick={() => setActiveLayers((p) => ({ ...p, bridge: !p.bridge }))}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                  activeLayers.bridge ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-transparent text-[#64748B] border-[#2A3B5E]"
                }`}
              >
                <Route className="w-2.5 h-2.5" /> Bridges
              </button>
              <button
                onClick={() => setActiveLayers((p) => ({ ...p, school: !p.school }))}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                  activeLayers.school ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-transparent text-[#64748B] border-[#2A3B5E]"
                }`}
              >
                <GraduationCap className="w-2.5 h-2.5" /> Schools
              </button>
              <button
                onClick={() => setActiveLayers((p) => ({ ...p, hospital: !p.hospital }))}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                  activeLayers.hospital ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-transparent text-[#64748B] border-[#2A3B5E]"
                }`}
              >
                <HeartPulse className="w-2.5 h-2.5" /> Clinics
              </button>
              <button
                onClick={() => setActiveLayers((p) => ({ ...p, safeZone: !p.safeZone }))}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                  activeLayers.safeZone ? "bg-emerald-600/20 text-emerald-300 border-emerald-600/40" : "bg-transparent text-[#64748B] border-[#2A3B5E]"
                }`}
              >
                <span>🛡️ Safe Havens</span>
              </button>
            </div>

            {/* Right Controls: Valley Profile + SITREP + Surge Slider + Maximize */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg border border-cyan-800 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                title="Inspect longitudinal river profile & flood wave velocity"
              >
                <TrendingDown className="w-3 h-3 text-cyan-400" />
                <span>Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSitrepModal(true)}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-800 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                title="Export official Situation Report (SITREP) & satellite SMS"
              >
                <FileText className="w-3 h-3 text-emerald-400" />
                <span>SITREP</span>
              </button>

              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-[#2A3B5E] bg-[#16233F]">
                <SlidersHorizontal className="w-3 h-3 text-orange-400" />
                <span className="text-[10px] text-[#94A3B8]">Surge:</span>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={waterSurge}
                  onChange={(e) => setWaterSurge(parseFloat(e.target.value))}
                  className="w-14 accent-[#E4572E] cursor-pointer"
                />
                <span className="font-mono text-[10px] font-bold text-orange-400">
                  +{waterSurge.toFixed(1)}m
                </span>
              </div>

              <button
                onClick={() => setIsMapExpanded((prev) => !prev)}
                className="p-1 rounded-lg border border-[#2A3B5E] bg-[#1C2C4C] hover:border-white/40 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                title={isMapExpanded ? "Compact map view" : "Maximize map view"}
              >
                {isMapExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Full Interactive Leaflet Map Canvas */}
          <div className="flex-1 w-full h-full relative overflow-hidden">
            <LeafletHazardMap
              corridor={currentCorridorConfig}
              assets={currentCorridorAssets}
              selectedAsset={selectedAsset}
              onSelectAsset={setSelectedAsset}
              activeLayers={activeLayers}
              simulatedWaterRise={waterSurge}
              getDynamicStatus={getDynamicStatus}
              seismicMagnitude={liveData?.seismic_waveform?.magnitude ?? selected.seismic}
              seismicEpicenter={liveData?.seismic_waveform?.epicenter ?? { lat: 28.2250, lng: 85.4800, label: "Langtang Gorge Tremor", depth_km: 10 }}
              lakeAreaChangePct={liveData?.corridor?.lake_area_change ?? selected.lakeChange}
              onInspectSentinelLake={onInspectLake}
              userPosition={userPosition}
              sosDistresses={sosDistresses}
              onLocateMe={onLocateMe}
              isLocating={isLocating}
              className="h-full w-full"
            />

            {/* Asset Inspector HUD Floating Card (Positioned bottom-left of map) */}
            {selectedAsset && (
              <div className="absolute bottom-14 left-4 z-[1000] w-72 p-3.5 rounded-2xl border border-[#2A3B5E] shadow-2xl backdrop-blur-md bg-[#16233F]/95 text-xs animate-in fade-in duration-200">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">
                      {selectedAsset.type}
                    </span>
                    <h4 className="font-bold text-white text-sm leading-tight">{selectedAsset.name}</h4>
                  </div>
                  <button onClick={() => setSelectedAsset(null)} className="text-[#94A3B8] hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className={`flex items-center justify-between mb-2 py-0.5 px-2 rounded-lg font-bold text-[10px] ${
                  getDynamicStatus(selectedAsset) === "critical" ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : getDynamicStatus(selectedAsset) === "advisory" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                }`}>
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Status: {getDynamicStatus(selectedAsset).toUpperCase()}</span>
                  <span>{selectedAsset.elevation}m ASL</span>
                </div>

                <p className="text-[#94A3B8] text-[11px] leading-relaxed mb-2 line-clamp-2">{selectedAsset.description}</p>
                <div className="text-[10px] font-mono text-[#64748B] flex justify-between border-t border-[#2A3B5E] pt-1.5">
                  <span>GPS: {selectedAsset.gps}</span>
                  <span>Safety Margin: +{selectedAsset.hazardThresholdMeters}m</span>
                </div>
              </div>
            )}
          </div>

          {/* Floating Bottom HUD Bar Over Map: Live Trekker Radar Toolbar */}
          <div className="p-2 bg-[#0F1B33]/90 border-t border-[#2A3B5E] flex items-center justify-between flex-wrap gap-2 z-10 backdrop-blur-md text-xs">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                <Navigation className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="text-[11px] text-[#94A3B8] font-mono flex items-center gap-1.5">
                <span className="text-white font-bold hidden sm:inline">Trekker GPS:</span>
                {userPosition ? (
                  <span>
                    {userPosition.lat.toFixed(4)}°N, {userPosition.lng.toFixed(4)}°E (~{Math.round(userPosition.altitude || 2780)}m) &bull;{" "}
                    <strong className={distanceToHazard !== null && distanceToHazard < 150 ? "text-rose-400 font-bold" : "text-emerald-400"}>
                      {distanceToHazard !== null ? `${distanceToHazard}m to hazard` : "Monitored"}
                    </strong>
                  </span>
                ) : (
                  "GPS offline"
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  playConfirmationBeep();
                  onLocateMe();
                }}
                disabled={isLocating}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1C2C4C] hover:bg-[#2A3B5E] text-white border border-[#2A3B5E] cursor-pointer"
                title="Query device GPS"
              >
                <Compass className={`w-3 h-3 ${isLocating ? "animate-spin text-cyan-400" : "text-cyan-400"}`} />
                <span>{isLocating ? "Locating..." : "📍 Locate Me"}</span>
              </button>

              <button
                onClick={() => {
                  playConfirmationBeep();
                  setUserPosition({
                    lat: 28.2140,
                    lng: 85.4950,
                    accuracy: 15,
                    altitude: 2780,
                  });
                }}
                className="px-2 py-1 rounded-lg text-xs font-medium bg-[#1C2C4C] hover:bg-[#2A3B5E] text-[#94A3B8] hover:text-white border border-[#2A3B5E] cursor-pointer hidden sm:inline"
                title="Simulate trekker position in Langtang Gorge"
              >
                Simulate Trekker
              </button>

              <button
                onClick={() => onTriggerSOS()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow cursor-pointer"
              >
                <Radio className="w-3 h-3 animate-pulse" />
                <span>🚨 Quick SOS</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSubmitVoiceReport={(report) => {
          setVoiceAttached(true);
          setReportNote(report.transcript);
          setReportDraftType(report.category);
          setIsVoiceModalOpen(false);
        }}
        corridorName={selected.name}
      />

      {/* Valley Elevation & Flood Velocity Profile Modal */}
      {showProfileModal && (
        <ValleyElevationProfileModal
          corridorId={selected.id}
          waterSurge={waterSurge}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Official Emergency SITREP Exporter Modal */}
      {showSitrepModal && (
        <SitrepExportModal
          corridor={selected}
          risk={selectedRisk}
          liveData={liveData}
          waterSurge={waterSurge}
          onClose={() => setShowSitrepModal(false)}
        />
      )}
    </div>
  );
}
