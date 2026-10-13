import React, { useState, useMemo, useCallback } from "react";
import { Users, AlertTriangle, Search, ShieldCheck, MapPin, Building, Clock, Radio } from "lucide-react";
import { Language, getTranslation } from "../data/localization";
import { playConfirmationBeep } from "../utils/audioAlert";

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

function priorityBand(score: number) {
  if (score >= 80) return { label: "Priority 0 — Confirmed distress signal", color: "#EF4444", bg: "bg-rose-500/20", border: "border-rose-500/50", text: "text-rose-400" };
  if (score >= 65) return { label: "Priority 1 — Dig now", color: "#EF4444", bg: "bg-rose-500/20", border: "border-rose-500/50", text: "text-rose-400" };
  if (score >= 40) return { label: "Priority 2 — Next in queue", color: "#F97316", bg: "bg-orange-500/20", border: "border-orange-500/50", text: "text-orange-400" };
  if (score >= 20) return { label: "Priority 3 — Monitor", color: "#F59E0B", bg: "bg-amber-500/20", border: "border-amber-500/50", text: "text-amber-400" };
  return { label: "Priority 4 — Low urgency", color: "#06B6D4", bg: "bg-cyan-500/20", border: "border-cyan-500/50", text: "text-cyan-400" };
}

interface SearchPriorityPanelProps {
  searchItems: any[];
  addFamilyReport: (r: any) => void;
  language?: Language;
}

export function SearchPriorityPanel({
  searchItems,
  addFamilyReport,
  language = "en",
}: SearchPriorityPanelProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [buildingType, setBuildingType] = useState(BUILDING_TYPES[0].id);
  const [condition, setCondition] = useState(CONDITIONS[2].id);
  const [daysSinceContact, setDaysSinceContact] = useState<number | string>(1);

  const submit = useCallback(() => {
    if (!name.trim() || !location.trim()) return;
    playConfirmationBeep();
    addFamilyReport({ name, location, buildingType, condition, daysSinceContact: Number(daysSinceContact) });
    setName("");
    setLocation("");
    setDaysSinceContact(1);
  }, [name, location, buildingType, condition, daysSinceContact, addFamilyReport]);

  const sorted = useMemo(() => [...searchItems].sort((a, b) => b.priority - a.priority), [searchItems]);

  return (
    <div className="flex-1 px-4 sm:px-8 py-7 overflow-y-auto space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 shadow-lg">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="text-xs text-[#ECF1F6] leading-relaxed">
          <strong className="text-amber-300">Phase 2 SAR Concept — Algorithmic Rescue Dispatch Triage.</strong> On Sept 5, 2026, a 60-year-old woman was rescued alive
          after 11 days trapped beneath a collapsed building in Betrawati, Nuwakot — found by Armed Police Force (APF) sniffer-dog teams
          searching largely undirected terrain. This panel shows how family reports and direct victim SOS signals are algorithmically prioritized to direct search teams toward the highest-probability survival sites first.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="col-span-1 p-5 rounded-2xl border border-[#2A3B5E] bg-[#16233F] shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#2A3B5E]">
            <Search className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {getTranslation(language, "missingPersonFormTitle") || "Family: Report Missing Person"}
            </h3>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#8CA0BE] uppercase tracking-wider block mb-1">
              Full Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pasang Tamang"
              className="w-full text-xs p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500 bg-[#0F1B33] text-white border border-[#2A3B5E]"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#8CA0BE] uppercase tracking-wider block mb-1">
              Last Known Landmark / Village
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Betrawati Bazaar, Nuwakot"
              className="w-full text-xs p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500 bg-[#0F1B33] text-white border border-[#2A3B5E]"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#8CA0BE] uppercase tracking-wider block mb-1.5">
              Building / Location Type
            </label>
            <div className="flex flex-col gap-1.5">
              {BUILDING_TYPES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBuildingType(b.id)}
                  className={`text-xs px-3 py-2 rounded-xl text-left cursor-pointer transition-all border ${
                    buildingType === b.id
                      ? "bg-[#2E86AB]/30 border-[#2E86AB] text-white font-semibold"
                      : "bg-[#0F1B33] border-[#2A3B5E] text-[#8CA0BE] hover:text-white"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#8CA0BE] uppercase tracking-wider block mb-1.5">
              Reported Structural Condition
            </label>
            <div className="flex flex-col gap-1.5">
              {CONDITIONS.map((cnd) => (
                <button
                  key={cnd.id}
                  onClick={() => setCondition(cnd.id)}
                  className={`text-xs px-3 py-2 rounded-xl text-left cursor-pointer transition-all border ${
                    condition === cnd.id
                      ? "bg-orange-500/20 border-orange-500 text-orange-200 font-semibold"
                      : "bg-[#0F1B33] border-[#2A3B5E] text-[#8CA0BE] hover:text-white"
                  }`}
                >
                  {cnd.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#8CA0BE] uppercase tracking-wider block mb-1">
              Days Since Last Contact
            </label>
            <input
              type="number"
              min="0"
              value={daysSinceContact}
              onChange={(e) => setDaysSinceContact(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500 bg-[#0F1B33] text-white border border-[#2A3B5E]"
            />
          </div>

          <button
            onClick={submit}
            disabled={!name.trim() || !location.trim()}
            className="w-full text-xs font-bold py-3 rounded-xl cursor-pointer hover:opacity-90 transition-opacity bg-[#E4572E] text-white shadow-lg shadow-orange-950/60 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add to Prioritized Rescue Queue
          </button>
        </div>

        {/* Prioritized Queue Column */}
        <div className="col-span-1 lg:col-span-2 p-5 rounded-2xl border border-[#2A3B5E] bg-[#16233F] shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#2A3B5E]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Prioritized SAR Rescue Queue ({sorted.length})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#8CA0BE]">
                APF &amp; Nepal Army Helitack Dispatch
              </span>
            </div>

            {sorted.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#8CA0BE]">
                No reports currently in queue. Add a family report or transmit an emergency SOS beacon to test algorithmic triage.
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {sorted.map((r) => {
                  const band = priorityBand(r.priority);
                  return (
                    <div
                      key={r.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0F1B33] transition-all ${
                        r.source === "sos" ? "border-rose-500/60 shadow-md shadow-rose-950/40" : "border-[#2A3B5E]"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{r.name}</span>
                          {r.source === "sos" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-rose-500/30 text-rose-300 border border-rose-500/60 flex items-center gap-1">
                              <Radio className="w-3 h-3 animate-ping" /> Direct SOS
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#8CA0BE] leading-relaxed">
                          {r.detail}
                        </div>
                      </div>

                      <div className="shrink-0 sm:text-right">
                        <span className={`text-[11px] px-3 py-1 rounded-full font-bold border inline-block ${band.bg} ${band.border} ${band.text}`}>
                          {band.label}
                        </span>
                        <div className="text-[10px] font-mono text-[#5E729A] mt-1">
                          Priority Score: {r.priority}/100
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#2A3B5E] text-[11px] text-[#8CA0BE] flex items-center justify-between">
            <span>Rescue bases: Dhunche (APF Disaster Mgmt) · Kathmandu (Tribhuvan Heli Base)</span>
            <span className="font-mono text-emerald-400">● Heli Avail: 2 MI-17s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
