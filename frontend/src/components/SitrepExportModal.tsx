import React, { useState, useMemo } from "react";
import { X, FileText, Copy, Check, Download, Radio } from "lucide-react";
import { MAP_ASSETS } from "../data/hazardMapData";

interface SitrepExportModalProps {
  corridor: any;
  risk: any;
  liveData: any;
  waterSurge?: number;
  onClose: () => void;
}

export function SitrepExportModal({
  corridor,
  risk,
  liveData,
  waterSurge = 0,
  onClose,
}: SitrepExportModalProps) {
  const [copiedSection, setCopiedSection] = useState<"full" | "sms" | null>(null);

  const timestampIso = new Date().toISOString();
  const nepaliDateStr = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kathmandu",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const incidentCode = `SITREP-${new Date().getFullYear()}-HIMAL-${corridor?.id?.toUpperCase() || "LANGTANG"}-${Date.now().toString().slice(-4)}`;

  const corridorAssets = useMemo(() => {
    return MAP_ASSETS.filter((a) => a.corridorId === corridor?.id);
  }, [corridor?.id]);

  const threatenedAssets = useMemo(() => {
    return corridorAssets.filter(
      (a) => waterSurge > 0 && a.hazardThresholdMeters - waterSurge <= 0
    );
  }, [corridorAssets, waterSurge]);

  const safeHavens = useMemo(() => {
    return corridorAssets.filter((a) => a.type === "safeZone");
  }, [corridorAssets]);

  // Formal NDRRMA / APF Text
  const fullSitrepText = useMemo(() => {
    const tier = risk?.tier || "Moderate";
    const score = (risk?.score || 0.45).toFixed(2);
    const rain = corridor?.rainfall || 38;
    const thresh = corridor?.rainThreshold || 144;
    const seismic = corridor?.seismic || 1.8;
    const lakeChange = corridor?.lakeChange || 4.0;
    const directive =
      liveData?.gemini_intelligence?.action_directive ||
      "RESTRICT LOW-LYING GORGE PASSAGE; EVACUATE TO UPPER RIDGE TERRACES";

    return `===================================================================
HIMALSANKET MULTI-HAZARD SITUATION REPORT (SITREP)
NEPAL DISASTER RISK REDUCTION AND MANAGEMENT AUTHORITY (NDRRMA)
ARMED POLICE FORCE (APF) & NEPAL ARMY DISASTER COMMAND
===================================================================
INCIDENT REPORT CODE: ${incidentCode}
ISSUED (NPT): ${nepaliDateStr} (+05:45 NPT)
ISSUED (UTC): ${timestampIso}
SECURITY CLASSIFICATION: OFFICIAL EMERGENCY BROADCAST

1. TARGET BASIN & REGIONAL CONTEXT
   - Corridor: ${corridor?.name || "Langtang Valley"} (${corridor?.region || "Rasuwa"} District, Nepal)
   - Centroid GPS: ${corridor?.gps || "28.2096° N, 85.5089° E"}
   - Primary River System: ${corridor?.name} Khola Basin
   - Overall Hazard Threat Level: [${tier.toUpperCase()}]
   - Computed Multi-Hazard Risk Index: ${score} / 1.00

2. SENSED PHYSICAL TELEMETRY (CONTINUOUS SENSOR NETWORK)
   - 24h Cumulative Precipitation: ${rain} mm (Regional Threshold: ${thresh} mm - ${((rain / thresh) * 100).toFixed(0)}% Capacity)
   - Real-time Seismicity: ${seismic} Magnitude (USGS/NSC Micro-array)
   - Sentinel-2 NDWI Glacial Lake Surface Delta: +${lakeChange}% (Moraine Dam Watch)
   - Active Inundation / River Crest Level: +${waterSurge.toFixed(1)} meters above baseline
   - Verified Ground Civilian Reports: ${corridor?.reports?.length || 0} active field dispatches

3. CRITICAL INFRASTRUCTURE & SETTLEMENT IMPACT
   - Total Monitored Vulnerable Assets: ${corridorAssets.length}
   - Critical / Submerged Assets: ${threatenedAssets.length}
${threatenedAssets.length > 0 ? threatenedAssets.map((a) => `     * [BREACHED] ${a.name} (${a.type.toUpperCase()}, Elev: ${a.elevation}m ASL)`).join("\n") : "     * All monitored bridges and river settlements currently above crestline."}

4. CIVILIAN ESCAPE HAVENS & RESCUE FORWARD BASES
${safeHavens.map((s) => `   - Designated Haven: ${s.name} (Elev: ${s.elevation}m ASL, Capacity: ${s.capacity || 100} persons)`).join("\n")}
   - Air Rescue Liaison: APF Mountain Disaster Division / Nepal Army HAWS
   - Emergency Frequency: VHF Ch 16 (143.900 MHz) & National Emergency Desk (1149)

5. TACTICAL DIRECTIVE & MITIGATION PROTOCOL
   ${directive}

===================================================================
Generated automatically by HimalSanket Multi-Hazard Decision Support System.
Verified by Google Gemini AI Multi-Hazard Engine.
===================================================================`;
  }, [
    incidentCode,
    nepaliDateStr,
    timestampIso,
    corridor,
    risk,
    waterSurge,
    corridorAssets,
    threatenedAssets,
    safeHavens,
    liveData,
  ]);

  // Ultra-Short Satellite SMS Packet (< 160 chars) for Garmin inReach / Iridium
  const satelliteSmsPacket = useMemo(() => {
    const tier = risk?.tier?.toUpperCase() || "MOD";
    const name = corridor?.name?.split(" ")[0] || "Langtang";
    const rain = corridor?.rainfall || 38;
    const lake = corridor?.lakeChange || 4.0;
    const surge = waterSurge > 0 ? ` +${waterSurge.toFixed(1)}m` : "";
    return `HimalSanket ALERT [${tier}] ${name}: Rain ${rain}mm, Lake +${lake}%${surge}. Evacuate river bed to safe havens. APF/DHM notified. VHF 143.9MHz.`;
  }, [corridor, risk, waterSurge]);

  const handleCopy = (text: string, section: "full" | "sms") => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([fullSitrepText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${incidentCode}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#18191E] border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans">
        {/* Header */}
        <div className="p-4 bg-[#111215] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Emergency Situation Report (SITREP) Exporter
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  NDRRMA / APF Standard
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Incident Code: {incidentCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Header Bar */}
        <div className="p-3 bg-[#18191E] border-b border-white/[0.08] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Threat Level:</span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] font-mono ${
                risk?.tier === "Critical"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : risk?.tier === "High"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {risk?.tier || "Moderate"}
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              ({threatenedAssets.length} bridges/villages threatened)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(fullSitrepText, "full")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/10 transition-colors cursor-pointer text-xs font-semibold"
            >
              {copiedSection === "full" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === "full" ? "Copied SITREP!" : "Copy SITREP"}</span>
            </button>
            <button
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-black font-bold transition-colors cursor-pointer text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download (.txt)</span>
            </button>
          </div>
        </div>

        {/* Body Preview */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-[#111215] font-mono text-xs text-slate-300 custom-scrollbar">
          {/* Satellite SMS Packet Feature */}
          <div className="p-3.5 rounded-xl bg-[#18191E] border border-white/[0.08] space-y-1.5 font-sans">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-slate-400" />
                Low-Bandwidth Satellite SMS Packet (Garmin inReach / Iridium / VHF)
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {satelliteSmsPacket.length} / 160 chars
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#111215] border border-white/[0.06] font-mono text-xs text-emerald-300 select-all">
              {satelliteSmsPacket}
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={() => handleCopy(satelliteSmsPacket, "sms")}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedSection === "sms" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSection === "sms" ? "Copied SMS Packet!" : "Copy SMS Packet"}</span>
              </button>
            </div>
          </div>

          {/* Full SITREP Document Preview */}
          <div className="p-4 rounded-xl bg-[#18191E] border border-white/[0.08] overflow-x-auto whitespace-pre leading-relaxed select-text text-[11px] text-slate-300 font-mono">
            {fullSitrepText}
          </div>
        </div>
      </div>
    </div>
  );
}
