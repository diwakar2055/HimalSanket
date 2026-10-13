import React, { useState, useMemo, useCallback, useEffect } from "react";
import { CommandHeader } from "./components/CommandHeader";
import { RiskDashboard } from "./components/RiskDashboard";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { SearchPriorityPanel } from "./components/SearchPriorityPanel";
import { SOSBeaconPanel } from "./components/SOSBeaconPanel";
import { GeminiChatbot } from "./components/GeminiChatbot";
import { SystemTourModal } from "./components/SystemTourModal";
import { SentinelLakeModal } from "./components/SentinelLakeModal";
import { playEmergencyChime, playConfirmationBeep } from "./utils/audioAlert";
import { Language } from "./data/localization";
import {
  CORRIDOR_CONFIGS,
  CORRIDOR_LANDSLIDE_ZONES,
  CORRIDOR_SENTINEL_LAKES,
} from "./data/hazardMapData";
import {
  fetchLiveTelemetry,
  triggerPresentationScenario,
  LiveTelemetryResponse,
} from "./services/riskEngineApi";

// Haversine geodesic distance in meters
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

export default function App() {
  // Navigation & Localization
  const [tab, setTab] = useState<"risk" | "analytics" | "search" | "sos">("risk");
  const [language, setLanguage] = useState<Language>("en");
  const [audioMuted, setAudioMuted] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [inspectingLake, setInspectingLake] = useState<any>(null);

  // Corridors & Active Telemetry
  const [corridors, setCorridors] = useState<any[]>(INITIAL_CORRIDORS);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_CORRIDORS[0].id);
  const [liveData, setLiveData] = useState<LiveTelemetryResponse | null>(null);
  const [isSensingSyncing, setIsSensingSyncing] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [activeScenario, setActiveScenario] = useState<string>("baseline");
  const [waterSurge, setWaterSurge] = useState<number>(0);

  // Search & Rescue + Victim SOS
  const [searchItems, setSearchItems] = useState<any[]>([]);
  const [sosDistresses, setSosDistresses] = useState<Array<{
    id: string | number;
    name: string;
    lat: number;
    lng: number;
    detail: string;
    priority: number;
    time?: string;
  }>>([]);

  // Live Trekker Geolocation
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

  // Compute Multi-Hazard Risks for all corridors
  const risks = useMemo(() => {
    const map: Record<string, any> = {};
    corridors.forEach((c) => {
      map[c.id] = computeRisk(c);
    });
    return map;
  }, [corridors]);

  const selectedCorridor = useMemo(() => {
    return corridors.find((c) => c.id === selectedId) || corridors[0];
  }, [corridors, selectedId]);

  const selectedRisk = useMemo(() => {
    return risks[selectedId] || computeRisk(selectedCorridor);
  }, [risks, selectedId, selectedCorridor]);

  // Geofence proximity calculation: compute minimum distance in meters to river & landslide polygons
  const distanceToHazard = useMemo(() => {
    if (!userPosition) return null;
    const config = CORRIDOR_CONFIGS[selectedId] || CORRIDOR_CONFIGS.langtang;
    let minD = Infinity;

    // Check river path
    const river = config.riverPath || [];
    for (const pt of river) {
      const d = getDistanceMeters(userPosition.lat, userPosition.lng, pt.lat, pt.lng);
      if (d < minD) minD = d;
    }

    // Check landslide hazard zones
    const landslides = CORRIDOR_LANDSLIDE_ZONES[selectedId] || [];
    for (const lz of landslides) {
      for (const pt of lz.polygon) {
        const d = getDistanceMeters(userPosition.lat, userPosition.lng, pt[0], pt[1]);
        if (d < minD) minD = d;
      }
    }

    return Math.round(minD);
  }, [userPosition, selectedId]);

  const geofenceStatus = distanceToHazard !== null && distanceToHazard < 150 ? "DANGER" : "SAFE";

  // Audio alert triggered on dangerous geofence proximity or critical cascade
  useEffect(() => {
    if (!audioMuted && (geofenceStatus === "DANGER" || activeScenario === "critical_cascade")) {
      playEmergencyChime();
    }
  }, [geofenceStatus, activeScenario, audioMuted]);

  // Sync real-time sensed telemetry from the backend (with offline cache resilience)
  const syncLiveTelemetry = useCallback(async (corridorId: string) => {
    setIsSensingSyncing(true);
    try {
      const data = await fetchLiveTelemetry(corridorId);
      setLiveData(data);
      setLastSynced(new Date());
      // Persist to localStorage for offline Himalayan field operations
      try {
        localStorage.setItem(`himalsanket_cache_${corridorId}`, JSON.stringify(data));
      } catch (_) {}

      if (data.active_scenario) {
        setActiveScenario(data.active_scenario);
      }
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
      console.warn("Live telemetry sync (offline fallback active):", err);
      // Retrieve last known telemetry from offline localStorage cache
      try {
        const cached = localStorage.getItem(`himalsanket_cache_${corridorId}`);
        if (cached) {
          const cachedData = JSON.parse(cached);
          setLiveData(cachedData);
        }
      } catch (_) {}
    } finally {
      setIsSensingSyncing(false);
    }
  }, []);

  // Trigger presentation disaster scenarios
  const handleTriggerScenario = useCallback(
    async (scenarioId: string) => {
      setActiveScenario(scenarioId);
      try {
        await triggerPresentationScenario(scenarioId, selectedId);
        await syncLiveTelemetry(selectedId);
      } catch (err) {
        console.warn("Trigger scenario fallback:", err);
      }

      // Automatically adjust simulated water rise buffer
      if (scenarioId === "cloudburst_spike") {
        setWaterSurge(2.5);
      } else if (scenarioId === "glof_lake_expansion") {
        setWaterSurge(1.5);
      } else if (scenarioId === "critical_cascade") {
        setWaterSurge(3.5);
      } else if (scenarioId === "seismic_tremor") {
        setWaterSurge(1.0);
      } else {
        setWaterSurge(0);
      }
    },
    [selectedId, syncLiveTelemetry]
  );

  useEffect(() => {
    syncLiveTelemetry(selectedId);
  }, [selectedId, syncLiveTelemetry]);

  // GPS Locate Device
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
      (err) => {
        console.warn("GPS lookup failed, using simulated corridor location:", err);
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

  // Quick 1-Click SOS Broadcast
  const handleTriggerSOS = useCallback((customNote?: string) => {
    if (!audioMuted) {
      playEmergencyChime();
    }
    const lat = userPosition?.lat || 28.2140;
    const lng = userPosition?.lng || 85.4950;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newDistress = {
      id: Date.now(),
      name: `SOS — Trekker at ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
      lat,
      lng,
      detail: customNote || "Direct Emergency SOS Distress transmitted by trekker on trail.",
      priority: 95,
      time,
    };
    setSosDistresses((prev) => [newDistress, ...prev]);
    setSearchItems((prev) => [
      {
        id: newDistress.id,
        source: "sos",
        name: newDistress.name,
        detail: `GPS: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E · ${newDistress.detail}`,
        priority: 95,
      },
      ...prev,
    ]);
  }, [audioMuted, userPosition]);

  // SAR Family Report
  const addFamilyReport = useCallback((r: any) => {
    const dayScore = Math.min(r.daysSinceContact * 3, 24);
    const priority = Math.min(40 + dayScore, 100);
    setSearchItems((prev) => [
      {
        id: Date.now(),
        source: "family",
        name: r.name,
        detail: `${r.location} · ${r.daysSinceContact}d since contact`,
        priority,
      },
      ...prev,
    ]);
  }, []);

  // Victim SOS Report
  const addSOSReport = useCallback((r: any) => {
    const lat = r.lat || userPosition?.lat || 28.2140;
    const lng = r.lng || userPosition?.lng || 85.4950;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const distress = {
      id: Date.now(),
      name: r.name,
      lat,
      lng,
      detail: r.detail,
      priority: r.priority,
      time,
    };
    setSosDistresses((prev) => [distress, ...prev]);
    setSearchItems((prev) => [
      { id: distress.id, source: "sos", name: r.name, detail: r.detail, priority: r.priority },
      ...prev,
    ]);
  }, [userPosition]);

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#0A1224] text-[#F8FAFC] antialiased selection:bg-cyan-500 selection:text-black">
      {/* 1. Executive Command Center Top Header */}
      <CommandHeader
        currentTab={tab}
        onTabChange={(newTab) => {
          playConfirmationBeep();
          setTab(newTab);
        }}
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
        onTriggerQuickSOS={() => handleTriggerSOS()}
        audioMuted={audioMuted}
        onToggleAudioMute={() => {
          playConfirmationBeep();
          setAudioMuted((prev) => !prev);
        }}
      />

      {/* 2. Primary Tab Views */}
      <main className="flex-1 flex flex-col min-h-0">
        {tab === "risk" && (
          <RiskDashboard
            corridors={corridors}
            setCorridors={setCorridors}
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
            setUserPosition={setUserPosition}
            sosDistresses={sosDistresses}
            onTriggerSOS={handleTriggerSOS}
            onLocateMe={handleLocateMe}
            isLocating={isLocating}
            distanceToHazard={distanceToHazard}
            geofenceStatus={geofenceStatus}
            onInspectLake={() => {
              const lake =
                liveData?.sentinel_satellite_lake ||
                (CORRIDOR_SENTINEL_LAKES as any)[selectedId] ||
                (CORRIDOR_SENTINEL_LAKES as any).langtang;
              setInspectingLake(lake);
            }}
            language={language}
          />
        )}

        {tab === "analytics" && (
          <AnalyticsDashboard
            corridor={selectedCorridor}
            risk={selectedRisk}
            liveData={liveData}
            activeScenario={activeScenario}
            waterSurge={waterSurge}
            onInspectLake={() => {
              const lake =
                liveData?.sentinel_satellite_lake ||
                (CORRIDOR_SENTINEL_LAKES as any)[selectedId] ||
                (CORRIDOR_SENTINEL_LAKES as any).langtang;
              setInspectingLake(lake);
            }}
            language={language}
          />
        )}

        {tab === "search" && (
          <SearchPriorityPanel
            searchItems={searchItems}
            addFamilyReport={addFamilyReport}
            language={language}
          />
        )}

        {tab === "sos" && (
          <SOSBeaconPanel
            addSOSReport={addSOSReport}
            userPosition={userPosition}
            onLocateMe={handleLocateMe}
            audioMuted={audioMuted}
            language={language}
          />
        )}
      </main>

      {/* 3. System Architecture Walkthrough Tour Modal */}
      <SystemTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        language={language}
      />

      {/* 4. ESA Sentinel-2 Glacial Lake Inspector Modal */}
      {inspectingLake && (
        <SentinelLakeModal
          lake={inspectingLake}
          onClose={() => setInspectingLake(null)}
          language={language}
        />
      )}

      {/* 5. Floating Gemini 2.0 Flash AI Copilot */}
      <GeminiChatbot
        activeCorridor={selectedCorridor}
        allCorridors={corridors}
        userPosition={userPosition}
        geofenceStatus={geofenceStatus}
        distanceToHazard={distanceToHazard}
        activeScenario={activeScenario}
        waterSurge={waterSurge}
      />
    </div>
  );
}
