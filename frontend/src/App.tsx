import React, { useState, useMemo, useCallback, useEffect } from "react";
import { AdminCommandDashboard } from "./components/admin/AdminCommandDashboard";
import { CivilianDashboard } from "./components/civilian/CivilianDashboard";
import { RescuerDashboard } from "./components/rescuer/RescuerDashboard";
import { UserRoleProvider, useUserRole, UserRole } from "./context/UserRoleContext";
import { playEmergencyChime, playConfirmationBeep } from "./utils/audioAlert";
import { Language } from "./data/localization";
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
];

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
    border: "border-zinc-800",
    text: "text-zinc-300",
    bg: "bg-zinc-900/60",
    dot: "bg-emerald-500",
    labelEn: "Safe baseline",
    labelNe: "सामान्य अवस्था",
    icon: CheckCircle2,
  },
  Moderate: {
    border: "border-zinc-800",
    text: "text-zinc-300",
    bg: "bg-zinc-900/60",
    dot: "bg-amber-500",
    labelEn: "Moderate watch",
    labelNe: "सतर्कता आवश्यक",
    icon: Activity,
  },
  High: {
    border: "border-zinc-800",
    text: "text-zinc-300",
    bg: "bg-zinc-900/60",
    dot: "bg-orange-500",
    labelEn: "Elevated risk",
    labelNe: "उच्च जोखिम",
    icon: AlertTriangle,
  },
  Critical: {
    border: "border-red-900/40",
    text: "text-red-300",
    bg: "bg-red-950/20",
    dot: "bg-red-500 animate-pulse",
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

  // Distance to hazard calculation
  const distanceToHazard = useMemo(() => {
    if (!userPosition) return null;
    const config = CORRIDOR_CONFIGS[selectedId] || CORRIDOR_CONFIGS.langtang;
    let minD = Infinity;

    for (const pt of config.riverPath || []) {
      const d = getDistanceMeters(userPosition.lat, userPosition.lng, pt.lat, pt.lng);
      if (d < minD) minD = d;
    }

    for (const lz of CORRIDOR_LANDSLIDE_ZONES[selectedId] || []) {
      for (const pt of lz.polygon) {
        const d = getDistanceMeters(userPosition.lat, userPosition.lng, pt[0], pt[1]);
        if (d < minD) minD = d;
      }
    }

    return Math.round(minD);
  }, [userPosition, selectedId]);

  const isHazardActive =
    (distanceToHazard !== null && distanceToHazard < (150 + waterSurge * 40)) ||
    waterSurge > 1.5 ||
    activeScenario === "critical_cascade" ||
    activeScenario === "cloudburst_spike" ||
    activeScenario === "glof_lake_expansion";

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
    <div className="w-full h-screen flex flex-col bg-zinc-950 text-zinc-100 antialiased overflow-hidden font-sans select-none">
      {/* 1. SIMPLE, MINIMAL & MODERN TOP NAVIGATION HEADER */}
      <header className="px-4 py-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0 z-30">
        {/* Left: Brand + Corridor Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center font-medium">
              <Mountain className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <span className="font-semibold text-zinc-100 text-sm tracking-tight block leading-tight">
                HimalSanket
              </span>
              <span className="text-[11px] text-zinc-500 block leading-none">
                हिमाल संकेत
              </span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

          {/* Himalayan Corridor Selector */}
          <div className="relative">
            <button
              onClick={() => setIsCorridorDropdownOpen((p) => !p)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-medium text-zinc-200 cursor-pointer transition-colors shadow-sm"
            >
              <Compass className="w-3.5 h-3.5 text-zinc-400" />
              <span>{selectedCorridor.name}</span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {isCorridorDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={() => setIsCorridorDropdownOpen(false)}
                />
                <div className="absolute left-0 top-10 w-60 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl p-1.5 z-[9999] text-xs space-y-0.5">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider px-2 py-1">
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
                          syncLiveTelemetry(c.id);
                          setIsCorridorDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left cursor-pointer transition-colors ${
                          isCur
                            ? "bg-zinc-800 text-zinc-100 font-medium"
                            : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                        }`}
                      >
                        <div className="truncate">
                          <div className="text-xs font-medium">{c.name}</div>
                          <div className="text-[11px] text-zinc-500">{c.region}</div>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-500">{c.rainfall}mm</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: CLEAN SEGMENTED ROLE CONTROL */}
        <div className="flex items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => handleSwitchRole("civilian")}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              currentRole === "civilian"
                ? "bg-zinc-800 text-zinc-100 font-medium shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 font-normal"
            }`}
          >
            Civilian / Trekker
          </button>

          <button
            onClick={() => handleSwitchRole("rescuer")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              currentRole === "rescuer"
                ? "bg-zinc-800 text-zinc-100 font-medium shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 font-normal"
            }`}
          >
            <span>Search & Rescue</span>
            {distressBeacons.filter((b) => b.status === "pending").length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => handleSwitchRole("admin")}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              currentRole === "admin"
                ? "bg-zinc-800 text-zinc-100 font-medium shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 font-normal"
            }`}
          >
            Command Admin
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 cursor-pointer transition-colors"
            title="Toggle Nepali / English"
          >
            <Languages className="w-3.5 h-3.5 text-zinc-400" />
            <span>{language === "en" ? "नेपाली" : "EN"}</span>
          </button>

          {/* Sound Mute Toggle */}
          <button
            onClick={() => setAudioMuted((p) => !p)}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 cursor-pointer transition-colors"
            title={audioMuted ? "Unmute chimes" : "Mute chimes"}
          >
            {audioMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-500" /> : <Volume2 className="w-3.5 h-3.5 text-zinc-400" />}
          </button>
        </div>
      </header>

      {/* 2. MAIN PURPOSEFUL ROLE VIEWPORT (100% Focused, Zero Extraneous Clutter) */}
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-zinc-950">
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
