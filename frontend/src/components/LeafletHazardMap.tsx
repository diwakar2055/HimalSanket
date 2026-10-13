import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import L from "leaflet";
import {
  MapAsset,
  CorridorConfig,
  CORRIDOR_SENTINEL_LAKES,
  CORRIDOR_LANDSLIDE_ZONES,
  CORRIDOR_LAKE_POLYGONS,
  CORRIDOR_RESCUE_BASES,
  CORRIDOR_WEATHER_STATIONS,
} from "../data/hazardMapData";
import {
  generateGeodesicBufferPolygon,
  sampleRiverFlowVectors,
  isPointWithinBuffer,
  getDistanceMeters,
} from "../utils/geoBuffer";
import {
  Key,
  Layers,
  MapPin,
  Globe2,
  Activity,
  Satellite,
  Waves,
  Navigation,
  AlertTriangle,
  Shield,
  Radio,
  Maximize2,
  Minimize2,
  Compass,
  ArrowRight,
  TrendingDown,
  Eye,
  Crosshair,
} from "lucide-react";

interface LeafletHazardMapProps {
  corridor: CorridorConfig;
  assets: MapAsset[];
  selectedAsset: MapAsset | null;
  onSelectAsset: (asset: MapAsset | null) => void;
  activeLayers: {
    people: boolean;
    school: boolean;
    bridge: boolean;
    hospital: boolean;
    dam?: boolean;
    safeZone?: boolean;
    hazardZone: boolean;
  };
  simulatedWaterRise: number;
  getDynamicStatus: (asset: MapAsset) => "safe" | "advisory" | "critical";
  onSwitchToGoogleView?: () => void;
  onOpenKeyModal?: () => void;
  hasGoogleKey?: boolean;
  className?: string;
  // Live Sensing & Presentation props
  seismicMagnitude?: number;
  seismicEpicenter?: { lat: number; lng: number; label: string; depth_km?: number } | null;
  lakeAreaChangePct?: number;
  onInspectSentinelLake?: () => void;
  // Live Trekker Geolocation & SOS Distress tracking
  userPosition?: { lat: number; lng: number; accuracy?: number; altitude?: number } | null;
  sosDistresses?: Array<{
    id: string | number;
    name: string;
    lat: number;
    lng: number;
    detail: string;
    priority: number;
    time?: string;
  }>;
  onLocateMe?: () => void;
  isLocating?: boolean;
}

// Crisp Vector SVG Icon Generators for Infrastructure Types
function getAssetSvg(type: string): string {
  switch (type) {
    case "bridge":
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V7l8-4 8 4v12" /><path d="M4 14h16" /><path d="M9 14v5" /><path d="M15 14v5" /><path d="M2 19h20" /></svg>`;
    case "school":
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>`;
    case "hospital":
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>`;
    case "dam":
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 6v12M12 6v12M17 6v12" /></svg>`;
    case "safeZone":
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>`;
    case "people":
    default:
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V9l7-5 7 5v12" /><path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" /></svg>`;
  }
}

