import React, { useState, useMemo, useCallback, useEffect } from "react";
import { CommandHeader } from "./components/CommandHeader";
import { CivilianDashboard } from "./components/civilian/CivilianDashboard";
import { RescuerDashboard } from "./components/rescuer/RescuerDashboard";
import { AdminCommandDashboard } from "./components/admin/AdminCommandDashboard";
import { SystemTourModal } from "./components/SystemTourModal";
import { CorridorStoriesBar } from "./components/mobile/CorridorStoriesBar";
import { MobileBottomNav } from "./components/mobile/MobileBottomNav";
import { EmergencySosModal } from "./components/mobile/EmergencySosModal";
import { PersonaSwitcherModal } from "./components/mobile/PersonaSwitcherModal";
import { UserRoleProvider, useUserRole } from "./context/UserRoleContext";
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

function MainApp() {
  const { currentRole, setCurrentRole, broadcastSOS, distressBeacons } = useUserRole();

  const [language, setLanguage] = useState<Language>("en");
  const [audioMuted, setAudioMuted] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);

  // Mobile Bottom Nav Tab State
  const [mobileNavTab, setMobileNavTab] = useState<"safety" | "map" | "rescue" | "admin">(
    currentRole === "rescuer" ? "rescue" : currentRole === "admin" ? "admin" : "safety"
  );

  // Sync mobile nav tab when currentRole changes externally
  useEffect(() => {
    if (currentRole === "civilian") setMobileNavTab("safety");
    else if (currentRole === "rescuer") setMobileNavTab("rescue");
    else if (currentRole === "admin") setMobileNavTab("admin");
  }, [currentRole]);

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

  // Corridors with live risk tiers for Instagram Stories bar
  const corridorsWithTiers = useMemo(() => {
    return corridors.map((c) => ({
      ...c,
      tier: risks[c.id]?.tier || "Low",
    }));
  }, [corridors, risks]);

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

  // Assets in selected corridor
  const corridorAssets = useMemo(() => {
    return MAP_ASSETS.filter((a) => a.corridorId === selectedId);
  }, [selectedId]);

  // Distance to hazard calculation
  const distanceToHazard = useMemo(() => {
    if (!userPosition) return null;
    const config = CORRIDOR_CONFIGS[selectedId] || CORRIDOR_CONFIGS.langtang;
    let minD = Infinity;

    // Check river
    for (const pt of config.riverPath || []) {
      const d = getDistanceMeters(userPosition.lat, userPosition.lng, pt.lat, pt.lng);
      if (d < minD) minD = d;
    }

    // Check landslide zones
    for (const lz of CORRIDOR_LANDSLIDE_ZONES[selectedId] || []) {
      for (const pt of lz.polygon) {
        const d = getDistanceMeters(userPosition.lat, userPosition.lng, pt[0], pt[1]);
        if (d < minD) minD = d;
      }
    }

    return Math.round(minD);
  }, [userPosition, selectedId]);

  const geofenceStatus = distanceToHazard !== null && distanceToHazard < 150 ? "DANGER" : "SAFE";

  // Audio alert on danger
  useEffect(() => {
    if (!audioMuted && (geofenceStatus === "DANGER" || activeScenario === "critical_cascade")) {
      playEmergencyChime();
    }
  }, [geofenceStatus, activeScenario, audioMuted]);

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
      console.warn("Offline telemetry fallback active:", err);
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
        console.warn("Trigger scenario fallback:", err);
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

  const pendingSosCount = distressBeacons.filter((b) => b.status === "pending").length;

  return (
    <div className="w-full h-screen flex flex-col bg-[#070D18] text-[#F8FAFC] antialiased overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* 1. Big Tech Streamlined Command Header with 1-Click Persona Switcher */}
      <CommandHeader
        activeTier={selectedRisk.tier}
        activeCorridor={selectedCorridor}
        allCorridors={corridors}
        onSelectCorridor={(id) => {
          playConfirmationBeep();
          setSelectedId(id);
          syncLiveTelemetry(id);
        }}
        language={language}
        onToggleLanguage={() => {
          playConfirmationBeep();
          setLanguage((prev) => (prev === "en" ? "ne" : "en"));
        }}
        onOpenGuide={() => {
          playConfirmationBeep();
          setIsTourOpen(true);
        }}
        audioMuted={audioMuted}
        onToggleAudioMute={() => {
          playConfirmationBeep();
          setAudioMuted((prev) => !prev);
        }}
        onOpenPersonaSwitcher={() => {
          playConfirmationBeep();
          setIsPersonaModalOpen(true);
        }}
      />

      {/* 2. Instagram Stories Style Corridor Status Carousel */}
      <CorridorStoriesBar
        corridors={corridorsWithTiers}
        selectedId={selectedId}
        onSelectCorridor={(id) => {
          playConfirmationBeep();
          setSelectedId(id);
          syncLiveTelemetry(id);
        }}
        language={language}
      />

      {/* 3. Main Viewport Stage (Desktop Split / Mobile Bottom Sheet) */}
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden pb-14 lg:pb-0">
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

      {/* 4. Mobile Bottom Navigation Bar (Thumb-Zone Optimized) */}
      <div className="lg:hidden">
        <MobileBottomNav
          activeTab={mobileNavTab}
          onChangeTab={(tab) => {
            setMobileNavTab(tab);
          }}
          onOpenSos={() => {
            setIsSosModalOpen(true);
          }}
          pendingSosCount={pendingSosCount}
        />
      </div>

      {/* 5. Apple Emergency SOS Modal */}
      <EmergencySosModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        onConfirmSOS={(note) => {
          handleTriggerSOS(note);
        }}
        userPosition={userPosition}
        corridorName={selectedCorridor.name}
      />

      {/* 6. Instagram/Meta Persona Switcher Modal */}
      <PersonaSwitcherModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
      />

      {/* 7. System Architecture Tour Modal */}
      <SystemTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        language={language}
      />
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
