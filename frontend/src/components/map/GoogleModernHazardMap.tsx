import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  MapAsset,
  CorridorConfig,
  CORRIDOR_LANDSLIDE_ZONES,
  CORRIDOR_RESCUE_BASES,
  CORRIDOR_LAKE_POLYGONS,
} from "../../data/hazardMapData";
import { generateGeodesicBufferPolygon, LatLng } from "../../utils/geoBuffer";
import { DistressBeacon, DispatchedRescueTeam } from "../../context/UserRoleContext";
import {
  deconflictMapAssets,
  getLandslideCrownScarpAnchor,
  MapLayerFilters,
  DEFAULT_LAYER_FILTERS,
  LAYER_PRESETS,
  LayerPreset,
} from "../../utils/mapDeconflict";
import {
  Layers,
  Compass,
  Navigation,
  AlertTriangle,
  Shield,
  HeartPulse,
  GraduationCap,
  Users,
  Radio,
  ExternalLink,
  Check,
  Building2,
  Clock,
  MapPin,
  Activity,
  RefreshCw,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HelicopterIcon, HELICOPTER_SVG_PATH } from "../common/HelicopterIcon";
import { ErrorBoundary } from "../ErrorBoundary";
const BridgeMarkerIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 18h18" strokeWidth="2.4" />
    <path d="M5 18V8l7 4 7-4v10" />
    <path d="M12 12v6" />
    <path d="M8 10v8" />
    <path d="M16 10v8" />
  </svg>
);

export interface GoogleModernHazardMapProps {
  corridor: CorridorConfig;
  assets?: MapAsset[];
  mode?: "civilian" | "rescuer" | "admin";
  userPosition?: { lat: number; lng: number; accuracy?: number; altitude?: number } | null;
  distressBeacons?: DistressBeacon[];
  dispatchedTeams?: DispatchedRescueTeam[];
  currentCivilianId?: string;
  myBeaconId?: string | number;
  selectedBeacon?: DistressBeacon | null;
  selectedShelter?: MapAsset | null;
  onSelectBeacon?: (beacon: DistressBeacon) => void;
  onDispatchBeacon?: (beacon: DistressBeacon) => void;
  onResolveBeacon?: (beacon: DistressBeacon) => void;
  simulatedWaterRise?: number;
  onLocateMe?: () => void;
  isLocating?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// 1. Google Maps Camera Controller (Recenter, Focus Beacon/Shelter, Tilt)
// ---------------------------------------------------------------------------
function GoogleCameraController({
  corridor,
  userPosition,
  selectedBeacon,
  selectedShelter,
  recenterTrigger,
  locateTrigger,
}: {
  corridor: CorridorConfig;
  userPosition?: { lat: number; lng: number } | null;
  selectedBeacon?: DistressBeacon | null;
  selectedShelter?: MapAsset | null;
  recenterTrigger: number;
  locateTrigger: number;
}) {
  const map = useMap();

  // Fit Corridor Bounds on change or recenter click
  useEffect(() => {
    if (!map) return;
    if (corridor.riverPath && corridor.riverPath.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      corridor.riverPath.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, { top: 70, right: 70, bottom: 70, left: 70 });
    } else if (corridor.center) {
      map.panTo(corridor.center);
      map.setZoom(corridor.zoom || 13);
    }
  }, [map, corridor.id, recenterTrigger]);

  // Focus Selected Beacon
  useEffect(() => {
    if (!map || !selectedBeacon) return;
    map.panTo({ lat: selectedBeacon.lat, lng: selectedBeacon.lng });
    map.setZoom(Math.max(map.getZoom() || 13, 15));
  }, [map, selectedBeacon]);

  // Focus Selected Shelter
  useEffect(() => {
    if (!map || !selectedShelter) return;
    map.panTo({ lat: selectedShelter.lat, lng: selectedShelter.lng });
    map.setZoom(Math.max(map.getZoom() || 13, 15));
  }, [map, selectedShelter]);

  // Pan to User Location
  useEffect(() => {
    if (!map || !userPosition || locateTrigger === 0) return;
    map.panTo({ lat: userPosition.lat, lng: userPosition.lng });
    map.setZoom(15);
  }, [map, locateTrigger]);

  return null;
}

// ---------------------------------------------------------------------------
// 2. Google Maps Overlays (Riverbed, Flood Surge Buffer, Landslides, SAR Vectors)
// ---------------------------------------------------------------------------
function GoogleMapOverlays({
  corridor,
  simulatedWaterRise,
  mode,
  userPosition,
  visibleRescueTeams,
  layerFilters,
}: {
  corridor: CorridorConfig;
  simulatedWaterRise: number;
  mode: "civilian" | "rescuer" | "admin";
  userPosition?: { lat: number; lng: number; accuracy?: number } | null;
  visibleRescueTeams: DispatchedRescueTeam[];
  layerFilters: MapLayerFilters;
}) {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);

  useEffect(() => {
    if (!map || typeof google === "undefined" || !google.maps) return;

    // Cleanup existing overlays
    polylinesRef.current.forEach((pl) => pl.setMap(null));
    polygonsRef.current.forEach((pg) => pg.setMap(null));
    circlesRef.current.forEach((c) => c.setMap(null));
    polylinesRef.current = [];
    polygonsRef.current = [];
    circlesRef.current = [];

    // A. Riverbed Flow Line (Cyan Geodesic Flow) & Flood Surge Buffer
    if (layerFilters.river && corridor.riverPath && corridor.riverPath.length > 1) {
      const riverLine = new google.maps.Polyline({
        path: corridor.riverPath,
        geodesic: true,
        strokeColor: "#0284c7",
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map,
      });
      polylinesRef.current.push(riverLine);

      // B. Riverbed Channel & Flood Surge Inundation Buffer Polygon
      const bufferMeters = Math.round(18 + Math.max(0, simulatedWaterRise) * 35);
      const polygonCoords = generateGeodesicBufferPolygon(
        corridor.riverPath as LatLng[],
        bufferMeters
      );
      if (polygonCoords.length > 0) {
        const surgeColor =
          simulatedWaterRise > 3
            ? "#ef4444"
            : simulatedWaterRise > 1.5
            ? "#f59e0b"
            : simulatedWaterRise > 0
            ? "#06b6d4"
            : "#0284c7";
        const surgePoly = new google.maps.Polygon({
          paths: polygonCoords.map(([lat, lng]) => ({ lat, lng })),
          strokeColor: surgeColor,
          strokeOpacity: simulatedWaterRise > 0 ? 0.85 : 0.5,
          strokeWeight: simulatedWaterRise > 0 ? 2 : 1.2,
          fillColor: surgeColor,
          fillOpacity: simulatedWaterRise > 0 ? Math.min(0.22 + simulatedWaterRise * 0.08, 0.55) : 0.16,
          map,
        });
        polygonsRef.current.push(surgePoly);
      }
    }

    // C. Landslide Risk Zones (Organic Natural GIS Hazard Envelopes)
    if (layerFilters.landslides) {
      const landslides = CORRIDOR_LANDSLIDE_ZONES[corridor.id] || [];
      landslides.forEach((lz) => {
        const isCrit = lz.severity === "critical";
        const strokeColor = isCrit ? "#f43f5e" : "#f59e0b";
        const fillColor = isCrit ? "#e11d48" : "#d97706";
        const poly = new google.maps.Polygon({
          paths: lz.polygon.map(([lat, lng]) => ({ lat, lng })),
          strokeColor: strokeColor,
          strokeOpacity: 0.9,
          strokeWeight: 1.2,
          fillColor: fillColor,
          fillOpacity: isCrit ? 0.14 : 0.10,
          map,
        });
        polygonsRef.current.push(poly);
      });

      // C.2. Sentinel Glacial Lake & GLOF Breach Boundary
      const lakeGeo = CORRIDOR_LAKE_POLYGONS[corridor.id];
      if (lakeGeo) {
        const basePoly = new google.maps.Polygon({
          paths: lakeGeo.baselinePolygon.map(([lat, lng]) => ({ lat, lng })),
          strokeColor: "#0ea5e9",
          strokeOpacity: 0.85,
          strokeWeight: 1.8,
          fillColor: "#0284c7",
          fillOpacity: 0.38,
          map,
        });
        polygonsRef.current.push(basePoly);

        const expPoly = new google.maps.Polygon({
          paths: lakeGeo.expandedPolygon.map(([lat, lng]) => ({ lat, lng })),
          strokeColor: "#f43f5e",
          strokeOpacity: 0.85,
          strokeWeight: 1.6,
          fillColor: "#e11d48",
          fillOpacity: 0.16,
          map,
        });
        polygonsRef.current.push(expPoly);
      }
    }

    // D. Search and Rescue Inbound Trajectories & Rendezvous Circles
    if (layerFilters.sar) {
      visibleRescueTeams.forEach((team) => {
        const isArrived = team.status === "arrived" || team.status === "evacuating";

        // 1. Direct Planned Vector
        const flightVector = new google.maps.Polyline({
          path: [team.startPosition, team.targetPosition],
          geodesic: true,
          strokeColor: "#64748b",
          strokeOpacity: 0.4,
          strokeWeight: 1.5,
          map,
        });
        polylinesRef.current.push(flightVector);

        // 2. Historic Trail Line
        if (team.trail && team.trail.length > 1) {
          const trailLine = new google.maps.Polyline({
            path: team.trail,
            geodesic: true,
            strokeColor: "#475569",
            strokeOpacity: 0.55,
            strokeWeight: 2,
            map,
          });
          polylinesRef.current.push(trailLine);
        }

        // 3. Dynamic Lead Vector (Inbound)
        if (!isArrived) {
          const leadVector = new google.maps.Polyline({
            path: [team.currentPosition, team.targetPosition],
            geodesic: true,
            strokeColor: "#38bdf8",
            strokeOpacity: 0.85,
            strokeWeight: 2.2,
            map,
          });
          polylinesRef.current.push(leadVector);
        }

        // 4. Civilian Extraction Ring
        if (mode === "civilian") {
          const targetRing = new google.maps.Circle({
            center: team.targetPosition,
            radius: 45,
            strokeColor: "#10b981",
            strokeOpacity: 0.85,
            strokeWeight: 1.8,
            fillColor: "#10b981",
            fillOpacity: 0.15,
            map,
          });
          circlesRef.current.push(targetRing);
        }
      });
    }

    // E. User Accuracy Circle
    if (userPosition && userPosition.accuracy && userPosition.accuracy > 5) {
      const userCircle = new google.maps.Circle({
        center: { lat: userPosition.lat, lng: userPosition.lng },
        radius: Math.min(userPosition.accuracy, 120),
        strokeColor: "#38bdf8",
        strokeOpacity: 0.6,
        strokeWeight: 1,
        fillColor: "#38bdf8",
        fillOpacity: 0.12,
        map,
      });
      circlesRef.current.push(userCircle);
    }

    return () => {
      polylinesRef.current.forEach((pl) => pl.setMap(null));
      polygonsRef.current.forEach((pg) => pg.setMap(null));
      circlesRef.current.forEach((c) => c.setMap(null));
    };
  }, [map, corridor.riverPath, corridor.id, simulatedWaterRise, mode, visibleRescueTeams, userPosition, layerFilters]);

  return null;
}