export function LeafletHazardMap({
  corridor,
  assets,
  selectedAsset,
  onSelectAsset,
  activeLayers,
  simulatedWaterRise,
  getDynamicStatus,
  onSwitchToGoogleView,
  onOpenKeyModal,
  hasGoogleKey = false,
  className = "",
  seismicMagnitude,
  seismicEpicenter,
  lakeAreaChangePct,
  onInspectSentinelLake,
  userPosition,
  sosDistresses = [],
  onLocateMe,
  isLocating = false,
}: LeafletHazardMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Dedicated Layer Groups for granular spatial management
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const landslidesLayerRef = useRef<L.LayerGroup | null>(null);
  const lakeMaskLayerRef = useRef<L.LayerGroup | null>(null);
  const inundationLayerRef = useRef<L.LayerGroup | null>(null);
  const flowVectorsLayerRef = useRef<L.LayerGroup | null>(null);
  const evacuationLayerRef = useRef<L.LayerGroup | null>(null);
  const rescueBasesLayerRef = useRef<L.LayerGroup | null>(null);
  const userGpsLayerRef = useRef<L.LayerGroup | null>(null);
  const sosLayerRef = useRef<L.LayerGroup | null>(null);

  const riverPolylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapType, setMapType] = useState<"satellite" | "topo" | "street">("satellite");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Spatial polygon toggle state
  const [showLandslides, setShowLandslides] = useState(true);
  const [showLakeMask, setShowLakeMask] = useState(true);
  const [showInundationBuffer, setShowInundationBuffer] = useState(true);
  const [showFlowVectors, setShowFlowVectors] = useState(true);
  const [showEvacuationRoutes, setShowEvacuationRoutes] = useState(true);
  const [showRescueBases, setShowRescueBases] = useState(true);

  // Tile layer URLs
  const tileSources = {
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri &mdash; Sentinel/NASA/USGS",
      maxZoom: 18,
    },
    topo: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: 'Map: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      maxZoom: 17,
    },
    street: {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    },
  };

  // Real-time calculation of lateral inundation half-width in true physical meters
  const lateralSurgeHalfWidthMeters = useMemo(() => {
    return Math.round(25 + simulatedWaterRise * 35);
  }, [simulatedWaterRise]);

  // Real-time count of assets submerged or threatened within active surge buffer
  const submergedAssetsCount = useMemo(() => {
    if (simulatedWaterRise <= 0) return 0;
    return assets.filter((asset) => {
      const { isWithin } = isPointWithinBuffer(
        { lat: asset.lat, lng: asset.lng },
        corridor.riverPath,
        lateralSurgeHalfWidthMeters
      );
      return isWithin;
    }).length;
  }, [assets, corridor.riverPath, lateralSurgeHalfWidthMeters, simulatedWaterRise]);

  // Center corridor with auto-framing bounding box encompassing lake, river, and assets
  const fitCorridorExtent = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const allPoints: [number, number][] = [];
    corridor.riverPath.forEach((p) => allPoints.push([p.lat, p.lng]));
    assets.forEach((a) => allPoints.push([a.lat, a.lng]));
    const lake = CORRIDOR_LAKE_POLYGONS[corridor.id];
    if (lake) {
      lake.baselinePolygon.forEach((p) => allPoints.push(p));
    }

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 13, animate: true });
    } else {
      map.setView([corridor.center.lat, corridor.center.lng], corridor.zoom, { animate: true });
    }
  }, [corridor, assets]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let resizeObserver: ResizeObserver | null = null;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [corridor.center.lat, corridor.center.lng],
        zoom: corridor.zoom,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.attribution({ position: "bottomright" }).addTo(map);
      L.control.zoom({ position: "topright" }).addTo(map);

      const source = tileSources[mapType];
      tileLayerRef.current = L.tileLayer(source.url, {
        attribution: source.attribution,
        maxZoom: source.maxZoom,
      }).addTo(map);

      // Create and attach all spatial layer groups
      inundationLayerRef.current = L.layerGroup().addTo(map);
      flowVectorsLayerRef.current = L.layerGroup().addTo(map);
      evacuationLayerRef.current = L.layerGroup().addTo(map);
      landslidesLayerRef.current = L.layerGroup().addTo(map);
      lakeMaskLayerRef.current = L.layerGroup().addTo(map);
      rescueBasesLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      userGpsLayerRef.current = L.layerGroup().addTo(map);
      sosLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;

      setTimeout(() => map.invalidateSize(), 150);

      resizeObserver = new ResizeObserver(() => map.invalidateSize());
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

    const source = tileSources[mapType];
    tileLayerRef.current = L.tileLayer(source.url, {
      attribution: source.attribution,
      maxZoom: source.maxZoom,
    }).addTo(map);
  }, [mapType]);

  // 3. Pan / Zoom / Fit Bounds when Corridor changes
  useEffect(() => {
    fitCorridorExtent();
  }, [corridor, fitCorridorExtent]);

  // 4. Render River Path & Meter-Accurate Geodesic Inundation Polygon Surfaces
  useEffect(() => {
    const map = mapInstanceRef.current;
    const inundationGroup = inundationLayerRef.current;
    if (!map || !inundationGroup) return;

    if (riverPolylineRef.current) map.removeLayer(riverPolylineRef.current);
    inundationGroup.clearLayers();

    const latLngs = corridor.riverPath.map((p) => [p.lat, p.lng] as [number, number]);

    // Meter-Accurate Geodesic Lateral Inundation Surface (scales with physical ground geometry)
    if (showInundationBuffer && simulatedWaterRise > 0) {
      const isCritical = simulatedWaterRise >= 2.0;
      const isElevated = simulatedWaterRise >= 1.0;

      const bufferColor = isCritical ? "#dc2626" : isElevated ? "#f59e0b" : "#0284c7";
      const bufferFillOpacity = Math.min(0.24 + simulatedWaterRise * 0.12, 0.65);

      // Outer Lateral Surge Inundation Polygon
      const surgePolyCoords = generateGeodesicBufferPolygon(
        corridor.riverPath,
        lateralSurgeHalfWidthMeters
      );

      if (surgePolyCoords.length > 2) {
        const surgePolygon = L.polygon(surgePolyCoords, {
          color: bufferColor,
          weight: 2,
          opacity: 0.9,
          fillColor: bufferColor,
          fillOpacity: bufferFillOpacity,
          dashArray: isCritical ? "5, 5" : undefined,
        });

        surgePolygon.bindPopup(`
          <div style="font-family: system-ui; padding: 6px; font-size: 12px; color: #0f172a; max-width: 250px;">
            <div style="font-weight: 800; color: ${bufferColor}; font-size: 13px; display: flex; align-items: center; gap: 4px;">
              ⚠️ Meter-Accurate Inundation Buffer Zone
            </div>
            <div style="margin-top: 5px; font-size: 11px; line-height: 1.4;">
              Simulated River Surge: <b>+${simulatedWaterRise.toFixed(1)}m</b> above baseline<br/>
              Lateral Spread: <b>&plusmn;${lateralSurgeHalfWidthMeters}m</b> (Total Corridor: <b>${lateralSurgeHalfWidthMeters * 2}m</b>)<br/>
              Submerged Infrastructure: <b style="color: ${isCritical ? '#dc2626' : '#ea580c'};">${submergedAssetsCount} assets in hazard zone</b>
            </div>
            <div style="margin-top: 6px; font-size: 10px; color: #475569; border-top: 1px solid #e2e8f0; pt-1;">
              <i>True geodesic surface calculated from river channel coordinates. Scales dynamically across all zoom levels.</i>
            </div>
          </div>
        `);

        inundationGroup.addLayer(surgePolygon);
      }

      // High-Velocity Core Torrent Inundation Bed (~16m width)
      const corePolyCoords = generateGeodesicBufferPolygon(corridor.riverPath, 16);
      if (corePolyCoords.length > 2) {
        const corePolygon = L.polygon(corePolyCoords, {
          color: isCritical ? "#7f1d1d" : "#0891b2",
          weight: 1.5,
          opacity: 0.95,
          fillColor: isCritical ? "#ef4444" : "#06b6d4",
          fillOpacity: 0.5,
        });
        inundationGroup.addLayer(corePolygon);
      }
    }

    // High-Resolution River Centerline
    riverPolylineRef.current = L.polyline(latLngs, {
      color: "#06b6d4",
      weight: 3.5,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
  }, [corridor, showInundationBuffer, simulatedWaterRise, lateralSurgeHalfWidthMeters, submergedAssetsCount]);

  // 5. Render Downstream River Flow Direction Chevrons (Downhill Water Velocity Trajectory)
  useEffect(() => {
    const layer = flowVectorsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showFlowVectors) return;

    // Sample downstream flow vectors spaced every ~650m
    const vectors = sampleRiverFlowVectors(corridor.riverPath, 650);
    const isSurging = simulatedWaterRise > 0;
    const arrowColor = simulatedWaterRise >= 2.0 ? "#f87171" : simulatedWaterRise >= 1.0 ? "#fbbf24" : "#38bdf8";

    vectors.forEach((vec, idx) => {
      const arrowHtml = `
        <div style="
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${vec.bearing}deg);
          cursor: pointer;
        ">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="${arrowColor}" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));">
            <path d="M12 2L19 12H14V22H10V12H5L12 2Z" />
          </svg>
        </div>
      `;

      const marker = L.marker([vec.lat, vec.lng], {
        icon: L.divIcon({
          className: "himal-flow-arrow",
          html: arrowHtml,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      });

      marker.bindPopup(`
        <div style="font-family: system-ui; font-size: 11px; color: #0f172a; padding: 4px;">
          <b style="color: ${arrowColor};">🌊 Downstream River Flow Vector</b><br/>
          Compass Bearing: <b>${Math.round(vec.bearing)}° True North</b><br/>
          Channel Gradient: <b>Rapid Downhill Drainage</b><br/>
          <i>Flood waves and debris trajectories travel along this vector.</i>
        </div>
      `);

      layer.addLayer(marker);
    });
  }, [corridor, showFlowVectors, simulatedWaterRise]);

  // 6. Render Safe Zone Evacuation Escape Vectors (Uphill Refuge Trajectories)
  useEffect(() => {
    const layer = evacuationLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showEvacuationRoutes) return;

    const safeZones = assets.filter((a) => a.type === "safeZone");
    if (safeZones.length === 0) return;

    // For assets that are in critical status or within the active surge buffer, draw escape routes to nearest safe zone
    assets.forEach((asset) => {
      if (asset.type === "safeZone") return;

      const dynamicStatus = getDynamicStatus(asset);
      const { isWithin } = isPointWithinBuffer(
        { lat: asset.lat, lng: asset.lng },
        corridor.riverPath,
        lateralSurgeHalfWidthMeters
      );

      const needsEvac = dynamicStatus === "critical" || (isWithin && simulatedWaterRise > 0);
      if (!needsEvac) return;

      // Find closest safe zone
      let closestSafe: MapAsset = safeZones[0];
      let minDistance = Infinity;

      safeZones.forEach((sz) => {
        const d = getDistanceMeters({ lat: asset.lat, lng: asset.lng }, { lat: sz.lat, lng: sz.lng });
        if (d < minDistance) {
          minDistance = d;
          closestSafe = sz;
        }
      });

      // Render dashed emerald escape trajectory line
      const escapeLine = L.polyline(
        [
          [asset.lat, asset.lng],
          [closestSafe.lat, closestSafe.lng],
        ],
        {
          color: "#10b981",
          weight: 2.5,
          opacity: 0.85,
          dashArray: "6, 6",
        }
      );

      escapeLine.bindPopup(`
        <div style="font-family: system-ui; font-size: 11px; color: #0f172a; padding: 4px; max-width: 240px;">
          <b style="color: #059669; font-size: 12px;">🏃 Recommended Uphill Evacuation Path</b><br/>
          From: <b>${asset.name}</b><br/>
          To Safe Refuge: <b>${closestSafe.name}</b><br/>
          Elevation Gain: <b>+${Math.max(0, closestSafe.elevation - asset.elevation)}m uphill</b><br/>
          Distance: <b>~${Math.round(minDistance)}m along trail</b>
        </div>
      `);

      layer.addLayer(escapeLine);
    });
  }, [assets, corridor, showEvacuationRoutes, simulatedWaterRise, lateralSurgeHalfWidthMeters, getDynamicStatus]);

  // 7. Render Predicted Landslide Hazard Polygons
  useEffect(() => {
    const layer = landslidesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showLandslides) return;

    const zones = CORRIDOR_LANDSLIDE_ZONES[corridor.id] || [];
    zones.forEach((zone) => {
      const isCrit = zone.severity === "critical";
      const isHigh = zone.severity === "high";

      const fillColor = isCrit ? "#dc2626" : isHigh ? "#ea580c" : "#f59e0b";
      const fillOpacity = isCrit ? 0.38 : isHigh ? 0.32 : 0.25;

      const polygon = L.polygon(zone.polygon, {
        color: fillColor,
        weight: 2,
        dashArray: "4, 4",
        fillColor,
        fillOpacity,
      });

      polygon.bindPopup(`
        <div style="font-family: system-ui; padding: 6px; font-size: 12px; color: #0f172a; max-width: 220px;">
          <div style="font-weight: 700; color: ${fillColor}; display: flex; align-items: center; gap: 4px;">
            ⚠️ ${zone.name}
          </div>
          <div style="margin-top: 4px; font-size: 11px;">
            Slope Angle: <b>${zone.slopeDegrees}° Incline</b><br/>
            Soil Moisture: <b>${zone.soilMoistureVwcPct}% VWC</b><br/>
            Severity: <b style="text-transform: uppercase;">${zone.severity} RISK</b>
          </div>
          <div style="margin-top: 6px; font-size: 10px; color: #475569; line-height: 1.3;">
            ${zone.description}
          </div>
        </div>
      `);

      layer.addLayer(polygon);
    });
  }, [corridor, showLandslides]);

  // 8. Render Glacial Lake Mask (Baseline vs Expanding Boundary & Moraine Outflow)
  useEffect(() => {
    const layer = lakeMaskLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showLakeMask) return;

    const lakeGeo = CORRIDOR_LAKE_POLYGONS[corridor.id];
    if (lakeGeo) {
      // Baseline Shoreline Polygon (Cyan)
      const basePolygon = L.polygon(lakeGeo.baselinePolygon, {
        color: "#0284c7",
        weight: 2.2,
        fillColor: "#0284c7",
        fillOpacity: 0.5,
      });
      basePolygon.bindPopup(`
        <div style="font-family: system-ui; font-size: 12px; color: #0f172a; padding: 4px;">
          <b style="color: #0284c7; font-size: 13px;">${lakeGeo.name}</b><br/>
          Baseline Water Mask: <b>Sentinel-2 NDWI Level-2A Reference</b><br/>
          Status: <b>Glacial meltwater lake feeding downstream riverhead</b>
        </div>
      `);
      layer.addLayer(basePolygon);

      // Expanding Water Mask Boundary (Red Strobe Border)
      const expandedPolygon = L.polygon(lakeGeo.expandedPolygon, {
        color: "#ef4444",
        weight: 2.5,
        dashArray: "5, 5",
        fillColor: "#dc2626",
        fillOpacity: 0.28,
      });
      expandedPolygon.bindPopup(`
        <div style="font-family: system-ui; font-size: 12px; color: #0f172a; padding: 4px;">
          <b style="color: #dc2626; font-size: 13px;">🚨 Expanding Lake Area (+${lakeGeo.expansionDeltaPct}%)</b><br/>
          Supraglacial meltwater surge pushing on natural moraine dam wall.<br/>
          GLOF breach hazard evaluated continuously.
        </div>
      `);
      layer.addLayer(expandedPolygon);
    }
  }, [corridor, showLakeMask]);

  // 9. Render Search & Rescue Bases (APF / Nepal Army / Ranger)
  useEffect(() => {
    const layer = rescueBasesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showRescueBases) return;

    const bases = CORRIDOR_RESCUE_BASES[corridor.id] || [];
    bases.forEach((base) => {
      const isArmy = base.agency === "Nepal Army";
      const isApf = base.agency === "APF";
      const color = isArmy ? "#16a34a" : isApf ? "#2563eb" : "#d97706";

      const iconHtml = `
        <div style="position: relative; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <div style="width: 28px; height: 28px; border-radius: 8px; background: ${color}; border: 2px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5 2 7.5-6.5-5-6.5 5 2-7.5-5.5-4.5h7z"/></svg>
          </div>
          <div style="position: absolute; top: 32px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.9); color: #ffffff; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 3px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2);">
            ${base.agency}
          </div>
        </div>
      `;

      const marker = L.marker([base.lat, base.lng], {
        icon: L.divIcon({ className: "himal-sar-base", html: iconHtml, iconSize: [32, 32], iconAnchor: [16, 16] }),
      });

      marker.bindPopup(`
        <div style="font-family: system-ui; font-size: 12px; color: #0f172a; padding: 4px;">
          <b style="color: ${color};">${base.name}</b><br/>
          Elevation: <b>${base.elevation}m</b><br/>
          Heli Dispatch Window: <b>~${base.heliFlightMin} mins flight time</b><br/>
          Emergency Contact: <b>${base.contact}</b>
        </div>
      `);

      layer.addLayer(marker);
    });
  }, [corridor, showRescueBases]);

  // 10. Render Dynamic Infrastructure Asset Markers with Submergence Impact Rings
  useEffect(() => {
    const layerGroup = markersLayerRef.current;
    if (!layerGroup) return;
    layerGroup.clearLayers();

    assets.forEach((asset) => {
      // Filter by layer toggles
      if (asset.type === "people" && !activeLayers.people) return;
      if (asset.type === "school" && !activeLayers.school) return;
      if (asset.type === "bridge" && !activeLayers.bridge) return;
      if (asset.type === "hospital" && !activeLayers.hospital) return;
      if (asset.type === "dam" && activeLayers.dam === false) return;
      if (asset.type === "safeZone" && activeLayers.safeZone === false) return;

      const dynamicStatus = getDynamicStatus(asset);
      const isSelected = selectedAsset?.id === asset.id;

      // Check whether this asset is geographically inside the lateral surge inundation buffer
      const { isWithin, distanceMeters } = isPointWithinBuffer(
        { lat: asset.lat, lng: asset.lng },
        corridor.riverPath,
        lateralSurgeHalfWidthMeters
      );

      const isSubmerged = isWithin && simulatedWaterRise > 0;
      const status = isSubmerged ? "critical" : dynamicStatus;

      const colorHex =
        status === "critical"
          ? "#ef4444"
          : status === "advisory"
          ? "#f59e0b"
          : asset.type === "safeZone"
          ? "#10b981"
          : "#0284c7";

      const svgIcon = getAssetSvg(asset.type);

      const iconHtml = `
        <div style="position: relative; width: 36px; height: 36px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          ${
            status === "critical"
              ? `<div style="position: absolute; inset: -5px; border-radius: 9999px; background-color: rgba(239, 68, 68, 0.45); animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ""
          }
          ${
            isSubmerged
              ? `<div style="position: absolute; inset: -9px; border-radius: 9999px; border: 2px dashed #dc2626; animation: spin 8s linear infinite;"></div>`
              : ""
          }
          <div style="
            position: relative;
            width: 34px;
            height: 34px;
            border-radius: ${asset.type === 'dam' ? '8px' : '9999px'};
            background-color: ${colorHex};
            border: 2px solid ${isSelected ? "#38bdf8" : "#ffffff"};
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            transform: ${isSelected ? "scale(1.2)" : "scale(1)"};
            transition: transform 0.2s ease-out;
          ">
            ${svgIcon}
          </div>
          <div style="
            position: absolute;
            top: 36px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(4px);
            color: #ffffff;
            font-size: 10px;
            font-weight: 600;
            padding: 1px 6px;
            border-radius: 4px;
            white-space: nowrap;
            border: 1px solid rgba(255,255,255,0.25);
            pointer-events: none;
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          ">
            ${asset.name.split(" ")[0]}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "himal-custom-marker",
        html: iconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([asset.lat, asset.lng], { icon: customIcon });

      marker.on("click", () => {
        onSelectAsset(asset);
      });

      marker.bindPopup(`
        <div style="font-family: system-ui; font-size: 12px; color: #0f172a; padding: 4px; max-width: 240px;">
          ${
            isSubmerged
              ? `<div style="background: #fee2e2; border-left: 3px solid #dc2626; padding: 4px; margin-bottom: 5px; color: #991b1b; font-weight: 800; font-size: 11px;">
                  🌊 INUNDATION THREAT: Inside active &plusmn;${lateralSurgeHalfWidthMeters}m surge buffer! (Distance to riverbed: ${distanceMeters}m)
                </div>`
              : ""
          }
          <b style="color: ${colorHex}; font-size: 13px;">${asset.name}</b><br/>
          <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">${asset.type} &bull; ${asset.elevation}m</span><br/>
          Status: <b style="color: ${colorHex}; text-transform: uppercase;">${status}</b><br/>
          Water Rise Buffer: <b>${(asset.hazardThresholdMeters - simulatedWaterRise).toFixed(1)}m remaining</b><br/>
          <p style="margin-top: 6px; font-size: 11px; color: #334155; line-height: 1.3;">${asset.description}</p>
        </div>
      `);

      layerGroup.addLayer(marker);
    });
  }, [
    assets,
    selectedAsset,
    simulatedWaterRise,
    activeLayers,
    getDynamicStatus,
    corridor.riverPath,
    lateralSurgeHalfWidthMeters,
    onSelectAsset,
  ]);

  // 11. Render Live Trekker Position (HTML5 GPS Radar)
  useEffect(() => {
    const layer = userGpsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!userPosition) return;

    const userHtml = `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background: rgba(14, 165, 233, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 28px; height: 28px; border-radius: 9999px; background: #0284c7; border: 3px solid #ffffff; box-shadow: 0 0 14px rgba(14, 165, 233, 0.9); display: flex; align-items: center; justify-content: center; color: white;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="12" r="5"/><path d="M12 2v3m0 14v3m-10-10h3m14 0h3"/></svg>
        </div>
        <div style="position: absolute; top: 32px; left: 50%; transform: translateX(-50%); background: rgba(2, 132, 199, 0.95); color: #ffffff; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 2px 6px rgba(0,0,0,0.5);">
          📍 You (Trekker)
        </div>
      </div>
    `;

    const marker = L.marker([userPosition.lat, userPosition.lng], {
      icon: L.divIcon({ className: "himal-user-gps", html: userHtml, iconSize: [44, 44], iconAnchor: [22, 22] }),
    });

    marker.bindPopup(`
      <div style="font-family: system-ui; font-size: 12px; color: #0f172a; padding: 4px;">
        <b style="color: #0284c7;">📍 Active Trekker Geolocation</b><br/>
        GPS: <b>${userPosition.lat.toFixed(4)}° N, ${userPosition.lng.toFixed(4)}° E</b><br/>
        Accuracy: <b>&plusmn;${Math.round(userPosition.accuracy || 15)}m</b><br/>
        Altitude: <b>${Math.round(userPosition.altitude || 2450)}m ASL</b>
      </div>
    `);

    layer.addLayer(marker);

    // Accuracy Circle
    if (userPosition.accuracy && userPosition.accuracy > 5) {
      const circle = L.circle([userPosition.lat, userPosition.lng], {
        radius: Math.min(userPosition.accuracy, 200),
        color: "#0284c7",
        weight: 1,
        fillColor: "#0284c7",
        fillOpacity: 0.12,
      });
      layer.addLayer(circle);
    }
  }, [userPosition]);

  // 12. Render Emergency SOS Distress Beacons & Tactical Air Rescue Flight Vectors
  useEffect(() => {
    const layer = sosLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    const corridorBases = CORRIDOR_RESCUE_BASES[corridor.id] || [];

    sosDistresses.forEach((sos) => {
      // Find closest rescue forward base
      let closestBase = corridorBases[0];
      let minDistanceM = Infinity;

      corridorBases.forEach((base) => {
        const d = getDistanceMeters(
          { lat: base.lat, lng: base.lng },
          { lat: sos.lat, lng: sos.lng }
        );
        if (d < minDistanceM) {
          minDistanceM = d;
          closestBase = base;
        }
      });

      // Draw tactical helicopter flight line if base exists
      if (closestBase && minDistanceM !== Infinity) {
        const distKm = minDistanceM / 1000;
        const flightEtaMin = Math.max(2, Math.round((distKm / 220) * 60 + 2));

        const flightVector = L.polyline(
          [
            [closestBase.lat, closestBase.lng],
            [sos.lat, sos.lng],
          ],
          {
            color: "#F59E0B",
            weight: 2.5,
            dashArray: "6, 8",
            opacity: 0.85,
          }
        );
        flightVector.bindTooltip(
          `🚁 APF Rescue Flight Vector: ${distKm.toFixed(1)} km &bull; ETA: ~${flightEtaMin}m from ${closestBase.name}`,
          { sticky: true }
        );
        layer.addLayer(flightVector);

        // Midpoint helicopter ETA badge
        const midLat = (closestBase.lat + sos.lat) / 2;
        const midLng = (closestBase.lng + sos.lng) / 2;
        const heliMarker = L.marker([midLat, midLng], {
          icon: L.divIcon({
            className: "himal-heli-eta",
            html: `
              <div style="background: rgba(11, 19, 43, 0.95); border: 1px solid #f59e0b; color: #fef08a; padding: 2px 7px; border-radius: 9999px; font-size: 9px; font-weight: 800; font-family: monospace; white-space: nowrap; box-shadow: 0 4px 15px rgba(0,0,0,0.85); display: flex; align-items: center; gap: 4px;">
                <span>🚁 Heli ETA: ~${flightEtaMin}m</span>
                <span style="color: #94a3b8;">(${distKm.toFixed(1)}km)</span>
              </div>
            `,
            iconSize: [120, 20],
            iconAnchor: [60, 10],
          }),
        });
        layer.addLayer(heliMarker);
      }

      const sosHtml = `
        <div style="position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="position: absolute; width: 56px; height: 56px; border-radius: 9999px; background: rgba(220, 38, 38, 0.6); animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 34px; height: 34px; border-radius: 9999px; background: #dc2626; border: 3px solid #fef08a; box-shadow: 0 0 20px rgba(239, 68, 68, 1); display: flex; align-items: center; justify-content: center; color: #fef08a; font-weight: 900; font-size: 16px;">
            🚨
          </div>
          <div style="position: absolute; top: 38px; left: 50%; transform: translateX(-50%); background: #991b1b; color: #fef08a; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 4px; white-space: nowrap; border: 1px solid #fef08a; box-shadow: 0 2px 10px rgba(0,0,0,0.8);">
            SOS: ${sos.name}
          </div>
        </div>
      `;

      const marker = L.marker([sos.lat, sos.lng], {
        icon: L.divIcon({ className: "himal-sos-beacon", html: sosHtml, iconSize: [56, 56], iconAnchor: [28, 28] }),
      });

      marker.bindPopup(`
        <div style="font-family: system-ui; font-size: 12px; color: #0f172a; padding: 6px;">
          <div style="font-weight: 800; color: #dc2626; font-size: 13px;">🚨 ACTIVE SOS RESCUE BEACON</div>
          <div>Victim: <b>${sos.name}</b></div>
          <div>Coordinates: <b>${sos.lat.toFixed(4)}° N, ${sos.lng.toFixed(4)}° E</b></div>
          <div>Reported: <b>${sos.time || "Just now"}</b></div>
          ${closestBase ? `<div style="margin-top: 2px; color: #b45309; font-weight: 700;">🚁 Nearest Base: ${closestBase.name}</div>` : ""}
          <div style="margin-top: 4px; padding: 4px; background: #fee2e2; border-radius: 4px; color: #991b1b; font-size: 11px;">
            ${sos.detail}
          </div>
        </div>
      `);

      layer.addLayer(marker);
    });
  }, [sosDistresses, corridor.id]);

  // 13. Render Seismic Waveform Marker if active
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer || !seismicEpicenter || !seismicMagnitude || seismicMagnitude < 2.0) return;

    const waveHtml = `
      <div style="position: relative; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 70px; height: 70px; border-radius: 9999px; background: rgba(239, 68, 68, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 34px; height: 34px; border-radius: 9999px; background: #dc2626; border: 2px solid #ffffff; box-shadow: 0 0 16px rgba(239, 68, 68, 0.9); display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">⚡</div>
        <div style="position: absolute; top: 40px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.95); color: #fca5a5; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; white-space: nowrap; border: 1px solid rgba(239, 68, 68, 0.5);">
          ⚡ ${seismicMagnitude.toFixed(1)} M Epicenter
        </div>
      </div>
    `;

    const marker = L.marker([seismicEpicenter.lat, seismicEpicenter.lng], {
      icon: L.divIcon({ className: "himal-seismic-epicenter", html: waveHtml, iconSize: [70, 70], iconAnchor: [35, 35] }),
    });

    marker.bindPopup(`
      <div style="font-family: system-ui; font-size: 12px; color: #0f172a; padding: 4px;">
        <b style="color: #dc2626;">USGS Tremor: ${seismicEpicenter.label || "Fault Epicenter"}</b><br/>
        Magnitude: <b>${seismicMagnitude.toFixed(1)} M</b><br/>
        Depth: <b>${seismicEpicenter.depth_km || 8} km</b> (Shallow Mountain Fault)
      </div>
    `);

    layer.addLayer(marker);
  }, [seismicEpicenter, seismicMagnitude]);

  return (
    <div
      className={`relative isolate w-full h-full bg-[#0c141d] rounded-xl overflow-hidden flex flex-col border border-white/10 ${
        isFullscreen ? "fixed inset-0 z-[999] rounded-none" : className || "min-h-[440px]"
      }`}
    >
      {/* Top Map View Controls */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none flex-wrap gap-2">
        {/* Layer / Tile switcher */}
        <div className="pointer-events-auto flex items-center bg-[#131d2a]/90 backdrop-blur-md p-1 rounded-lg border border-white/15 shadow-xl text-xs gap-1">
          <button
            onClick={() => setMapType("satellite")}
            className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all cursor-pointer ${
              mapType === "satellite"
                ? "bg-teal-600 text-white shadow-sm font-semibold"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapType("topo")}
            className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all cursor-pointer ${
              mapType === "topo"
                ? "bg-teal-600 text-white shadow-sm font-semibold"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            Topographic
          </button>
          <button
            onClick={() => setMapType("street")}
            className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all cursor-pointer ${
              mapType === "street"
                ? "bg-teal-600 text-white shadow-sm font-semibold"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            Relief
          </button>

          {/* Spatial Layers Popover Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition-all cursor-pointer border ${
                showLayerMenu ? "bg-teal-600/30 border-teal-400 text-teal-200" : "border-white/10 text-slate-300 hover:bg-white/5"
              }`}
              title="Hazard & Spatial Layer Controls"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Layers</span>
            </button>

            {showLayerMenu && (
              <div className="absolute top-9 left-0 w-56 bg-[#0f172a]/95 backdrop-blur-md p-3 rounded-lg border border-white/20 shadow-2xl z-50 text-xs flex flex-col gap-2">
                <div className="font-semibold text-slate-200 pb-1 border-b border-white/10">Hazard Overlays</div>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showInundationBuffer}
                    onChange={(e) => setShowInundationBuffer(e.target.checked)}
                    className="rounded text-blue-500"
                  />
                  <span>🌊 Geographic Inundation Buffer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showFlowVectors}
                    onChange={(e) => setShowFlowVectors(e.target.checked)}
                    className="rounded text-cyan-500"
                  />
                  <span>⬇️ Downhill River Flow Direction</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showEvacuationRoutes}
                    onChange={(e) => setShowEvacuationRoutes(e.target.checked)}
                    className="rounded text-emerald-500"
                  />
                  <span>🏃 Safe Zone Evacuation Routes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showLakeMask}
                    onChange={(e) => setShowLakeMask(e.target.checked)}
                    className="rounded text-cyan-500"
                  />
                  <span>🛰️ Glacial Lake Expansion</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showLandslides}
                    onChange={(e) => setShowLandslides(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>⚠️ Predicted Landslides</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showRescueBases}
                    onChange={(e) => setShowRescueBases(e.target.checked)}
                    className="rounded text-emerald-500"
                  />
                  <span>🚁 Search & Rescue Bases</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* GPS Locate Me, Re-Center & Fullscreen Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={fitCorridorExtent}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#131d2a]/90 border border-white/20 text-slate-200 hover:bg-white/10 backdrop-blur-md cursor-pointer shadow-lg"
            title="Auto-Fit corridor bounding box (glacier to canyon)"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>Fit Extent</span>
          </button>

          {onLocateMe && (
            <button
              onClick={onLocateMe}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md border transition-all cursor-pointer shadow-lg ${
                userPosition
                  ? "bg-sky-500/25 border-sky-400 text-sky-200 hover:bg-sky-500/35"
                  : "bg-[#131d2a]/90 border-white/20 text-slate-200 hover:bg-white/10"
              }`}
              title="Locate my real-time position via browser GPS"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? "animate-spin text-sky-400" : "text-sky-400"}`} />
              {isLocating ? "Locating..." : userPosition ? "📍 Located" : "Locate Me"}
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-[#131d2a]/90 border border-white/20 text-slate-300 hover:text-white hover:bg-white/10 backdrop-blur-md cursor-pointer shadow-lg"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mission Control"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Floating Inundation Impact HUD (Top Left below controls) */}
      <div className="absolute top-14 left-3 z-20 pointer-events-auto">
        <div className="bg-[#0b131e]/90 backdrop-blur-md border border-[#2A3B5E] px-3 py-2 rounded-xl shadow-2xl text-[11px] space-y-1 max-w-[280px]">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
            <span className="font-bold text-cyan-300 flex items-center gap-1">
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              <span>Surge Buffer</span>
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {simulatedWaterRise > 0 ? `+${simulatedWaterRise.toFixed(1)}m active` : "Baseline flow"}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-300 pt-0.5">
            <span>Lateral Envelope:</span>
            <span className="font-mono font-bold text-white">&plusmn;{lateralSurgeHalfWidthMeters}m</span>
          </div>

          <div className="flex items-center justify-between text-[10px] pt-0.5">
            <span>Impacted Assets:</span>
            <span
              className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${
                submergedAssetsCount > 0
                  ? "bg-rose-950 text-rose-300 border border-rose-800 animate-pulse"
                  : "bg-emerald-950 text-emerald-300 border border-emerald-800"
              }`}
            >
              {submergedAssetsCount > 0 ? `⚠️ ${submergedAssetsCount} Submerged` : "✓ All Safe"}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Topographic Compass Rose (Bottom Right above footer) */}
      <div className="absolute bottom-12 right-3 z-20 pointer-events-none">
        <div className="w-10 h-10 rounded-full bg-[#0b131e]/90 backdrop-blur-md border border-white/20 shadow-xl flex flex-col items-center justify-center pointer-events-auto cursor-help">
          <span className="text-[8px] font-black font-mono text-rose-400 leading-none">N</span>
          <Compass className="w-4 h-4 text-slate-300 my-0.5" />
          <span className="text-[7px] font-mono text-slate-500 leading-none">TRUE</span>
        </div>
      </div>

      {/* Map DOM target */}
      <div ref={mapContainerRef} className="w-full flex-1 z-10" />

      {/* Footer Info & Legend */}
      <div className="bg-[#0b131e] px-4 py-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 z-20 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-teal-400" />
          <span>
            {corridor.name} ({corridor.region}) &mdash; {corridor.centerName}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
          <span className="flex items-center gap-1">⬇️ Flow Direction</span>
          <span className="flex items-center gap-1 text-emerald-400">🏃 Uphill Escape</span>
          <span className="flex items-center gap-1">🌉 Bridge</span>
          <span className="flex items-center gap-1">🏫 School</span>
          <span className="flex items-center gap-1">🏥 Clinic</span>
          <span className="flex items-center gap-1">🏘️ Lodge</span>
          <span className="flex items-center gap-1">⚡ Dam/Gauge</span>
          <span className="flex items-center gap-1 text-emerald-400">🛡️ Safe Haven</span>
          <span className="flex items-center gap-1 text-sky-400">📍 Trekker</span>
          {sosDistresses.length > 0 && (
            <span className="flex items-center gap-1 text-red-400 font-bold animate-pulse">
              🚨 {sosDistresses.length} SOS Active
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
