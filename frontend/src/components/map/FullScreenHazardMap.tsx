import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  Polyline,
  Polygon,
  Circle,
} from "@vis.gl/react-google-maps";
import {
  MapAsset,
  CorridorConfig,
  CORRIDOR_CONFIGS,
  CORRIDOR_LANDSLIDE_ZONES,
  CORRIDOR_LAKE_POLYGONS,
  CORRIDOR_RESCUE_BASES,
} from "../../data/hazardMapData";
import { generateGeodesicBufferPolygon, getDistanceMeters } from "../../utils/geoBuffer";
import { DistressBeacon } from "../../context/UserRoleContext";
import {
  Layers,
  MapPin,
  Satellite,
  Compass,
  AlertTriangle,
  Radio,
  Eye,
  Shield,
  Key,
  ExternalLink,
  CheckCircle2,
  SlidersHorizontal,
  Mountain,
  Map as MapIcon,
  Crosshair,
  Volume2,
} from "lucide-react";
import { ErrorBoundary } from "../ErrorBoundary";
import { TacticalCompass } from "./TacticalCompass";
import { playConfirmationBeep } from "../../utils/audioAlert";

export interface FullScreenHazardMapProps {
  corridor: CorridorConfig;
  assets: MapAsset[];
  mode?: "civilian" | "rescuer" | "admin";
  selectedAsset?: MapAsset | null;
  onSelectAsset?: (asset: MapAsset | null) => void;
  selectedBeacon?: DistressBeacon | null;
  onDispatchBeacon?: (beacon: DistressBeacon) => void;
  onResolveBeacon?: (beacon: DistressBeacon) => void;
  simulatedWaterRise?: number;
  userPosition?: { lat: number; lng: number; accuracy?: number; altitude?: number } | null;
  distressBeacons?: DistressBeacon[];
  onSelectBeacon?: (beacon: DistressBeacon) => void;
  onTriggerSOS?: () => void;
  onLocateMe?: () => void;
  isLocating?: boolean;
  distanceToHazard?: number | null;
  geofenceStatus?: string;
  className?: string;
  showSurgeControls?: boolean;
  onSurgeChange?: (surge: number) => void;
}

// Dark tactical styling for Google Maps Roadmap view
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0c141d" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0c141d" }, { weight: 2 }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#38bdf8" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#0284c7" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#062828" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2563eb" }, { lightness: -40 }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#032b43" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#38bdf8" }],
  },
];

// Inner controller that handles camera panning, bounds fitting, heading and tilt
function MapCameraController({
  corridor,
  selectedAsset,
  selectedBeacon,
  recenterTrigger,
  locateTrigger,
  userPosition,
  heading,
  tilt,
  onHeadingChange,
  onTiltChange,
}: {
  corridor: CorridorConfig;
  selectedAsset?: MapAsset | null;
  selectedBeacon?: DistressBeacon | null;
  recenterTrigger: number;
  locateTrigger: number;
  userPosition?: { lat: number; lng: number } | null;
  heading: number;
  tilt: number;
  onHeadingChange: (heading: number) => void;
  onTiltChange: (tilt: number) => void;
}) {
  const map = useMap();

  // Initial and corridor bounds fit
  useEffect(() => {
    if (!map) return;
    if (selectedBeacon) {
      map.panTo({ lat: selectedBeacon.lat, lng: selectedBeacon.lng });
      map.setZoom(15);
    } else if (selectedAsset) {
      map.panTo({ lat: selectedAsset.lat, lng: selectedAsset.lng });
      map.setZoom(Math.max(map.getZoom() || 12, 14));
    } else if (corridor.riverPath && corridor.riverPath.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      corridor.riverPath.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    } else if (corridor.center) {
      map.panTo(corridor.center);
      map.setZoom(corridor.zoom || 12);
    }
  }, [map, corridor, selectedAsset, selectedBeacon]);

  // Recenter button click
  useEffect(() => {
    if (!map || recenterTrigger === 0) return;
    if (corridor.riverPath && corridor.riverPath.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      corridor.riverPath.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    } else if (corridor.center) {
      map.panTo(corridor.center);
      map.setZoom(corridor.zoom || 12);
    }
  }, [map, recenterTrigger, corridor]);

  // Locate trekker button click
  useEffect(() => {
    if (!map || locateTrigger === 0 || !userPosition) return;
    map.panTo({ lat: userPosition.lat, lng: userPosition.lng });
    map.setZoom(15);
  }, [map, locateTrigger, userPosition]);

  // Listen to Google Maps internal heading and tilt changes (e.g. user gestures)
  useEffect(() => {
    if (!map) return;
    const hListener = map.addListener("heading_changed", () => {
      if (typeof map.getHeading === "function") {
        const curH = map.getHeading();
        if (typeof curH === "number" && !isNaN(curH)) {
          onHeadingChange(curH);
        }
      }
    });

    const tListener = map.addListener("tilt_changed", () => {
      if (typeof map.getTilt === "function") {
        const curT = map.getTilt();
        if (typeof curT === "number" && !isNaN(curT)) {
          onTiltChange(curT);
        }
      }
    });

    return () => {
      google.maps.event.removeListener(hListener);
      google.maps.event.removeListener(tListener);
    };
  }, [map, onHeadingChange, onTiltChange]);

  // Apply heading updates from UI controls to Google Maps camera
  useEffect(() => {
    if (!map || typeof map.setHeading !== "function") return;
    const curH = typeof map.getHeading === "function" ? map.getHeading() : undefined;
    if (curH !== heading) {
      map.setHeading(heading);
    }
  }, [map, heading]);

  // Apply tilt updates from UI controls to Google Maps camera
  useEffect(() => {
    if (!map || typeof map.setTilt !== "function") return;
    const curT = typeof map.getTilt === "function" ? map.getTilt() : undefined;
    if (curT !== tilt) {
      map.setTilt(tilt);
    }
  }, [map, tilt]);

  return null;
}

