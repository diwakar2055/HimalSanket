import React, { useState, useEffect, useRef } from "react";
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
} from "../data/hazardMapData";
import {
  Users,
  GraduationCap,
  HeartPulse,
  Route,
  AlertTriangle,
  Key,
  Layers,
  MapPin,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { ErrorBoundary } from "./ErrorBoundary";

interface GoogleHazardMapProps {
  corridor: CorridorConfig;
  assets: MapAsset[];
  selectedAsset: MapAsset | null;
  onSelectAsset: (asset: MapAsset | null) => void;
  activeLayers: {
    people: boolean;
    school: boolean;
    bridge: boolean;
    hospital: boolean;
    hazardZone: boolean;
  };
  simulatedWaterRise: number;
  getDynamicStatus: (asset: MapAsset) => "safe" | "advisory" | "critical";
  apiKey: string;
  onUpdateApiKey: (newKey: string) => void;
  onSwitchToSatelliteView: () => void;
}

// Controller to smoothly pan and zoom Google Maps when corridor or selection changes
function MapCameraController({
  corridor,
  selectedAsset,
}: {
  corridor: CorridorConfig;
  selectedAsset: MapAsset | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (selectedAsset) {
      map.panTo({ lat: selectedAsset.lat, lng: selectedAsset.lng });
      map.setZoom(Math.max(map.getZoom() || 12, 14));
    } else {
      map.panTo(corridor.center);
      map.setZoom(corridor.zoom);
    }
  }, [map, corridor, selectedAsset]);

  return null;
}

// River Path & Flood Hazard Buffer Overlays on Google Maps
function RiverAndHazardBuffer({
  riverPath,
  showBuffer,
  surgeLevel,
}: {
  riverPath: { lat: number; lng: number }[];
  showBuffer: boolean;
  surgeLevel: number;
}) {
  const map = useMap();
  const riverLineRef = useRef<google.maps.Polyline | null>(null);
  const bufferLineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || typeof google === "undefined" || !google.maps) return;

    // Clean up previous
    if (riverLineRef.current) riverLineRef.current.setMap(null);
    if (bufferLineRef.current) bufferLineRef.current.setMap(null);

    // Primary riverbed polyline (Cyan flow)
    const riverLine = new google.maps.Polyline({
      path: riverPath,
      geodesic: true,
      strokeColor: "#06b6d4",
      strokeOpacity: 0.9,
      strokeWeight: 4,
      map,
    });
    riverLineRef.current = riverLine;

    // Surge Buffer polyline (expands with surgeLevel)
    if (showBuffer) {
      const bufferWeight = Math.min(10 + surgeLevel * 9, 54);
      const bufferColor =
        surgeLevel > 3 ? "#ef4444" : surgeLevel > 1.5 ? "#f59e0b" : "#0284c7";
      const bufferOpacity = Math.min(0.22 + surgeLevel * 0.08, 0.65);

      const bufferLine = new google.maps.Polyline({
        path: riverPath,
        geodesic: true,
        strokeColor: bufferColor,
        strokeOpacity: bufferOpacity,
        strokeWeight: bufferWeight,
        map,
      });
      bufferLineRef.current = bufferLine;
    }

    return () => {
      if (riverLineRef.current) riverLineRef.current.setMap(null);
      if (bufferLineRef.current) bufferLineRef.current.setMap(null);
    };
  }, [map, riverPath, showBuffer, surgeLevel]);

  return null;
}

