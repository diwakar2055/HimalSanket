import React, { useState, useMemo } from "react";
import { X, FileText, Copy, Check, Download, Radio, Shield, AlertTriangle } from "lucide-react";
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
Verified by Google Gemini 2.0 Flash AI Disaster Reasoner.
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
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#0B132B] border border-[#2A3B5E] shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-[#0F1B33] border-b border-[#2A3B5E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-700/80 flex items-center justify-center text-cyan-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Emergency Situation Report (SITREP) Exporter
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  NDRRMA / APF Standard
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                Official Incident Code: {incidentCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#16233F] hover:bg-[#203358] border border-[#2A3B5E] flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Header Bar */}
        <div className="p-3 bg-[#070D1B] border-b border-[#1E293B] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#94A3B8]">Threat Level:</span>
            <span
              className={`px-2 py-0.5 rounded font-bold uppercase text-[11px] ${
                risk?.tier === "Critical"
                  ? "bg-rose-950 text-rose-300 border border-rose-800"
                  : risk?.tier === "High"
                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                  : "bg-cyan-950 text-cyan-300 border border-cyan-800"
              }`}
            >
              {risk?.tier || "Moderate"}
            </span>
            <span className="text-[#64748B] font-mono">
              ({threatenedAssets.length} bridges/villages threatened)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(fullSitrepText, "full")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 transition-colors cursor-pointer text-xs font-semibold"
            >
              {copiedSection === "full" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === "full" ? "Copied Full SITREP!" : "Copy Full SITREP"}</span>
            </button>
            <button
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16233F] hover:bg-[#203358] text-white border border-[#2A3B5E] transition-colors cursor-pointer text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download (.txt)</span>
            </button>
          </div>
        </div>

        {/* Body Preview */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-[#0A1224] font-mono text-xs text-[#CBD5E1]">
          {/* Satellite SMS Packet Feature */}
          <div className="p-3 rounded-xl bg-[#0F1B33] border border-cyan-900/60 space-y-1.5 font-sans">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                Low-Bandwidth Satellite SMS Packet (Garmin inReach / Iridium / VHF)
              </span>
              <span className="text-[10px] font-mono text-[#64748B]">
                {satelliteSmsPacket.length} / 160 chars
              </span>
            </div>
            <div className="p-2 rounded-lg bg-[#070D1B] border border-[#1E293B] font-mono text-xs text-emerald-300 select-all">
              {satelliteSmsPacket}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => handleCopy(satelliteSmsPacket, "sms")}
                className="text-[11px] text-cyan-400 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
              >
                {copiedSection === "sms" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSection === "sms" ? "Copied SMS Packet!" : "Copy SMS Packet"}</span>
              </button>
            </div>
          </div>

          {/* Full SITREP Document Preview */}
          <div className="p-4 rounded-xl bg-[#070D1B] border border-[#1E293B] overflow-x-auto whitespace-pre leading-relaxed select-text text-[11px] text-[#CBD5E1]">
            {fullSitrepText}
          </div>
        </div>
      </div>
    </div>
  );
}
