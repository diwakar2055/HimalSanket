import React, { useState, useMemo, useCallback, useEffect } from "react";
import { AdminCommandDashboard } from "./components/admin/AdminCommandDashboard";
import { CivilianDashboard } from "./components/civilian/CivilianDashboard";
import { RescuerDashboard } from "./components/rescuer/RescuerDashboard";
import { UserRoleProvider, useUserRole, UserRole } from "./context/UserRoleContext";
import { playEmergencyChime, playConfirmationBeep } from "./utils/audioAlert";
import { Language } from "./data/localization";
import { BrandLogo } from "./components/common/BrandLogo";
import {
  CORRIDOR_CONFIGS,
  CORRIDOR_LANDSLIDE_ZONES,
  MAP_ASSETS,
} from "./data/hazardMapData";
import {
  fetchLiveTelemetry,
  triggerPresentationScenario,
  LiveTelemetryResponse,
} from "./services/riskEngineApi";
import {
  Compass,
  Radio,
  Shield,
  Activity,
  CheckCircle2,
  ChevronDown,
  Mountain,
  AlertTriangle,
  Volume2,
  VolumeX,
  Languages,
  Users,
} from "lucide-react";
import { MobileBottomNav } from "./components/mobile/MobileBottomNav";

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const INITIAL_CORRIDORS = [
  { id: "langtang", name: "Langtang Valley", region: "Rasuwa", rainfall: 38, rainThreshold: 144, seismic: 1.8, lakeChange: 4, susceptibility: 0.71, reports: [], gps: "28.2096° N, 85.5089° E" },
  { id: "khumbu", name: "Everest / Khumbu", region: "Solukhumbu", rainfall: 22, rainThreshold: 144, seismic: 0.6, lakeChange: 1, susceptibility: 0.52, reports: [], gps: "27.9878° N, 86.9250° E" },
  { id: "annapurna", name: "Annapurna Circuit", region: "Manang", rainfall: 51, rainThreshold: 144, seismic: 1.1, lakeChange: 2, susceptibility: 0.63, reports: [], gps: "28.6667° N, 84.0167° E" },
  { id: "manaslu", name: "Manaslu Circuit", region: "Gorkha", rainfall: 17, rainThreshold: 144, seismic: 0.4, lakeChange: 0, susceptibility: 0.44, reports: [], gps: "28.5497° N, 84.5602° E" },
  { id: "rolwaling", name: "Rolwaling Valley", region: "Dolakha", rainfall: 28, rainThreshold: 144, seismic: 0.8, lakeChange: 1.5, susceptibility: 0.68, reports: [], gps: "27.8540° N, 86.4780° E" },
  { id: "mardi", name: "Mardi Himal Trek", region: "Kaski", rainfall: 42, rainThreshold: 160, seismic: 0.9, lakeChange: 0.5, susceptibility: 0.65, reports: [], gps: "28.3840° N, 83.8920° E" },
  { id: "poonhill", name: "Ghorepani Poon Hill", region: "Myagdi / Parbat", rainfall: 35, rainThreshold: 150, seismic: 0.7, lakeChange: 0.0, susceptibility: 0.58, reports: [], gps: "28.3750° N, 83.7380° E" },
  { id: "abc", name: "Annapurna Base Camp (ABC)", region: "Kaski / Sanctuary", rainfall: 48, rainThreshold: 160, seismic: 1.2, lakeChange: 2.5, susceptibility: 0.74, reports: [], gps: "28.4750° N, 83.8570° E" },
];

const DEFAULT_CORRIDOR_USER_POSITIONS: Record<string, { lat: number; lng: number; altitude: number }> = {
  langtang: { lat: 28.2140, lng: 85.4950, altitude: 2780 },
  khumbu: { lat: 27.8933, lng: 86.8294, altitude: 4410 },
  annapurna: { lat: 28.6544, lng: 84.0216, altitude: 3519 },
  manaslu: { lat: 28.5800, lng: 84.6700, altitude: 3530 },
  rolwaling: { lat: 27.8540, lng: 86.4780, altitude: 3690 },
  mardi: { lat: 28.41499, lng: 83.85454, altitude: 3250 },
  poonhill: { lat: 28.35673, lng: 83.73538, altitude: 1960 },
  abc: { lat: 28.45702, lng: 83.85693, altitude: 2310 },
};

