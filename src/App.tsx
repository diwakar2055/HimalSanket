import React, { useState, useMemo, useCallback } from "react";
import { GeminiChatbot } from "./components/GeminiChatbot";
import { LeafletHazardMap } from "./components/LeafletHazardMap";
import {
  CORRIDOR_CONFIGS,
  MAP_ASSETS,
  MapAsset,
} from "./data/hazardMapData";
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
} from "lucide-react";

// ---- palette ----
const C = {
  bg: "#0F1B33",
  panel: "#16233F",
  panelAlt: "#1C2C4C",
  border: "#2A3B5E",
  text: "#ECF1F6",
  muted: "#8CA0BE",
  mutedDim: "#5E729A",
  teal: "#2E86AB",
  amber: "#C9A227",
  orange: "#E4572E",
  red: "#9B2C22",
};

const TIER: Record<string, { color: string; label: string; ne: string }> = {
  Low: { color: C.teal, label: "Low", ne: "न्यून" },
  Moderate: { color: C.amber, label: "Moderate", ne: "मध्यम" },
  High: { color: C.orange, label: "High", ne: "उच्च" },
  Critical: { color: C.red, label: "Critical", ne: "गम्भीर" },
};

const INITIAL_CORRIDORS = [
  { id: "langtang", name: "Langtang Valley", region: "Rasuwa", rainfall: 38, rainThreshold: 144, seismic: 1.8, lakeChange: 4, susceptibility: 0.71, reports: [], gps: "28.2096° N, 85.5089° E" },
  { id: "khumbu", name: "Everest / Khumbu", region: "Solukhumbu", rainfall: 22, rainThreshold: 144, seismic: 0.6, lakeChange: 1, susceptibility: 0.52, reports: [], gps: "27.9878° N, 86.9250° E" },
  { id: "annapurna", name: "Annapurna Circuit", region: "Manang", rainfall: 51, rainThreshold: 144, seismic: 1.1, lakeChange: 2, susceptibility: 0.63, reports: [], gps: "28.6667° N, 84.0167° E" },
  { id: "manaslu", name: "Manaslu Circuit", region: "Gorkha", rainfall: 17, rainThreshold: 144, seismic: 0.4, lakeChange: 0, susceptibility: 0.44, reports: [], gps: "28.5497° N, 84.5602° E" },
];

const REPORT_TYPES = [
  { id: "water", label: "Water rising" },
  { id: "crack", label: "Trail cracking" },
  { id: "sound", label: "Unusual sound" },
  { id: "other", label: "Other" },
];

const BUILDING_TYPES = [
  { id: "multi", label: "Multi-storey building", weight: 22 },
  { id: "single", label: "Single-storey home", weight: 10 },
  { id: "outdoor", label: "Outdoors / open field", weight: 4 },
];

const CONDITIONS = [
  { id: "collapsed", label: "Structure reported collapsed", weight: 40 },
  { id: "damaged", label: "Structure damaged, standing", weight: 18 },
  { id: "unknown", label: "Condition unknown", weight: 8 },
];

const SIGNAL_LEVELS = [
  { id: "none", label: "No signal" },
  { id: "weak", label: "Weak signal" },
  { id: "strong", label: "Strong signal" },
];

const SEVERITY_KEYWORDS = ["injured", "hurt", "bleeding", "blood", "can't move", "cannot move", "leg", "trapped", "pain", "broken"];

function computeRisk(c: any) {
  const rainScore = Math.min(c.rainfall / c.rainThreshold, 1);
  const seismicScore = Math.min(c.seismic / 4, 1);
  const lakeScore = Math.min(c.lakeChange / 15, 1);
  const reportScore = Math.min(c.reports.length * 0.18, 1);
  const score = rainScore * 0.3 + seismicScore * 0.2 + lakeScore * 0.25 + c.susceptibility * 0.1 + reportScore * 0.15;
  let tier = "Low";
  if (score >= 0.7) tier = "Critical";
  else if (score >= 0.5) tier = "High";
  else if (score >= 0.3) tier = "Moderate";
  return { score, tier, rainScore, seismicScore, lakeScore, reportScore };
}

