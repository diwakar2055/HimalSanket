import React, { useState, useMemo } from "react";
import { TimesfmForecastChart } from "./TimesfmForecastChart";
import { FloodCascadeTimeline } from "./FloodCascadeTimeline";
import { LiveTelemetryResponse } from "../services/riskEngineApi";
import { Language, getTranslation } from "../data/localization";
import { synthesizeDynamicGeminiBriefing } from "../utils/geminiReasoner";
import { playHazardVoiceBroadcast } from "../utils/speechSynthesizer";
import {
  Activity,
  Sparkles,
  Waves,
  Satellite,
  Volume2,
  TrendingUp,
  AlertTriangle,
  Info,
  Layers,
  MapPin,
  Clock,
} from "lucide-react";

interface AnalyticsDashboardProps {
  corridor: any;
  risk: any;
  liveData: LiveTelemetryResponse | null;
  activeScenario: string;
  waterSurge: number;
  onInspectLake: () => void;
  language: Language;
}

export function AnalyticsDashboard({
  corridor,
  risk,
  liveData,
  activeScenario,
  waterSurge,
  onInspectLake,
  language,
}: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<"drivers" | "gemini" | "downstream">("drivers");
  const [speakingLang, setSpeakingLang] = useState<"en" | "ne" | null>(null);

  const tierKey = (risk?.tier || "Low") as "Low" | "Moderate" | "High" | "Critical";
  const score = ((risk?.score ?? 0) * 100).toFixed(1);
  const dynamicGemini = useMemo(() => {
    return synthesizeDynamicGeminiBriefing(corridor, risk, liveData, activeScenario, waterSurge);
  }, [corridor, risk, liveData, activeScenario, waterSurge]);

  const gemini = dynamicGemini;

  const signalContrib = liveData?.risk_assessment?.signal_contributions || {
    rainfall: (risk?.rainScore ?? 0) * 0.3,
    seismic: (risk?.seismicScore ?? 0) * 0.2,
    lake: (risk?.lakeScore ?? 0) * 0.25,
    terrain: (corridor?.susceptibility ?? 0.71) * 0.1,
    reports: (risk?.reportScore ?? 0) * 0.15,
  };

  const keyDrivers = liveData?.risk_assessment?.explanation?.key_drivers || [];

  return (
    <div className="flex-1 px-4 sm:px-8 py-7 overflow-y-auto space-y-7">
      {/* Executive Analytics Header */}
      <div className="p-5 rounded-2xl border border-[#2A3B5E] bg-gradient-to-r from-[#16233F] via-[#101A30] to-[#0A1224] shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              {language === "ne" ? "कृत्रिम बुद्धिमत्ता पूर्वानुमान केन्द्र" : "AI Multi-Hazard Predictive Intelligence Center"}
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800">
              TimesFM 200M + Gemini 2.0 Flash
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/10 text-[#8CA0BE]">
              Scenario: <strong className="text-white capitalize">{activeScenario.replace(/_/g, " ")}</strong>
            </span>
          </div>

          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <span>📍 {corridor?.name || "Langtang Valley"}</span>
            <span className="text-sm font-normal text-[#8CA0BE]">({corridor?.region || "Rasuwa"} District · {corridor?.gps || "28.2096° N, 85.5089° E"})</span>
          </h2>
          <p className="text-xs text-[#8CA0BE] mt-1">
            {language === "ne"
              ? "गुगल टाइम्सएफएम २४-घण्टे वर्षा प्रक्षेपण, सेन्टिनेल-२ हिमताल एनडीडब्लूआई विस्तार तथा बाढी प्रवाहको समय-तालिका।"
              : "Continuous multi-modal physics modeling combining 24h TimesFM deep neural forecasting, Sentinel-2 NDWI lake growth delta, and hydraulic travel times."}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 bg-[#0F1B33]/80 p-3.5 rounded-xl border border-[#2A3B5E]">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#8CA0BE]">Multi-Hazard Index</div>
            <div className="text-2xl font-mono font-black text-white">
              {score} <span className="text-xs font-normal text-[#8CA0BE]">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-[#8CA0BE]">Fused Severity</div>
            <div className={`text-base font-bold uppercase ${
              tierKey === "Critical" ? "text-rose-400" : tierKey === "High" ? "text-orange-400" : tierKey === "Moderate" ? "text-amber-400" : "text-emerald-400"
            }`}>
              {tierKey} RISK
            </div>
          </div>
        </div>
      </div>

      {/* 1. TimesFM 24h Predictive Rainfall Chart */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
              {getTranslation(language, "timesfmTitle")}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#8CA0BE]">
            Resolution: Hourly (t+0 to t+24h)
          </span>
        </div>
        <TimesfmForecastChart
          corridorId={corridor.id}
          corridorName={corridor.name}
          currentRainfall={corridor.rainfall}
          rainThreshold={corridor.rainThreshold}
          activeScenario={activeScenario}
        />
      </section>

      {/* 2. Physical Hazard Drivers Breakdown (Why This Region Is At Risk) */}
      <section className="p-5 rounded-2xl border border-[#2A3B5E] shadow-xl bg-[#16233F]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2A3B5E]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              <span>Multi-Hazard Physical Root Cause Breakdown</span>
            </h3>
            <p className="text-xs text-[#8CA0BE] mt-0.5">
              Exact scientific weighting and physical drivers causing elevated hazard scores
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0F1B33] p-1 rounded-xl border border-[#2A3B5E]">
            <button
              onClick={() => setActiveTab("drivers")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === "drivers"
                  ? "bg-[#2E86AB] text-white shadow"
                  : "text-[#8CA0BE] hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Physics Signals
            </button>
            <button
              onClick={() => setActiveTab("gemini")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === "gemini"
                  ? "bg-[#2E86AB] text-white shadow"
                  : "text-[#8CA0BE] hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Gemini Intelligence
            </button>
            <button
              onClick={() => setActiveTab("downstream")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === "downstream"
                  ? "bg-[#2E86AB] text-white shadow"
                  : "text-[#8CA0BE] hover:text-white"
              }`}
            >
              <Waves className="w-3.5 h-3.5 text-cyan-300" /> Downstream Cascade
            </button>
          </div>
        </div>

        {/* Tab 1: Physics Signals */}
        {activeTab === "drivers" && (
          <div className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Rainfall */}
              <div className="p-3.5 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
                <div className="flex items-center justify-between text-xs text-[#8CA0BE] mb-1">
                  <span className="flex items-center gap-1 font-semibold text-white">🌧️ Rainfall</span>
                  <span className="font-mono text-white font-bold">{corridor.rainfall} mm</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#2A3B5E] overflow-hidden my-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(risk.rainScore * 100, 100)}%`,
                      background: risk.rainScore > 0.7 ? "#E4572E" : "#2E86AB",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#5E729A] font-mono">
                  <span>Threshold: {corridor.rainThreshold}mm</span>
                  <span>+{(signalContrib.rainfall || 0).toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-[#8CA0BE] mt-2">
                  {corridor.rainfall > 100 ? "Severe catchment saturation surge" : "Catchment precipitation normal"}
                </div>
              </div>

              {/* Seismic */}
              <div className="p-3.5 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
                <div className="flex items-center justify-between text-xs text-[#8CA0BE] mb-1">
                  <span className="flex items-center gap-1 font-semibold text-white">⚡ Seismic</span>
                  <span className="font-mono text-white font-bold">{corridor.seismic.toFixed(1)} M</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#2A3B5E] overflow-hidden my-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(risk.seismicScore * 100, 100)}%`,
                      background: risk.seismicScore > 0.5 ? "#E4572E" : "#2E86AB",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#5E729A] font-mono">
                  <span>USGS Real-time</span>
                  <span>+{(signalContrib.seismic || 0).toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-[#8CA0BE] mt-2">
                  {corridor.seismic >= 3.0 ? "Shallow tremor trigger" : "Microseismic baseline"}
                </div>
              </div>

              {/* Sentinel Lake */}
              <div className="p-3.5 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
                <div className="flex items-center justify-between text-xs text-[#8CA0BE] mb-1">
                  <span className="flex items-center gap-1 font-semibold text-white">🛰️ Sentinel-2</span>
                  <span className="font-mono text-cyan-300 font-bold">+{corridor.lakeChange}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#2A3B5E] overflow-hidden my-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(risk.lakeScore * 100, 100)}%`,
                      background: risk.lakeScore > 0.6 ? "#E4572E" : "#2E86AB",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#5E729A] font-mono">
                  <button
                    onClick={onInspectLake}
                    className="text-cyan-400 underline hover:text-cyan-200 cursor-pointer"
                  >
                    Inspect ↗
                  </button>
                  <span>+{(signalContrib.lake || 0).toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-[#8CA0BE] mt-2">
                  {corridor.lakeChange >= 10 ? "Rapid supraglacial melt" : "Seasonal melt stable"}
                </div>
              </div>

              {/* Terrain Susceptibility */}
              <div className="p-3.5 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
                <div className="flex items-center justify-between text-xs text-[#8CA0BE] mb-1">
                  <span className="flex items-center gap-1 font-semibold text-white">🏔️ Terrain</span>
                  <span className="font-mono text-white font-bold">{(corridor.susceptibility * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#2A3B5E] overflow-hidden my-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${corridor.susceptibility * 100}%`,
                      background: "#2E86AB",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#5E729A] font-mono">
                  <span>Moraine slope</span>
                  <span>+{(signalContrib.terrain || 0).toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-[#8CA0BE] mt-2">
                  Steep glacial canyon profile
                </div>
              </div>

              {/* Ground Dispatches */}
              <div className="p-3.5 rounded-xl border border-[#2A3B5E] bg-[#0F1B33]">
                <div className="flex items-center justify-between text-xs text-[#8CA0BE] mb-1">
                  <span className="flex items-center gap-1 font-semibold text-white">📻 Dispatches</span>
                  <span className="font-mono text-white font-bold">{corridor.reports.length}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#2A3B5E] overflow-hidden my-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(risk.reportScore * 100, 100)}%`,
                      background: risk.reportScore > 0.4 ? "#E4572E" : "#2E86AB",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#5E729A] font-mono">
                  <span>Ground crowd notes</span>
                  <span>+{(signalContrib.reports || 0).toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-[#8CA0BE] mt-2">
                  {corridor.reports.length > 0 ? "Field anomalies noted" : "No crowd anomalies"}
                </div>
              </div>
            </div>

            {keyDrivers.length > 0 && (
              <div className="p-3.5 rounded-xl bg-[#0F1B33] border border-[#2A3B5E] text-xs">
                <span className="font-bold text-white">Identified Physical Multi-Hazard Triggers: </span>
                <span className="text-[#8CA0BE]">{keyDrivers.join(" · ")}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Gemini 2.0 Flash AI Intelligence */}
        {activeTab === "gemini" && (
          <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* English Briefing */}
            <div className="p-4 rounded-xl border border-[#2A3B5E] bg-[#0F1B33] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                    🇬🇧 English Emergency Briefing
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    Gemini 2.0 Flash
                  </span>
                </div>
                <p className="text-xs text-[#ECF1F6] leading-relaxed">
                  {gemini?.briefing_en || "Langtang Valley is experiencing elevated risk. Maintain strict satellite radio monitoring."}
                </p>
                {gemini?.action_directive && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-300">
                    DIRECTIVE: {gemini.action_directive}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  if (speakingLang === "en") {
                    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                    setSpeakingLang(null);
                  } else {
                    playHazardVoiceBroadcast({
                      text: gemini?.briefing_en || "Langtang Valley is experiencing elevated risk.",
                      isNepali: false,
                      onStart: () => setSpeakingLang("en"),
                      onEnd: () => setSpeakingLang(null),
                      onError: () => setSpeakingLang(null),
                    });
                  }
                }}
                className={`mt-3.5 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  speakingLang === "en"
                    ? "bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse shadow-lg shadow-rose-900/30"
                    : "bg-cyan-950/80 text-cyan-300 border border-cyan-800 hover:bg-cyan-900"
                }`}
              >
                <Volume2 className={`w-3.5 h-3.5 ${speakingLang === "en" ? "text-rose-300 animate-bounce" : ""}`} />
                <span>{speakingLang === "en" ? "⏹️ Stop Broadcast" : "🔊 Voice Broadcast (English)"}</span>
              </button>
            </div>

            {/* Nepali Briefing */}
            <div className="p-4 rounded-xl border border-[#2A3B5E] bg-[#0F1B33] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    🇳🇵 नेपाली आधिकारिक चेतावनी
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                    स्थानिय भाषा
                  </span>
                </div>
                <p className="text-xs text-[#ECF1F6] leading-relaxed">
                  {gemini?.briefing_ne || "जोखिम बढ्दो क्रममा छ, सतर्कता अपनाउनुहोस्।"}
                </p>
              </div>
              <button
                onClick={() => {
                  if (speakingLang === "ne") {
                    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                    setSpeakingLang(null);
                  } else {
                    playHazardVoiceBroadcast({
                      text: gemini?.briefing_ne || "जोखिम बढ्दो क्रममा छ, सतर्कता अपनाउनुहोस्।",
                      isNepali: true,
                      romanizedFallback: gemini?.sms_alert_romanized,
                      onStart: () => setSpeakingLang("ne"),
                      onEnd: () => setSpeakingLang(null),
                      onError: () => setSpeakingLang(null),
                    });
                  }
                }}
                className={`mt-3.5 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  speakingLang === "ne"
                    ? "bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse shadow-lg shadow-rose-900/30"
                    : "bg-amber-950/80 text-amber-300 border border-amber-800 hover:bg-amber-900"
                }`}
              >
                <Volume2 className={`w-3.5 h-3.5 ${speakingLang === "ne" ? "text-rose-300 animate-bounce" : ""}`} />
                <span>{speakingLang === "ne" ? "⏹️ प्रसारण रोक्नुहोस्" : "🔊 ध्वनि प्रसारण (नेपाली)"}</span>
              </button>
            </div>

            {/* SMS Romanized Broadcast */}
            <div className="p-4 rounded-xl border border-[#2A3B5E] bg-[#0F1B33] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                    📱 SMS Romanized Broadcast (2G Cell)
                  </span>
                  <span className="text-[10px] font-mono text-[#5E729A]">160 chars</span>
                </div>
                <div className="p-3 rounded-lg bg-black/60 border border-[#2A3B5E] font-mono text-xs text-emerald-400 leading-relaxed">
                  {gemini?.sms_alert_romanized || `HimalSanket: ${corridor?.name || "Langtang"} ${tierKey.toUpperCase()} risk. Mausam ra khola herera matra hidnu.`}
                </div>
              </div>
              <div className="text-[10px] text-[#5E729A] mt-3">
                Transmission ready for automated broadcast across NTC &amp; Ncell localized tower transceivers.
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Downstream Cascade Timeline */}
        {activeTab === "downstream" && (
          <div className="pt-4">
            <FloodCascadeTimeline
              corridorName={corridor?.name || "Langtang Valley"}
              waterSurgeMeters={waterSurge > 0 ? waterSurge : corridor?.rainfall > 100 ? 2.5 : 0}
            />
          </div>
        )}
      </section>

      {/* 3. Sentinel-2 Satellite Inspector Quick Card */}
      <section className="p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-[#0F1B33] to-[#16233F] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            <Satellite className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              ESA Sentinel-2 Multi-Spectral Lake Inspector Available
            </h4>
            <p className="text-xs text-[#8CA0BE] mt-0.5">
              NDWI Band 3/8 spectral thresholding with surface area deltas (+{corridor.lakeChange}%) and moraine impoundment stability checks.
            </p>
          </div>
        </div>

        <button
          onClick={onInspectLake}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#2E86AB] hover:bg-cyan-600 text-white shadow-lg shadow-cyan-950/60 flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-105 shrink-0"
        >
          <Satellite className="w-4 h-4" />
          <span>Launch Sentinel-2 Inspector ↗</span>
        </button>
      </section>
    </div>
  );
}
