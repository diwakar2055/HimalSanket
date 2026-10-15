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
  Globe2,
  Search,
  Plus,
  Minus,
  Plane,
} from "lucide-react";
import { ErrorBoundary } from "../ErrorBoundary";
import { LeafletHazardMap } from "../LeafletHazardMap";
import { TraefikNodeCard, TraefikNodeData } from "./TraefikNodeCard";

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
    featureType: "administrative.land_parcel",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.attraction",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.medical",
    elementType: "labels.text.fill",
    stylers: [{ color: "#22c55e" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#062828" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#2dd4bf" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "road.local",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
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

// Inner controller that handles camera panning and bounds fitting
function MapCameraController({
  corridor,
  selectedAsset,
  selectedBeacon,
  recenterTrigger,
  locateTrigger,
  userPosition,
}: {
  corridor: CorridorConfig;
  selectedAsset?: MapAsset | null;
  selectedBeacon?: DistressBeacon | null;
  recenterTrigger: number;
  locateTrigger: number;
  userPosition?: { lat: number; lng: number } | null;
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

  const hasValidGoogleKey = Boolean(
    apiKey &&
      apiKey.trim().length > 20 &&
      !apiKey.includes("YOUR_") &&
      !authErrorNotice
  );

  // Default to Leaflet for 100% reliable satellite and terrain tiles without Google key popups
  const [engine, setEngine] = useState<"google" | "leaflet">("leaflet");

  useEffect(() => {
    if (!hasValidGoogleKey) {
      setEngine("leaflet");
    }
  }, [hasValidGoogleKey]);

  // Listen for Google Maps Authentication failure callback
  useEffect(() => {
    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      setAuthErrorNotice(true);
      setEngine("leaflet");
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
    if (cleanKey.length > 20) {
      setEngine("google");
    }
  };

  const getDynamicStatus = useCallback(
    (asset: MapAsset): "safe" | "advisory" | "critical" => {
      if (simulatedWaterRise === 0) return asset.status;
      const buffer = (asset.hazardThresholdMeters || 3) - simulatedWaterRise;
      if (buffer <= 0) return "critical";
      if (buffer <= 1.2) return "critical";
      if (buffer <= 2.5) return "advisory";
      return "safe";
    },
    [simulatedWaterRise]
  );

  // 2. Map View Styles: terrain (best for mountains), hybrid (satellite + labels), satellite, roadmap
  const [mapType, setMapType] = useState<"terrain" | "hybrid" | "satellite" | "roadmap">("terrain");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [locateTrigger, setLocateTrigger] = useState(0);

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

  // Transcope Map Search & Filtering
  const [mapSearch, setMapSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "safe" | "sos" | "bases">("all");

  const activeNodeData = useMemo<TraefikNodeData | null>(() => {
    if (activeBeacon) {
      return {
        title: activeBeacon.name,
        subtitle: `Distress Incident #${String(activeBeacon.id).slice(-4)} • ${safeCorridor.name}`,
        statusText: activeBeacon.status === "rescued" ? "Safely Extracted" : `${activeBeacon.priority}% Triage SOS`,
        statusVariant: activeBeacon.status === "rescued" ? "safe" : activeBeacon.priority >= 90 ? "danger" : "warning",
        metrics: [
          { label: "GPS Coordinates", value: `${activeBeacon.lat.toFixed(3)}°, ${activeBeacon.lng.toFixed(3)}°` },
          { label: "Altitude", value: `${Math.round(activeBeacon.altitude || 2780)}m ASL` },
          { label: "Triage Urgency", value: `${activeBeacon.priority}% SOS`, highlight: true },
          { label: "Assigned Squad", value: activeBeacon.assignedUnit || "Standby Squad" },
        ],
        primaryAction:
          onDispatchBeacon && activeBeacon.status !== "rescued"
            ? {
                label: "Dispatch APF Squad",
                onClick: () => onDispatchBeacon(activeBeacon),
                icon: <Plane className="w-3.5 h-3.5" />,
              }
            : undefined,
        secondaryAction:
          onResolveBeacon && activeBeacon.status !== "rescued"
            ? {
                label: "Mark Extracted",
                onClick: () => onResolveBeacon(activeBeacon),
              }
            : undefined,
      };
    }

    if (activeAsset) {
      return {
        title: activeAsset.name,
        subtitle:
          activeAsset.type === "safeZone"
            ? "High-Ground Evacuation Refuge"
            : `Corridor Asset (${activeAsset.type})`,
        statusText: activeAsset.status === "safe" ? "Nominal Safe" : "Advisory Watch",
        statusVariant: activeAsset.status === "safe" ? "safe" : "warning",
        metrics: [
          { label: "Elevation", value: `${activeAsset.elevation}m ASL` },
          { label: "Capacity", value: activeAsset.capacity ? `${activeAsset.capacity} Pax` : "Unrestricted" },
          { label: "Safety Status", value: activeAsset.status.toUpperCase(), highlight: activeAsset.status !== "safe" },
          { label: "Corridor Sector", value: safeCorridor.name.split(" ")[0] },
        ],
      };
    }

    if (activeBase) {
      return {
        title: activeBase.name,
        subtitle: `SAR Forward Base • ${activeBase.agency}`,
        statusText: "Operational",
        statusVariant: "safe",
        metrics: [
          { label: "Flight Time", value: `~${activeBase.heliFlightMin} mins` },
          { label: "Elevation", value: `${activeBase.elevation}m ASL` },
          { label: "Aircraft Type", value: "AS350 B3e" },
          { label: "Radio Frequency", value: activeBase.contact || "122.8 MHz" },
        ],
      };
    }

    return null;
  }, [activeBeacon, activeAsset, activeBase, safeCorridor, onDispatchBeacon, onResolveBeacon]);

  // When engine is Leaflet or no valid Google Maps API Key is configured, seamlessly render Leaflet
  if (engine === "leaflet" || !hasValidGoogleKey) {
    return (
      <div className={`relative w-full h-full overflow-hidden select-none bg-[#090D16] ${className}`}>
        <LeafletHazardMap
          corridor={safeCorridor}
          assets={displayAssets}
          selectedAsset={activeAsset}
          onSelectAsset={handleAssetClick}
          activeLayers={{
            people: layers.infrastructure,
            school: layers.infrastructure,
            bridge: layers.infrastructure,
            hospital: layers.infrastructure,
            dam: layers.infrastructure,
            safeZone: true,
            hazardZone: layers.landslides,
          }}
          simulatedWaterRise={simulatedWaterRise}
          getDynamicStatus={getDynamicStatus}
          onSwitchToGoogleView={hasValidGoogleKey ? () => setEngine("google") : undefined}
          onOpenKeyModal={() => setShowKeyModal(true)}
          hasGoogleKey={hasValidGoogleKey}
          userPosition={userPosition}
          sosDistresses={distressBeacons.map((b) => ({
            id: b.id,
            name: b.name,
            lat: b.lat,
            lng: b.lng,
            detail: b.detail || `Priority ${b.priority}`,
            priority: b.priority,
            time: b.time,
          }))}
          onLocateMe={onLocateMe}
          isLocating={isLocating}
          className="w-full h-full"
        />

        {/* TRANSCOPE FLOATING MAP SEARCH & FILTER BAR */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 hidden sm:flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center bg-[#090D16]/90 backdrop-blur-xl border border-white/[0.12] rounded-2xl px-3 py-1.5 shadow-2xl text-xs gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search trail, refuge, SOS..."
              value={mapSearch}
              onChange={(e) => setMapSearch(e.target.value)}
              className="bg-transparent text-white placeholder-slate-400 text-xs w-44 lg:w-56 focus:outline-none font-mono"
            />
            {mapSearch && (
              <button
                onClick={() => setMapSearch("")}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                &times;
              </button>
            )}
          </div>

          <div className="flex items-center bg-[#090D16]/90 backdrop-blur-xl border border-white/[0.12] rounded-2xl px-3 py-1.5 shadow-2xl text-xs gap-1.5 text-slate-300 font-semibold">
            <span className="text-slate-400 text-[10px]">Filter:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0F172A] text-white">All Hazards</option>
              <option value="sos" className="bg-[#0F172A] text-white">Urgent SOS</option>
              <option value="safe" className="bg-[#0F172A] text-white">Safe Refuges</option>
              <option value="bases" className="bg-[#0F172A] text-white">SAR Helipads</option>
            </select>
          </div>
        </div>

        {/* TRAEFIK HUB FLOATING NODE DETAIL CARD */}
        {activeNodeData && (
          <div className="absolute bottom-4 left-4 z-30 pointer-events-auto">
            <TraefikNodeCard
              data={activeNodeData}
              onClose={() => {
                setActiveBeacon(null);
                setActiveAsset(null);
                setActiveBase(null);
              }}
            />
          </div>
        )}

        {/* Floating Google Maps Switcher Pill (Top Right) */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2 pointer-events-auto">
          {hasValidGoogleKey ? (
            <button
              onClick={() => setEngine("google")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#101A2A]/90 backdrop-blur-md border border-cyan-500/40 text-cyan-300 text-xs font-bold shadow-xl hover:bg-[#152238] cursor-pointer"
            >
              <Mountain className="w-3.5 h-3.5 text-cyan-400" />
              <span>Google 3D Elevation</span>
            </button>
          ) : (
            <button
              onClick={() => setShowKeyModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#101A2A]/90 backdrop-blur-md border border-[#27364B] text-[#A7B4C8] hover:text-[#F8FAFC] text-xs font-semibold shadow-xl cursor-pointer"
              title="Add Google Maps API Key for 3D elevation terrain"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Add Google Key</span>
            </button>
          )}
        </div>

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
                HimalSanket provides high-resolution ESRI satellite GIS and OpenTopoMap by default with zero setup.
                Enter your Google Cloud API key to optionally enable Google 3D elevation terrain.
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

  return (
    <div className={`relative w-full h-full overflow-hidden select-none bg-[#0c141d] ${className}`}>
      <ErrorBoundary
        fallback={
          <div className="relative w-full h-full">
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 bg-[#101A2A]/90 border border-amber-500/40 rounded-full text-xs text-amber-300 font-semibold backdrop-blur-md flex items-center gap-2 shadow-xl">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Google Maps unavailable — Tactical Satellite GIS active</span>
              <button
                onClick={() => setShowKeyModal(true)}
                className="ml-2 underline text-cyan-400 text-xs cursor-pointer"
              >
                Configure Key
              </button>
            </div>
            <LeafletHazardMap
              corridor={safeCorridor}
              assets={displayAssets}
              selectedAsset={activeAsset}
              onSelectAsset={handleAssetClick}
              activeLayers={{
                people: layers.infrastructure,
                school: layers.infrastructure,
                bridge: layers.infrastructure,
                hospital: layers.infrastructure,
                dam: layers.infrastructure,
                safeZone: true,
                hazardZone: layers.landslides,
              }}
              simulatedWaterRise={simulatedWaterRise}
              getDynamicStatus={getDynamicStatus}
              hasGoogleKey={false}
              userPosition={userPosition}
              sosDistresses={distressBeacons.map((b) => ({
                id: b.id,
                name: b.name,
                lat: b.lat,
                lng: b.lng,
                detail: b.detail || `Priority ${b.priority}`,
                priority: b.priority,
                time: b.time,
              }))}
              onLocateMe={onLocateMe}
              isLocating={isLocating}
              className="w-full h-full"
            />
          </div>
        }
      >
        <APIProvider apiKey={apiKey} libraries={["maps", "marker", "geometry"]}>
          <Map
            defaultCenter={safeCorridor.center}
            defaultZoom={safeCorridor.zoom}
            mapTypeId={mapType}
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
                const color = isRescued ? "bg-[#22C55E]" : isCritical ? "bg-[#DC2626]" : "bg-[#EAB308]";
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
                              isCritical ? "bg-[#DC2626]" : "bg-[#EAB308]"
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
                            ? "ring-4 ring-rose-400 ring-offset-2 ring-offset-black shadow-[0_0_25px_rgba(220,38,38,0.9)] animate-bounce"
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
                      <Radio className="w-3.5 h-3.5 text-white" />
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
                          ? "bg-[#22C55E] border-emerald-300 text-white"
                          : "bg-blue-600 border-blue-300 text-white"
                      }`}
                    >
                      {isSafe ? <Shield className="w-3 h-3 text-white" /> : <MapPin className="w-3 h-3 text-white" />}
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

      {/* TRANSCOPE FLOATING MAP SEARCH & FILTER BAR */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 hidden sm:flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center bg-[#18191E]/95 backdrop-blur-xl border border-white/[0.12] rounded-2xl px-3 py-1.5 shadow-2xl text-xs gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search trail, refuge, SOS..."
            value={mapSearch}
            onChange={(e) => setMapSearch(e.target.value)}
            className="bg-transparent text-white placeholder-slate-400 text-xs w-44 lg:w-56 focus:outline-none font-mono"
          />
          {mapSearch && (
            <button
              onClick={() => setMapSearch("")}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              &times;
            </button>
          )}
        </div>

        <div className="flex items-center bg-[#18191E]/95 backdrop-blur-xl border border-white/[0.12] rounded-2xl px-3 py-1.5 shadow-2xl text-xs gap-1.5 text-slate-300 font-semibold">
          <span className="text-slate-400 text-[10px]">Filter:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#18191E] text-white">All Hazards</option>
            <option value="sos" className="bg-[#18191E] text-white">Urgent SOS</option>
            <option value="safe" className="bg-[#18191E] text-white">Safe Refuges</option>
            <option value="bases" className="bg-[#18191E] text-white">SAR Helipads</option>
          </select>
        </div>
      </div>

      {/* TRAEFIK HUB FLOATING NODE DETAIL CARD */}
      {activeNodeData && (
        <div className="absolute bottom-4 left-4 z-30 pointer-events-auto">
          <TraefikNodeCard
            data={activeNodeData}
            onClose={() => {
              setActiveBeacon(null);
              setActiveAsset(null);
              setActiveBase(null);
            }}
          />
        </div>
      )}

      {/* FLOATING HUD CONTROLS (TOP LEFT: CORRIDOR & GEOFENCE STATUS) */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#18191E]/95 backdrop-blur-md border border-white/[0.1] shadow-xl text-xs text-white">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-extrabold tracking-wide">{safeCorridor.name}</span>
          <span className="text-slate-400 text-[11px]">({safeCorridor.region})</span>
          {geofenceStatus && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                geofenceStatus === "DANGER"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {geofenceStatus === "DANGER" ? "Danger zone" : "Safe zone"}
            </span>
          )}
        </div>

        {/* Hazard Distance Readout */}
        {distanceToHazard !== null && distanceToHazard !== undefined && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#18191E]/90 backdrop-blur-md border border-white/[0.08] text-[11px] text-slate-400 shadow-md">
            <Compass className="w-3.5 h-3.5 text-slate-300" />
            <span>Hazard distance:</span>
            <strong className="text-white font-mono">{distanceToHazard}m</strong>
          </div>
        )}
      </div>

      {/* FLOATING HUD CONTROLS (TOP RIGHT DOCK: BASEMAP SWITCHER & GIS LAYERS & RECENTER) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 pointer-events-auto">
        {/* Google Maps MapType Switcher */}
        <div className="flex items-center bg-[#18191E]/95 backdrop-blur-md border border-white/[0.1] rounded-xl p-0.5 shadow-xl text-xs">
          <button
            onClick={() => setMapType("terrain")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              mapType === "terrain"
                ? "bg-white/[0.12] text-white border border-white/20 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
            title="Google 3D Elevation & Mountain Terrain"
          >
            <Mountain className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Terrain</span>
          </button>
          <button
            onClick={() => setMapType("hybrid")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              mapType === "hybrid"
                ? "bg-white/[0.12] text-white border border-white/20 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
            title="Satellite Imagery with Trails & Labels"
          >
            <Satellite className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hybrid</span>
          </button>
          <button
            onClick={() => setMapType("satellite")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              mapType === "satellite"
                ? "bg-white/[0.12] text-white border border-white/20 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
            title="Pure Photorealistic Satellite Imagery"
          >
            <Satellite className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Satellite</span>
          </button>
          <button
            onClick={() => setMapType("roadmap")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
              mapType === "roadmap"
                ? "bg-white/[0.12] text-white border border-white/20 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
            title="Dark Tactical Vector Map"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Tactical</span>
          </button>
          <button
            onClick={() => setEngine("leaflet")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer text-slate-400 hover:text-white"
            title="Switch to Tactical Satellite GIS (Leaflet)"
          >
            <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Satellite GIS</span>
          </button>
        </div>

        {/* GIS Layers Dropdown (Rescuer & Admin) */}
        {mode !== "civilian" && (
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="p-2 rounded-xl bg-[#18191E]/95 backdrop-blur-md border border-white/[0.1] text-white hover:bg-white/[0.08] shadow-xl transition-colors cursor-pointer"
              title="Toggle GIS Overlays"
            >
              <Layers className="w-4 h-4 text-slate-300" />
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 top-11 w-52 rounded-xl bg-[#18191E] border border-white/[0.12] shadow-2xl p-3 text-xs text-white space-y-2 z-30">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-white/[0.08]">
                  GIS Map Layers
                </div>
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={layers.river}
                    onChange={(e) => setLayers((p) => ({ ...p, river: e.target.checked }))}
                    className="accent-emerald-500 rounded"
                  />
                  <span>River Flow Centerline</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={layers.inundation}
                    onChange={(e) => setLayers((p) => ({ ...p, inundation: e.target.checked }))}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Surge Flood Inundation</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={layers.glacialLake}
                    onChange={(e) => setLayers((p) => ({ ...p, glacialLake: e.target.checked }))}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Sentinel-2 Glacial Lakes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={layers.landslides}
                    onChange={(e) => setLayers((p) => ({ ...p, landslides: e.target.checked }))}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Landslide Hazard Zones</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={layers.distressBeacons}
                    onChange={(e) => setLayers((p) => ({ ...p, distressBeacons: e.target.checked }))}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Distress Beacons (SOS)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={layers.rescueBases}
                    onChange={(e) => setLayers((p) => ({ ...p, rescueBases: e.target.checked }))}
                    className="accent-emerald-500 rounded"
                  />
                  <span>SAR Helipads & Bases</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={layers.infrastructure}
                    onChange={(e) => setLayers((p) => ({ ...p, infrastructure: e.target.checked }))}
                    className="accent-emerald-500 rounded"
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
          className="p-2 rounded-xl bg-[#18191E]/95 backdrop-blur-md border border-white/[0.1] text-white hover:bg-white/[0.08] shadow-xl transition-colors cursor-pointer"
          title="Fit Corridor Bounds"
        >
          <Compass className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      {/* FLOATING BOTTOM RIGHT TACTICAL DOCK: GPS LOCATE & GOOGLE MAPS CONNECTION */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 pointer-events-auto">
        {/* GPS Locate Me Button */}
        {onLocateMe && (
          <button
            onClick={() => {
              onLocateMe();
              setLocateTrigger((p) => p + 1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18191E]/95 backdrop-blur-md border border-white/[0.1] text-xs font-semibold text-white hover:bg-white/[0.08] shadow-xl transition-colors cursor-pointer ${
              isLocating ? "animate-pulse text-emerald-400" : ""
            }`}
            title="Locate GPS position"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">GPS</span>
            {userPosition?.altitude && (
              <span className="text-[10px] font-mono text-slate-300 hidden md:inline">
                {Math.round(userPosition.altitude)}m
              </span>
            )}
          </button>
        )}

        {/* Google Maps API Key Config Pill */}
        <button
          onClick={() => setShowKeyModal(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md border transition-colors cursor-pointer shadow-xl ${
            hasValidGoogleKey
              ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60"
              : "bg-[#18191E] border-white/10 text-slate-400 hover:text-white"
          }`}
          title="Configure Google Maps API Key"
        >
          <Key className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">{hasValidGoogleKey ? "Google Maps Connected" : "Set Maps Key"}</span>
        </button>
      </div>

      {/* FLOATING BOTTOM CENTER: WATER SURGE SLIDER (ADMIN MODE ONLY) */}
      {showSurgeControls && onSurgeChange && (
        <div className="absolute bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-2 rounded-xl bg-[#18191E]/95 backdrop-blur-xl border border-white/[0.1] shadow-2xl text-xs text-white pointer-events-auto">
          <SlidersHorizontal className="w-4 h-4 text-slate-300" />
          <span className="font-semibold text-slate-400">Water Surge:</span>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={simulatedWaterRise}
            onChange={(e) => onSurgeChange(parseFloat(e.target.value))}
            className="w-28 sm:w-44 accent-white cursor-pointer"
          />
          <span className="font-mono font-bold text-white">+{simulatedWaterRise.toFixed(1)}m</span>
          <span className="text-[10px] text-slate-400 font-mono">(&plusmn;{lateralSurgeMeters}m spread)</span>
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