export function GoogleHazardMap({
  corridor,
  assets,
  selectedAsset,
  onSelectAsset,
  activeLayers,
  simulatedWaterRise,
  getDynamicStatus,
  apiKey,
  onUpdateApiKey,
  onSwitchToSatelliteView,
}: GoogleHazardMapProps) {
  const [mapType, setMapType] = useState<"satellite" | "terrain" | "hybrid" | "roadmap">("satellite");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInputValue, setKeyInputValue] = useState(apiKey);
  const [authFailed, setAuthFailed] = useState(false);

  const isMockKey = !apiKey || apiKey.includes("MOCK") || apiKey.includes("YOUR_");

  // Listen for Google Maps auth failure (e.g. invalid mock key)
  useEffect(() => {
    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      setAuthFailed(true);
      if (typeof prevAuthFailure === "function") prevAuthFailure();
    };
    return () => {
      (window as any).gm_authFailure = prevAuthFailure;
    };
  }, []);

  const getMarkerIcon = (type: MapAsset["type"]) => {
    switch (type) {
      case "people":
        return <Users className="w-3.5 h-3.5 text-amber-300" />;
      case "school":
        return <GraduationCap className="w-3.5 h-3.5 text-blue-300" />;
      case "bridge":
        return <Route className="w-3.5 h-3.5 text-rose-300" />;
      case "hospital":
        return <HeartPulse className="w-3.5 h-3.5 text-emerald-300" />;
    }
  };

  const getMarkerColor = (status: "safe" | "advisory" | "critical") => {
    switch (status) {
      case "critical":
        return {
          bg: "bg-red-500",
          border: "border-red-400",
          ring: "ring-red-400/50",
          shadow: "shadow-red-500/50",
        };
      case "advisory":
        return {
          bg: "bg-amber-500",
          border: "border-amber-400",
          ring: "ring-amber-400/40",
          shadow: "shadow-amber-500/40",
        };
      case "safe":
      default:
        return {
          bg: "bg-emerald-600",
          border: "border-emerald-400",
          ring: "ring-emerald-400/30",
          shadow: "shadow-emerald-600/30",
        };
    }
  };

  const handleSaveKey = () => {
    onUpdateApiKey(keyInputValue.trim());
    setShowKeyModal(false);
    setAuthFailed(false);
  };

  return (
    <div className="relative w-full h-full min-h-[580px] bg-[#0c141d] rounded-xl overflow-hidden flex flex-col border border-white/10">
      {/* Top Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none flex-wrap gap-2">
        {/* Map Type Switcher */}
        <div className="pointer-events-auto flex items-center bg-[#131d2a]/90 backdrop-blur-md p-1 rounded-lg border border-white/15 shadow-xl text-xs">
          {(["satellite", "terrain", "hybrid", "roadmap"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setMapType(type)}
              className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all cursor-pointer ${
                mapType === type
                  ? "bg-teal-600 text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* API Key Status Pill & Vector View Toggle */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => setShowKeyModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-md border transition-all cursor-pointer shadow-lg ${
              isMockKey
                ? "bg-amber-500/20 border-amber-500/40 text-amber-200 hover:bg-amber-500/30"
                : "bg-emerald-500/20 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30"
            }`}
            title="Configure Google Maps API Key"
          >
            <Key className="w-3.5 h-3.5" />
            {isMockKey ? "Using Mock Key (Click to set real key)" : "Google Maps Key Connected"}
          </button>

          <button
            onClick={onSwitchToSatelliteView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#131d2a]/90 border border-white/20 text-slate-200 hover:bg-white/10 transition-all cursor-pointer shadow-lg backdrop-blur-md"
            title="Switch to Live Satellite Map"
          >
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            Live Satellite Map
          </button>
        </div>
      </div>

      {/* Auth Failure / Mock Key Helper Banner */}
      {authFailed && (
        <div className="absolute top-16 left-4 right-4 z-20 bg-amber-950/90 border border-amber-500/50 p-3 rounded-lg shadow-2xl backdrop-blur-md flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Google Maps loaded with mock key.</strong> Satellite tiles may display development watermarks until a live Google Maps Platform API key is provided.
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowKeyModal(true)}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium cursor-pointer"
            >
              Enter API Key
            </button>
            <button
              onClick={onSwitchToSatelliteView}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded font-medium cursor-pointer"
            >
              Switch to Live Satellite Map
            </button>
          </div>
        </div>
      )}

      {/* Main Google Maps Viewport */}
      <div className="relative w-full flex-1">
        {isMockKey ? (
          <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#0e1726] to-[#070c14] text-center">
            <div className="max-w-md w-full bg-[#131d2a] p-6 rounded-2xl border border-white/15 shadow-2xl space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Google Maps API Key Required</h3>
                  <p className="text-[11px] text-slate-400">
                    Google Maps Platform strictly authenticates API keys.
                  </p>
                </div>
              </div>

              <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-200/90 leading-relaxed">
                A placeholder or mock key causes Google's servers to reject map initialization. You can enter your real Google Maps key below, or use our <strong>Live Satellite Map</strong> which works immediately with zero keys required!
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Enter Your Google Maps API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={keyInputValue}
                    onChange={(e) => setKeyInputValue(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#09101a] border border-white/20 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500 font-mono"
                  />
                  <button
                    onClick={handleSaveKey}
                    disabled={!keyInputValue.trim() || keyInputValue.includes("MOCK")}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Activate
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <button
                  onClick={onSwitchToSatelliteView}
                  className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-medium cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  View Live Satellite Map (Instant)
                </button>
                <a
                  href="https://console.cloud.google.com/google/maps-apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                >
                  <span>Google Cloud Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ) : (
          <ErrorBoundary
            fallback={
              <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#0e1726] text-center">
                <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
                <h3 className="text-base font-bold text-white mb-1">Google Maps Authentication Notice</h3>
                <p className="text-xs text-slate-400 max-w-md mb-4">
                  Google Maps could not authenticate with the current key. Please ensure "Maps JavaScript API" is enabled on your key in Google Cloud Console.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onSwitchToSatelliteView}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Switch to Live Satellite Map
                  </button>
                </div>
              </div>
            }
          >
            <APIProvider apiKey={apiKey}>
              <Map
                defaultCenter={corridor.center}
                defaultZoom={corridor.zoom}
                mapTypeId={mapType}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                style={{ width: "100%", height: "100%", position: "absolute" }}
                gestureHandling="greedy"
                streetViewControl={false}
                mapTypeControl={false}
                fullscreenControl={false}
                zoomControl={true}
              >
                <MapCameraController corridor={corridor} selectedAsset={selectedAsset} />

                {/* Riverbed Line & Surge Buffer */}
                <RiverAndHazardBuffer
                  riverPath={corridor.riverPath}
                  showBuffer={activeLayers.hazardZone}
                  surgeLevel={simulatedWaterRise}
                />

                {/* Asset Advanced Markers */}
                {assets.map((asset) => {
                  const status = getDynamicStatus(asset);
                  const colors = getMarkerColor(status);
                  const isSelected = selectedAsset?.id === asset.id;

                  return (
                    <AdvancedMarker
                      key={asset.id}
                      position={{ lat: asset.lat, lng: asset.lng }}
                      onClick={() => onSelectAsset(asset)}
                      title={asset.name}
                    >
                      <div
                        className={`relative cursor-pointer transition-transform duration-200 group ${
                          isSelected ? "scale-125 z-30" : "hover:scale-110 z-10"
                        }`}
                      >
                        {/* Pulsing ring for critical status */}
                        {status === "critical" && (
                          <span className="absolute -inset-1.5 rounded-full bg-red-500/50 animate-ping" />
                        )}

                        {/* Marker badge */}
                        <div
                          className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg ${colors.bg} ${colors.border} ${
                            isSelected ? "ring-4 ring-cyan-400" : ""
                          }`}
                        >
                          {getMarkerIcon(asset.type)}
                        </div>

                        {/* Compact Label */}
                        <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap border border-white/20 shadow-md opacity-90 group-hover:opacity-100 pointer-events-none">
                          {asset.name.split(" ")[0]}
                        </div>
                      </div>
                    </AdvancedMarker>
                  );
                })}

                {/* Info Window for Selected Asset */}
                {selectedAsset && (
                  <InfoWindow
                    position={{ lat: selectedAsset.lat, lng: selectedAsset.lng }}
                    onCloseClick={() => onSelectAsset(null)}
                  >
                    <div className="p-1 max-w-[260px] text-slate-900 font-sans">
                      <div className="flex items-center justify-between gap-1 mb-1 border-b pb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                          {selectedAsset.type}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            getDynamicStatus(selectedAsset) === "critical"
                              ? "bg-red-100 text-red-700"
                              : getDynamicStatus(selectedAsset) === "advisory"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {getDynamicStatus(selectedAsset)}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {selectedAsset.name}
                      </h4>
                      <div className="text-[11px] text-slate-600 mt-1 flex flex-col gap-0.5">
                        <div>
                          <strong>Elevation:</strong> {selectedAsset.elevation}m
                        </div>
                        <div>
                          <strong>GPS:</strong> {selectedAsset.gps}
                        </div>
                        {selectedAsset.population && (
                          <div>
                            <strong>Population:</strong> {selectedAsset.population} residents
                          </div>
                        )}
                        {selectedAsset.capacity && (
                          <div>
                            <strong>Capacity:</strong> {selectedAsset.capacity} individuals
                          </div>
                        )}
                        <div>
                          <strong>Flood Margin:</strong>{" "}
                          {Math.max(0, selectedAsset.hazardThresholdMeters - simulatedWaterRise).toFixed(1)}m remaining
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5 italic line-clamp-2">
                        {selectedAsset.riskNote}
                      </p>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          </ErrorBoundary>
        )}
      </div>

      {/* Attribution Footer */}
      <div className="bg-[#0b131e] px-4 py-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-teal-400" />
          <span>
            {corridor.name} ({corridor.region}) — {corridor.centerName}
          </span>
        </div>
        <div className="text-slate-500 text-[10px]">
          Google Maps Platform Satellite &amp; Terrain
        </div>
      </div>

      {/* Modal for setting/updating custom Google Maps API key */}
      {showKeyModal && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141e2b] border border-white/20 rounded-xl p-5 max-w-md w-full shadow-2xl text-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-teal-400" />
                Google Maps API Configuration
              </h3>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              You are currently using a <strong>mock development key</strong>. To render high-resolution Google Maps satellite imagery, mountain 3D relief, and official tiles without development watermarks, paste your personal Google Maps API key below:
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Google Maps API Key:
              </label>
              <input
                type="text"
                value={keyInputValue}
                onChange={(e) => setKeyInputValue(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#0d1520] border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setKeyInputValue("AIzaSy_MOCK_DEMO_KEY");
                  onUpdateApiKey("AIzaSy_MOCK_DEMO_KEY");
                  setShowKeyModal(false);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Reset to Mock Key
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveKey}
                  className="px-4 py-1.5 rounded-lg text-xs bg-teal-600 hover:bg-teal-500 font-semibold text-white cursor-pointer"
                >
                  Save &amp; Reload Map
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
