import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import L from "leaflet";
import {
  MapAsset,
  CorridorConfig,
  CORRIDOR_CONFIGS,
  CORRIDOR_SENTINEL_LAKES,
  CORRIDOR_LANDSLIDE_ZONES,
  CORRIDOR_LAKE_POLYGONS,
  CORRIDOR_RESCUE_BASES,
} from "../../data/hazardMapData";
import {
  generateGeodesicBufferPolygon,
  sampleRiverFlowVectors,
  isPointWithinBuffer,
  getDistanceMeters,
} from "../../utils/geoBuffer";
import {
  Layers,
  MapPin,
  Satellite,
  Compass,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Radio,
  Eye,
  Route,
  Users,
  GraduationCap,
  HeartPulse,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import { DistressBeacon } from "../../context/UserRoleContext";

interface FullScreenHazardMapProps {
  corridor: CorridorConfig;
  assets: MapAsset[];
  mode?: "civilian" | "rescuer" | "admin";
  selectedAsset?: MapAsset | null;
  onSelectAsset?: (asset: MapAsset | null) => void;
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

const TILE_SOURCES = {
  satellite: {
    name: "Satellite (Sentinel)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Sentinel-2/NASA",
    maxZoom: 18,
  },
  dark: {
    name: "Dark Tactical",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; CartoDB &copy; OpenStreetMap",
    maxZoom: 19,
  },
  topo: {
    name: "Topographic",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "Map: &copy; OpenTopoMap",
    maxZoom: 17,
  },
};

export function FullScreenHazardMap({
  corridor,
  assets,
  mode = "admin",
  selectedAsset,
  onSelectAsset,
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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const riverLayerRef = useRef<L.LayerGroup | null>(null);
  const inundationLayerRef = useRef<L.LayerGroup | null>(null);
  const flowVectorsLayerRef = useRef<L.LayerGroup | null>(null);
  const evacuationLayerRef = useRef<L.LayerGroup | null>(null);
  const landslidesLayerRef = useRef<L.LayerGroup | null>(null);
  const lakeLayerRef = useRef<L.LayerGroup | null>(null);
  const rescueBasesLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userGpsLayerRef = useRef<L.LayerGroup | null>(null);
  const distressLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapType, setMapType] = useState<"satellite" | "dark" | "topo">("dark");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Layer Toggles
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

  // Defensive corridor configuration fallback
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

  // Calculate dynamic surge buffer
  const lateralSurgeMeters = useMemo(() => {
    return Math.round(25 + simulatedWaterRise * 35);
  }, [simulatedWaterRise]);

  // Find closest safe haven for evacuation trajectory
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

  // 1. Initialize Map with HTML5 Canvas Renderer (preferCanvas: true for high FPS)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let resizeObserver: ResizeObserver | null = null;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [safeCorridor.center.lat, safeCorridor.center.lng],
        zoom: safeCorridor.zoom,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true, // Key optimization: Hardware-accelerated canvas
      });

      L.control.attribution({ position: "bottomright" }).addTo(map);

      // Add Base Tile Layer with keepBuffer to prevent flickering
      const source = TILE_SOURCES[mapType];
      tileLayerRef.current = L.tileLayer(source.url, {
        attribution: source.attribution,
        maxZoom: source.maxZoom,
        keepBuffer: 6,
        updateWhenIdle: true,
      }).addTo(map);

      // Initialize all layer groups
      riverLayerRef.current = L.layerGroup().addTo(map);
      inundationLayerRef.current = L.layerGroup().addTo(map);
      landslidesLayerRef.current = L.layerGroup().addTo(map);
      lakeLayerRef.current = L.layerGroup().addTo(map);
      flowVectorsLayerRef.current = L.layerGroup().addTo(map);
      evacuationLayerRef.current = L.layerGroup().addTo(map);
      rescueBasesLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      userGpsLayerRef.current = L.layerGroup().addTo(map);
      distressLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;

      // Fit corridor bounds immediately
      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Change Tile Source
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);

    const source = TILE_SOURCES[mapType];
    tileLayerRef.current = L.tileLayer(source.url, {
      attribution: source.attribution,
      maxZoom: source.maxZoom,
      keepBuffer: 6,
      updateWhenIdle: true,
    }).addTo(map);
  }, [mapType]);

  // 3. Pan to corridor when corridor changes
  const fitBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const points: [number, number][] = (safeCorridor.riverPath || []).map((p) => [p.lat, p.lng]);
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
    }
  }, [safeCorridor]);

  useEffect(() => {
    fitBounds();
  }, [safeCorridor, fitBounds]);

  // 4. Render River & Inundation Buffer (Canvas)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const rLayer = riverLayerRef.current;
    const iLayer = inundationLayerRef.current;
    if (!map || !rLayer || !iLayer) return;

    rLayer.clearLayers();
    iLayer.clearLayers();

    if (!layers.river) return;

    const latLngs = (safeCorridor.riverPath || []).map((p) => [p.lat, p.lng] as [number, number]);

    // River centerline
    const riverLine = L.polyline(latLngs, {
      color: "#00f0ff",
      weight: 3.5,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round",
    });
    rLayer.addLayer(riverLine);

    // Lateral Inundation Buffer (Calculated smoothly)
    if (layers.inundation && simulatedWaterRise > 0) {
      const isCritical = simulatedWaterRise >= 2.0;
      const color = isCritical ? "#ef4444" : "#f59e0b";
      const polyCoords = generateGeodesicBufferPolygon(safeCorridor.riverPath || [], lateralSurgeMeters);
      if (polyCoords.length > 2) {
        const poly = L.polygon(polyCoords, {
          color,
          weight: 2,
          opacity: 0.8,
          fillColor: color,
          fillOpacity: 0.35,
          dashArray: isCritical ? "4, 4" : undefined,
        });
        iLayer.addLayer(poly);
      }
    }
  }, [safeCorridor, layers.river, layers.inundation, simulatedWaterRise, lateralSurgeMeters]);

  // 5. Render Glacial Lake Mask
  useEffect(() => {
    const layer = lakeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!layers.glacialLake) return;

    const lakeGeo = CORRIDOR_LAKE_POLYGONS[safeCorridor.id];
    if (lakeGeo) {
      const basePoly = L.polygon(lakeGeo.baselinePolygon, {
        color: "#0284c7",
        weight: 2,
        fillColor: "#0284c7",
        fillOpacity: 0.5,
      });
      basePoly.bindPopup(`<b>${lakeGeo.name}</b><br/>Sentinel-2 Reference Shoreline`);
      layer.addLayer(basePoly);

      const expandedPoly = L.polygon(lakeGeo.expandedPolygon, {
        color: "#f43f5e",
        weight: 2,
        dashArray: "4, 4",
        fillColor: "#f43f5e",
        fillOpacity: 0.3,
      });
      expandedPoly.bindPopup(`<b>🚨 Lake Surge Expansion (+${lakeGeo.expansionDeltaPct}%)</b>`);
      layer.addLayer(expandedPoly);
    }
  }, [safeCorridor, layers.glacialLake]);

  // 6. Render Landslide Zones (Admin mode)
  useEffect(() => {
    const layer = landslidesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!layers.landslides || mode === "civilian") return;

    const zones = CORRIDOR_LANDSLIDE_ZONES[safeCorridor.id] || [];
    zones.forEach((zone) => {
      const color = zone.severity === "critical" ? "#ef4444" : "#f97316";
      const poly = L.polygon(zone.polygon, {
        color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.28,
        dashArray: "3, 3",
      });
      poly.bindPopup(`<b>⚠️ ${zone.name}</b><br/>${zone.description}`);
      layer.addLayer(poly);
    });
  }, [safeCorridor, layers.landslides, mode]);

  // 7. Render Search & Rescue Bases (Rescuer / Admin)
  useEffect(() => {
    const layer = rescueBasesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!layers.rescueBases || mode === "civilian") return;

    const bases = CORRIDOR_RESCUE_BASES[safeCorridor.id] || [];
    bases.forEach((base) => {
      const iconHtml = `
        <div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#10b981;border:2px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.5);color:#fff;cursor:pointer;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5 2 7.5-6.5-5-6.5 5 2-7.5-5.5-4.5h7z"/></svg>
        </div>
      `;
      const marker = L.marker([base.lat, base.lng], {
        icon: L.divIcon({ html: iconHtml, iconSize: [28, 28], iconAnchor: [14, 14], className: "" }),
      });
      marker.bindPopup(`<b>🚁 ${base.name}</b><br/>Heli flight: ~${base.heliFlightMin} mins<br/>Phone: ${base.contact}`);
      layer.addLayer(marker);
    });
  }, [safeCorridor, layers.rescueBases, mode]);

  // 8. Render Distress Beacons (Rescuer & Admin)
  useEffect(() => {
    const layer = distressLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!layers.distressBeacons) return;

    distressBeacons.forEach((beacon) => {
      const isCritical = beacon.priority >= 90;
      const color = beacon.status === "rescued" ? "#10b981" : isCritical ? "#ef4444" : "#f97316";

      const iconHtml = `
        <div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
          ${beacon.status !== "rescued" ? `<div style="position:absolute;inset:-6px;border-radius:9999px;background:${color};opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ""}
          <div style="width:28px;height:28px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 0 14px ${color};display:flex;align-items:center;justify-content:center;color:#fff;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z"/></svg>
          </div>
        </div>
      `;

      const marker = L.marker([beacon.lat, beacon.lng], {
        icon: L.divIcon({ html: iconHtml, iconSize: [34, 34], iconAnchor: [17, 17], className: "" }),
      });

      marker.on("click", () => {
        if (onSelectBeacon) onSelectBeacon(beacon);
      });

      marker.bindPopup(`
        <div style="font-family:system-ui;font-size:12px;padding:4px;">
          <b style="color:${color};font-size:13px;">🚨 ${beacon.name}</b><br/>
          Priority: <b>${beacon.priority}% Triage Urgency</b><br/>
          Status: <b style="text-transform:uppercase;">${beacon.status}</b><br/>
          <p style="margin-top:4px;font-size:11px;color:#334155;">${beacon.detail}</p>
        </div>
      `);

      layer.addLayer(marker);
    });
  }, [distressBeacons, layers.distressBeacons, onSelectBeacon]);

  // 9. Render Infrastructure Assets
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!layers.infrastructure && mode !== "civilian") return;

    // In civilian mode: only render safe zones to avoid cognitive overload
    const filteredAssets = mode === "civilian" ? assets.filter((a) => a.type === "safeZone") : assets;

    filteredAssets.forEach((asset) => {
      const isSelected = selectedAsset?.id === asset.id;
      const isSafe = asset.type === "safeZone";
      const color = isSafe ? "#10b981" : "#0284c7";

      const iconHtml = `
        <div style="width:24px;height:24px;border-radius:${isSafe ? "9999px" : "6px"};background:${color};border:2px solid ${isSelected ? "#38bdf8" : "#ffffff"};box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;">
          ${isSafe ? "🛡️" : "📍"}
        </div>
      `;

      const marker = L.marker([asset.lat, asset.lng], {
        icon: L.divIcon({ html: iconHtml, iconSize: [24, 24], iconAnchor: [12, 12], className: "" }),
      });

      marker.on("click", () => {
        if (onSelectAsset) onSelectAsset(asset);
      });

      marker.bindPopup(`<b>${asset.name}</b> (${asset.elevation}m)<br/>${asset.description}`);
      layer.addLayer(marker);
    });
  }, [assets, selectedAsset, layers.infrastructure, mode, onSelectAsset]);

  // 10. Render Trekker Location & Uphill Evacuation Path
  useEffect(() => {
    const uLayer = userGpsLayerRef.current;
    const eLayer = evacuationLayerRef.current;
    if (!uLayer || !eLayer) return;

    uLayer.clearLayers();
    eLayer.clearLayers();

    if (!userPosition) return;

    // Trekker GPS Marker
    const userHtml = `
      <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:9999px;background:#0284c7;opacity:0.35;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width:24px;height:24px;border-radius:9999px;background:#0284c7;border:3px solid #fff;box-shadow:0 0 12px #0284c7;display:flex;align-items:center;justify-content:center;color:#fff;">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m-10-10h2m16 0h2"/></svg>
        </div>
      </div>
    `;

    const uMarker = L.marker([userPosition.lat, userPosition.lng], {
      icon: L.divIcon({ html: userHtml, iconSize: [36, 36], iconAnchor: [18, 18], className: "" }),
    });
    uMarker.bindPopup(`<b>📍 Your Location</b><br/>Altitude: ~${Math.round(userPosition.altitude || 2780)}m ASL`);
    uLayer.addLayer(uMarker);

    // Evacuation Line to Nearest Safe Zone
    if (layers.evacuationRoutes && nearestSafeZone) {
      const line = L.polyline(
        [
          [userPosition.lat, userPosition.lng],
          [nearestSafeZone.asset.lat, nearestSafeZone.asset.lng],
        ],
        {
          color: "#10b981",
          weight: 3,
          opacity: 0.9,
          dashArray: "6, 6",
        }
      );
      line.bindPopup(`<b>🏃 Recommended High-Ground Refuge Path</b><br/>To: ${nearestSafeZone.asset.name} (${nearestSafeZone.distanceMeters}m away)`);
      eLayer.addLayer(line);
    }
  }, [userPosition, nearestSafeZone, layers.evacuationRoutes]);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none ${className}`}>
      {/* The Leaflet Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-[#0A1224]" />

      {/* Floating Glassmorphism HUD Controls (Top Left: Corridor & Hazard Status) */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F1B33]/85 backdrop-blur-md border border-[#2A3B5E] shadow-xl text-xs text-white">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold tracking-wide">{safeCorridor.name}</span>
          <span className="text-[#94A3B8]">({safeCorridor.region})</span>
          {geofenceStatus && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                geofenceStatus === "DANGER"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {geofenceStatus === "DANGER" ? "⚠️ Danger Zone" : "🟢 Safe Haven"}
            </span>
          )}
        </div>

        {/* Distance Indicator Banner (If user is near river) */}
        {distanceToHazard !== null && distanceToHazard !== undefined && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0F1B33]/80 backdrop-blur-md border border-[#2A3B5E] text-[11px] text-[#94A3B8]">
            <Compass className="w-3 h-3 text-cyan-400" />
            <span>Hazard Distance:</span>
            <strong className="text-white">{distanceToHazard}m</strong>
          </div>
        )}
      </div>

      {/* Floating Top Right: Map Styles, Layers, & Re-center */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {/* Map Type Switcher */}
        <div className="flex items-center bg-[#0F1B33]/85 backdrop-blur-md border border-[#2A3B5E] rounded-xl p-1 shadow-xl">
          <button
            onClick={() => setMapType("dark")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              mapType === "dark" ? "bg-cyan-600 text-white shadow" : "text-[#94A3B8] hover:text-white"
            }`}
          >
            Tactical
          </button>
          <button
            onClick={() => setMapType("satellite")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              mapType === "satellite" ? "bg-cyan-600 text-white shadow" : "text-[#94A3B8] hover:text-white"
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapType("topo")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              mapType === "topo" ? "bg-cyan-600 text-white shadow" : "text-[#94A3B8] hover:text-white"
            }`}
          >
            Topo
          </button>
        </div>

        {/* Layer Toggle Menu (For Rescuer and Admin) */}
        {mode !== "civilian" && (
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="p-2 rounded-xl bg-[#0F1B33]/85 backdrop-blur-md border border-[#2A3B5E] text-white hover:bg-[#1C2C4C] shadow-xl transition-all cursor-pointer"
              title="Toggle GIS Layers"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 top-10 w-48 rounded-xl bg-[#0F1B33]/95 backdrop-blur-xl border border-[#2A3B5E] shadow-2xl p-2.5 text-xs text-white space-y-1.5 z-20">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] pb-1 border-b border-[#2A3B5E]">
                  Spatial Overlays
                </div>
                <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-300">
                  <input
                    type="checkbox"
                    checked={layers.river}
                    onChange={(e) => setLayers((p) => ({ ...p, river: e.target.checked }))}
                    className="accent-cyan-500 rounded"
                  />
                  <span>River Centerline</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-300">
                  <input
                    type="checkbox"
                    checked={layers.inundation}
                    onChange={(e) => setLayers((p) => ({ ...p, inundation: e.target.checked }))}
                    className="accent-cyan-500 rounded"
                  />
                  <span>Surge Inundation Buffer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-300">
                  <input
                    type="checkbox"
                    checked={layers.glacialLake}
                    onChange={(e) => setLayers((p) => ({ ...p, glacialLake: e.target.checked }))}
                    className="accent-cyan-500 rounded"
                  />
                  <span>Sentinel-2 Glacial Lake</span>
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
                  <span>SOS Distress Beacons</span>
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
                  <span>Infrastructure Assets</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Re-center Corridor */}
        <button
          onClick={fitBounds}
          className="p-2 rounded-xl bg-[#0F1B33]/85 backdrop-blur-md border border-[#2A3B5E] text-white hover:bg-[#1C2C4C] shadow-xl transition-all cursor-pointer"
          title="Fit Corridor Bounds"
        >
          <Compass className="w-4 h-4 text-cyan-400" />
        </button>

        {/* Locate User */}
        {onLocateMe && (
          <button
            onClick={onLocateMe}
            className={`p-2 rounded-xl bg-[#0F1B33]/85 backdrop-blur-md border border-[#2A3B5E] text-white hover:bg-[#1C2C4C] shadow-xl transition-all cursor-pointer ${
              isLocating ? "animate-spin" : ""
            }`}
            title="Locate Device GPS"
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
          </button>
        )}
      </div>

      {/* Floating Bottom Center: Surge Inundation Slider (Admin Mode Only) */}
      {showSurgeControls && onSurgeChange && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#0F1B33]/90 backdrop-blur-xl border border-[#2A3B5E] shadow-2xl text-xs text-white">
          <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-[#94A3B8]">Water Surge:</span>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={simulatedWaterRise}
            onChange={(e) => onSurgeChange(parseFloat(e.target.value))}
            className="w-28 sm:w-40 accent-cyan-400 cursor-pointer"
          />
          <span className="font-mono font-bold text-cyan-300">+{simulatedWaterRise.toFixed(1)}m</span>
          <span className="text-[10px] text-[#94A3B8] font-mono">(&plusmn;{lateralSurgeMeters}m spread)</span>
        </div>
      )}
    </div>
  );
}