// ---------------------------------------------------------------------------
// 3. Main GoogleModernHazardMap Component
// ---------------------------------------------------------------------------
export function GoogleModernHazardMap({
  corridor,
  assets = [],
  mode = "admin",
  userPosition,
  distressBeacons = [],
  dispatchedTeams = [],
  currentCivilianId,
  myBeaconId,
  selectedBeacon,
  selectedShelter,
  onSelectBeacon,
  onDispatchBeacon,
  onResolveBeacon,
  simulatedWaterRise = 0,
  onLocateMe,
  isLocating = false,
  className = "",
}: GoogleModernHazardMapProps) {
  // Map configuration state
  const [googleMapType, setGoogleMapType] = useState<"terrain" | "hybrid" | "satellite" | "roadmap">(
    () => {
      return (
        (localStorage.getItem("himalsanket_gmaps_type") as
          | "terrain"
          | "hybrid"
          | "satellite"
          | "roadmap") || "satellite"
      );
    }
  );

  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [locateTrigger, setLocateTrigger] = useState(0);

  // Layer Filters State & Presets for interactive decluttering
  const [layerFilters, setLayerFilters] = useState<MapLayerFilters>(() => {
    try {
      const saved = localStorage.getItem("himalsanket_layer_filters");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_LAYER_FILTERS;
  });
  const [activePreset, setActivePreset] = useState<LayerPreset | "custom">("all");

  const toggleLayer = useCallback((key: keyof MapLayerFilters) => {
    setLayerFilters((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("himalsanket_layer_filters", JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    setActivePreset("custom");
  }, []);

  const applyPreset = useCallback((preset: LayerPreset) => {
    setActivePreset(preset);
    const next = LAYER_PRESETS[preset];
    setLayerFilters(next);
    try {
      localStorage.setItem("himalsanket_layer_filters", JSON.stringify(next));
    } catch (_) {}
  }, []);

  // Spatial Deconfliction for Co-located Village Assets (prevents pin overlapping)
  const deconflictedAssets = useMemo(() => {
    return deconflictMapAssets(assets);
  }, [assets]);

  // Selected item for tactical InfoWindow
  const [activeInfo, setActiveInfo] = useState<{
    type: "asset" | "beacon" | "base" | "team" | "user";
    data: any;
    pos: { lat: number; lng: number };
  } | null>(null);

  // Sync InfoWindow when selectedBeacon is selected externally (e.g. from sidebar "Locate on Map")
  useEffect(() => {
    if (selectedBeacon) {
      setActiveInfo({
        type: "beacon",
        data: selectedBeacon,
        pos: { lat: selectedBeacon.lat, lng: selectedBeacon.lng },
      });
    }
  }, [selectedBeacon]);

  // Sync InfoWindow when selectedShelter is selected externally
  useEffect(() => {
    if (selectedShelter) {
      setActiveInfo({
        type: "asset",
        data: selectedShelter,
        pos: { lat: selectedShelter.lat, lng: selectedShelter.lng },
      });
    }
  }, [selectedShelter]);

  // Check if userPosition is identical to an active distress beacon
  const isUserPosCoveredByBeacon = useMemo(() => {
    if (!userPosition) return false;
    return distressBeacons.some(
      (b) =>
        Math.abs(b.lat - userPosition.lat) < 0.0008 &&
        Math.abs(b.lng - userPosition.lng) < 0.0008
    );
  }, [userPosition, distressBeacons]);

  // API Key is strictly provided by the environment or runtime config - never requested from frontend
  const rawKey =
    (typeof window !== "undefined" && (window as any).__APP_CONFIG__?.VITE_GOOGLE_MAPS_API_KEY) ||
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ||
    "";
  const apiKey = (rawKey && !rawKey.includes("YOUR_") && !rawKey.includes("MOCK") && rawKey.trim().length > 20)
    ? rawKey.trim()
    : "";
  const [authFailed, setAuthFailed] = useState(false);

  // Clear any legacy client-side keys and listen for Google Maps auth failure
  useEffect(() => {
    try {
      localStorage.removeItem("himal_gmaps_key");
    } catch (_) {}

    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      setAuthFailed(true);
      if (typeof prevAuthFailure === "function") prevAuthFailure();
    };
    return () => {
      (window as any).gm_authFailure = prevAuthFailure;
    };
  }, []);

  // Format SAR Helpers
  const formatEtaTime = (seconds: number): string => {
    if (seconds <= 0) return "On-Site / Extraction";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  const formatDistanceMeters = (meters: number): string => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)}m`;
  };

  // Filter visible rescue teams
  const visibleRescueTeams = useMemo(() => {
    if (!dispatchedTeams || dispatchedTeams.length === 0) return [];
    if (mode === "civilian") {
      return dispatchedTeams.filter((t) => {
        const matchesCivilian = Boolean(currentCivilianId && t.civilianId === currentCivilianId);
        const matchesBeacon = Boolean(myBeaconId && String(t.targetBeaconId) === String(myBeaconId));
        const matchesCorridor = Boolean(!t.corridorId || t.corridorId === corridor.id);
        return matchesCivilian || matchesBeacon || matchesCorridor;
      });
    }
    if (mode === "rescuer") {
      return dispatchedTeams.filter((t) => !t.corridorId || t.corridorId === corridor.id);
    }
    return dispatchedTeams;
  }, [dispatchedTeams, mode, currentCivilianId, myBeaconId, corridor.id]);

  // Collapsible state for floating Dynamic Island SAR flight tracker capsule
  const [isFlightTrackerCollapsed, setIsFlightTrackerCollapsed] = useState(true);

  // Tracked SAR Rescue Team for Live Flight Telemetry Capsule (Civilian Mode Only)
  const primaryTrackedTeam = useMemo<DispatchedRescueTeam | null>(() => {
    // Strictly civilian only: Rescuers and Command Admins have dedicated incident triage panels and dispatch queues
    if (mode !== "civilian") return null;

    // 1. Prioritize direct match for civilian's active distress beacon or civilian ID
    const directTeam = (dispatchedTeams || []).find(
      (t) =>
        (myBeaconId && String(t.targetBeaconId) === String(myBeaconId)) ||
        (currentCivilianId && t.civilianId === currentCivilianId)
    );
    if (directTeam) return directTeam;

    // 2. Any active/en-route team responding in this corridor
    const corridorTeam = (dispatchedTeams || []).find(
      (t) => (!t.corridorId || t.corridorId === corridor.id) && t.status !== "completed"
    );
    if (corridorTeam) return corridorTeam;

    // 3. Fallback: first visible team
    if (visibleRescueTeams.length > 0) return visibleRescueTeams[0];

    return null;
  }, [mode, visibleRescueTeams, dispatchedTeams, currentCivilianId, myBeaconId, corridor.id]);

  // Rescue Bases for current corridor
  const forwardBases = useMemo(() => {
    return CORRIDOR_RESCUE_BASES[corridor.id] || CORRIDOR_RESCUE_BASES.langtang || [];
  }, [corridor.id]);

  if (!apiKey || authFailed) {
    return (
      <div className={`relative w-full h-full flex flex-col items-center justify-center p-6 bg-[#0b1320] text-center select-none ${className}`}>
        <Compass className="w-10 h-10 text-sky-400 mb-3 animate-pulse" />
        <h3 className="text-base font-bold text-white mb-1">Google Maps Platform</h3>
        <p className="text-xs text-slate-400 max-w-md mb-4">
          {authFailed
            ? "Google Maps API authorization failed. Please check your VITE_GOOGLE_MAPS_API_KEY credentials."
            : "Google Maps API key is initializing or not detected. Please verify your environment settings."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
        >
          Reload Map Engine
        </button>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden select-none bg-[#0b1320] ${className}`}>
      {/* -------------------------------------------------------------------- */}
      {/* 1. MOCK KEY ACTIVATION BANNER OR MODAL */}
      {/* -------------------------------------------------------------------- */}
        <ErrorBoundary
          fallback={
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#0b1320] text-center">
              <Compass className="w-10 h-10 text-sky-400 mb-3 animate-pulse" />
              <h3 className="text-base font-bold text-white mb-1">Google Maps Platform</h3>
              <p className="text-xs text-slate-400 max-w-md mb-4">
                Google Maps encountered an initialization error.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Reload Map Engine
              </button>
            </div>
          }
        >
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={corridor.center}
              defaultZoom={corridor.zoom || 13}
              mapTypeId={googleMapType}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}
              gestureHandling="greedy"
              disableDefaultUI={true}
              streetViewControl={false}
              mapTypeControl={false}
              fullscreenControl={false}
              zoomControl={false}
              rotateControl={false}
              scaleControl={false}
              className="w-full h-full"
            >
              {/* Dynamic Camera Controller */}
              <GoogleCameraController
                corridor={corridor}
                userPosition={userPosition}
                selectedBeacon={selectedBeacon}
                selectedShelter={selectedShelter}
                recenterTrigger={recenterTrigger}
                locateTrigger={locateTrigger}
              />

              {/* Polylines & Polygons Overlays */}
              <GoogleMapOverlays
                corridor={corridor}
                simulatedWaterRise={simulatedWaterRise}
                mode={mode}
                userPosition={userPosition}
                visibleRescueTeams={visibleRescueTeams}
                layerFilters={layerFilters}
              />

              {/* ------------------------------------------------------------ */}
              {/* ADVANCED MARKERS                                             */}
              {/* ------------------------------------------------------------ */}

              {/* A. CIVILIAN SAFE EVACUATION SHELTERS & HELIPADS */}
              {(mode === "civilian" || mode === "admin") &&
                layerFilters.shelters &&
                deconflictedAssets
                  .filter((a) => a.type === "safeZone")
                  .map((sz) => {
                    const isSelected = selectedShelter?.id === sz.id;
                    const isHelipad =
                      sz.name.toLowerCase().includes("helipad") ||
                      sz.id.toLowerCase().includes("helipad") ||
                      sz.name.includes("[H]");

                    return (
                      <AdvancedMarker
                        key={`safezone-${sz.id}`}
                        position={{ lat: sz.displayLat, lng: sz.displayLng }}
                        onClick={() =>
                          setActiveInfo({
                            type: "asset",
                            data: sz,
                            pos: { lat: sz.lat, lng: sz.lng },
                          })
                        }
                        title={`${isHelipad ? "Helipad" : "Safe Refuge"}: ${sz.name} (Elev: ${sz.elevation}m)`}
                      >
                        {isHelipad ? (
                          <div
                            className={`flex items-center justify-center w-5.5 h-5.5 rounded-md bg-[#070e1a]/95 text-amber-400 shadow-md border-[1.5px] border-amber-400 ring-1 ring-amber-400/30 cursor-pointer transition-transform ${
                              isSelected ? "scale-125 ring-2 ring-amber-300" : "hover:scale-115"
                            }`}
                          >
                            <span className="font-mono font-black text-[9.5px] leading-none">H</span>
                          </div>
                        ) : (
                          <div
                            className={`flex items-center justify-center w-5.5 h-5.5 rounded-full bg-emerald-600 text-white shadow-md border-[1.5px] border-white/95 ring-1 ring-emerald-500/40 cursor-pointer transition-transform ${
                              isSelected ? "scale-125 ring-2 ring-emerald-300 ring-offset-1 ring-offset-slate-900" : "hover:scale-115"
                            }`}
                          >
                            <Shield className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </AdvancedMarker>
                    );
                  })}

              {/* B. CRITICAL FACILITIES: HOSPITALS, SCHOOLS, BRIDGES, DAMS, VILLAGES */}
              {deconflictedAssets
                .filter((a) => {
                  if (a.type === "safeZone") return false;
                  if (a.type === "hospital" && !layerFilters.health) return false;
                  if (a.type === "school" && !layerFilters.schools) return false;
                  if (a.type === "bridge" && !layerFilters.bridges) return false;
                  return true;
                })
                .map((asset) => {
                  let badge = "";
                  let iconElement: React.ReactNode = null;
                  let bgClass = "bg-slate-700";

                  if (asset.type === "hospital") {
                    bgClass = "bg-rose-600 ring-rose-400/30";
                    iconElement = <HeartPulse className="w-2.5 h-2.5 text-white" />;
                    badge = "🏥 Clinic";
                  } else if (asset.type === "school") {
                    bgClass = "bg-sky-600 ring-sky-400/30";
                    iconElement = <GraduationCap className="w-2.5 h-2.5 text-white" />;
                    badge = "🏫 School";
                  } else if (asset.type === "bridge") {
                    bgClass = "bg-amber-600 ring-amber-400/30";
                    iconElement = <BridgeMarkerIcon className="w-3 h-3 text-white" />;
                    badge = "🌉 Bridge";
                  } else if (asset.type === "people") {
                    bgClass = "bg-indigo-600 ring-indigo-400/30";
                    iconElement = <Users className="w-2.5 h-2.5 text-white" />;
                    badge = `🏘️ Village (${asset.population || 50})`;
                  } else if (asset.type === "dam") {
                    bgClass = "bg-cyan-700 ring-cyan-400/30";
                    iconElement = <span className="text-[7.5px] font-black leading-none">DAM</span>;
                    badge = "🌊 Spillway";
                  }

                  return (
                    <AdvancedMarker
                      key={`asset-${asset.id}`}
                      position={{ lat: asset.displayLat, lng: asset.displayLng }}
                      onClick={() =>
                        setActiveInfo({
                          type: "asset",
                          data: asset,
                          pos: { lat: asset.lat, lng: asset.lng },
                        })
                      }
                      title={`${asset.name} (${badge})`}
                    >
                      {asset.type === "bridge" ? (
                        <div className="flex items-center justify-center px-1.5 py-0.5 rounded-md bg-amber-600 text-white shadow-md border border-amber-200/60 ring-1 ring-amber-400/30 cursor-pointer transition-transform hover:scale-115">
                          <BridgeMarkerIcon className="w-3 h-3 text-white" />
                        </div>
                      ) : asset.type === "dam" ? (
                        <div className="flex items-center justify-center px-1 py-0.5 rounded bg-cyan-700 text-white shadow-md border border-cyan-300/80 cursor-pointer transition-transform hover:scale-115">
                          <span className="text-[7.5px] font-mono font-black leading-none">DAM</span>
                        </div>
                      ) : (
                        <div
                          className={`flex items-center justify-center w-5 h-5 rounded-full text-white shadow-md border-[1.5px] border-white/95 ring-1 cursor-pointer transition-transform hover:scale-115 ${bgClass}`}
                        >
                          {iconElement}
                        </div>
                      )}
                    </AdvancedMarker>
                  );
                })}

              {/* C. DISTRESS SOS BEACONS (SYNCHRONIZED ACROSS CIVILIAN, RESCUER & ADMIN) */}
              {distressBeacons
                .filter((b) => !b.corridorId || b.corridorId === corridor.id)
                .map((beacon) => {
                  const isSelected = selectedBeacon?.id === beacon.id;
                  const isMyBeacon = Boolean(
                    (myBeaconId && String(beacon.id) === String(myBeaconId)) ||
                    (currentCivilianId && beacon.civilianId === currentCivilianId)
                  );
                  const isRescued = beacon.status === "rescued";
                  const isDispatched = beacon.status === "dispatched";

                  const bgClass = isRescued
                    ? "bg-emerald-600"
                    : isDispatched
                    ? "bg-amber-500"
                    : "bg-rose-600";

                  const priorityTier =
                    beacon.priority >= 90 ? "P1" : beacon.priority >= 75 ? "P2" : "P3";

                  return (
                    <AdvancedMarker
                      key={`beacon-${beacon.id}`}
                      position={{ lat: beacon.lat, lng: beacon.lng }}
                      onClick={() => {
                        if (onSelectBeacon) onSelectBeacon(beacon);
                        setActiveInfo({
                          type: "beacon",
                          data: beacon,
                          pos: { lat: beacon.lat, lng: beacon.lng },
                        });
                      }}
                      title={`SOS: ${beacon.name} (${priorityTier} • Triage: ${beacon.priority}/100)`}
                    >
                      <div className="relative flex items-center justify-center cursor-pointer group">
                        {/* Radar pulse ripple for active distress */}
                        {!isRescued && (
                          <span className="absolute -inset-1.5 rounded-full bg-rose-500/35 animate-ping pointer-events-none" />
                        )}
                        <div
                          className={`relative flex items-center justify-center w-6.5 h-6.5 rounded-full ${bgClass} text-white shadow-xl border-[1.5px] ${
                            isSelected || isMyBeacon
                              ? "border-white ring-2 ring-rose-400 scale-120"
                              : "border-white/95 ring-1 ring-rose-500/50"
                          } cursor-pointer hover:scale-115 transition-transform`}
                        >
                          <Radio className="w-3.5 h-3.5 text-white" />
                        </div>
                        {/* Sleek tactical triage badge */}
                        <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[7.5px] font-mono font-black bg-[#070e1a]/95 text-rose-300 border border-rose-500/50 shadow-sm leading-tight">
                          {beacon.priority ? priorityTier : "SOS"}
                        </span>
                      </div>
                    </AdvancedMarker>
                  );
                })}

              {/* D. FORWARD SAR BASES & HELIPADS */}
              {forwardBases.map((base) => (
                <AdvancedMarker
                  key={`base-${base.id}`}
                  position={{ lat: base.lat, lng: base.lng }}
                  onClick={() =>
                    setActiveInfo({
                      type: "base",
                      data: base,
                      pos: { lat: base.lat, lng: base.lng },
                    })
                  }
                  title={`${base.name} (${base.agency})`}
                >
                  <div className="flex items-center justify-center w-5.5 h-5.5 rounded-md bg-[#070e1a]/95 text-amber-400 border-[1.5px] border-amber-400/90 shadow-md font-mono font-bold text-[10px] cursor-pointer hover:scale-115 transition-transform">
                    <span className="leading-none">H</span>
                  </div>
                </AdvancedMarker>
              ))}

              {/* E. DISPATCHED RESCUE HELICOPTERS / GROUND FLEET (Compact Non-Colliding Callsign) */}
              {layerFilters.sar &&
                visibleRescueTeams.map((team) => {
                  const isHeli = team.vehicleType === "helicopter";
                  const etaStr = formatEtaTime(team.etaSeconds);
                  const distStr = formatDistanceMeters(team.distanceRemainingMeters);

                  return (
                    <AdvancedMarker
                      key={`team-${team.id}`}
                      position={{ lat: team.currentPosition.lat, lng: team.currentPosition.lng }}
                      onClick={() =>
                        setActiveInfo({
                          type: "team",
                          data: team,
                          pos: { lat: team.currentPosition.lat, lng: team.currentPosition.lng },
                        })
                      }
                      title={`${team.name} (${team.callSign}) - ETA: ${etaStr}`}
                    >
                      <div className="relative flex items-center justify-center cursor-pointer group">
                        <span className="absolute -inset-2 rounded-full bg-sky-400/25 animate-ping"></span>
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#0b1320] text-[#38bdf8] shadow-lg border border-sky-400/60 ring-2 ring-sky-500/30 transition-transform group-hover:scale-110">
                          {isHeli ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d={HELICOPTER_SVG_PATH} />
                            </svg>
                          ) : (
                            <Navigation className="w-4 h-4 text-sky-400" />
                          )}
                        </div>
                        {/* Micro Callsign Tag (Compact - Eliminates Giant Box Collisions) */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.2 rounded-full bg-[#070d18]/95 text-sky-300 font-mono text-[8.5px] font-bold border border-sky-500/40 shadow-md flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-sky-400 animate-pulse" />
                          <span>{team.callSign}</span>
                        </div>
                        {/* Expanded Tactical Card on Hover */}
                        <div className="hidden group-hover:flex absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-[#070d18]/95 text-white font-mono text-[9px] border border-sky-400/60 shadow-2xl backdrop-blur-md z-30 flex-col items-center pointer-events-none">
                          <div className="font-bold text-sky-300 flex items-center gap-1">
                            <span>{team.name}</span>
                            <span className="text-[8px] px-1 rounded bg-sky-950 text-sky-400 border border-sky-800">{team.callSign}</span>
                          </div>
                          <div className="text-[8.5px] text-slate-300 mt-0.5">
                            {team.status === "arrived" || team.status === "evacuating"
                              ? "On-Site • Extraction Active"
                              : `ETA: ${etaStr} • ${distStr}`}
                          </div>
                        </div>
                      </div>
                    </AdvancedMarker>
                  );
                })}

              {/* F. LANDSLIDE RISK NATURALISTIC CHIP (Upper Crown Scarp Anchored) */}
              {layerFilters.landslides &&
                (CORRIDOR_LANDSLIDE_ZONES[corridor.id] || []).map((lz) => {
                  const isCrit = lz.severity === "critical";
                  const anchor = getLandslideCrownScarpAnchor(lz.polygon);
                  const shortName = lz.name
                    .replace(
                      / Debris Chute| Narrow Gorge Scree| Moraine Slump| Escarpment| Debris Fan| Cliff Ravel Zone| Terminal Moraine Debris Chute| Vertical Scree| Exposed Ridge Scree| Gully Mudslide Zone| 3,300-Stair Escarpment| Riverbank Torrent Zone| Historical Avalanche Chute| Gorge Chokepoint Scree/gi,
                      ""
                    )
                    .trim();
                  return (
                    <AdvancedMarker
                      key={`landslide-tag-${lz.id}`}
                      position={{ lat: anchor.lat, lng: anchor.lng }}
                      onClick={() =>
                        setActiveInfo({
                          type: "asset",
                          data: {
                            name: lz.name,
                            type: "landslide_hazard",
                            elevation: Math.round(lz.slopeDegrees),
                            description: lz.description,
                            soilMoisture: lz.soilMoistureVwcPct,
                            severity: lz.severity,
                          },
                          pos: { lat: anchor.lat, lng: anchor.lng },
                        })
                      }
                      title={`Hazard Zone: ${lz.name} (${lz.slopeDegrees}° slope)`}
                    >
                      <div
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
                          isCrit
                            ? "bg-[#070d18]/90 border border-rose-500/50 text-rose-200 shadow-md shadow-black/80"
                            : "bg-[#070d18]/90 border border-amber-500/50 text-amber-200 shadow-md shadow-black/80"
                        } text-[8px] font-mono font-medium tracking-tight backdrop-blur-md cursor-pointer hover:scale-105 transition-all select-none`}
                      >
                        <AlertTriangle className={`w-2.5 h-2.5 shrink-0 ${isCrit ? "text-rose-400" : "text-amber-400"}`} />
                        <span>{shortName} • {lz.slopeDegrees}°</span>
                      </div>
                    </AdvancedMarker>
                  );
                })}

              {/* G. USER GPS LOCATION (Civilian view only) */}
              {userPosition && mode === "civilian" && (
                <AdvancedMarker
                  position={{ lat: userPosition.lat, lng: userPosition.lng }}
                  onClick={() =>
                    setActiveInfo({
                      type: "user",
                      data: userPosition,
                      pos: { lat: userPosition.lat, lng: userPosition.lng },
                    })
                  }
                  title="Your Current Location"
                >
                  <div className="relative flex items-center justify-center w-6 h-6 cursor-pointer">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-sky-400/60 animate-ping"></span>
                    <span className="relative inline-flex w-3.5 h-3.5 rounded-full bg-sky-500 border-2 border-white shadow-lg"></span>
                  </div>
                </AdvancedMarker>
              )}

              {/* ------------------------------------------------------------ */}
              {/* TACTICAL INFOWINDOW POPUP                                    */}
              {/* ------------------------------------------------------------ */}
              {activeInfo && (
                <InfoWindow
                  position={activeInfo.pos}
                  onCloseClick={() => setActiveInfo(null)}
                  headerContent={null}
                  pixelOffset={[0, -10]}
                >
                  <div>
                    {/* ASSET POPUP */}
                    {activeInfo.type === "asset" && (() => {
                      const isShelter = activeInfo.data.type === "safeZone";
                      const isBridge = activeInfo.data.type === "bridge";
                      const isHospital = activeInfo.data.type === "hospital";
                      const isSchool = activeInfo.data.type === "school";
                      const isVillage = activeInfo.data.type === "people";
                      const isDam = activeInfo.data.type === "dam";
                      const isLandslide = activeInfo.data.type === "landslide_hazard";

                      let catLabel = "INFRASTRUCTURE";
                      let catBadgeStyle = "text-sky-300 bg-sky-500/15 border-sky-500/30";
                      let icon = <Building2 className="w-3.5 h-3.5 text-sky-400" />;

                      if (isShelter) {
                        catLabel = "SAFE HAVEN";
                        catBadgeStyle = "text-emerald-300 bg-emerald-500/15 border-emerald-500/30";
                        icon = <Shield className="w-3.5 h-3.5 text-emerald-400" />;
                      } else if (isHospital) {
                        catLabel = "HEALTH POST";
                        catBadgeStyle = "text-rose-300 bg-rose-500/15 border-rose-500/30";
                        icon = <HeartPulse className="w-3.5 h-3.5 text-rose-400" />;
                      } else if (isSchool) {
                        catLabel = "SCHOOL / HAVEN";
                        catBadgeStyle = "text-amber-300 bg-amber-500/15 border-amber-500/30";
                        icon = <GraduationCap className="w-3.5 h-3.5 text-amber-400" />;
                      } else if (isVillage) {
                        catLabel = "SETTLEMENT";
                        catBadgeStyle = "text-blue-300 bg-blue-500/15 border-blue-500/30";
                        icon = <Users className="w-3.5 h-3.5 text-blue-400" />;
                      } else if (isBridge) {
                        catLabel = "SUSPENSION BRIDGE";
                        catBadgeStyle = "text-cyan-300 bg-cyan-500/15 border-cyan-500/30";
                        icon = <Navigation className="w-3.5 h-3.5 text-cyan-400" />;
                      } else if (isDam) {
                        catLabel = "HYDRO DAM";
                        catBadgeStyle = "text-amber-300 bg-amber-500/15 border-amber-500/30";
                        icon = <Activity className="w-3.5 h-3.5 text-orange-400" />;
                      } else if (isLandslide) {
                        catLabel = "LANDSLIDE ZONE";
                        catBadgeStyle = "text-rose-300 bg-rose-500/15 border-rose-500/30";
                        icon = <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
                      }

                      return (
                        <div className="w-[280px] sm:w-[310px] bg-[#0c1524] border border-[#1e2c44] rounded-2xl shadow-2xl overflow-hidden font-sans text-[#f1f5f9] select-none">
                          {/* Header Bar with Integrated Close Button */}
                          <div className="flex items-center justify-between px-3 py-2 bg-[#111c2e] border-b border-[#1c2738]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="p-1 rounded-md bg-[#0c1524] border border-[#1e2c44] shrink-0">
                                {icon}
                              </div>
                              <span className={`text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded border uppercase truncate ${catBadgeStyle}`}>
                                {catLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {activeInfo.data.elevation && (
                                <span className="text-[10px] font-mono font-semibold text-[#8fa0b5] bg-[#0c1524] px-1.5 py-0.5 rounded border border-[#1e2c44]">
                                  {activeInfo.data.elevation}m ASL
                                </span>
                              )}
                              <button
                                onClick={() => setActiveInfo(null)}
                                className="p-1 rounded-md text-[#8fa0b5] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                title="Close popup"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Content Body */}
                          <div className="p-3 space-y-2">
                            <h4 className="font-bold text-[13px] text-white tracking-tight leading-snug">
                              {activeInfo.data.name}
                            </h4>

                            {/* Metric Chips Row */}
                            {(activeInfo.data.population || activeInfo.data.capacity || activeInfo.data.hazardThresholdMeters || activeInfo.data.soilMoisture) && (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {activeInfo.data.population && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#132034] text-[#38bdf8] border border-[#1e3454] text-[10px] font-mono">
                                    <Users className="w-3 h-3" />
                                    <span>{activeInfo.data.population} residents</span>
                                  </span>
                                )}
                                {activeInfo.data.capacity && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0d2a22] text-[#5eead4] border border-[#144f3f] text-[10px] font-mono">
                                    <Shield className="w-3 h-3" />
                                    <span>{activeInfo.data.capacity} capacity</span>
                                  </span>
                                )}
                                {activeInfo.data.hazardThresholdMeters && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#2a1b12] text-amber-300 border border-[#4d321d] text-[10px] font-mono">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>+{activeInfo.data.hazardThresholdMeters}m surge limit</span>
                                  </span>
                                )}
                                {activeInfo.data.soilMoisture && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#2b141a] text-rose-300 border border-[#4d1f27] text-[10px] font-mono">
                                    <Activity className="w-3 h-3" />
                                    <span>{activeInfo.data.soilMoisture}% VWC</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Description / Risk Note */}
                            {(activeInfo.data.description || activeInfo.data.riskNote) && (
                              <p className="text-[11px] text-[#cbd5e1] leading-relaxed bg-[#080e18]/80 p-2 rounded-lg border border-[#172338]">
                                {activeInfo.data.description || activeInfo.data.riskNote}
                              </p>
                            )}

                            {/* Tactical GPS stamp */}
                            {activeInfo.data.lat && activeInfo.data.lng && (
                              <div className="flex items-center justify-between text-[10px] font-mono text-[#64748b] pt-1 border-t border-[#172338]">
                                <span>📍 {activeInfo.data.lat.toFixed(4)}°N, {activeInfo.data.lng.toFixed(4)}°E</span>
                                <span>{isShelter ? "Evacuation Haven" : "Monitored Asset"}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* BEACON POPUP */}
                    {activeInfo.type === "beacon" && (
                      <div className="w-[280px] sm:w-[310px] bg-[#0c1524] border border-[#1e2c44] rounded-2xl shadow-2xl overflow-hidden font-sans text-[#f1f5f9] select-none">
                        {/* Header Bar with Integrated Close Button */}
                        <div className="flex items-center justify-between px-3 py-2 bg-[#111c2e] border-b border-[#1c2738]">
                          <div className="flex items-center gap-1.5">
                            <div className={`p-1 rounded-md border ${
                              activeInfo.data.status === "rescued"
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                : activeInfo.data.status === "dispatched"
                                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                : "bg-rose-500/15 border-rose-500/30 text-rose-400 animate-pulse"
                            }`}>
                              <Radio className="w-3.5 h-3.5" />
                            </div>
                            <span className={`text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded border uppercase ${
                              activeInfo.data.status === "rescued"
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                : activeInfo.data.status === "dispatched"
                                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                            }`}>
                              {activeInfo.data.status} SOS
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold bg-[#132034] text-[#38bdf8] border border-[#1e3454] px-1.5 py-0.5 rounded">
                              Pri: {activeInfo.data.priority}
                            </span>
                            <button
                              onClick={() => setActiveInfo(null)}
                              className="p-1 rounded-md text-[#8fa0b5] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                              title="Close popup"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Content Body */}
                        <div className="p-3 space-y-2.5">
                          <h4 className="font-bold text-[13px] text-white tracking-tight leading-snug">
                            {activeInfo.data.name}
                          </h4>

                          <p className="text-[11px] text-[#cbd5e1] leading-relaxed bg-[#080e18]/80 p-2 rounded-lg border border-[#172338]">
                            {activeInfo.data.detail}
                          </p>

                          <div className="flex items-center justify-between text-[10px] font-mono text-[#8fa0b5] pt-0.5">
                            <span>📍 {activeInfo.data.lat.toFixed(4)}°N, {activeInfo.data.lng.toFixed(4)}°E</span>
                            {activeInfo.data.altitude && <span>~{Math.round(activeInfo.data.altitude)}m ASL</span>}
                          </div>

                          {onDispatchBeacon && activeInfo.data.status === "pending" && (
                            <button
                              onClick={() => {
                                onDispatchBeacon(activeInfo.data);
                                setActiveInfo(null);
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40 cursor-pointer transition-all"
                            >
                              <HelicopterIcon className="w-3.5 h-3.5" />
                              <span>Dispatch Helitack SAR Unit</span>
                            </button>
                          )}

                          {onResolveBeacon && activeInfo.data.status === "dispatched" && (
                            <button
                              onClick={() => {
                                onResolveBeacon(activeInfo.data);
                                setActiveInfo(null);
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer transition-all"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Extraction Complete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* BASE POPUP */}
                    {activeInfo.type === "base" && (
                      <div className="w-[280px] sm:w-[310px] bg-[#0c1524] border border-[#1e2c44] rounded-2xl shadow-2xl overflow-hidden font-sans text-[#f1f5f9] select-none">
                        {/* Header Bar with Integrated Close Button */}
                        <div className="flex items-center justify-between px-3 py-2 bg-[#111c2e] border-b border-[#1c2738]">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-black text-xs">
                              H
                            </div>
                            <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300 uppercase">
                              {activeInfo.data.agency || "APF"} FORWARD BASE
                            </span>
                          </div>
                          <button
                            onClick={() => setActiveInfo(null)}
                            className="p-1 rounded-md text-[#8fa0b5] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title="Close popup"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Content Body */}
                        <div className="p-3 space-y-2.5">
                          <h4 className="font-bold text-[13px] text-white tracking-tight leading-snug">
                            {activeInfo.data.name}
                          </h4>

                          <div className="p-2 rounded-lg bg-[#080e18]/80 border border-[#172338] space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#8fa0b5] flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-400" /> Helipad Response Lag:
                              </span>
                              <span className="font-mono font-bold text-white text-xs">{activeInfo.data.heliFlightMin} min</span>
                            </div>
                            <div className="text-[10px] text-[#64748b] leading-tight">
                              Tactical staging point for Mountain Rescue Division & HAWS squadrons.
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono text-[#64748b] pt-1 border-t border-[#172338]">
                            <span>📍 {activeInfo.data.lat.toFixed(4)}°N, {activeInfo.data.lng.toFixed(4)}°E</span>
                            <span>Aviation Staging</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TEAM POPUP */}
                    {activeInfo.type === "team" && (
                      <div className="w-[280px] sm:w-[310px] bg-[#0c1524] border border-[#1e2c44] rounded-2xl shadow-2xl overflow-hidden font-sans text-[#f1f5f9] select-none">
                        {/* Header Bar with Integrated Close Button */}
                        <div className="flex items-center justify-between px-3 py-2 bg-[#111c2e] border-b border-[#1c2738]">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 rounded-md bg-sky-500/15 border border-sky-500/30 text-[#38bdf8]">
                              <HelicopterIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded border border-sky-500/30 bg-sky-500/10 text-[#38bdf8] uppercase">
                              {activeInfo.data.callSign}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              {formatEtaTime(activeInfo.data.etaSeconds)}
                            </span>
                            <button
                              onClick={() => setActiveInfo(null)}
                              className="p-1 rounded-md text-[#8fa0b5] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                              title="Close popup"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Content Body */}
                        <div className="p-3 space-y-2">
                          <h4 className="font-bold text-[13px] text-white tracking-tight">{activeInfo.data.name}</h4>
                          <div className="p-2 rounded-lg bg-[#080e18]/80 border border-[#172338] space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[#8fa0b5]">Target Civilian:</span>
                              <strong className="text-white font-medium">{activeInfo.data.targetCivilianName}</strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#8fa0b5]">Distance Remaining:</span>
                              <strong className="text-[#38bdf8] font-mono">{formatDistanceMeters(activeInfo.data.distanceRemainingMeters)}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* USER POPUP */}
                    {activeInfo.type === "user" && (
                      <div className="w-[280px] sm:w-[300px] bg-[#0c1524] border border-[#1e2c44] rounded-2xl shadow-2xl overflow-hidden font-sans text-[#f1f5f9] select-none">
                        <div className="flex items-center justify-between px-3 py-2 bg-[#111c2e] border-b border-[#1c2738]">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-400">
                              <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] font-mono font-bold tracking-wider text-sky-300 uppercase">
                              LIVE TREKKER GPS
                            </span>
                          </div>
                          <button
                            onClick={() => setActiveInfo(null)}
                            className="p-1 rounded-md text-[#8fa0b5] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title="Close popup"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="p-2.5 rounded-xl bg-[#080e18]/80 border border-[#172338] space-y-1">
                            <div className="text-xs font-mono font-bold text-white">
                              {userPosition?.lat.toFixed(4)}°N, {userPosition?.lng.toFixed(4)}°E
                            </div>
                            <div className="text-[11px] text-[#8fa0b5] font-mono flex items-center justify-between">
                              <span>Altitude: ~{Math.round(userPosition?.altitude || 2780)}m ASL</span>
                              <span className="text-emerald-400">GPS Locked</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        </ErrorBoundary>

      {/* -------------------------------------------------------------------- */}
      {/* 3. AUTH FAILURE TOAST NOTICE                                         */}
      {/* -------------------------------------------------------------------- */}
      {authFailed && (
        <div className="absolute top-16 left-4 right-4 z-30 bg-amber-950/95 border border-amber-500/60 p-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Google Maps key unauthorized or missing in <code>frontend/.env.local</code>.
            </span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium cursor-pointer shadow"
          >
            Retry
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 3.5. FLOATING INBOUND SAR RESCUE TRACKING HUD (CIVILIAN MODE ONLY)   */}
      {/* -------------------------------------------------------------------- */}
      <AnimatePresence mode="wait">
        {mode === "civilian" && primaryTrackedTeam && (() => {
          const isArrived =
            primaryTrackedTeam.status === "arrived" ||
            primaryTrackedTeam.status === "evacuating" ||
            primaryTrackedTeam.etaSeconds <= 0;

          return isFlightTrackerCollapsed ? (
            /* COLLAPSED FLIGHT TRACKER MODE: Dynamic Island Capsule */
            <motion.div
              key="flight-capsule-collapsed"
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onClick={() => setIsFlightTrackerCollapsed(false)}
              className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-full bg-[#0b1322]/95 hover:bg-[#101b30] border border-[#1a2c46] hover:border-sky-500/40 shadow-xl shadow-black/60 backdrop-blur-md text-[#f1f5f9] cursor-pointer flex items-center gap-2.5 select-none group transition-all"
              title="Click to view rescue telemetry"
            >
              {/* Helicopter Icon & Live Beacon */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-[#122036] border border-sky-500/30 text-sky-400">
                  <span
                    className={`absolute inline-flex h-1.5 w-1.5 rounded-full ${
                      isArrived ? "bg-emerald-400" : "bg-sky-400 animate-pulse"
                    }`}
                  />
                  <HelicopterIcon className="w-3 h-3 relative z-10" />
                </div>
                <span className="text-[11px] font-semibold text-white tracking-wide">
                  {primaryTrackedTeam.callSign}
                </span>
              </div>

              {/* Micro Progress Track */}
              <div className="w-12 h-1 rounded-full bg-[#070e1a] border border-[#16253a] overflow-hidden shrink-0">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    isArrived ? "bg-emerald-500" : "bg-sky-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(8, primaryTrackedTeam.progress * 100))}%` }}
                />
              </div>

              {/* Right Status / ETA */}
              <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-[#16253a] text-[11px] font-sans">
                {isArrived ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-600/30">
                    ON-SITE
                  </span>
                ) : (
                  <>
                    <span className="font-semibold text-white">
                      {formatEtaTime(primaryTrackedTeam.etaSeconds)}
                    </span>
                    <span className="text-[#8fa0b5] text-[10px] hidden sm:inline">
                      ({formatDistanceMeters(primaryTrackedTeam.distanceRemainingMeters)})
                    </span>
                  </>
                )}
                <ChevronDown className="w-3 h-3 text-[#8fa0b5] group-hover:text-white group-hover:translate-y-0.5 transition-transform" />
              </div>
            </motion.div>
          ) : (
            /* EXPANDED FULL TELEMETRY MODE: Military-Grade Tactical SAR HUD */
            <motion.div
              key="flight-capsule-expanded"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute top-3 left-3 right-3 sm:right-auto sm:w-[310px] z-30 p-3 rounded-xl bg-[#0b1322]/95 border border-[#1a2c46] hover:border-sky-500/30 shadow-2xl shadow-black/80 backdrop-blur-md text-[#f1f5f9] space-y-2.5 transition-colors font-sans"
            >
              {/* Top Header Badge & Agency Identification */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        isArrived ? "bg-emerald-400" : "bg-sky-400 animate-pulse"
                      }`} />
                    </span>
                    <HelicopterIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                      SAR
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-[#122036] text-sky-200 text-[9.5px] font-medium border border-[#1f3657] whitespace-nowrap">
                      {primaryTrackedTeam.callSign}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide border whitespace-nowrap ${
                      isArrived
                        ? "bg-emerald-950/70 text-emerald-300 border-emerald-600/30"
                        : "bg-sky-950/60 text-sky-300 border-sky-600/30"
                    }`}>
                      {isArrived ? "Arrived" : primaryTrackedTeam.status.replace("_", " ")}
                    </span>
                    <button
                      onClick={() => setIsFlightTrackerCollapsed(true)}
                      className="w-6 h-6 rounded-md bg-[#0e1a2b] hover:bg-[#16273f] border border-[#1c2e47] text-[#8fa0b5] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Minimize to flight tracker bar"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xs font-semibold text-white tracking-tight leading-snug truncate" title={primaryTrackedTeam.name}>
                  {primaryTrackedTeam.name}
                </h3>
              </div>

              {/* Dual Telemetry Pod: Estimated Arrival & Distance */}
              <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-[#070e1a] border border-[#152438]">
                <div>
                  <span className="text-[9.5px] font-medium uppercase tracking-wider text-[#7e90a5] block">
                    Estimated Arrival
                  </span>
                  <span className={`text-base font-bold tracking-tight block mt-0.5 ${
                    isArrived ? "text-emerald-400" : "text-white"
                  }`}>
                    {isArrived ? "On-Site" : formatEtaTime(primaryTrackedTeam.etaSeconds)}
                  </span>
                </div>
                <div className="border-l border-[#152438] pl-2">
                  <span className="text-[9.5px] font-medium uppercase tracking-wider text-[#7e90a5] block">
                    Distance
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-bold text-white tracking-tight">
                      {isArrived ? "0m" : formatDistanceMeters(primaryTrackedTeam.distanceRemainingMeters)}
                    </span>
                    <span className="text-[10px] text-[#8fa0b5]">
                      {isArrived ? "Hovering" : `@${primaryTrackedTeam.speedKmH}km/h`}
                    </span>
                  </div>
                </div>
              </div>

              {/* High-Precision Flight Progress Tracker */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-[#8fa0b5]">
                  <span className="truncate max-w-[120px] text-[#94a3b8]" title={primaryTrackedTeam.startBaseName}>
                    {primaryTrackedTeam.startBaseName}
                  </span>
                  <span className={`font-semibold ${isArrived ? "text-emerald-400" : "text-sky-400"}`}>
                    {Math.round(primaryTrackedTeam.progress * 100)}%
                  </span>
                  <span className="text-[#94a3b8]">{mode === "civilian" ? "Your Location" : "Target Rendezvous"}</span>
                </div>

                <div className="relative w-full h-1 rounded-full bg-[#070e1a] border border-[#16253a]">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      isArrived
                        ? "bg-emerald-500"
                        : "bg-gradient-to-r from-sky-600 to-sky-400"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(6, primaryTrackedTeam.progress * 100))}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700 ease-out pointer-events-none"
                    style={{ left: `${Math.min(96, Math.max(4, primaryTrackedTeam.progress * 100))}%` }}
                  >
                    <div className="w-4 h-4 rounded-full bg-[#0b1626] border border-sky-400/80 shadow flex items-center justify-center text-sky-300">
                      <HelicopterIcon className="w-2.5 h-2.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Reassuring Field Guidance & Comm Frequencies */}
              <div className="p-2 rounded-lg bg-[#070e1a] border border-[#152438] space-y-2 text-[11px]">
                <div className="flex items-start gap-1.5 text-[#94a3b8] leading-tight">
                  <Shield className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                  <span className="text-[10.5px]">Stay on open high ground with clear line-of-sight for approach.</span>
                </div>

                <div className="pt-1.5 border-t border-[#152438] grid grid-cols-2 gap-2 text-[10px]">
                  <div className="min-w-0">
                    <span className="text-[#64748b] block text-[9px] uppercase font-medium tracking-wide">Radio Comm</span>
                    <span className="font-medium text-slate-200 truncate block" title={primaryTrackedTeam.contact}>
                      {primaryTrackedTeam.contact}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[#64748b] block text-[9px] uppercase font-medium tracking-wide">Ground Signal</span>
                    <span className="font-medium text-slate-300 truncate block">
                      Bright clothing / light
                    </span>
                  </div>
                </div>
              </div>

              {/* Tactical Collapse Toggle Button */}
              <button
                onClick={() => setIsFlightTrackerCollapsed(true)}
                className="w-full py-1.5 px-2.5 rounded-lg bg-[#0e1a2b] hover:bg-[#16273f] active:scale-[0.98] text-[#8fa0b5] hover:text-white text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[#1c2e47] hover:border-[#274062] shadow-sm group font-sans"
                title="Collapse to minimal flight tracker bar"
              >
                <ChevronUp className="w-3 h-3 text-[#64748b] group-hover:text-sky-400 group-hover:-translate-y-0.5 transition-transform" />
                <span>Collapse to Flight Tracker Bar</span>
              </button>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* -------------------------------------------------------------------- */}
      {/* 4. FLOATING HUD CONTROLS (TOP RIGHT)                                 */}
      {/* -------------------------------------------------------------------- */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-[#080f1d]/90 border border-[#1b2b46]/90 shadow-xl backdrop-blur-md select-none">
        {/* Google Map Type Switcher */}
        <div className="flex items-center text-xs">
          {(["satellite", "hybrid", "terrain"] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setGoogleMapType(type);
                try {
                  localStorage.setItem("himalsanket_gmaps_type", type);
                } catch (_) {}
              }}
              className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-all cursor-pointer text-xs ${
                googleMapType === type
                  ? "bg-sky-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="h-4 w-[1px] bg-[#1e2c44] mx-0.5" />

        {/* Recenter Corridor */}
        <button
          onClick={() => setRecenterTrigger((v) => v + 1)}
          className="px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
          title="Fit Corridor Bounds"
        >
          <Compass className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Fit Valley</span>
        </button>

        {/* Locate User (Civilian mode only) */}
        {mode === "civilian" && (
          <button
            onClick={() => {
              if (userPosition) {
                setLocateTrigger((v) => v + 1);
              } else if (onLocateMe) {
                onLocateMe();
              }
            }}
            disabled={isLocating}
            className="px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title="Pan to My GPS Coordinates"
          >
            <Navigation className={`w-3.5 h-3.5 text-slate-400 ${isLocating ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">My GPS</span>
          </button>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 5. INTERACTIVE LAYER CONTROLS & DECLUTTER DOCK (BOTTOM LEFT)         */}
      {/* -------------------------------------------------------------------- */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 p-1 rounded-2xl bg-[#080f1d]/90 hover:bg-[#0a1426]/95 border border-[#1b2b46]/90 shadow-2xl backdrop-blur-xl max-w-[calc(100vw-24px)] overflow-x-auto no-scrollbar transition-all select-none">
        {/* Presets Cluster */}
        <div className="flex items-center gap-1 shrink-0 px-0.5">
          <span className="px-1 text-slate-400 font-semibold flex items-center gap-1 text-[9.5px]">
            <SlidersHorizontal className="w-2.5 h-2.5 text-sky-400" />
            <span className="hidden sm:inline">Layers</span>
          </span>
          <button
            onClick={() => applyPreset("all")}
            className={`px-2 py-0.5 rounded-full font-medium transition-all cursor-pointer text-[10px] ${
              activePreset === "all"
                ? "bg-sky-600 text-white font-bold shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            All
          </button>
          <button
            onClick={() => applyPreset("tactical")}
            className={`px-2 py-0.5 rounded-full font-medium transition-all cursor-pointer text-[10px] ${
              activePreset === "tactical"
                ? "bg-amber-600 text-white font-bold shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            title="Focus on Hazards, SOS, and SAR Inbound"
          >
            🎯 Tactical
          </button>
          <button
            onClick={() => applyPreset("evac")}
            className={`px-2 py-0.5 rounded-full font-medium transition-all cursor-pointer text-[10px] ${
              activePreset === "evac"
                ? "bg-emerald-600 text-white font-bold shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            title="Declutter map for Evacuation to Safe Shelters"
          >
            🛡️ Evac
          </button>
        </div>

        {/* Micro Divider */}
        <div className="h-4 w-[1px] bg-slate-700/60 shrink-0 mx-0.5" />

        {/* Granular Layer Toggle Chips */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* River */}
          <button
            onClick={() => toggleLayer("river")}
            className={`flex items-center gap-1.5 h-6 px-2 py-0.5 rounded-full transition-all cursor-pointer text-[10px] sm:text-[10.5px] whitespace-nowrap shrink-0 ${
              layerFilters.river
                ? "bg-[#121f33]/90 hover:bg-[#182842] text-slate-200 border border-[#223757]/80 shadow-sm font-medium"
                : "bg-transparent hover:bg-white/[0.04] text-slate-500 hover:text-slate-300 border border-transparent line-through decoration-slate-600/40"
            }`}
            title="Toggle River Channel & Surge Buffer"
          >
            <svg
              className={`w-2.5 h-2.5 shrink-0 ${layerFilters.river ? "text-sky-400" : "opacity-35 grayscale"}`}
              viewBox="0 0 20 12"
              fill="none"
              stroke="currentColor"
            >
              <path d="M1 9C5 9 5 3 10 3C15 3 15 9 19 9" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span>River</span>
          </button>

          {/* Safe Shelter */}
          {(mode === "civilian" || mode === "admin") && (
            <button
              onClick={() => toggleLayer("shelters")}
              className={`flex items-center gap-1.5 h-6 px-2 py-0.5 rounded-full transition-all cursor-pointer text-[10px] sm:text-[10.5px] whitespace-nowrap shrink-0 ${
                layerFilters.shelters
                  ? "bg-[#121f33]/90 hover:bg-[#182842] text-slate-200 border border-[#223757]/80 shadow-sm font-medium"
                  : "bg-transparent hover:bg-white/[0.04] text-slate-500 hover:text-slate-300 border border-transparent line-through decoration-slate-600/40"
              }`}
              title="Toggle Safe Shelters & Helipads"
            >
              <Shield
                className={`w-2.5 h-2.5 shrink-0 ${layerFilters.shelters ? "text-emerald-400" : "opacity-35 grayscale"}`}
              />
              <span>Shelters</span>
            </button>
          )}

          {/* Health */}
          <button
            onClick={() => toggleLayer("health")}
            className={`flex items-center gap-1.5 h-6 px-2 py-0.5 rounded-full transition-all cursor-pointer text-[10px] sm:text-[10.5px] whitespace-nowrap shrink-0 ${
              layerFilters.health
                ? "bg-[#121f33]/90 hover:bg-[#182842] text-slate-200 border border-[#223757]/80 shadow-sm font-medium"
                : "bg-transparent hover:bg-white/[0.04] text-slate-500 hover:text-slate-300 border border-transparent line-through decoration-slate-600/40"
            }`}
            title="Toggle Health Posts / Clinics"
          >
            <HeartPulse
              className={`w-2.5 h-2.5 shrink-0 ${layerFilters.health ? "text-rose-400" : "opacity-35 grayscale"}`}
            />
            <span>Clinics</span>
          </button>

          {/* Schools */}
          <button
            onClick={() => toggleLayer("schools")}
            className={`flex items-center gap-1.5 h-6 px-2 py-0.5 rounded-full transition-all cursor-pointer text-[10px] sm:text-[10.5px] whitespace-nowrap shrink-0 ${
              layerFilters.schools
                ? "bg-[#121f33]/90 hover:bg-[#182842] text-slate-200 border border-[#223757]/80 shadow-sm font-medium"
                : "bg-transparent hover:bg-white/[0.04] text-slate-500 hover:text-slate-300 border border-transparent line-through decoration-slate-600/40"
            }`}
            title="Toggle Community Schools"
          >
            <GraduationCap
              className={`w-2.5 h-2.5 shrink-0 ${layerFilters.schools ? "text-sky-400" : "opacity-35 grayscale"}`}
            />
            <span>Schools</span>
          </button>

          {/* Bridges */}
          <button
            onClick={() => toggleLayer("bridges")}
            className={`flex items-center gap-1.5 h-6 px-2 py-0.5 rounded-full transition-all cursor-pointer text-[10px] sm:text-[10.5px] whitespace-nowrap shrink-0 ${
              layerFilters.bridges
                ? "bg-[#121f33]/90 hover:bg-[#182842] text-slate-200 border border-[#223757]/80 shadow-sm font-medium"
                : "bg-transparent hover:bg-white/[0.04] text-slate-500 hover:text-slate-300 border border-transparent line-through decoration-slate-600/40"
            }`}
            title="Toggle Suspension Bridges"
          >
            <BridgeMarkerIcon
              className={`w-2.5 h-2.5 shrink-0 ${layerFilters.bridges ? "text-amber-400" : "opacity-35 grayscale"}`}
            />
            <span>Bridges</span>
          </button>

          {/* Landslides */}
          <button
            onClick={() => toggleLayer("landslides")}
            className={`flex items-center gap-1.5 h-6 px-2 py-0.5 rounded-full transition-all cursor-pointer text-[10px] sm:text-[10.5px] whitespace-nowrap shrink-0 ${
              layerFilters.landslides
                ? "bg-[#121f33]/90 hover:bg-[#182842] text-slate-200 border border-[#223757]/80 shadow-sm font-medium"
                : "bg-transparent hover:bg-white/[0.04] text-slate-500 hover:text-slate-300 border border-transparent line-through decoration-slate-600/40"
            }`}
            title="Toggle Landslide Hazard Envelopes"
          >
            <AlertTriangle
              className={`w-2.5 h-2.5 shrink-0 ${
                layerFilters.landslides ? "text-orange-400" : "opacity-35 grayscale"
              }`}
            />
            <span>Landslides</span>
          </button>

          {/* SOS Indicator (for rescuer/admin) */}
          {(mode === "rescuer" || mode === "admin") && (
            <span className="flex items-center gap-1.5 h-6 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] sm:text-[10.5px] font-medium shrink-0 whitespace-nowrap">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
              </span>
              <Radio className="w-2.5 h-2.5 text-rose-400 shrink-0" />
              <span>SOS ({distressBeacons.length})</span>
            </span>
          )}

          {/* Surge Buffer dynamic info */}
          {simulatedWaterRise > 0 && layerFilters.river && (
            <span className="flex items-center gap-1.5 h-6 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] sm:text-[10.5px] font-medium shrink-0 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span>Surge +{simulatedWaterRise}m</span>
            </span>
          )}

          {/* Live SAR Inbound */}
          {visibleRescueTeams.length > 0 && (
            <button
              onClick={() => toggleLayer("sar")}
              className={`flex items-center gap-1.5 h-6 px-2 py-0.5 rounded-full transition-all cursor-pointer text-[10px] sm:text-[10.5px] whitespace-nowrap shrink-0 ${
                layerFilters.sar
                  ? "bg-[#121f33]/90 hover:bg-[#182842] text-slate-200 border border-[#223757]/80 shadow-sm font-medium"
                  : "bg-transparent hover:bg-white/[0.04] text-slate-500 hover:text-slate-300 border border-transparent line-through decoration-slate-600/40"
              }`}
              title="Toggle Live SAR Aircraft & Trajectories"
            >
              <svg
                className={`w-3 h-3 shrink-0 ${layerFilters.sar ? "text-sky-400" : "opacity-35 grayscale"}`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d={HELICOPTER_SVG_PATH} />
              </svg>
              <span>SAR ({visibleRescueTeams.length})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