export function FullScreenHazardMap({
  corridor,
  assets,
  mode = "admin",
  selectedAsset,
  onSelectAsset,
  selectedBeacon,
  onDispatchBeacon,
  onResolveBeacon,
  simulatedWaterRise = 0,
  userPosition,
  distressBeacons = [],
  onSelectBeacon,
  onTriggerSOS,
  onLocateMe,
  isLocating = false,
  distanceToHazard,
  geofenceStatus,
  className = "",
  showSurgeControls = false,
  onSurgeChange,
}: FullScreenHazardMapProps) {
  // 1. Google Maps API Key management with local storage persistence
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      const stored = localStorage.getItem("himalsanket_google_maps_key");
      if (stored && stored.trim().length > 20) return stored.trim();
    } catch (_) {}
    const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (envKey && !envKey.includes("YOUR_") && envKey.trim().length > 20) {
      return envKey.trim();
    }
    return "";
  });

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey);
  const [authErrorNotice, setAuthErrorNotice] = useState(false);

  // Listen for Google Maps Authentication failure callback
  useEffect(() => {
    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      setAuthErrorNotice(true);
      if (typeof prevAuthFailure === "function") prevAuthFailure();
    };
    return () => {
      (window as any).gm_authFailure = prevAuthFailure;
    };
  }, []);

  const handleSaveApiKey = () => {
    const cleanKey = keyInput.trim();
    setApiKey(cleanKey);
    try {
      if (cleanKey) {
        localStorage.setItem("himalsanket_google_maps_key", cleanKey);
      } else {
        localStorage.removeItem("himalsanket_google_maps_key");
      }
    } catch (_) {}
    setShowKeyModal(false);
    setAuthErrorNotice(false);
  };

  // 2. Map View Styles: terrain (best for mountains), hybrid (satellite + labels), satellite, roadmap
  const [mapType, setMapType] = useState<"terrain" | "hybrid" | "satellite" | "roadmap">("terrain");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [locateTrigger, setLocateTrigger] = useState(0);

  // Camera heading and 3D perspective tilt
  const [heading, setHeading] = useState<number>(0);
  const [tilt, setTilt] = useState<number>(0);

  const handleResetNorth = useCallback(() => {
    playConfirmationBeep();
    setHeading(0);
  }, []);

  // Active item for InfoWindow
  const [activeBeacon, setActiveBeacon] = useState<DistressBeacon | null>(selectedBeacon || null);
  const [activeAsset, setActiveAsset] = useState<MapAsset | null>(selectedAsset || null);
  const [activeBase, setActiveBase] = useState<any | null>(null);

  useEffect(() => {
    if (selectedAsset) setActiveAsset(selectedAsset);
  }, [selectedAsset]);

  // Sync activeBeacon with external selectedBeacon prop (e.g. from Rescuer victim card click)
  useEffect(() => {
    if (selectedBeacon !== undefined) {
      setActiveBeacon(selectedBeacon);
      if (selectedBeacon) {
        setActiveAsset(null);
        setActiveBase(null);
      }
    }
  }, [selectedBeacon]);

  // 3. Layer Toggles
  const [layers, setLayers] = useState({
    river: true,
    inundation: true,
    landslides: mode === "admin",
    glacialLake: mode !== "civilian",
    infrastructure: mode === "admin",
    rescueBases: mode !== "civilian",
    evacuationRoutes: true,
    distressBeacons: true,
  });

  // 4. Safe Corridor configuration fallback
  const safeCorridor = useMemo(() => {
    const config = CORRIDOR_CONFIGS[corridor?.id] || CORRIDOR_CONFIGS.langtang;
    return {
      ...config,
      ...(corridor || {}),
      center: corridor?.center?.lat ? corridor.center : config.center,
      zoom: corridor?.zoom || config.zoom || 12,
      riverPath: corridor?.riverPath?.length ? corridor.riverPath : config.riverPath,
      name: corridor?.name || config.name || "Langtang Valley",
      region: corridor?.region || config.region || "Rasuwa",
    };
  }, [corridor]);

  // Dynamic surge buffer calculations
  const lateralSurgeMeters = useMemo(() => {
    return Math.round(25 + simulatedWaterRise * 35);
  }, [simulatedWaterRise]);

  const inundationBufferCoords = useMemo(() => {
    if (simulatedWaterRise <= 0 || !layers.inundation) return [];
    const polygon = generateGeodesicBufferPolygon(safeCorridor.riverPath || [], lateralSurgeMeters);
    return polygon.map(([lat, lng]) => ({ lat, lng }));
  }, [safeCorridor.riverPath, lateralSurgeMeters, simulatedWaterRise, layers.inundation]);

  // Nearest safe refuge for evacuation route
  const nearestSafeZone = useMemo(() => {
    const safeZones = assets.filter((a) => a.type === "safeZone");
    if (safeZones.length === 0 || !userPosition) return null;
    let closest: MapAsset = safeZones[0];
    let minD = Infinity;
    safeZones.forEach((sz) => {
      const d = getDistanceMeters(userPosition, { lat: sz.lat, lng: sz.lng });
      if (d < minD) {
        minD = d;
        closest = sz;
      }
    });
    return { asset: closest, distanceMeters: Math.round(minD) };
  }, [assets, userPosition]);

  // Glacial Lake geometry for selected corridor
  const lakeGeo = useMemo(() => {
    return CORRIDOR_LAKE_POLYGONS[safeCorridor.id] || null;
  }, [safeCorridor.id]);

  // Landslide zones
  const landslideZones = useMemo(() => {
    return CORRIDOR_LANDSLIDE_ZONES[safeCorridor.id] || [];
  }, [safeCorridor.id]);

  // SAR Rescue bases
  const rescueBases = useMemo(() => {
    return CORRIDOR_RESCUE_BASES[safeCorridor.id] || [];
  }, [safeCorridor.id]);

  // Assets to display
  const displayAssets = useMemo(() => {
    if (mode === "civilian") {
      return assets.filter((a) => a.type === "safeZone");
    }
    return assets;
  }, [assets, mode]);

  const handleBeaconClick = useCallback(
    (beacon: DistressBeacon) => {
      setActiveBeacon(beacon);
      setActiveAsset(null);
      setActiveBase(null);
      if (onSelectBeacon) onSelectBeacon(beacon);
    },
    [onSelectBeacon]
  );

  const handleAssetClick = useCallback(
    (asset: MapAsset) => {
      setActiveAsset(asset);
      setActiveBeacon(null);
      setActiveBase(null);
      if (onSelectAsset) onSelectAsset(asset);
    },
    [onSelectAsset]
  );

  return (
    <div className={`relative w-full h-full overflow-hidden select-none bg-[#0c141d] ${className}`}>
      <ErrorBoundary
        fallback={
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#0A1224] text-center">
            <AlertTriangle className="w-12 h-12 text-amber-400 mb-3 animate-bounce" />
            <h3 className="text-lg font-bold text-white mb-2">Google Maps Initialization Notice</h3>
            <p className="text-xs text-slate-400 max-w-md mb-4">
              Google Maps Platform is loading. If you are presenting at the AI Summit, you can connect your Google Maps API key below for unwatermarked satellite & terrain imagery.
            </p>
            <button
              onClick={() => setShowKeyModal(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer"
            >
              Configure Google Maps Key
            </button>
          </div>
        }
      >
        <APIProvider apiKey={apiKey} libraries={["maps", "marker", "geometry"]}>
          <Map
            defaultCenter={safeCorridor.center}
            defaultZoom={safeCorridor.zoom}
            headingInteractionEnabled={true}
            tiltInteractionEnabled={true}
            mapTypeId={mapType}
            mapId="HIMALSANKET_MAP_ID"
            style={{ width: "100%", height: "100%", position: "absolute" }}
            gestureHandling="greedy"
            streetViewControl={false}
            mapTypeControl={false}
            fullscreenControl={false}
            zoomControl={false}
            styles={mapType === "roadmap" ? DARK_MAP_STYLES : undefined}
          >
            {/* Camera Coordinator */}
            <MapCameraController
              corridor={safeCorridor}
              selectedAsset={activeAsset}
              selectedBeacon={activeBeacon}
              recenterTrigger={recenterTrigger}
              locateTrigger={locateTrigger}
              userPosition={userPosition}
              heading={heading}
              tilt={tilt}
              onHeadingChange={setHeading}
              onTiltChange={setTilt}
            />

            {/* 1. RIVER FLOW POLYLINE (ELECTRIC CYAN) */}
            {layers.river && safeCorridor.riverPath && safeCorridor.riverPath.length > 1 && (
              <Polyline
                path={safeCorridor.riverPath}
                geodesic={true}
                strokeColor="#00f0ff"
                strokeOpacity={0.9}
                strokeWeight={3.5}
              />
            )}

            {/* 2. DYNAMIC SURGE INUNDATION BUFFER POLYGON */}
            {layers.inundation && inundationBufferCoords.length > 2 && (
              <Polygon
                paths={inundationBufferCoords}
                strokeColor={simulatedWaterRise >= 2.0 ? "#ef4444" : "#f59e0b"}
                strokeOpacity={0.8}
                strokeWeight={2}
                fillColor={simulatedWaterRise >= 2.0 ? "#ef4444" : "#f59e0b"}
                fillOpacity={0.35}
              />
            )}

            {/* 3. GLACIAL LAKE SENTINEL-2 POLYGONS */}
            {layers.glacialLake && lakeGeo && (
              <>
                {/* Reference Baseline Shoreline */}
                <Polygon
                  paths={lakeGeo.baselinePolygon.map(([lat, lng]) => ({ lat, lng }))}
                  strokeColor="#0284c7"
                  strokeOpacity={0.9}
                  strokeWeight={2}
                  fillColor="#0284c7"
                  fillOpacity={0.45}
                />
                {/* Outburst Expansion Surge Shoreline */}
                <Polygon
                  paths={lakeGeo.expandedPolygon.map(([lat, lng]) => ({ lat, lng }))}
                  strokeColor="#f43f5e"
                  strokeOpacity={0.9}
                  strokeWeight={2}
                  fillColor="#f43f5e"
                  fillOpacity={0.3}
                />
              </>
            )}

            {/* 4. LANDSLIDE RISK ZONES (ADMIN & RESCUER) */}
            {layers.landslides &&
              mode !== "civilian" &&
              landslideZones.map((zone) => (
                <Polygon
                  key={zone.id}
                  paths={zone.polygon.map(([lat, lng]) => ({ lat, lng }))}
                  strokeColor={zone.severity === "critical" ? "#ef4444" : "#f97316"}
                  strokeOpacity={0.85}
                  strokeWeight={1.5}
                  fillColor={zone.severity === "critical" ? "#ef4444" : "#f97316"}
                  fillOpacity={0.25}
                />
              ))}

            {/* 5. EVACUATION PATH TO NEAREST SAFE ZONE */}
            {layers.evacuationRoutes && userPosition && nearestSafeZone && (
              <Polyline
                path={[
                  { lat: userPosition.lat, lng: userPosition.lng },
                  { lat: nearestSafeZone.asset.lat, lng: nearestSafeZone.asset.lng },
                ]}
                strokeColor="#10b981"
                strokeOpacity={0.95}
                strokeWeight={3}
              />
            )}

            {/* 6. USER LOCATION ACCURACY CIRCLE */}
            {userPosition && (
              <Circle
                center={{ lat: userPosition.lat, lng: userPosition.lng }}
                radius={userPosition.accuracy || 20}
                strokeColor="#0284c7"
                strokeOpacity={0.4}
                strokeWeight={1}
                fillColor="#0284c7"
                fillOpacity={0.15}
              />
            )}

            {/* 7. TREKKER LIVE GPS MARKER */}
            {userPosition && (
              <AdvancedMarker
                position={{ lat: userPosition.lat, lng: userPosition.lng }}
                title="Your Current Location"
              >
                <div className="relative flex items-center justify-center cursor-pointer group">
                  <div className="absolute -inset-2 rounded-full bg-cyan-400 opacity-40 animate-ping" />
                  <div className="relative w-7 h-7 rounded-full bg-cyan-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs">
                    <Crosshair className="w-3.5 h-3.5" />
                  </div>
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-[#0F1B33]/90 text-[10px] font-bold text-cyan-200 px-2 py-0.5 rounded-full border border-cyan-500/40 whitespace-nowrap shadow-lg">
                    {Math.round(userPosition.altitude || 2780)}m ASL
                  </div>
                </div>
              </AdvancedMarker>
            )}

            {/* 8. DISTRESS BEACONS (SOS) */}
            {layers.distressBeacons &&
              distressBeacons.map((beacon) => {
                const isCritical = beacon.priority >= 90;
                const isRescued = beacon.status === "rescued";
                const color = isRescued ? "bg-emerald-600" : isCritical ? "bg-rose-600" : "bg-amber-600";
                const isSelected = activeBeacon?.id === beacon.id;

                return (
                  <AdvancedMarker
                    key={beacon.id}
                    position={{ lat: beacon.lat, lng: beacon.lng }}
                    onClick={() => handleBeaconClick(beacon)}
                    title={beacon.name}
                    zIndex={isSelected ? 999 : 50}
                  >
                    <div
                      className={`relative flex items-center justify-center cursor-pointer transition-all duration-300 ${
                        isSelected ? "scale-125 z-50" : "hover:scale-110 z-20"
                      }`}
                    >
                      {!isRescued && (
                        <>
                          <div
                            className={`absolute -inset-3 rounded-full opacity-70 animate-ping ${
                              isCritical ? "bg-rose-500" : "bg-amber-500"
                            }`}
                          />
                          {isSelected && (
                            <div className="absolute -inset-5 rounded-full border-2 border-rose-400 opacity-80 animate-pulse" />
                          )}
                        </>
                      )}
                      <div
                        className={`w-9 h-9 rounded-full ${color} border-2 border-white flex items-center justify-center text-white font-black text-xs transition-all ${
                          isSelected
                            ? "ring-4 ring-rose-400 ring-offset-2 ring-offset-black shadow-[0_0_25px_rgba(244,63,94,0.9)] animate-bounce"
                            : "shadow-2xl"
                        }`}
                      >
                        <Radio className="w-4 h-4 animate-pulse" />
                      </div>
                      <div
                        className={`absolute top-10 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded border whitespace-nowrap shadow-xl text-[10px] font-black transition-all ${
                          isSelected
                            ? "bg-rose-950 text-rose-200 border-rose-400 scale-105"
                            : "bg-black/90 text-white border-white/20"
                        }`}
                      >
                        {beacon.priority}% SOS
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

            {/* 9. SEARCH & RESCUE FORWARD BASES (RESCUER & ADMIN) */}
            {layers.rescueBases &&
              mode !== "civilian" &&
              rescueBases.map((base) => (
                <AdvancedMarker
                  key={base.id}
                  position={{ lat: base.lat, lng: base.lng }}
                  onClick={() => {
                    setActiveBase(base);
                    setActiveAsset(null);
                    setActiveBeacon(null);
                  }}
                  title={base.name}
                >
                  <div className="flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
                      🚁
                    </div>
                  </div>
                </AdvancedMarker>
              ))}

            {/* 10. INFRASTRUCTURE & SAFE REFUGE ASSETS */}
            {displayAssets.map((asset) => {
              const isSafe = asset.type === "safeZone";
              const isSelected = activeAsset?.id === asset.id;

              return (
                <AdvancedMarker
                  key={asset.id}
                  position={{ lat: asset.lat, lng: asset.lng }}
                  onClick={() => handleAssetClick(asset)}
                  title={asset.name}
                >
                  <div
                    className={`flex items-center justify-center cursor-pointer transition-transform ${
                      isSelected ? "scale-125 z-30 ring-2 ring-cyan-400 rounded-full" : "hover:scale-110"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] shadow-md border ${
                        isSafe
                          ? "bg-emerald-600 border-emerald-300 text-white"
                          : "bg-blue-600 border-blue-300 text-white"
                      }`}
                    >
                      {isSafe ? "🛡️" : "📍"}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* 11. INFOWINDOW: ACTIVE DISTRESS BEACON */}
            {activeBeacon && (
              <InfoWindow
                position={{ lat: activeBeacon.lat, lng: activeBeacon.lng }}
                onCloseClick={() => {
                  setActiveBeacon(null);
                  if (onSelectBeacon) onSelectBeacon(null as any);
                }}
              >
                <div className="p-1.5 max-w-[280px] font-sans text-slate-900">
                  <div className="flex items-center justify-between border-b pb-1 mb-1.5">
                    <span className="text-[10px] font-black uppercase text-rose-600 flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                      <span>{activeBeacon.priority}% Triage Distress</span>
                    </span>
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        activeBeacon.status === "rescued"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {activeBeacon.status}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 leading-tight">
                    {activeBeacon.name}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    {activeBeacon.detail}
                  </p>
                  <div className="mt-2 pt-1.5 border-t text-[10px] text-slate-500 flex justify-between items-center font-mono">
                    <span>GPS: {activeBeacon.lat.toFixed(4)}°, {activeBeacon.lng.toFixed(4)}°</span>
                    <span>Elev: ~{Math.round(activeBeacon.altitude || 2780)}m</span>
                  </div>
                  {mode !== "civilian" && activeBeacon.status !== "rescued" && (
                    <div className="mt-2 pt-1.5 border-t flex gap-1.5">
                      {onDispatchBeacon && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDispatchBeacon(activeBeacon);
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] cursor-pointer shadow transition-all active:scale-95"
                        >
                          Dispatch Team
                        </button>
                      )}
                      {onResolveBeacon && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onResolveBeacon(activeBeacon);
                          }}
                          className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer shadow transition-all active:scale-95"
                        >
                          Mark Rescued
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}

            {/* 12. INFOWINDOW: ACTIVE ASSET / SAFE ZONE */}
            {activeAsset && (
              <InfoWindow
                position={{ lat: activeAsset.lat, lng: activeAsset.lng }}
                onCloseClick={() => setActiveAsset(null)}
              >
                <div className="p-1 max-w-[260px] font-sans text-slate-900">
                  <div className="flex items-center justify-between border-b pb-1 mb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      {activeAsset.type === "safeZone" ? "High-Ground Refuge" : activeAsset.type}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        activeAsset.status === "safe"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {activeAsset.status}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-slate-900">{activeAsset.name}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    {activeAsset.description}
                  </div>
                  <div className="mt-1.5 pt-1 border-t flex items-center justify-between text-[10px] text-slate-500">
                    <span>Elevation: {activeAsset.elevation}m</span>
                    {activeAsset.capacity && <span>Cap: {activeAsset.capacity}</span>}
                  </div>
                </div>
              </InfoWindow>
            )}

            {/* 13. INFOWINDOW: RESCUE HELIPAD BASE */}
            {activeBase && (
              <InfoWindow
                position={{ lat: activeBase.lat, lng: activeBase.lng }}
                onCloseClick={() => setActiveBase(null)}
              >
                <div className="p-1 max-w-[240px] font-sans text-slate-900">
                  <div className="text-[10px] font-extrabold text-emerald-700 uppercase mb-0.5">
                    SAR Forward Base &bull; {activeBase.agency}
                  </div>
                  <div className="font-bold text-xs text-slate-900">{activeBase.name}</div>
                  <div className="text-[11px] text-slate-600 mt-1">
                    Helicopter flight time to corridor: <strong>~{activeBase.heliFlightMin} mins</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t">
                    Radio/Sat: {activeBase.contact}
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </ErrorBoundary>

      {/* FLOATING HUD CONTROLS (TOP LEFT: CORRIDOR & GEOFENCE STATUS) */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#0F1B33]/90 backdrop-blur-md border border-[#2A3B5E] shadow-2xl text-xs text-white">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-extrabold tracking-wide">{safeCorridor.name}</span>
          <span className="text-[#94A3B8] text-[11px]">({safeCorridor.region})</span>
          {geofenceStatus && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                geofenceStatus === "DANGER"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
              }`}
            >
              {geofenceStatus === "DANGER" ? "⚠️ Danger Zone" : "🟢 Safe Refuge"}
            </span>
          )}
        </div>

        {/* Hazard Distance Readout */}
        {distanceToHazard !== null && distanceToHazard !== undefined && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0F1B33]/85 backdrop-blur-md border border-[#2A3B5E] text-[11px] text-[#94A3B8] shadow-lg">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hazard Distance:</span>
            <strong className="text-white font-mono">{distanceToHazard}m</strong>
          </div>
        )}
      </div>

      {/* FLOATING HUD CONTROLS (TOP RIGHT: MAP STYLES, LAYERS, GPS & KEY) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 pointer-events-auto flex-wrap justify-end">
        {/* Google Maps MapType Switcher */}
        <div className="flex items-center bg-[#0F1B33]/90 backdrop-blur-md border border-[#2A3B5E] rounded-2xl p-1 shadow-2xl text-xs">
          <button
            onClick={() => setMapType("terrain")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              mapType === "terrain"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                : "text-[#94A3B8] hover:text-white"
            }`}
            title="Google 3D Elevation & Mountain Terrain"
          >
            <Mountain className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Terrain</span>
          </button>
          <button
            onClick={() => setMapType("hybrid")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              mapType === "hybrid"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                : "text-[#94A3B8] hover:text-white"
            }`}
            title="Satellite Imagery with Trails & Labels"
          >
            <Satellite className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hybrid</span>
          </button>
          <button
            onClick={() => setMapType("satellite")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              mapType === "satellite"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                : "text-[#94A3B8] hover:text-white"
            }`}
            title="Pure Photorealistic Satellite Imagery"
          >
            <span className="text-xs">🛰️</span>
            <span className="hidden md:inline">Satellite</span>
          </button>
          <button
            onClick={() => setMapType("roadmap")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              mapType === "roadmap"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                : "text-[#94A3B8] hover:text-white"
            }`}
            title="Dark Tactical Vector Map"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Tactical</span>
          </button>
        </div>

        {/* GIS Layers Dropdown (Rescuer & Admin) */}
        {mode !== "civilian" && (
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="p-2 rounded-2xl bg-[#0F1B33]/90 backdrop-blur-md border border-[#2A3B5E] text-white hover:bg-[#1C2C4C] shadow-2xl transition-all cursor-pointer"
              title="Toggle GIS Overlays"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 top-11 w-52 rounded-2xl bg-[#0F1B33]/95 backdrop-blur-2xl border border-[#2A3B5E] shadow-2xl p-3 text-xs text-white space-y-2 z-30">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] pb-1 border-b border-[#2A3B5E]">
                  Google Maps Layers
                </div>
                <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-300">
                  <input
                    type="checkbox"
                    checked={layers.river}
                    onChange={(e) => setLayers((p) => ({ ...p, river: e.target.checked }))}
                    className="accent-cyan-500 rounded"
                  />
                  <span>River Flow Centerline</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-300">
                  <input
                    type="checkbox"
                    checked={layers.inundation}
                    onChange={(e) => setLayers((p) => ({ ...p, inundation: e.target.checked }))}
                    className="accent-cyan-500 rounded"
                  />
                  <span>Surge Flood Inundation</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-300">
                  <input
                    type="checkbox"
                    checked={layers.glacialLake}
                    onChange={(e) => setLayers((p) => ({ ...p, glacialLake: e.target.checked }))}
                    className="accent-cyan-500 rounded"
                  />
                  <span>Sentinel-2 Glacial Lakes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-300">
                  <input
                    type="checkbox"
                    checked={layers.landslides}
                    onChange={(e) => setLayers((p) => ({ ...p, landslides: e.target.checked }))}
                    className="accent-cyan-500 rounded"
                  />
                  <span>Landslide Hazard Zones</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-300">
                  <input
                    type="checkbox"
                    checked={layers.distressBeacons}
                    onChange={(e) => setLayers((p) => ({ ...p, distressBeacons: e.target.checked }))}
                    className="accent-cyan-500 rounded"
                  />
                  <span>Distress Beacons (SOS)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-300">
                  <input
                    type="checkbox"
                    checked={layers.rescueBases}
                    onChange={(e) => setLayers((p) => ({ ...p, rescueBases: e.target.checked }))}
                    className="accent-cyan-500 rounded"
                  />
                  <span>SAR Helipads & Bases</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-300">
                  <input
                    type="checkbox"
                    checked={layers.infrastructure}
                    onChange={(e) => setLayers((p) => ({ ...p, infrastructure: e.target.checked }))}
                    className="accent-cyan-500 rounded"
                  />
                  <span>Refuge & Infrastructure</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Re-center Button */}
        <button
          onClick={() => setRecenterTrigger((p) => p + 1)}
          className="p-2 rounded-2xl bg-[#0F1B33]/90 backdrop-blur-md border border-[#2A3B5E] text-white hover:bg-[#1C2C4C] shadow-2xl transition-all cursor-pointer"
          title="Fit Corridor Bounds"
        >
          <Compass className="w-4 h-4 text-cyan-400" />
        </button>

        {/* GPS Locate Me Button */}
        {onLocateMe && (
          <button
            onClick={() => {
              onLocateMe();
              setLocateTrigger((p) => p + 1);
            }}
            className={`p-2 rounded-2xl bg-[#0F1B33]/90 backdrop-blur-md border border-[#2A3B5E] text-white hover:bg-[#1C2C4C] shadow-2xl transition-all cursor-pointer ${
              isLocating ? "animate-spin text-cyan-400" : ""
            }`}
            title="Locate My GPS Device"
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
          </button>
        )}

        {/* Google Maps API Key Config Pill */}
        <button
          onClick={() => setShowKeyModal(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl text-xs font-bold backdrop-blur-md border transition-all cursor-pointer shadow-2xl ${
            apiKey && apiKey.length > 20
              ? "bg-emerald-600/30 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/40"
              : "bg-amber-600/20 border-amber-500/40 text-amber-300 hover:bg-amber-600/30"
          }`}
          title="Configure Google Maps API Key"
        >
          <Key className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">{apiKey ? "Google Maps Connected" : "Set Google Maps Key"}</span>
        </button>
      </div>

      {/* TACTICAL NORTH COMPASS & CAMERA ANGLE HUD */}
      <div className="absolute top-16 sm:top-14 right-3 z-20">
        <TacticalCompass
          heading={heading}
          tilt={tilt}
          onHeadingChange={setHeading}
          onTiltChange={setTilt}
          onResetNorth={handleResetNorth}
        />
      </div>

      {/* FLOATING BOTTOM CENTER: WATER SURGE SLIDER (ADMIN MODE ONLY) */}
      {showSurgeControls && onSurgeChange && (
        <div className="absolute bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#0F1B33]/95 backdrop-blur-xl border border-[#2A3B5E] shadow-2xl text-xs text-white pointer-events-auto">
          <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-[#94A3B8]">Water Surge:</span>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={simulatedWaterRise}
            onChange={(e) => onSurgeChange(parseFloat(e.target.value))}
            className="w-28 sm:w-44 accent-cyan-400 cursor-pointer"
          />
          <span className="font-mono font-bold text-cyan-300">+{simulatedWaterRise.toFixed(1)}m</span>
          <span className="text-[10px] text-[#94A3B8] font-mono">(&plusmn;{lateralSurgeMeters}m spread)</span>
        </div>
      )}

      {/* GOOGLE MAPS API KEY CONFIGURATION MODAL */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0F1B33] border border-[#2A3B5E] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Google Maps Platform Key</h3>
                <p className="text-xs text-slate-400">Powering high-precision terrain & satellite maps</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              HimalSanket uses Google Maps JavaScript API with 3D elevation terrain and Sentinel-2 overlays.
              Enter your Google Cloud API key to unlock full production tiles.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200">Google Maps API Key</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full px-3 py-2 bg-[#16233F] border border-[#2A3B5E] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#2A3B5E]">
              <a
                href="https://console.cloud.google.com/google/maps-apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
              >
                <span>Get key on Google Cloud</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-[#1C2C4C] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveApiKey}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-all"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
