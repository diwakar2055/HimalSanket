import React, { useState, useMemo, useCallback } from "react";

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

const TIER = {
  Low: { color: C.teal, label: "Low", ne: "\u0928\u094D\u092F\u0942\u0928" },
  Moderate: { color: C.amber, label: "Moderate", ne: "\u092E\u0927\u094D\u092F\u092E" },
  High: { color: C.orange, label: "High", ne: "\u0909\u091A\u094D\u091A" },
  Critical: { color: C.red, label: "Critical", ne: "\u0917\u092E\u094D\u092D\u0940\u0930" },
};

const INITIAL_CORRIDORS = [
  { id: "langtang", name: "Langtang Valley", region: "Rasuwa", rainfall: 38, rainThreshold: 144, seismic: 1.8, lakeChange: 4, susceptibility: 0.71, reports: [], gps: "28.2096\u00B0 N, 85.5089\u00B0 E" },
  { id: "khumbu", name: "Everest / Khumbu", region: "Solukhumbu", rainfall: 22, rainThreshold: 144, seismic: 0.6, lakeChange: 1, susceptibility: 0.52, reports: [], gps: "27.9878\u00B0 N, 86.9250\u00B0 E" },
  { id: "annapurna", name: "Annapurna Circuit", region: "Manang", rainfall: 51, rainThreshold: 144, seismic: 1.1, lakeChange: 2, susceptibility: 0.63, reports: [], gps: "28.6667\u00B0 N, 84.0167\u00B0 E" },
  { id: "manaslu", name: "Manaslu Circuit", region: "Gorkha", rainfall: 17, rainThreshold: 144, seismic: 0.4, lakeChange: 0, susceptibility: 0.44, reports: [], gps: "28.5497\u00B0 N, 84.5602\u00B0 E" },
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

function computeRisk(c) {
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

function generateBriefing(c, risk) {
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
    ? `${c.name} \u0939\u093E\u0932 \u0915\u092E \u091C\u094B\u0916\u093F\u092E\u092E\u093E \u091B\u0964 \u092A\u0930\u093F\u0938\u094D\u0925\u093F\u0924\u093F \u0938\u093E\u092E\u093E\u0928\u094D\u092F \u0926\u093E\u092F\u0930\u093E\u092E\u093E \u091B\u0964`
    : `${c.name} ${TIER[risk.tier].ne} \u091C\u094B\u0916\u093F\u092E\u092E\u093E \u091B\u0964 \u0938\u0924\u0930\u094D\u0915\u0924\u093E \u0905\u092A\u0928\u093E\u0907 \u092F\u093E\u0924\u094D\u0930\u093E \u0938\u0902\u0917\u0920\u0928\u0932\u093E\u0908 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0917\u0930\u093E\u0909\u0928\u0941\u0939\u094B\u0938\u094D\u0964`;

  return { en, ne };
}

function priorityBand(score) {
  if (score >= 80) return { label: "Priority 0 \u2014 Confirmed distress signal", color: C.red };
  if (score >= 65) return { label: "Priority 1 \u2014 Dig now", color: C.red };
  if (score >= 40) return { label: "Priority 2 \u2014 Next in queue", color: C.orange };
  if (score >= 20) return { label: "Priority 3 \u2014 Monitor", color: C.amber };
  return { label: "Priority 4 \u2014 Low urgency", color: C.teal };
}

function StatRow({ label, value, unit, fraction }) {
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

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} className="text-sm px-4 py-2" style={{ color: active ? C.text : C.muted, borderBottom: active ? `2px solid ${C.orange}` : "2px solid transparent", fontWeight: active ? 600 : 400 }}>
      {children}
    </button>
  );
}