function generateBriefing(c: any, risk: any) {
  const drivers = [];
  if (risk.rainScore > 0.35) drivers.push("rainfall approaching the district threshold");
  if (risk.lakeScore > 0.15) drivers.push("measurable glacial lake area growth");
  if (risk.seismicScore > 0.3) drivers.push("recent nearby seismic activity");
  if (risk.reportScore > 0.15) drivers.push("multiple ground reports from the valley");
  if (drivers.length === 0) drivers.push("no elevated signals at this time");

  const en = risk.tier === "Low"
    ? `${c.name} is currently at LOW risk. Conditions are within normal range; ${drivers[0]}. Routine travel advisory in effect.`
    : `${c.name} is at ${risk.tier.toUpperCase()} risk. Key drivers: ${drivers.join(", ")}. ${
        risk.tier === "Critical" ? "Recommend postponing entry and notifying registered trekking groups immediately."
        : risk.tier === "High" ? "Recommend delaying non-essential entry and briefing agencies before departure."
        : "Monitor conditions closely before departure; no restriction yet."
      }`;

  const ne = risk.tier === "Low"
    ? `${c.name} हाल कम जोखिममा छ। परिस्थिति सामान्य दायरामा छ।`
    : `${c.name} ${TIER[risk.tier].ne} जोखिममा छ। सतर्कता अपनाई यात्रा संगठनलाई जानकारी गराउनुहोस्।`;

  return { en, ne };
}

function priorityBand(score: number) {
  if (score >= 80) return { label: "Priority 0 — Confirmed distress signal", color: C.red };
  if (score >= 65) return { label: "Priority 1 — Dig now", color: C.red };
  if (score >= 40) return { label: "Priority 2 — Next in queue", color: C.orange };
  if (score >= 20) return { label: "Priority 3 — Monitor", color: C.amber };
  return { label: "Priority 4 — Low urgency", color: C.teal };
}

function StatRow({ label, value, unit, fraction }: { label: string, value: any, unit: string, fraction: number }) {
  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${C.border}` }}>
      <span className="text-sm" style={{ color: C.muted }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm" style={{ color: C.text, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{value}{unit}</span>
        <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ background: C.border }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(fraction, 1) * 100}%`, background: fraction > 0.65 ? C.orange : fraction > 0.35 ? C.amber : C.teal }} />
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="text-sm px-4 py-2 cursor-pointer transition-colors" style={{ color: active ? C.text : C.muted, borderBottom: active ? `2px solid ${C.orange}` : "2px solid transparent", fontWeight: active ? 600 : 400 }}>
      {children}
    </button>
  );
}

