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
} from "../../data/hazardMapData";
import { generateGeodesicBufferPolygon, LatLng } from "../../utils/geoBuffer";
import { DistressBeacon, DispatchedRescueTeam } from "../../context/UserRoleContext";
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
  RefreshCw,
  X,
} from "lucide-react";
import { HELICOPTER_SVG_PATH } from "../common/HelicopterIcon";
import { ErrorBoundary } from "../ErrorBoundary";

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
  onSwitchToLeaflet: () => void;
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
}: {
  corridor: CorridorConfig;
  simulatedWaterRise: number;
  mode: "civilian" | "rescuer" | "admin";
  userPosition?: { lat: number; lng: number; accuracy?: number } | null;
  visibleRescueTeams: DispatchedRescueTeam[];
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

    // A. Riverbed Flow Line (Cyan Geodesic Flow)
    if (corridor.riverPath && corridor.riverPath.length > 1) {
      const riverLine = new google.maps.Polyline({
        path: corridor.riverPath,
        geodesic: true,
        strokeColor: "#0284c7",
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map,
      });
      polylinesRef.current.push(riverLine);

      // B. Flood Surge Inundation Buffer Polygon
      if (simulatedWaterRise > 0) {
        const bufferMeters = Math.round(20 + simulatedWaterRise * 35);
        const polygonCoords = generateGeodesicBufferPolygon(
          corridor.riverPath as LatLng[],
          bufferMeters
        );
        if (polygonCoords.length > 0) {
          const surgeColor =
            simulatedWaterRise > 3 ? "#ef4444" : simulatedWaterRise > 1.5 ? "#f59e0b" : "#06b6d4";
          const surgePoly = new google.maps.Polygon({
            paths: polygonCoords.map(([lat, lng]) => ({ lat, lng })),
            strokeColor: surgeColor,
            strokeOpacity: 0.85,
            strokeWeight: 2,
            fillColor: surgeColor,
            fillOpacity: Math.min(0.22 + simulatedWaterRise * 0.08, 0.55),
            map,
          });
          polygonsRef.current.push(surgePoly);
        }
      }
    }

    // C. Landslide Risk Zones (Civilian & Admin Modes)
    if (mode === "civilian" || mode === "admin") {
      const landslides = CORRIDOR_LANDSLIDE_ZONES[corridor.id] || [];
      landslides.forEach((lz) => {
        const poly = new google.maps.Polygon({
          paths: lz.polygon.map(([lat, lng]) => ({ lat, lng })),
          strokeColor: "#e11d48",
          strokeOpacity: 0.85,
          strokeWeight: 1.8,
          fillColor: "#f43f5e",
          fillOpacity: 0.2,
          map,
        });
        polygonsRef.current.push(poly);
      });
    }

    // D. Search and Rescue Inbound Trajectories & Rendezvous Circles
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
  }, [map, corridor.riverPath, corridor.id, simulatedWaterRise, mode, visibleRescueTeams, userPosition]);

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
  onSwitchToLeaflet,
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

  // API Key is strictly provided by the environment (.env.local) - never requested from frontend
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || "";
  const [authFailed, setAuthFailed] = useState(false);

  // Clear any legacy client-side keys and listen for Google Maps auth failure
  useEffect(() => {
    try {
      localStorage.removeItem("himal_gmaps_key");
    } catch (_) {}

    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      setAuthFailed(true);
      // Automatically switch to Leaflet Satellite GIS if Google Maps fails auth
      onSwitchToLeaflet();
      if (typeof prevAuthFailure === "function") prevAuthFailure();
    };
    return () => {
      (window as any).gm_authFailure = prevAuthFailure;
    };
  }, [onSwitchToLeaflet]);

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
        return matchesCivilian || matchesBeacon;
      });
    }
    if (mode === "rescuer") {
      return dispatchedTeams.filter((t) => !t.corridorId || t.corridorId === corridor.id);
    }
    return dispatchedTeams;
  }, [dispatchedTeams, mode, currentCivilianId, myBeaconId, corridor.id]);

  // Rescue Bases for current corridor
  const forwardBases = useMemo(() => {
    return CORRIDOR_RESCUE_BASES[corridor.id] || CORRIDOR_RESCUE_BASES.langtang || [];
  }, [corridor.id]);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none bg-[#0b1320] ${className}`}>
      {/* -------------------------------------------------------------------- */}
      {/* 1. MOCK KEY ACTIVATION BANNER OR MODAL */}
      {/* -------------------------------------------------------------------- */}
        <ErrorBoundary
          fallback={
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#0b1320] text-center">
              <Compass className="w-10 h-10 text-sky-400 mb-3 animate-pulse" />
              <h3 className="text-base font-bold text-white mb-1">Satellite GIS Active</h3>
              <p className="text-xs text-slate-400 max-w-md mb-4">
                Google Maps could not initialize. Switching to high-resolution satellite imagery.
              </p>
              <button
                onClick={onSwitchToLeaflet}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Continue with Satellite GIS
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
              />

              {/* ------------------------------------------------------------ */}
              {/* ADVANCED MARKERS                                             */}
              {/* ------------------------------------------------------------ */}

              {/* A. CIVILIAN SAFE EVACUATION SHELTERS */}
              {(mode === "civilian" || mode === "admin") &&
                assets
                  .filter((a) => a.type === "safeZone")
                  .map((sz) => {
                    const isSelected = selectedShelter?.id === sz.id;
                    return (
                      <AdvancedMarker
                        key={`safezone-${sz.id}`}
                        position={{ lat: sz.lat, lng: sz.lng }}
                        onClick={() =>
                          setActiveInfo({
                            type: "asset",
                            data: sz,
                            pos: { lat: sz.lat, lng: sz.lng },
                          })
                        }
                        title={`Safe Refuge: ${sz.name}`}
                      >
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white shadow-lg border-2 border-white ring-2 ring-emerald-500/50 cursor-pointer transition-transform ${
                            isSelected ? "scale-125 ring-4 ring-emerald-300" : "hover:scale-110"
                          }`}
                        >
                          <Shield className="w-4 h-4 text-white" />
                        </div>
                      </AdvancedMarker>
                    );
                  })}

              {/* B. CRITICAL FACILITIES: HOSPITALS, SCHOOLS, BRIDGES, DAMS, VILLAGES */}
              {assets
                .filter((a) => a.type !== "safeZone")
                .map((asset) => {
                  let badge = "";
                  let iconElement: React.ReactNode = null;
                  let bgClass = "bg-slate-700";

                  if (asset.type === "hospital") {
                    bgClass = "bg-rose-600 ring-rose-400";
                    iconElement = <HeartPulse className="w-3.5 h-3.5 text-white" />;
                    badge = "🏥 Clinic";
                  } else if (asset.type === "school") {
                    bgClass = "bg-sky-700 ring-sky-400";
                    iconElement = <GraduationCap className="w-3.5 h-3.5 text-white" />;
                    badge = "🏫 School";
                  } else if (asset.type === "bridge") {
                    bgClass = "bg-amber-600 ring-amber-400";
                    iconElement = <span className="text-[10px] font-bold leading-none">═</span>;
                    badge = "🌉 Bridge";
                  } else if (asset.type === "people") {
                    bgClass = "bg-indigo-700 ring-indigo-400";
                    iconElement = <Users className="w-3.5 h-3.5 text-white" />;
                    badge = `🏘️ Village (${asset.population || 50})`;
                  } else if (asset.type === "dam") {
                    bgClass = "bg-cyan-700 ring-cyan-400";
                    iconElement = <span className="text-[9px] font-black leading-none">DAM</span>;
                    badge = "🌊 Spillway";
                  }

                  return (
                    <AdvancedMarker
                      key={`asset-${asset.id}`}
                      position={{ lat: asset.lat, lng: asset.lng }}
                      onClick={() =>
                        setActiveInfo({
                          type: "asset",
                          data: asset,
                          pos: { lat: asset.lat, lng: asset.lng },
                        })
                      }
                      title={`${asset.name} (${badge})`}
                    >
                      <div
                        className={`flex items-center justify-center w-7 h-7 rounded-full text-white shadow-md border-2 border-white ring-1 cursor-pointer transition-transform hover:scale-110 ${bgClass}`}
                      >
                        {iconElement}
                      </div>
                    </AdvancedMarker>
                  );
                })}

              {/* C. DISTRESS SOS BEACONS (RESCUER & ADMIN) */}
              {(mode === "rescuer" || mode === "admin") &&
                distressBeacons.map((beacon) => {
                  const isSelected = selectedBeacon?.id === beacon.id;
                  const isRescued = beacon.status === "rescued";
                  const isDispatched = beacon.status === "dispatched";

                  const bgClass = isRescued
                    ? "bg-emerald-600"
                    : isDispatched
                    ? "bg-amber-500"
                    : "bg-rose-600 animate-pulse";

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
                      title={`SOS: ${beacon.name} (Pri: ${beacon.priority})`}
                    >
                      <div
                        className={`relative flex items-center justify-center w-9 h-9 rounded-full ${bgClass} text-white shadow-xl border-2 ${
                          isSelected ? "border-white ring-4 ring-rose-400 scale-125" : "border-white/90"
                        } cursor-pointer hover:scale-110 transition-transform`}
                      >
                        <Radio className="w-4 h-4 text-white" />
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-black text-white font-mono border border-white/40">
                          {beacon.priority}
                        </span>
                      </div>
                    </AdvancedMarker>
                  );
                })}

              {/* D. FORWARD SAR BASES & HELIPADS (RESCUER & ADMIN) */}
              {(mode === "rescuer" || mode === "admin") &&
                forwardBases.map((base) => (
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
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 text-amber-400 border border-amber-400/80 shadow-md cursor-pointer hover:scale-105">
                      <span className="font-mono font-black text-xs">H</span>
                    </div>
                  </AdvancedMarker>
                ))}

              {/* E. DISPATCHED RESCUE HELICOPTERS / GROUND FLEET */}
              {visibleRescueTeams.map((team) => {
                const isHeli = team.vehicleType === "helicopter";
                const etaStr = formatEtaTime(team.etaSeconds);

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
                      <span className="absolute -inset-2 rounded-full bg-sky-400/20 animate-ping"></span>
                      <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#111c2e] text-[#38bdf8] shadow-md border border-[#1e2c44] ring-2 ring-sky-500/30 transition-transform group-hover:scale-105">
                        {isHeli ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d={HELICOPTER_SVG_PATH} />
                          </svg>
                        ) : (
                          <Navigation className="w-4 h-4 text-sky-400" />
                        )}
                      </div>
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-[#0b1320]/90 text-[#f1f5f9] font-mono text-[9px] font-semibold border border-[#1e2c44] shadow">
                        {team.callSign} • {etaStr}
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* F. USER GPS LOCATION (Civilian view only) */}
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
                  <div className="relative flex items-center justify-center w-7 h-7 cursor-pointer">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-sky-400 opacity-75 animate-ping"></span>
                    <span className="relative inline-flex w-4 h-4 rounded-full bg-sky-500 border-2 border-white shadow-lg"></span>
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
                >
                  <div className="p-1 max-w-[260px] text-slate-900 font-sans">
                    {/* ASSET POPUP */}
                    {activeInfo.type === "asset" && (
                      <div>
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200">
                          <span className="text-[10px] font-mono font-bold text-sky-700 uppercase">
                            {activeInfo.data.type}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {activeInfo.data.elevation}m ASL
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900">
                          {activeInfo.data.name}
                        </h4>
                        {activeInfo.data.population && (
                          <div className="text-xs text-slate-700 mt-1">
                            Population: <strong>{activeInfo.data.population}</strong>
                          </div>
                        )}
                        {activeInfo.data.capacity && (
                          <div className="text-xs text-slate-700 mt-0.5">
                            Capacity: <strong>{activeInfo.data.capacity}</strong> evacuees
                          </div>
                        )}
                        <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                          {activeInfo.data.description || activeInfo.data.riskNote}
                        </p>
                      </div>
                    )}

                    {/* BEACON POPUP */}
                    {activeInfo.type === "beacon" && (
                      <div>
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200">
                          <span
                            className={`text-[10px] font-mono font-bold uppercase ${
                              activeInfo.data.status === "rescued"
                                ? "text-emerald-700"
                                : activeInfo.data.status === "dispatched"
                                ? "text-amber-700"
                                : "text-rose-700"
                            }`}
                          >
                            {activeInfo.data.status} SOS
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-slate-900 text-white px-1.5 py-0.2 rounded">
                            Pri: {activeInfo.data.priority}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900">
                          {activeInfo.data.name}
                        </h4>
                        <p className="text-xs text-slate-700 mt-1">{activeInfo.data.detail}</p>
                        <div className="text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-200">
                          GPS: {activeInfo.data.lat.toFixed(4)}°N, {activeInfo.data.lng.toFixed(4)}°E
                        </div>
                        {onDispatchBeacon && activeInfo.data.status === "pending" && (
                          <button
                            onClick={() => {
                              onDispatchBeacon(activeInfo.data);
                              setActiveInfo(null);
                            }}
                            className="mt-2 w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold cursor-pointer transition-colors shadow"
                          >
                            Dispatch Helitack SAR
                          </button>
                        )}
                        {onResolveBeacon && activeInfo.data.status === "dispatched" && (
                          <button
                            onClick={() => {
                              onResolveBeacon(activeInfo.data);
                              setActiveInfo(null);
                            }}
                            className="mt-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold cursor-pointer transition-colors shadow"
                          >
                            Mark Extraction Complete
                          </button>
                        )}
                      </div>
                    )}

                    {/* BASE POPUP */}
                    {activeInfo.type === "base" && (
                      <div>
                        <span className="text-[10px] font-mono font-bold text-amber-700 uppercase block">
                          {activeInfo.data.agency} Forward Base
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{activeInfo.data.name}</h4>
                        <div className="text-xs text-slate-600 font-mono mt-1">
                          Helipad Lag: <strong>{activeInfo.data.heliFlightMin} min</strong>
                        </div>
                      </div>
                    )}

                    {/* TEAM POPUP */}
                    {activeInfo.type === "team" && (
                      <div>
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200">
                          <span className="text-[10px] font-mono text-sky-700 font-bold uppercase">
                            {activeInfo.data.callSign}
                          </span>
                          <span className="text-[10px] font-mono bg-sky-100 text-sky-800 px-1 rounded">
                            {formatEtaTime(activeInfo.data.etaSeconds)}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900">{activeInfo.data.name}</h4>
                        <div className="text-xs text-slate-600 mt-1">
                          Target: <strong>{activeInfo.data.targetCivilianName}</strong>
                        </div>
                        <div className="text-xs text-slate-600">
                          Distance:{" "}
                          <strong>{formatDistanceMeters(activeInfo.data.distanceRemainingMeters)}</strong>
                        </div>
                      </div>
                    )}

                    {/* USER POPUP */}
                    {activeInfo.type === "user" && (
                      <div>
                        <span className="text-[10px] font-mono font-bold text-sky-700 uppercase block">
                          📍 Your Coordinates
                        </span>
                        <div className="text-xs font-mono font-bold text-slate-900 mt-1">
                          {userPosition?.lat.toFixed(4)}°N, {userPosition?.lng.toFixed(4)}°E
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Alt: ~{Math.round(userPosition?.altitude || 2780)}m ASL
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
              Google Maps authentication unavailable. Switched to high-resolution Satellite GIS.
            </span>
          </div>
          <button
            onClick={onSwitchToLeaflet}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium cursor-pointer shadow"
          >
            Switch to Satellite GIS
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 4. FLOATING HUD CONTROLS (TOP RIGHT)                                 */}
      {/* -------------------------------------------------------------------- */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
        {/* Map Engine Switcher & Style Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111c2e]/90 border border-[#1e2c44] shadow-xl backdrop-blur-md">
          {/* Engine Indicator Pill */}
          <div className="flex items-center text-xs">
            <button
              onClick={() => {}}
              className="px-2.5 py-1.5 rounded-lg bg-sky-600 text-white font-semibold flex items-center gap-1.5 text-xs shadow-sm cursor-default"
            >
              <Compass className="w-3.5 h-3.5 text-white" />
              <span>Google Maps</span>
            </button>
            <button
              onClick={onSwitchToLeaflet}
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 font-medium transition-colors cursor-pointer text-xs flex items-center gap-1"
              title="Switch to Leaflet Satellite GIS"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Leaflet</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-[#1e2c44] mx-0.5" />

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
                className={`px-2 py-1.5 rounded-lg font-medium capitalize transition-all cursor-pointer text-xs ${
                  googleMapType === type
                    ? "bg-[#1d4ed8]/40 text-sky-300 font-bold border border-sky-500/40"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Action Controls */}
        <div className="flex items-center gap-2">
          {/* Recenter Corridor */}
          <button
            onClick={() => setRecenterTrigger((v) => v + 1)}
            className="p-2 rounded-xl bg-[#111c2e]/90 hover:bg-[#15233a] text-[#8fa0b5] hover:text-[#f1f5f9] border border-[#1e2c44] hover:border-[#2a456c] shadow-lg backdrop-blur-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Fit Corridor Bounds"
          >
            <Compass className="w-4 h-4 text-[#8fa0b5]" />
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
              className="p-2 rounded-xl bg-[#111c2e]/90 hover:bg-[#15233a] text-[#8fa0b5] hover:text-[#f1f5f9] border border-[#1e2c44] hover:border-[#2a456c] shadow-lg backdrop-blur-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Pan to My Coordinates"
            >
              <Navigation className={`w-4 h-4 text-[#8fa0b5] ${isLocating ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">My GPS</span>
            </button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 5. BOTTOM STATUS LEGEND                                              */}
      {/* -------------------------------------------------------------------- */}
      <div className="absolute bottom-3 left-3 z-20 px-3.5 py-2 rounded-xl bg-[#111c2e]/90 border border-[#1e2c44] backdrop-blur-md shadow-lg text-xs text-[#8fa0b5] flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 rounded-full bg-sky-500" />
          <span>River Channel</span>
        </span>

        {mode === "civilian" && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#52c7ad]" />
              <span>Safe Shelter</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Health Posts</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-sky-500" />
              <span>Schools</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-amber-500 flex items-center justify-center text-[7px] text-white font-bold leading-none">═</span>
              <span>Bridges</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 rounded-sm bg-rose-500/40 border border-rose-500" />
              <span>Landslides</span>
            </span>
          </>
        )}

        {(mode === "rescuer" || mode === "admin") && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#fb7185] animate-pulse" />
              <span>SOS</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Health Posts</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-sky-500" />
              <span>Schools</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-amber-500 flex items-center justify-center text-[7px] text-white font-bold leading-none">═</span>
              <span>Bridges</span>
            </span>
            {mode === "admin" && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1.5 rounded-sm bg-rose-500/40 border border-rose-500" />
                <span>Landslides</span>
              </span>
            )}
          </>
        )}

        {simulatedWaterRise > 0 && (
          <span className="flex items-center gap-1.5 text-[#f1f5f9] font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Surge +{simulatedWaterRise}m</span>
          </span>
        )}

        {visibleRescueTeams.length > 0 && (
          <span className="flex items-center gap-1.5 text-[#38bdf8] font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
            </span>
            <span>Live SAR Inbound ({visibleRescueTeams.length})</span>
          </span>
        )}
      </div>
    </div>
  );
}