function RiskDashboard() {
  const [corridors, setCorridors] = useState(INITIAL_CORRIDORS);
  const [selectedId, setSelectedId] = useState(INITIAL_CORRIDORS[0].id);
  const [reportDraftType, setReportDraftType] = useState(null);
  const [reportNote, setReportNote] = useState("");
  const [voiceAttached, setVoiceAttached] = useState(false);
  const [pulseId, setPulseId] = useState(null);

  const risks = useMemo(() => {
    const map = {};
    corridors.forEach((c) => { map[c.id] = computeRisk(c); });
    return map;
  }, [corridors]);

  const selected = corridors.find((c) => c.id === selectedId);
  const selectedRisk = risks[selectedId];
  const briefing = useMemo(() => generateBriefing(selected, selectedRisk), [selected, selectedRisk]);

  const simulateSpike = useCallback((id) => {
    setCorridors((prev) => prev.map((c) => (c.id === id ? { ...c, rainfall: Math.min(c.rainfall + 65, 220), lakeChange: c.lakeChange + 6, seismic: c.seismic + 1.6 } : c)));
    setPulseId(id);
    setTimeout(() => setPulseId(null), 900);
  }, []);

  const resetCorridor = useCallback((id) => {
    const base = INITIAL_CORRIDORS.find((c) => c.id === id);
    setCorridors((prev) => prev.map((c) => (c.id === id ? { ...base, reports: c.reports } : c)));
  }, []);

  const submitReport = useCallback(() => {
    if (!reportDraftType) return;
    const label = REPORT_TYPES.find((t) => t.id === reportDraftType).label;
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
              <button key={c.id} onClick={() => setSelectedId(c.id)} className="w-full text-left px-5 py-3 flex items-center justify-between" style={{ background: active ? C.panel : "transparent" }}>
                <div>
                  <div className="text-sm" style={{ color: C.text, fontWeight: active ? 600 : 400 }}>{c.name}</div>
                  <div className="text-xs" style={{ color: C.mutedDim }}>{c.region}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${t.color}22`, color: t.color, border: `1px solid ${t.color}55`, transform: pulseId === c.id ? "scale(1.12)" : "scale(1)", transition: "transform 0.3s ease" }}>{t.label}</span>
              </button>
            );
          })}
        </div>
        <div className="px-5 py-4 text-xs" style={{ color: C.mutedDim, borderTop: `1px solid ${C.border}` }}>Prototype \u2014 signals are simulated locally for this demo.</div>
      </div>

      <div className="flex-1 px-8 py-7 overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs mb-1" style={{ color: C.mutedDim }}>{selected.region}</div>
            <h1 className="text-2xl" style={{ color: C.text, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700 }}>{selected.name}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => simulateSpike(selected.id)} className="text-sm px-3 py-2 rounded" style={{ background: C.orange, color: "#fff" }}>Simulate rainfall spike</button>
            <button onClick={() => resetCorridor(selected.id)} className="text-sm px-3 py-2 rounded" style={{ background: "transparent", color: C.muted, border: `1px solid ${C.border}` }}>Reset signals</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-1 p-4 rounded" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="text-xs mb-3" style={{ color: C.mutedDim }}>Live signals</div>
            <StatRow label="Rainfall" value={selected.rainfall} unit=" mm/24h" fraction={selectedRisk.rainScore} />
            <StatRow label="Seismic activity" value={selected.seismic.toFixed(1)} unit=" M nearby" fraction={selectedRisk.seismicScore} />
            <StatRow label="Lake area change" value={`+${selected.lakeChange}`} unit="%" fraction={selectedRisk.lakeScore} />
            <StatRow label="Terrain susceptibility" value={(selected.susceptibility * 100).toFixed(0)} unit="/100" fraction={selected.susceptibility} />
            <StatRow label="Ground reports" value={selected.reports.length} unit="" fraction={selectedRisk.reportScore} />
            <div className="mt-4 p-3 rounded text-center" style={{ background: `${TIER[selectedRisk.tier].color}18`, border: `1px solid ${TIER[selectedRisk.tier].color}55` }}>
              <div className="text-xs" style={{ color: C.mutedDim }}>Fused risk tier</div>
              <div className="text-lg" style={{ color: TIER[selectedRisk.tier].color, fontWeight: 700 }}>{TIER[selectedRisk.tier].label}</div>
            </div>
          </div>

          <div className="col-span-2 flex flex-col gap-5">
            <div className="p-4 rounded" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs" style={{ color: C.mutedDim }}>Gemini reasoning layer</div>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: C.panelAlt, color: C.mutedDim }}>simulated for demo</span>
              </div>
              <p className="text-sm mb-3" style={{ color: C.text, lineHeight: 1.55 }}>{briefing.en}</p>
              <p className="text-sm" style={{ color: C.muted, lineHeight: 1.55 }}>{briefing.ne}</p>
            </div>

            <div className="p-4 rounded" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <div className="text-xs mb-3" style={{ color: C.mutedDim }}>Submit a ground report</div>
              <div className="flex flex-wrap gap-2 mb-3">
                {REPORT_TYPES.map((t) => (
                  <button key={t.id} onClick={() => setReportDraftType(t.id)} className="text-sm px-3 py-1.5 rounded" style={{ background: reportDraftType === t.id ? C.teal : "transparent", color: reportDraftType === t.id ? "#fff" : C.muted, border: `1px solid ${reportDraftType === t.id ? C.teal : C.border}` }}>{t.label}</button>
                ))}
              </div>
              <textarea value={reportNote} onChange={(e) => setReportNote(e.target.value)} placeholder="Optional note (what did you see?) \u2014 useful when typing isn't practical" className="w-full text-sm p-2 rounded mb-3" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, resize: "none" }} rows={2} />
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={submitReport} disabled={!reportDraftType} className="text-sm px-4 py-2 rounded" style={{ background: reportDraftType ? C.orange : C.border, color: reportDraftType ? "#fff" : C.mutedDim }}>Submit report</button>
                <button onClick={() => setVoiceAttached((v) => !v)} className="text-sm px-3 py-2 rounded flex items-center gap-2" style={{ background: voiceAttached ? `${C.teal}22` : "transparent", color: voiceAttached ? C.teal : C.muted, border: `1px solid ${voiceAttached ? C.teal : C.border}` }}>
                  <span style={{ fontSize: "0.9em" }}>{voiceAttached ? "\u25CF" : "\u25CB"}</span>
                  {voiceAttached ? "Voice note attached" : "Attach voice note"}
                </button>
                <span className="text-xs" style={{ color: C.mutedDim }}>for local dialects, low literacy</span>
              </div>
              {selected.reports.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {selected.reports.map((r) => (
                    <div key={r.id} className="text-xs p-2 rounded flex justify-between" style={{ background: C.panelAlt, color: C.muted }}>
                      <span><strong style={{ color: C.text }}>{r.label}</strong>{r.note ? ` \u2014 ${r.note}` : ""}{r.voice ? <span style={{ color: C.teal }}> \u00B7 voice note</span> : ""}</span>
                      <span style={{ color: C.mutedDim }}>{r.time.toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchPriorityPanel({ searchItems, addFamilyReport }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [buildingType, setBuildingType] = useState(BUILDING_TYPES[0].id);
  const [condition, setCondition] = useState(CONDITIONS[2].id);
  const [daysSinceContact, setDaysSinceContact] = useState(1);

  const submit = useCallback(() => {
    if (!name.trim() || !location.trim()) return;
    addFamilyReport({ name, location, buildingType, condition, daysSinceContact: Number(daysSinceContact) });
    setName(""); setLocation(""); setDaysSinceContact(1);
  }, [name, location, buildingType, condition, daysSinceContact, addFamilyReport]);

  const sorted = useMemo(() => [...searchItems].sort((a, b) => b.priority - a.priority), [searchItems]);

  return (
    <div className="flex-1 px-8 py-7 overflow-y-auto">
      <div className="mb-5 p-4 rounded" style={{ background: `${C.amber}18`, border: `1px solid ${C.amber}55` }}>
        <div className="text-sm" style={{ color: C.text }}>
          <strong>Phase 2 concept \u2014 not part of the hackathon MVP.</strong> On Sept 5, 2026, a 60-year-old woman was rescued alive
          after 11 days trapped beneath a collapsed building in Betrawati, Nuwakot \u2014 found by Armed Police Force sniffer-dog teams
          searching largely undirected terrain. This panel does not replace that work. It shows how family reports and direct SOS
          signals could help direct search teams toward the highest-priority sites sooner.
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-1 p-4 rounded" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-xs mb-3" style={{ color: C.mutedDim }}>Family: report a missing person</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full text-sm p-2 rounded mb-2" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }} />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Last known location (village / landmark)" className="w-full text-sm p-2 rounded mb-3" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }} />

          <div className="text-xs mb-1" style={{ color: C.mutedDim }}>Building type</div>
          <div className="flex flex-col gap-1 mb-3">
            {BUILDING_TYPES.map((b) => (
              <button key={b.id} onClick={() => setBuildingType(b.id)} className="text-sm px-3 py-1.5 rounded text-left" style={{ background: buildingType === b.id ? C.teal : "transparent", color: buildingType === b.id ? "#fff" : C.muted, border: `1px solid ${buildingType === b.id ? C.teal : C.border}` }}>{b.label}</button>
            ))}
          </div>

          <div className="text-xs mb-1" style={{ color: C.mutedDim }}>Reported condition</div>
          <div className="flex flex-col gap-1 mb-3">
            {CONDITIONS.map((cnd) => (
              <button key={cnd.id} onClick={() => setCondition(cnd.id)} className="text-sm px-3 py-1.5 rounded text-left" style={{ background: condition === cnd.id ? C.orange : "transparent", color: condition === cnd.id ? "#fff" : C.muted, border: `1px solid ${condition === cnd.id ? C.orange : C.border}` }}>{cnd.label}</button>
            ))}
          </div>

          <div className="text-xs mb-1" style={{ color: C.mutedDim }}>Days since last contact</div>
          <input type="number" min="0" value={daysSinceContact} onChange={(e) => setDaysSinceContact(e.target.value)} className="w-full text-sm p-2 rounded mb-3" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }} />

          <button onClick={submit} className="text-sm px-4 py-2 rounded" style={{ background: C.orange, color: "#fff" }}>Add to search list</button>
        </div>

        <div className="col-span-2 p-4 rounded" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-xs mb-3" style={{ color: C.mutedDim }}>Prioritized search list ({sorted.length})</div>
          {sorted.length === 0 && <div className="text-sm" style={{ color: C.mutedDim }}>No reports yet \u2014 add one, or send an SOS from the beacon tab, to see it prioritized.</div>}
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
                    <div className="text-xs" style={{ color: C.mutedDim }}>{r.detail}</div>
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

function SOSBeaconPanel({ addSOSReport }) {
  const [corridorId, setCorridorId] = useState(INITIAL_CORRIDORS[0].id);
  const [transcript, setTranscript] = useState("");
  const [photoAttached, setPhotoAttached] = useState(false);
  const [signal, setSignal] = useState("weak");
  const [log, setLog] = useState([]);

  const corridor = INITIAL_CORRIDORS.find((c) => c.id === corridorId);

  const send = useCallback(() => {
    const time = new Date().toLocaleTimeString();
    const entries = [];
    // location always attempted first — smallest payload
    entries.push(`[${time}] GPS ping (${corridor.gps}) \u2014 sent`);
    if (signal === "none") {
      entries.push(`[${time}] No signal \u2014 voice note and photo queued locally, will retry automatically`);
    } else if (signal === "weak") {
      entries.push(`[${time}] Weak signal \u2014 location delivered. Voice note and photo still queued, sending when signal improves`);
    } else {
      if (transcript.trim()) entries.push(`[${time}] Voice note delivered (${transcript.trim().split(/\s+/).length} words)`);
      if (photoAttached) entries.push(`[${time}] Photo delivered`);
    }
    setLog((prev) => [...entries, ...prev]);

    const severityHit = SEVERITY_KEYWORDS.some((k) => transcript.toLowerCase().includes(k));
    const gotFullPayload = signal === "strong";
    let priority = 75; // direct SOS always outranks family reports
    if (severityHit) priority += 15;
    if (!gotFullPayload) priority -= 10; // less information came through
    priority = Math.min(priority, 100);

    const detailParts = [`GPS: ${corridor.gps}`];
    detailParts.push(gotFullPayload ? "full report received" : signal === "weak" ? "location only \u2014 media queued" : "no data received yet, retrying");
    if (gotFullPayload && transcript.trim()) detailParts.push(`"${transcript.trim().slice(0, 60)}${transcript.trim().length > 60 ? "\u2026" : ""}"`);

    addSOSReport({ name: `SOS \u2014 ${corridor.name}`, detail: detailParts.join(" \u00B7 "), priority });
  }, [corridor, transcript, photoAttached, signal, addSOSReport]);

  return (
    <div className="flex-1 px-8 py-7 overflow-y-auto">
      <div className="mb-5 p-4 rounded" style={{ background: `${C.red}18`, border: `1px solid ${C.red}55` }}>
        <div className="text-sm" style={{ color: C.text }}>
          <strong>Victim self-report \u2014 Phase 2 concept.</strong> Designed for the moment right after a collapse or flood, while
          someone is still conscious and has a few seconds of signal. Location is sent first, as the smallest possible payload \u2014
          voice and photo follow only if the connection allows. If the phone dies before anything sends, this tool has nothing to
          offer; it only helps once at least one signal gets through.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="p-5 rounded" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-xs mb-2" style={{ color: C.mutedDim }}>Simulated location context</div>
          <select value={corridorId} onChange={(e) => setCorridorId(e.target.value)} className="w-full text-sm p-2 rounded mb-4" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}` }}>
            {INITIAL_CORRIDORS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="text-xs mb-2" style={{ color: C.mutedDim }}>Voice note (type what you'd say \u2014 stands in for a recording)</div>
          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="e.g. I'm trapped on the second floor, my leg is stuck, there are two of us" className="w-full text-sm p-2 rounded mb-4" style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, resize: "none" }} rows={3} />

          <button onClick={() => setPhotoAttached((v) => !v)} className="text-sm px-3 py-2 rounded mb-4" style={{ background: photoAttached ? `${C.teal}22` : "transparent", color: photoAttached ? C.teal : C.muted, border: `1px solid ${photoAttached ? C.teal : C.border}` }}>
            {photoAttached ? "\u25CF Photo attached" : "\u25CB Attach photo of surroundings"}
          </button>

          <div className="text-xs mb-2" style={{ color: C.mutedDim }}>Simulated signal strength</div>
          <div className="flex gap-2 mb-5">
            {SIGNAL_LEVELS.map((s) => (
              <button key={s.id} onClick={() => setSignal(s.id)} className="text-sm px-3 py-1.5 rounded" style={{ background: signal === s.id ? C.orange : "transparent", color: signal === s.id ? "#fff" : C.muted, border: `1px solid ${signal === s.id ? C.orange : C.border}` }}>{s.label}</button>
            ))}
          </div>

          <button onClick={send} className="w-full text-base font-semibold px-4 py-3 rounded" style={{ background: C.red, color: "#fff" }}>Send SOS</button>
        </div>

        <div className="p-5 rounded" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-xs mb-3" style={{ color: C.mutedDim }}>Transmission log</div>
          {log.length === 0 && <div className="text-sm" style={{ color: C.mutedDim }}>No SOS sent yet.</div>}
          <div className="flex flex-col gap-2">
            {log.map((entry, i) => (
              <div key={i} className="text-xs p-2 rounded" style={{ background: C.panelAlt, color: C.muted }}>{entry}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HimalSanketDashboard() {
  const [tab, setTab] = useState("risk");
  const [searchItems, setSearchItems] = useState([]);

  const addFamilyReport = useCallback((r) => {
    const bw = BUILDING_TYPES.find((b) => b.id === r.buildingType).weight;
    const cw = CONDITIONS.find((c) => c.id === r.condition).weight;
    const dayScore = Math.min(r.daysSinceContact * 3, 24);
    const priority = Math.min(bw + cw + dayScore, 100);
    setSearchItems((prev) => [{
      id: Date.now(),
      source: "family",
      name: r.name,
      detail: `${r.location} \u00B7 ${BUILDING_TYPES.find((b) => b.id === r.buildingType).label} \u00B7 ${CONDITIONS.find((c) => c.id === r.condition).label} \u00B7 ${r.daysSinceContact}d since contact`,
      priority,
    }, ...prev]);
  }, []);

  const addSOSReport = useCallback((r) => {
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
    </div>
  );
}