function computeRisk(c: any) {
  const rainScore = Math.min((c.rainfall || 0) / (c.rainThreshold || 144), 1);
  const seismicScore = Math.min((c.seismic || 0) / 4, 1);
  const lakeScore = Math.min((c.lakeChange || 0) / 15, 1);
  const reportScore = Math.min((c.reports?.length || 0) * 0.18, 1);
  const score = rainScore * 0.3 + seismicScore * 0.2 + lakeScore * 0.25 + (c.susceptibility || 0.71) * 0.1 + reportScore * 0.15;
  let tier: "Low" | "Moderate" | "High" | "Critical" = "Low";
  if (score >= 0.7) tier = "Critical";
  else if (score >= 0.5) tier = "High";
  else if (score >= 0.3) tier = "Moderate";
  return { score, tier, rainScore, seismicScore, lakeScore, reportScore };
}

const TIER_CONFIG = {
  Low: {
    border: "border-[#16785d]/60",
    text: "text-[#52c7ad]",
    bg: "bg-[#053c2e]",
    dot: "bg-[#52c7ad]",
    labelEn: "Safe baseline",
    labelNe: "सामान्य अवस्था",
    icon: CheckCircle2,
  },
  Moderate: {
    border: "border-[#1d4ed8]/50",
    text: "text-[#38bdf8]",
    bg: "bg-[#132845]",
    dot: "bg-[#38bdf8]",
    labelEn: "Moderate watch",
    labelNe: "सतर्कता आवश्यक",
    icon: Activity,
  },
  High: {
    border: "border-[#78350f]/60",
    text: "text-[#fbbf24]",
    bg: "bg-[#3b2308]",
    dot: "bg-[#fbbf24]",
    labelEn: "Elevated risk",
    labelNe: "उच्च जोखिम",
    icon: AlertTriangle,
  },
  Critical: {
    border: "border-[#9f1239]/60",
    text: "text-[#fb7185]",
    bg: "bg-[#3b0f19]",
    dot: "bg-[#fb7185] animate-pulse",
    labelEn: "Critical emergency",
    labelNe: "आपतकालीन संकट",
    icon: AlertTriangle,
  },
};