function RiskDashboard({ onOpenMap }: { onOpenMap?: () => void }) {
  const [corridors, setCorridors] = useState(INITIAL_CORRIDORS as any[]);
  const [selectedId, setSelectedId] = useState(INITIAL_CORRIDORS[0].id);
  const [reportDraftType, setReportDraftType] = useState<string | null>(null);
  const [reportNote, setReportNote] = useState("");
  const [voiceAttached, setVoiceAttached] = useState(false);
  const [pulseId, setPulseId] = useState<string | null>(null);

  // Map state
  const [selectedAsset, setSelectedAsset] = useState<MapAsset | null>(null);
  const [waterSurge, setWaterSurge] = useState<number>(0);
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);
  const [activeLayers, setActiveLayers] = useState({
    people: true,
    school: true,
    bridge: true,
    hospital: true,
    hazardZone: true,
  });

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

  const risks = useMemo(() => {
    const map: Record<string, any> = {};
    corridors.forEach((c) => { map[c.id] = computeRisk(c); });
    return map;
  }, [corridors]);

  const selected = corridors.find((c) => c.id === selectedId)!;
  const selectedRisk = risks[selectedId];
  const briefing = useMemo(() => generateBriefing(selected, selectedRisk), [selected, selectedRisk]);

  const simulateSpike = useCallback((id: string) => {
    setCorridors((prev) => prev.map((c) => (c.id === id ? { ...c, rainfall: Math.min(c.rainfall + 65, 220), lakeChange: c.lakeChange + 6, seismic: c.seismic + 1.6 } : c)));
    setWaterSurge(2.0); // automatically surge river buffer on rainfall spike
    setPulseId(id);
    setTimeout(() => setPulseId(null), 900);
  }, []);

  const resetCorridor = useCallback((id: string) => {
    const base = INITIAL_CORRIDORS.find((c) => c.id === id)!;
    setCorridors((prev) => prev.map((c) => (c.id === id ? { ...base, reports: c.reports } : c)));
    setWaterSurge(0);
    setSelectedAsset(null);
  }, []);

  const submitReport = useCallback(() => {
    if (!reportDraftType) return;
    const label = REPORT_TYPES.find((t) => t.id === reportDraftType)?.label;
    setCorridors((prev) => prev.map((c) => (c.id === selectedId
      ? { ...c, reports: [{ id: Date.now(), label, note: reportNote, voice: voiceAttached, time: new Date() }, ...c.reports] }
      : c)));
    setReportDraftType(null);
    setReportNote("");
    setVoiceAttached(false);
  }, [reportDraftType, reportNote, voiceAttached, selectedId]);

  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-72 shrink-0 flex flex-col" style={{ borderRight: `1px solid ${C.border}` }}>
        <div className="flex-1 overflow-y-auto py-2">
          {corridors.map((c) => {
            const r = risks[c.id];
            const t = TIER[r.tier];
            const active = c.id === selectedId;
            return (
              <button key={c.id} onClick={() => { setSelectedId(c.id); setSelectedAsset(null); }} className="w-full text-left px-5 py-3 flex items-center justify-between hover:bg-[#16233F]/50 transition-colors cursor-pointer" style={{ background: active ? C.panel : "transparent" }}>
                <div>
                  <div className="text-sm" style={{ color: C.text, fontWeight: active ? 600 : 400 }}>{c.name}</div>
                  <div className="text-xs" style={{ color: C.mutedDim }}>{c.region}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full transition-transform" style={{ background: `${t.color}22`, color: t.color, border: `1px solid ${t.color}55`, transform: pulseId === c.id ? "scale(1.12)" : "scale(1)" }}>{t.label}</span>
              </button>
            );
          })}
        </div>
        <div className="px-5 py-4 text-xs" style={{ color: C.mutedDim, borderTop: `1px solid ${C.border}` }}>Prototype — signals are simulated locally for this demo.</div>
      </div>

      <div className="flex-1 px-8 py-7 overflow-y-auto">
        {/* Corridor header & Action Buttons */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-xs mb-1" style={{ color: C.mutedDim }}>{selected.region}</div>
            <h1 className="text-2xl" style={{ color: C.text, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700 }}>{selected.name}</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => simulateSpike(selected.id)} className="text-sm px-3 py-2 rounded font-medium cursor-pointer hover:opacity-90 transition-opacity" style={{ background: C.orange, color: "#fff" }}>Simulate rainfall spike</button>
            <button onClick={() => resetCorridor(selected.id)} className="text-sm px-3 py-2 rounded cursor-pointer hover:bg-white/5 transition-colors" style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}>Reset signals</button>
          </div>
        </div>

        {/* Side-by-side section: Live Signals on LEFT, Map on RIGHT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6 items-stretch">
          {/* Left Column: Live signals */}
          <div className="lg:col-span-4 p-5 rounded-xl flex flex-col justify-between" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.mutedDim }}>Live signals</div>
                <span className="text-[11px] px-2 py-0.5 rounded font-semibold" style={{ background: `${TIER[selectedRisk.tier].color}20`, color: TIER[selectedRisk.tier].color, border: `1px solid ${TIER[selectedRisk.tier].color}40` }}>
                  {TIER[selectedRisk.tier].label}
                </span>
              </div>
              <div className="space-y-1">
                <StatRow label="Rainfall" value={selected.rainfall} unit=" mm/24h" fraction={selectedRisk.rainScore} />
                <StatRow label="Seismic activity" value={selected.seismic.toFixed(1)} unit=" M nearby" fraction={selectedRisk.seismicScore} />
                <StatRow label="Lake area change" value={`+${selected.lakeChange}`} unit="%" fraction={selectedRisk.lakeScore} />
                <StatRow label="Terrain susceptibility" value={(selected.susceptibility * 100).toFixed(0)} unit="/100" fraction={selected.susceptibility} />
                <StatRow label="Ground reports" value={selected.reports.length} unit="" fraction={selectedRisk.reportScore} />
              </div>
            </div>

            <div className="mt-5 p-3.5 rounded-lg text-center" style={{ background: `${TIER[selectedRisk.tier].color}18`, border: `1px solid ${TIER[selectedRisk.tier].color}55` }}>
              <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: C.mutedDim }}>Fused risk tier</div>
              <div className="text-xl" style={{ color: TIER[selectedRisk.tier].color, fontWeight: 700 }}>{TIER[selectedRisk.tier].label}</div>
            </div>
          </div>

          {/* Right Column: Corridor Hazard Map */}
          <div className="lg:col-span-8 p-4 rounded-xl flex flex-col justify-between" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.mutedDim }}>
                  Corridor hazard map
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: `${TIER[selectedRisk.tier].color}20`, color: TIER[selectedRisk.tier].color, border: `1px solid ${TIER[selectedRisk.tier].color}40` }}>
                  {selected.name}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs">
                {/* Risk Legend */}
                <div className="flex items-center gap-2.5" style={{ color: C.muted }}>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.teal }}></span> Low</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.amber }}></span> Mod</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.orange }}></span> High</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.red }}></span> Crit</span>
                </div>

                {/* Surge Slider */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#2A3B5E]" style={{ background: C.bg }}>
                  <SlidersHorizontal className="w-3 h-3" style={{ color: C.orange }} />
                  <span className="text-[11px]" style={{ color: C.muted }}>Surge:</span>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={waterSurge}
                    onChange={(e) => setWaterSurge(parseFloat(e.target.value))}
                    className="w-14 accent-[#E4572E] cursor-pointer"
                  />
                  <span className="font-mono text-[11px] font-bold" style={{ color: waterSurge > 0 ? C.orange : C.muted }}>
                    +{waterSurge.toFixed(1)}m
                  </span>
                </div>

                {/* Expand Toggle */}
                <button
                  onClick={() => setIsMapExpanded((prev) => !prev)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-[#2A3B5E] hover:border-white/30 transition-colors cursor-pointer"
                  style={{ background: C.panelAlt, color: C.muted }}
                  title={isMapExpanded ? "Compact map view" : "Expand map view"}
                >
                  {isMapExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Layer Filter Pills */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5 pb-2 border-b border-[#2A3B5E]/50">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-[#5E729A] uppercase tracking-wider mr-1">Filter:</span>
                <button
                  onClick={() => setActiveLayers((p) => ({ ...p, people: !p.people }))}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                    activeLayers.people ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-transparent text-[#5E729A] border-[#2A3B5E]"
                  }`}
                >
                  <Users className="w-3 h-3" /> Settlements ({currentCorridorAllAssets.filter((a) => a.type === "people").length})
                </button>
                <button
                  onClick={() => setActiveLayers((p) => ({ ...p, bridge: !p.bridge }))}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                    activeLayers.bridge ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-transparent text-[#5E729A] border-[#2A3B5E]"
                  }`}
                >
                  <Route className="w-3 h-3" /> Bridges ({currentCorridorAllAssets.filter((a) => a.type === "bridge").length})
                </button>
                <button
                  onClick={() => setActiveLayers((p) => ({ ...p, school: !p.school }))}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                    activeLayers.school ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-transparent text-[#5E729A] border-[#2A3B5E]"
                  }`}
                >
                  <GraduationCap className="w-3 h-3" /> Schools ({currentCorridorAllAssets.filter((a) => a.type === "school").length})
                </button>
                <button
                  onClick={() => setActiveLayers((p) => ({ ...p, hospital: !p.hospital }))}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                    activeLayers.hospital ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-transparent text-[#5E729A] border-[#2A3B5E]"
                  }`}
                >
                  <HeartPulse className="w-3 h-3" /> Clinics ({currentCorridorAllAssets.filter((a) => a.type === "hospital").length})
                </button>
              </div>
            </div>

            {/* Interactive Map Canvas */}
            <div className={`relative w-full rounded-lg overflow-hidden border border-[#2A3B5E] ${isMapExpanded ? "h-[540px]" : "h-[340px]"} transition-all duration-300`}>
              <LeafletHazardMap
                corridor={currentCorridorConfig}
                assets={currentCorridorAssets}
                selectedAsset={selectedAsset}
                onSelectAsset={setSelectedAsset}
                activeLayers={activeLayers}
                simulatedWaterRise={waterSurge}
                getDynamicStatus={getDynamicStatus}
                className="h-full w-full"
              />

              {/* Selected Asset Float Inspector Overlay */}
              {selectedAsset && (
                <div className="absolute bottom-3 left-3 z-[1000] w-64 sm:w-72 p-3 rounded-xl border border-[#2A3B5E] shadow-2xl backdrop-blur-md bg-[#16233F]/95 text-xs animate-in fade-in duration-200">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#8CA0BE]">
                        {selectedAsset.type}
                      </span>
                      <h4 className="font-bold text-white text-sm leading-tight">{selectedAsset.name}</h4>
                    </div>
                    <button onClick={() => setSelectedAsset(null)} className="text-[#8CA0BE] hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mb-1.5 py-0.5 px-1.5 rounded font-semibold text-[10px]" style={{
                    background: getDynamicStatus(selectedAsset) === "critical" ? `${C.red}33` : getDynamicStatus(selectedAsset) === "advisory" ? `${C.amber}33` : `${C.teal}33`,
                    color: getDynamicStatus(selectedAsset) === "critical" ? "#ff9f8f" : getDynamicStatus(selectedAsset) === "advisory" ? "#ffd271" : "#74d2fc",
                    border: `1px solid ${getDynamicStatus(selectedAsset) === "critical" ? C.red : getDynamicStatus(selectedAsset) === "advisory" ? C.amber : C.teal}66`,
                  }}>
                    <span className="flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> Status: {getDynamicStatus(selectedAsset).toUpperCase()}</span>
                    <span>{selectedAsset.elevation}m ASL</span>
                  </div>

                  <p className="text-[#8CA0BE] text-[11px] leading-relaxed mb-1.5 line-clamp-2">{selectedAsset.description}</p>
                  <div className="text-[10px] font-mono text-[#5E729A] flex justify-between border-t border-[#2A3B5E] pt-1">
                    <span>GPS: {selectedAsset.gps}</span>
                    <span>Threshold: +{selectedAsset.hazardThresholdMeters}m</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 text-[11px] flex items-center justify-between flex-wrap gap-2" style={{ color: C.mutedDim }}>
              <span>Center: {currentCorridorConfig.centerName} ({selected.region})</span>
              <span>Click markers for threshold inspection</span>
            </div>
          </div>
        </div>

        {/* Gemini Reasoning & Ground Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="p-4 rounded-xl" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.mutedDim }}>Gemini reasoning layer</div>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: C.panelAlt, color: C.mutedDim }}>simulated for demo</span>
            </div>
            <p className="text-sm mb-3" style={{ color: C.text, lineHeight: 1.55 }}>{briefing.en}</p>
            <p className="text-sm" style={{ color: C.muted, lineHeight: 1.55 }}>{briefing.ne}</p>
          </div>

          <div className="p-4 rounded-xl" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="text-xs mb-3 font-semibold uppercase tracking-wider" style={{ color: C.mutedDim }}>Submit a ground report</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {REPORT_TYPES.map((t) => (
                <button key={t.id} onClick={() => setReportDraftType(t.id)} className="text-sm px-3 py-1.5 rounded cursor-pointer transition-colors" style={{ background: reportDraftType === t.id ? C.teal : "transparent", color: reportDraftType === t.id ? "#fff" : C.muted, border: `1px solid ${reportDraftType === t.id ? C.teal : C.border}` }}>{t.label}</button>
              ))}
            </div>
            <textarea value={reportNote} onChange={(e) => setReportNote(e.target.value)} placeholder="Optional note (what did you see?) — useful when typing isn't practical" className="w-full text-sm p-2 rounded mb-3 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, resize: "none" }} rows={2} />
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={submitReport} disabled={!reportDraftType} className="text-sm font-medium px-4 py-2 rounded transition-opacity cursor-pointer disabled:cursor-not-allowed" style={{ background: reportDraftType ? C.orange : C.border, color: reportDraftType ? "#fff" : C.mutedDim, opacity: reportDraftType ? 1 : 0.5 }}>Submit report</button>
              <button onClick={() => setVoiceAttached((v) => !v)} className="text-sm px-3 py-2 rounded flex items-center gap-2 cursor-pointer transition-colors" style={{ background: voiceAttached ? `${C.teal}22` : "transparent", color: voiceAttached ? C.teal : C.muted, border: `1px solid ${voiceAttached ? C.teal : C.border}` }}>
                <span style={{ fontSize: "0.9em" }}>{voiceAttached ? "●" : "○"}</span>
                {voiceAttached ? "Voice note attached" : "Attach voice note"}
              </button>
              <span className="text-xs" style={{ color: C.mutedDim }}>for local dialects, low literacy</span>
            </div>
            {selected.reports.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {selected.reports.map((r: any) => (
                  <div key={r.id} className="text-xs p-2 rounded flex justify-between" style={{ background: C.panelAlt, color: C.muted }}>
                    <span><strong style={{ color: C.text }}>{r.label}</strong>{r.note ? ` — ${r.note}` : ""}{r.voice ? <span style={{ color: C.teal }}> · voice note</span> : ""}</span>
                    <span style={{ color: C.mutedDim }}>{r.time.toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchPriorityPanel({ searchItems, addFamilyReport }: { searchItems: any[]; addFamilyReport: (r: any) => void }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [buildingType, setBuildingType] = useState(BUILDING_TYPES[0].id);
  const [condition, setCondition] = useState(CONDITIONS[2].id);
  const [daysSinceContact, setDaysSinceContact] = useState<number | string>(1);

  const submit = useCallback(() => {
    if (!name.trim() || !location.trim()) return;
    addFamilyReport({ name, location, buildingType, condition, daysSinceContact: Number(daysSinceContact) });
    setName(""); setLocation(""); setDaysSinceContact(1);
  }, [name, location, buildingType, condition, daysSinceContact, addFamilyReport]);

  const sorted = useMemo(() => [...searchItems].sort((a, b) => b.priority - a.priority), [searchItems]);

  return (
    <div className="flex-1 px-8 py-7 overflow-y-auto">
      <div className="mb-5 p-4 rounded" style={{ background: `${C.amber}18`, border: `1px solid ${C.amber}55` }}>
        <div className="text-sm leading-relaxed" style={{ color: C.text }}>
          <strong>Phase 2 concept — not part of the hackathon MVP.</strong> On Sept 5, 2026, a 60-year-old woman was rescued alive
          after 11 days trapped beneath a collapsed building in Betrawati, Nuwakot — found by Armed Police Force sniffer-dog teams
          searching largely undirected terrain. This panel does not replace that work. It shows how family reports and direct SOS
          signals could help direct search teams toward the highest-priority sites sooner.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="col-span-1 p-4 rounded" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-xs mb-3 font-medium uppercase tracking-wider" style={{ color: C.mutedDim }}>Family: report a missing person</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full text-sm p-2 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }} />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Last known location (village / landmark)" className="w-full text-sm p-2 rounded mb-3 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }} />

          <div className="text-xs mb-1 font-medium" style={{ color: C.mutedDim }}>Building type</div>
          <div className="flex flex-col gap-1 mb-3">
            {BUILDING_TYPES.map((b) => (
              <button key={b.id} onClick={() => setBuildingType(b.id)} className="text-sm px-3 py-1.5 rounded text-left cursor-pointer transition-colors" style={{ background: buildingType === b.id ? C.teal : "transparent", color: buildingType === b.id ? "#fff" : C.muted, border: `1px solid ${buildingType === b.id ? C.teal : C.border}` }}>{b.label}</button>
            ))}
          </div>

          <div className="text-xs mb-1 font-medium" style={{ color: C.mutedDim }}>Reported condition</div>
          <div className="flex flex-col gap-1 mb-3">
            {CONDITIONS.map((cnd) => (
              <button key={cnd.id} onClick={() => setCondition(cnd.id)} className="text-sm px-3 py-1.5 rounded text-left cursor-pointer transition-colors" style={{ background: condition === cnd.id ? C.orange : "transparent", color: condition === cnd.id ? "#fff" : C.muted, border: `1px solid ${condition === cnd.id ? C.orange : C.border}` }}>{cnd.label}</button>
            ))}
          </div>

          <div className="text-xs mb-1 font-medium" style={{ color: C.mutedDim }}>Days since last contact</div>
          <input type="number" min="0" value={daysSinceContact} onChange={(e) => setDaysSinceContact(e.target.value)} className="w-full text-sm p-2 rounded mb-3 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }} />

          <button onClick={submit} className="text-sm px-4 py-2 rounded font-medium cursor-pointer hover:opacity-90 transition-opacity" style={{ background: C.orange, color: "#fff" }}>Add to search list</button>
        </div>

        <div className="col-span-1 lg:col-span-2 p-4 rounded" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-xs mb-3 font-medium uppercase tracking-wider" style={{ color: C.mutedDim }}>Prioritized search list ({sorted.length})</div>
          {sorted.length === 0 && <div className="text-sm" style={{ color: C.mutedDim }}>No reports yet — add one, or send an SOS from the beacon tab, to see it prioritized.</div>}
          <div className="flex flex-col gap-2">
            {sorted.map((r) => {
              const band = priorityBand(r.priority);
              return (
                <div key={r.id} className="p-3 rounded flex items-center justify-between" style={{ background: C.panelAlt, border: r.source === "sos" ? `1px solid ${C.red}55` : "1px solid transparent" }}>
                  <div>
                    <div className="text-sm flex items-center gap-2" style={{ color: C.text, fontWeight: 600 }}>
                      {r.name}
                      {r.source === "sos" && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${C.red}30`, color: "#ff9f8f" }}>Direct SOS</span>}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: C.mutedDim }}>{r.detail}</div>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full shrink-0 ml-3" style={{ background: `${band.color}22`, color: band.color, border: `1px solid ${band.color}55` }}>{band.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SOSBeaconPanel({ addSOSReport }: { addSOSReport: (r: any) => void }) {
  const [corridorId, setCorridorId] = useState(INITIAL_CORRIDORS[0].id);
  const [transcript, setTranscript] = useState("");
  const [photoAttached, setPhotoAttached] = useState(false);
  const [signal, setSignal] = useState("weak");
  const [log, setLog] = useState<string[]>([]);

  const corridor = INITIAL_CORRIDORS.find((c) => c.id === corridorId)!;

  const send = useCallback(() => {
    const time = new Date().toLocaleTimeString();
    const entries = [];
    
    entries.push(`[${time}] GPS ping (${corridor.gps}) — sent`);
    if (signal === "none") {
      entries.push(`[${time}] No signal — voice note and photo queued locally, will retry automatically`);
    } else if (signal === "weak") {
      entries.push(`[${time}] Weak signal — location delivered. Voice note and photo still queued, sending when signal improves`);
    } else {
      if (transcript.trim()) entries.push(`[${time}] Voice note delivered (${transcript.trim().split(/\s+/).length} words)`);
      if (photoAttached) entries.push(`[${time}] Photo delivered`);
    }
    setLog((prev) => [...entries, ...prev]);

    const severityHit = SEVERITY_KEYWORDS.some((k) => transcript.toLowerCase().includes(k));
    const gotFullPayload = signal === "strong";
    let priority = 75; // direct SOS always outranks family reports
    if (severityHit) priority += 15;
    if (!gotFullPayload) priority -= 10; 
    priority = Math.min(priority, 100);

    const detailParts = [`GPS: ${corridor.gps}`];
    detailParts.push(gotFullPayload ? "full report received" : signal === "weak" ? "location only — media queued" : "no data received yet, retrying");
    if (gotFullPayload && transcript.trim()) detailParts.push(`"${transcript.trim().slice(0, 60)}${transcript.trim().length > 60 ? "…" : ""}"`);

    addSOSReport({ name: `SOS — ${corridor.name}`, detail: detailParts.join(" · "), priority });
  }, [corridor, transcript, photoAttached, signal, addSOSReport]);

  return (
    <div className="flex-1 px-8 py-7 overflow-y-auto">
      <div className="mb-5 p-4 rounded" style={{ background: `${C.red}18`, border: `1px solid ${C.red}55` }}>
        <div className="text-sm leading-relaxed" style={{ color: C.text }}>
          <strong>Victim self-report — Phase 2 concept.</strong> Designed for the moment right after a collapse or flood, while
          someone is still conscious and has a few seconds of signal. Location is sent first, as the smallest possible payload —
          voice and photo follow only if the connection allows. If the phone dies before anything sends, this tool has nothing to
          offer; it only helps once at least one signal gets through.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-xs mb-2 font-medium" style={{ color: C.mutedDim }}>Simulated location context</div>
          <select value={corridorId} onChange={(e) => setCorridorId(e.target.value)} className="w-full text-sm p-2 rounded mb-4 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }}>
            {INITIAL_CORRIDORS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="text-xs mb-2 font-medium" style={{ color: C.mutedDim }}>Voice note (type what you'd say — stands in for a recording)</div>
          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="e.g. I'm trapped on the second floor, my leg is stuck, there are two of us" className="w-full text-sm p-2 rounded mb-4 focus:outline-none focus:ring-1 focus:ring-[#2E86AB]" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, resize: "none" }} rows={3} />

          <button onClick={() => setPhotoAttached((v) => !v)} className="text-sm px-3 py-2 rounded mb-4 cursor-pointer transition-colors" style={{ background: photoAttached ? `${C.teal}22` : "transparent", color: photoAttached ? C.teal : C.muted, border: `1px solid ${photoAttached ? C.teal : C.border}` }}>
            {photoAttached ? "● Photo attached" : "○ Attach photo of surroundings"}
          </button>

          <div className="text-xs mb-2 font-medium" style={{ color: C.mutedDim }}>Simulated signal strength</div>
          <div className="flex gap-2 mb-5">
            {SIGNAL_LEVELS.map((s) => (
              <button key={s.id} onClick={() => setSignal(s.id)} className="text-sm px-3 py-1.5 rounded cursor-pointer transition-colors" style={{ background: signal === s.id ? C.orange : "transparent", color: signal === s.id ? "#fff" : C.muted, border: `1px solid ${signal === s.id ? C.orange : C.border}` }}>{s.label}</button>
            ))}
          </div>

          <button onClick={send} className="w-full text-base font-semibold px-4 py-3 rounded cursor-pointer hover:opacity-90 transition-opacity" style={{ background: C.red, color: "#fff" }}>Send SOS</button>
        </div>

        <div className="p-5 rounded" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-xs mb-3 font-medium uppercase tracking-wider" style={{ color: C.mutedDim }}>Transmission log</div>
          {log.length === 0 && <div className="text-sm" style={{ color: C.mutedDim }}>No SOS sent yet.</div>}
          <div className="flex flex-col gap-2">
            {log.map((entry, i) => (
              <div key={i} className="text-xs p-2 rounded font-mono" style={{ background: C.panelAlt, color: C.muted }}>{entry}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("risk");
  const [searchItems, setSearchItems] = useState<any[]>([]);

  const addFamilyReport = useCallback((r: any) => {
    const bw = BUILDING_TYPES.find((b) => b.id === r.buildingType)!.weight;
    const cw = CONDITIONS.find((c) => c.id === r.condition)!.weight;
    const dayScore = Math.min(r.daysSinceContact * 3, 24);
    const priority = Math.min(bw + cw + dayScore, 100);
    setSearchItems((prev) => [{
      id: Date.now(),
      source: "family",
      name: r.name,
      detail: `${r.location} · ${BUILDING_TYPES.find((b) => b.id === r.buildingType)!.label} · ${CONDITIONS.find((c) => c.id === r.condition)!.label} · ${r.daysSinceContact}d since contact`,
      priority,
    }, ...prev]);
  }, []);

  const addSOSReport = useCallback((r: any) => {
    setSearchItems((prev) => [{ id: Date.now(), source: "sos", name: r.name, detail: r.detail, priority: r.priority }, ...prev]);
  }, []);

  return (
    <div className="w-full min-h-screen flex flex-col" style={{ background: C.bg, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}>
      <div className="px-5 pt-6 pb-0 flex items-end justify-between flex-wrap gap-2" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <div className="text-xl" style={{ color: C.text, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700 }}>HimalSanket</div>
          <div className="text-xs mt-1 mb-3" style={{ color: C.mutedDim }}>Corridor risk monitor</div>
        </div>
        <div className="flex">
          <TabButton active={tab === "risk"} onClick={() => setTab("risk")}>Corridor Risk Dashboard</TabButton>
          <TabButton active={tab === "search"} onClick={() => setTab("search")}>Search &amp; Rescue Priority</TabButton>
          <TabButton active={tab === "sos"} onClick={() => setTab("sos")}>SOS Beacon (victim view)</TabButton>
        </div>
      </div>

      {tab === "risk" && <RiskDashboard />}
      {tab === "search" && <SearchPriorityPanel searchItems={searchItems} addFamilyReport={addFamilyReport} />}
      {tab === "sos" && <SOSBeaconPanel addSOSReport={addSOSReport} />}

      {/* Floating Gemini Chatbot on Bottom Right Corner */}
      <GeminiChatbot />
    </div>
  );
}