function MainApp() {
  const { currentRole, setCurrentRole, userProfile, broadcastSOS, distressBeacons } = useUserRole();

  // App settings
  const [language, setLanguage] = useState<Language>("en");
  const [audioMuted, setAudioMuted] = useState(false);
  const [isCorridorDropdownOpen, setIsCorridorDropdownOpen] = useState(false);
  const [civilianMobileTab, setCivilianMobileTab] = useState<"shelters" | "map">("shelters");

  // Corridors & Telemetry
  const [corridors, setCorridors] = useState<any[]>(INITIAL_CORRIDORS);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_CORRIDORS[0].id);
  const [liveData, setLiveData] = useState<LiveTelemetryResponse | null>(null);
  const [isSensingSyncing, setIsSensingSyncing] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<string>("baseline");
  const [waterSurge, setWaterSurge] = useState<number>(0);

  // Trekker Geolocation
  const [userPosition, setUserPosition] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    altitude?: number;
  } | null>({
    lat: 28.2140,
    lng: 85.4950,
    accuracy: 15,
    altitude: 2780,
  });
  const [isLocating, setIsLocating] = useState(false);

  // Compute Multi-Hazard Risks
  const risks = useMemo(() => {
    const map: Record<string, any> = {};
    corridors.forEach((c) => {
      map[c.id] = computeRisk(c);
    });
    return map;
  }, [corridors]);

  const selectedCorridor = useMemo(() => {
    const config = CORRIDOR_CONFIGS[selectedId] || CORRIDOR_CONFIGS.langtang;
    const telemetry = corridors.find((c) => c.id === selectedId) || corridors[0];
    return {
      ...config,
      ...telemetry,
      center: config.center,
      zoom: config.zoom,
      riverPath: config.riverPath,
      centerName: config.centerName,
    };
  }, [corridors, selectedId]);

  const selectedRisk = useMemo(() => {
    return risks[selectedId] || computeRisk(selectedCorridor);
  }, [risks, selectedId, selectedCorridor]);

  const corridorAssets = useMemo(() => {
    return MAP_ASSETS.filter((a) => a.corridorId === selectedId);
  }, [selectedId]);

  // Distance to river and landslide calculations
  const { distanceToRiver, distanceToLandslide, distanceToHazard } = useMemo(() => {
    if (!userPosition) return { distanceToRiver: null, distanceToLandslide: null, distanceToHazard: null };
    const config = CORRIDOR_CONFIGS[selectedId] || CORRIDOR_CONFIGS.langtang;

    let minRiver = Infinity;
    for (const pt of config.riverPath || []) {
      const d = getDistanceMeters(userPosition.lat, userPosition.lng, pt.lat, pt.lng);
      if (d < minRiver) minRiver = d;
    }

    let minLandslide = Infinity;
    for (const lz of CORRIDOR_LANDSLIDE_ZONES[selectedId] || []) {
      for (const pt of lz.polygon) {
        const d = getDistanceMeters(userPosition.lat, userPosition.lng, pt[0], pt[1]);
        if (d < minLandslide) minLandslide = d;
      }
    }

    const dRiver = minRiver !== Infinity ? Math.round(minRiver) : null;
    const dLandslide = minLandslide !== Infinity ? Math.round(minLandslide) : null;

    let dHazard = dRiver;
    if (activeScenario === "seismic_tremor" && dLandslide !== null) {
      dHazard = dLandslide;
    } else if (dRiver !== null && dLandslide !== null) {
      dHazard = Math.min(dRiver, dLandslide);
    } else {
      dHazard = dRiver ?? dLandslide;
    }

    return {
      distanceToRiver: dRiver,
      distanceToLandslide: dLandslide,
      distanceToHazard: dHazard,
    };
  }, [userPosition, selectedId, activeScenario]);

  // Authoritative Multi-Hazard Evaluation across all scenarios & trails
  const isHazardActive = useMemo(() => {
    // 1. Active drill or compound emergency scenario triggered by Admin
    const isScenarioDisaster =
      activeScenario === "critical_cascade" ||
      activeScenario === "cloudburst_spike" ||
      activeScenario === "glof_lake_expansion" ||
      activeScenario === "seismic_tremor";

    // 2. Flood surge inundation threat:
    // A river at 0m surge is calm and within natural banks (Safe).
    // Surges >= 0.5m expand laterally into the valley floor.
    // Major surges >= 1.5m threaten the entire valley floor.
    const surgeBufferMeters = 25 + waterSurge * 40;
    const isSurgeThreat =
      waterSurge >= 1.5 ||
      (waterSurge >= 0.5 && distanceToRiver !== null && distanceToRiver <= surgeBufferMeters);

    // 3. Landslide & debris chute threat:
    // Active during heavy rainfall (>90% threshold) or seismic tremor, when user is near steep scarp
    const isRainfallSaturated = (selectedCorridor.rainfall || 0) >= (selectedCorridor.rainThreshold || 144) * 0.9;
    const isLandslideThreat =
      (isScenarioDisaster || isRainfallSaturated) &&
      distanceToLandslide !== null &&
      distanceToLandslide < 200;

    return isScenarioDisaster || isSurgeThreat || isLandslideThreat;
  }, [activeScenario, waterSurge, distanceToRiver, distanceToLandslide, selectedCorridor]);

  const geofenceStatus = isHazardActive ? "DANGER" : "SAFE";

  // Audio alert on danger
  useEffect(() => {
    if (!audioMuted && geofenceStatus === "DANGER") {
      playEmergencyChime();
    }
  }, [geofenceStatus, audioMuted]);

  // Sync Telemetry
  const syncLiveTelemetry = useCallback(async (corridorId: string) => {
    setIsSensingSyncing(true);
    try {
      const data = await fetchLiveTelemetry(corridorId);
      setLiveData(data);
      if (data.active_scenario) setActiveScenario(data.active_scenario);

      setCorridors((prev) =>
        prev.map((c) =>
          c.id === corridorId
            ? {
                ...c,
                rainfall: data.corridor.rainfall,
                seismic: data.corridor.seismic_activity,
                lakeChange: data.corridor.lake_area_change,
                reports: data.corridor.reports?.length ? data.corridor.reports : c.reports,
              }
            : c
        )
      );
    } catch (err) {
      // Offline fallback
    } finally {
      setIsSensingSyncing(false);
    }
  }, []);

  useEffect(() => {
    syncLiveTelemetry(selectedId);
  }, [selectedId, syncLiveTelemetry]);

  // Trigger Scenario Drills
  const handleTriggerScenario = useCallback(
    async (scenarioId: string) => {
      setActiveScenario(scenarioId);
      try {
        await triggerPresentationScenario(scenarioId, selectedId);
        await syncLiveTelemetry(selectedId);
      } catch (err) {
        // Fallback
      }

      if (scenarioId === "cloudburst_spike") setWaterSurge(2.5);
      else if (scenarioId === "glof_lake_expansion") setWaterSurge(1.5);
      else if (scenarioId === "critical_cascade") setWaterSurge(3.5);
      else if (scenarioId === "seismic_tremor") setWaterSurge(1.0);
      else setWaterSurge(0);
    },
    [selectedId, syncLiveTelemetry]
  );

  // GPS Device Locator
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude || 2450,
        });
        setIsLocating(false);
      },
      () => {
        setUserPosition({
          lat: 28.2140,
          lng: 85.4950,
          accuracy: 15,
          altitude: 2780,
        });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const handleTriggerSOS = useCallback(
    (customNote?: string) => {
      if (!audioMuted) playEmergencyChime();
      const lat = userPosition?.lat || 28.2140;
      const lng = userPosition?.lng || 85.4950;
      broadcastSOS({
        name: `Trekker SOS (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`,
        lat,
        lng,
        altitude: userPosition?.altitude || 2780,
        detail: customNote || "Direct Emergency SOS Distress transmitted by trekker on trail.",
        priority: 95,
        corridorId: selectedId,
      });
    },
    [audioMuted, userPosition, broadcastSOS, selectedId]
  );

  const tierConfig = TIER_CONFIG[selectedRisk.tier] || TIER_CONFIG.Low;
  const TierIcon = tierConfig.icon;

  const handleSwitchRole = (role: UserRole) => {
    playConfirmationBeep();
    setCurrentRole(role);
  };

  return (
    <div className="w-full h-screen h-[100dvh] flex flex-col bg-[#0b1320] text-[#f1f5f9] antialiased overflow-hidden font-sans select-none">
      {/* 1. SIMPLE, MINIMAL & MODERN TOP NAVIGATION HEADER */}
      <header className="px-4 py-2 bg-[#0b1320] border-b border-[#1c2536] flex items-center justify-between gap-3 shrink-0 z-30">
        {/* Left: Brand + Corridor Dropdown (Spans Civilian Sidebar width ~400-420px) */}
        <div className="flex items-center justify-between lg:w-[400px] xl:w-[420px] shrink-0 lg:pr-4">
          <BrandLogo size="md" />

          {/* Himalayan Corridor Selector */}
          <div className="relative">
            <button
              onClick={() => setIsCorridorDropdownOpen((p) => !p)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111c2e] hover:bg-[#15233a] border border-[#1e2c44] text-xs font-semibold text-[#f1f5f9] cursor-pointer transition-colors shadow-sm"
            >
              <Compass className="w-3.5 h-3.5 text-[#8fa0b5] shrink-0" />
              <span className="truncate max-w-[100px] sm:max-w-none">{selectedCorridor.name}</span>
              <ChevronDown className="w-3 h-3 text-[#707c9b] shrink-0" />
            </button>

            {isCorridorDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={() => setIsCorridorDropdownOpen(false)}
                />
                <div className="absolute right-0 lg:right-0 top-10 w-60 max-h-[70vh] overflow-y-auto custom-scrollbar rounded-xl bg-[#111c2e] border border-[#1e2c44] shadow-2xl p-1.5 z-[9999] text-xs space-y-0.5">
                  <div className="text-[10px] font-mono text-[#8fa0b5] uppercase tracking-wider px-2 py-1 sticky top-0 bg-[#111c2e] z-10">
                    Select Himalayan Corridor
                  </div>
                  {corridors.map((c) => {
                    const isCur = c.id === selectedId;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          playConfirmationBeep();
                          setSelectedId(c.id);
                          const defPos = DEFAULT_CORRIDOR_USER_POSITIONS[c.id];
                          if (defPos) {
                            setUserPosition({ ...defPos, accuracy: 15 });
                          }
                          syncLiveTelemetry(c.id);
                          setIsCorridorDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left cursor-pointer transition-colors ${
                          isCur
                            ? "bg-[#1c2e4a] text-[#38bdf8] font-semibold border border-[#2a456c]"
                            : "text-[#8fa0b5] hover:bg-[#15233a] hover:text-[#f1f5f9]"
                        }`}
                      >
                        <div className="truncate">
                          <div className="text-xs font-medium">{c.name}</div>
                          <div className="text-[11px] text-[#64748b]">{c.region}</div>
                        </div>
                        <span className="text-[11px] font-mono text-[#64748b]">{c.rainfall}mm</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: CLEAN SEGMENTED ROLE CONTROL (Delegated to MobileBottomNav on <1024px) */}
        <div className="hidden lg:flex items-center bg-[#111c2e] p-1 rounded-xl border border-[#1c2536]">
          <button
            onClick={() => handleSwitchRole("civilian")}
            className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              currentRole === "civilian"
                ? "bg-[#1c2e4a] text-[#38bdf8] font-semibold border border-[#2a456c] shadow-sm"
                : "text-[#8fa0b5] hover:text-[#f1f5f9] font-medium"
            }`}
          >
            <span className="hidden lg:inline">Civilian / Trekker</span>
            <span className="lg:hidden">Trekker</span>
          </button>

          <button
            onClick={() => handleSwitchRole("rescuer")}
            className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              currentRole === "rescuer"
                ? "bg-[#1c2e4a] text-[#38bdf8] font-semibold border border-[#2a456c] shadow-sm"
                : "text-[#8fa0b5] hover:text-[#f1f5f9] font-medium"
            }`}
          >
            <span className="hidden lg:inline">Search & Rescue</span>
            <span className="lg:hidden">SAR</span>
            {distressBeacons.filter((b) => b.status === "pending").length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => handleSwitchRole("admin")}
            className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              currentRole === "admin"
                ? "bg-[#1c2e4a] text-[#38bdf8] font-semibold border border-[#2a456c] shadow-sm"
                : "text-[#8fa0b5] hover:text-[#f1f5f9] font-medium"
            }`}
          >
            <span className="hidden lg:inline">Command Admin</span>
            <span className="lg:hidden">Admin</span>
          </button>
        </div>

        {/* Right: Hazard Status Badge + Controls */}
        <div className="flex items-center gap-2">
          {/* Corridor Risk Badge */}
          <div
            className={`hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${tierConfig.bg} ${tierConfig.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${tierConfig.dot}`} />
            <span className={`font-medium ${tierConfig.text}`}>
              {language === "ne" ? tierConfig.labelNe : tierConfig.labelEn}
            </span>
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage((p) => (p === "en" ? "ne" : "en"))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#121c2d] hover:bg-[#18253a] text-xs text-[#8fa0b5] hover:text-[#f1f5f9] border border-[#1e2c44] cursor-pointer transition-colors"
            title="Toggle Nepali / English"
          >
            <Languages className="w-3.5 h-3.5 text-[#8fa0b5]" />
            <span>{language === "en" ? "नेपाली" : "EN"}</span>
          </button>

          {/* Sound Mute Toggle */}
          <button
            onClick={() => setAudioMuted((p) => !p)}
            className="p-2 rounded-lg bg-[#121c2d] hover:bg-[#18253a] text-[#8fa0b5] hover:text-[#f1f5f9] border border-[#1e2c44] cursor-pointer transition-colors"
            title={audioMuted ? "Unmute audible chimes (Emergency alerts muted)" : "Mute audible chimes (Audible hazard warning active)"}
          >
            {audioMuted ? <VolumeX className="w-3.5 h-3.5 text-[#707c9b]" /> : <Volume2 className="w-3.5 h-3.5 text-[#8fa0b5]" />}
          </button>
        </div>
      </header>

      {/* 2. MAIN PURPOSEFUL ROLE VIEWPORT (100% Focused, Zero Extraneous Clutter) */}
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-[#0b1320] pb-16 lg:pb-0">
        {currentRole === "civilian" && (
          <CivilianDashboard
            corridor={selectedCorridor}
            userPosition={userPosition}
            onLocateMe={handleLocateMe}
            isLocating={isLocating}
            distanceToHazard={distanceToHazard}
            geofenceStatus={geofenceStatus}
            onTriggerSOS={handleTriggerSOS}
            language={language}
            assets={corridorAssets}
            activeScenario={activeScenario}
            waterSurge={waterSurge}
            mobileTab={civilianMobileTab}
            onMobileTabChange={setCivilianMobileTab}
          />
        )}

        {currentRole === "rescuer" && (
          <RescuerDashboard
            corridor={selectedCorridor}
            userPosition={userPosition}
            onLocateMe={handleLocateMe}
            language={language}
            assets={corridorAssets}
            activeScenario={activeScenario}
            waterSurge={waterSurge}
          />
        )}

        {currentRole === "admin" && (
          <AdminCommandDashboard
            corridors={corridors}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            selectedRisk={selectedRisk}
            liveData={liveData}
            isSensingSyncing={isSensingSyncing}
            syncLiveTelemetry={syncLiveTelemetry}
            handleTriggerScenario={handleTriggerScenario}
            activeScenario={activeScenario}
            waterSurge={waterSurge}
            setWaterSurge={setWaterSurge}
            userPosition={userPosition}
            language={language}
            assets={corridorAssets}
          />
        )}
      </main>

      {/* 3. MOBILE BOTTOM THUMB NAVIGATION (< 1024px / < lg) */}
      <div className="lg:hidden">
        <MobileBottomNav
          activeTab={
            currentRole === "civilian"
              ? civilianMobileTab === "map"
                ? "map"
                : "safety"
              : currentRole === "rescuer"
              ? "rescue"
              : "admin"
          }
          onChangeTab={(tab) => {
            if (tab === "safety") {
              handleSwitchRole("civilian");
              setCivilianMobileTab("shelters");
            } else if (tab === "map") {
              handleSwitchRole("civilian");
              setCivilianMobileTab("map");
            } else if (tab === "rescue") {
              handleSwitchRole("rescuer");
            } else if (tab === "admin") {
              handleSwitchRole("admin");
            }
          }}
          onOpenSos={() => handleTriggerSOS("CRITICAL EMERGENCY BEACON (Mobile 1-Tap SOS)")}
          pendingSosCount={distressBeacons.filter((b) => b.status === "pending").length}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <UserRoleProvider>
      <MainApp />
    </UserRoleProvider>
  );
}
