import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import L from "leaflet";
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
  MapPin,
  Compass,
  Crosshair,
  Shield,
  Radio,
  Navigation,
} from "lucide-react";
import { HELICOPTER_SVG_PATH } from "../common/HelicopterIcon";
import { GoogleModernHazardMap } from "./GoogleModernHazardMap";

export interface ModernHazardMapProps {
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

function LeafletHazardMapInner({
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
  onSwitchToGoogle,
  className = "",
}: ModernHazardMapProps & { onSwitchToGoogle: () => void }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Layer groups for clean management
  const riverLayerRef = useRef<L.LayerGroup | null>(null);
  const surgeLayerRef = useRef<L.LayerGroup | null>(null);
  const sheltersLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentsLayerRef = useRef<L.LayerGroup | null>(null);
  const basesLayerRef = useRef<L.LayerGroup | null>(null);
  const assetsLayerRef = useRef<L.LayerGroup | null>(null);
  const userGpsLayerRef = useRef<L.LayerGroup | null>(null);
  const hazardsLayerRef = useRef<L.LayerGroup | null>(null);
  const rescueTeamsLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapType, setMapType] = useState<"topo" | "satellite">(() => {
    return (localStorage.getItem("himalsanket_map_type") as "topo" | "satellite") || "satellite";
  });

  // Tile sources: Clean Himalayan terrain with zero watermarks or API keys
  const tileSources = {
    topo: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri &mdash; Sources: USGS, Esri',
      maxZoom: 19,
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri &mdash; NASA/USGS",
      maxZoom: 18,
    },
  };

  // Center on corridor
  const handleRecenter = useCallback(() => {
    if (!mapRef.current) return;
    if (corridor.riverPath && corridor.riverPath.length > 0) {
      const bounds = L.latLngBounds(corridor.riverPath.map((p) => [p.lat, p.lng]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40], animate: true });
    } else if (corridor.center) {
      mapRef.current.setView([corridor.center.lat, corridor.center.lng], corridor.zoom || 13, {
        animate: true,
      });
    }
  }, [corridor]);

  // Center on user
  const handleCenterUser = useCallback(() => {
    if (!mapRef.current) return;
    if (userPosition) {
      mapRef.current.flyTo([userPosition.lat, userPosition.lng], 15, { animate: true });
    } else if (onLocateMe) {
      onLocateMe();
    }
  }, [userPosition, onLocateMe]);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [corridor.center.lat, corridor.center.lng],
      zoom: corridor.zoom || 13,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.attribution({ position: "bottomright" }).addTo(map);

    const source = tileSources[mapType];
    tileLayerRef.current = L.tileLayer(source.url, {
      attribution: source.attribution,
      maxZoom: source.maxZoom,
    }).addTo(map);

    // Initialize layers in specific z-order
    riverLayerRef.current = L.layerGroup().addTo(map);
    surgeLayerRef.current = L.layerGroup().addTo(map);
    hazardsLayerRef.current = L.layerGroup().addTo(map);
    sheltersLayerRef.current = L.layerGroup().addTo(map);
    assetsLayerRef.current = L.layerGroup().addTo(map);
    basesLayerRef.current = L.layerGroup().addTo(map);
    incidentsLayerRef.current = L.layerGroup().addTo(map);
    rescueTeamsLayerRef.current = L.layerGroup().addTo(map);
    userGpsLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    // Invalidate size on load
    setTimeout(() => map.invalidateSize(), 200);

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(mapContainerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update tile layer
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    mapRef.current.removeLayer(tileLayerRef.current);
    const source = tileSources[mapType];
    tileLayerRef.current = L.tileLayer(source.url, {
      attribution: source.attribution,
      maxZoom: source.maxZoom,
    }).addTo(mapRef.current);
  }, [mapType]);

  // Handle corridor transition
  useEffect(() => {
    if (!mapRef.current) return;
    handleRecenter();
  }, [corridor.id, handleRecenter]);

  // Handle selectedBeacon focus
  useEffect(() => {
    if (!mapRef.current || !selectedBeacon) return;
    mapRef.current.flyTo([selectedBeacon.lat, selectedBeacon.lng], 16, { animate: true });
  }, [selectedBeacon]);

  // Handle selectedShelter focus
  useEffect(() => {
    if (!mapRef.current || !selectedShelter) return;
    mapRef.current.flyTo([selectedShelter.lat, selectedShelter.lng], 16, { animate: true });
  }, [selectedShelter]);

  // 2. Render River & Flood Inundation Buffer
  useEffect(() => {
    if (!riverLayerRef.current || !surgeLayerRef.current) return;
    riverLayerRef.current.clearLayers();
    surgeLayerRef.current.clearLayers();

    if (!corridor.riverPath || corridor.riverPath.length < 2) return;

    const latLngs = corridor.riverPath.map((p) => [p.lat, p.lng] as [number, number]);

    // River centerline
    const riverLine = L.polyline(latLngs, {
      color: "#0284c7",
      weight: 4,
      opacity: 0.85,
      dashArray: undefined,
    });
    riverLayerRef.current.addLayer(riverLine);

    // Inundation surge buffer
    if (simulatedWaterRise > 0) {
      const bufferMeters = Math.round(20 + simulatedWaterRise * 35);
      const polygonCoords = generateGeodesicBufferPolygon(
        corridor.riverPath as LatLng[],
        bufferMeters
      );
      if (polygonCoords.length > 0) {
        const surgePoly = L.polygon(polygonCoords, {
          color: "#06b6d4",
          weight: 2,
          fillColor: "#0891b2",
          fillOpacity: 0.28,
          dashArray: "4, 6",
        });
        surgePoly.bindTooltip(
          `🌊 Simulated Surge Buffer: +${simulatedWaterRise}m (${bufferMeters}m lateral)`,
          { sticky: true, className: "leaflet-tooltip-minimal" }
        );
        surgeLayerRef.current.addLayer(surgePoly);
      }
    }
  }, [corridor.riverPath, simulatedWaterRise]);

  // 3. Render Mode-Specific Markers
  useEffect(() => {
    if (
      !sheltersLayerRef.current ||
      !incidentsLayerRef.current ||
      !basesLayerRef.current ||
      !assetsLayerRef.current ||
      !hazardsLayerRef.current
    )
      return;

    sheltersLayerRef.current.clearLayers();
    incidentsLayerRef.current.clearLayers();
    basesLayerRef.current.clearLayers();
    assetsLayerRef.current.clearLayers();
    hazardsLayerRef.current.clearLayers();

    // Unified Specific Facility Icons for Civilian, SAR, and Command Admin
    const getFacilityIconConfig = (asset: MapAsset) => {
      let iconHtml = "";
      let popupBadge = "";
      let badgeColor = "";

      if (asset.type === "hospital") {
        popupBadge = "🏥 Health Post / Clinic";
        badgeColor = "text-rose-600";
        iconHtml = `
          <div class="flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 text-white shadow-md border-2 border-white ring-1 ring-rose-400 cursor-pointer hover:scale-110 transition-transform">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
        `;
      } else if (asset.type === "school") {
        popupBadge = "🏫 Evacuation Shelter / School";
        badgeColor = "text-sky-700";
        iconHtml = `
          <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-sky-700 text-white shadow-md border-2 border-white ring-1 ring-sky-400 cursor-pointer hover:scale-110 transition-transform">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
        `;
      } else if (asset.type === "people") {
        popupBadge = `🏘️ Village (${asset.population || 50} Pax)`;
        badgeColor = "text-indigo-700";
        iconHtml = `
          <div class="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-700 text-white shadow-md border-2 border-white ring-1 ring-indigo-400 cursor-pointer hover:scale-110 transition-transform">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
        `;
      } else if (asset.type === "safeZone") {
        popupBadge = "🛡️ Safe Evac Zone";
        badgeColor = "text-emerald-700";
        iconHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white shadow-sm border border-white cursor-pointer hover:scale-110 transition-transform">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        `;
      } else if (asset.type === "bridge") {
        popupBadge = "🌉 River Bridge";
        badgeColor = "text-amber-700";
        iconHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-md bg-amber-600 text-white shadow-sm border border-white cursor-pointer hover:scale-110 transition-transform">
            <span class="text-[10px] font-bold">═</span>
          </div>
        `;
      } else if (asset.type === "dam") {
        popupBadge = "🌊 Hydropower Dam / Spillway";
        badgeColor = "text-cyan-700";
        iconHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-md bg-cyan-700 text-white shadow-sm border border-white cursor-pointer hover:scale-110 transition-transform">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="6" width="18" height="12" rx="2"/>
              <path d="M7 6v12M12 6v12M17 6v12"/>
            </svg>
          </div>
        `;
      }

      return { iconHtml, popupBadge, badgeColor };
    };

    // A. CIVILIAN MODE: Safe Shelters, Bridges, Health Posts, Schools, and Landslide Hazards
    if (mode === "civilian") {
      // 1. Safe Shelters
      const safeZones = assets.filter((a) => a.type === "safeZone");
      safeZones.forEach((sz) => {
        const icon = L.divIcon({
          className: "custom-leaflet-icon",
          html: `
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white shadow-lg border-2 border-white ring-2 ring-emerald-500/50 cursor-pointer hover:scale-110 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([sz.lat, sz.lng], { icon });
        marker.bindPopup(`
          <div class="p-2 min-w-[180px] font-sans">
            <div class="flex items-center gap-1.5 text-emerald-700 font-bold text-xs uppercase tracking-wide">
              <span>Verified Safe Refuge</span>
            </div>
            <div class="font-extrabold text-slate-900 text-sm mt-0.5">${sz.name}</div>
            <div class="text-xs text-slate-600 font-mono mt-1">Elevation: ${sz.elevation}m ASL</div>
            <div class="text-[11px] text-slate-500 mt-1">${sz.description || "Designated high ground evacuation terrace clear of flood surge."}</div>
          </div>
        `);
        sheltersLayerRef.current?.addLayer(marker);
      });

      // 2. Bridges, Health Posts, and Schools for Civilian / Trekker Navigation
      const civilianFacilities = assets.filter(
        (a) => a.type === "bridge" || a.type === "hospital" || a.type === "school"
      );
      civilianFacilities.forEach((asset) => {
        const { iconHtml, popupBadge, badgeColor } = getFacilityIconConfig(asset);
        if (iconHtml) {
          const icon = L.divIcon({
            className: "custom-leaflet-icon",
            html: iconHtml,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const marker = L.marker([asset.lat, asset.lng], { icon });
          marker.bindPopup(`
            <div class="p-2 min-w-[210px] font-sans">
              <span class="text-[10px] font-mono ${badgeColor} font-bold block uppercase">${popupBadge}</span>
              <strong class="text-sm text-slate-900 block mt-0.5">${asset.name}</strong>
              <div class="text-xs text-slate-600 font-mono mt-1">Elev: ${asset.elevation}m ASL</div>
              ${asset.contact ? `<div class="text-xs text-slate-700 font-medium mt-0.5">Contact: <strong>${asset.contact}</strong></div>` : ""}
              ${asset.capacity ? `<div class="text-xs text-slate-700 font-medium">Capacity: <strong>${asset.capacity}</strong> persons</div>` : ""}
              ${asset.hazardThresholdMeters ? `<div class="text-xs text-amber-700 font-medium">Flood Threshold: +${asset.hazardThresholdMeters}m surge</div>` : ""}
              <p class="text-[11px] text-slate-500 mt-1 leading-snug">${asset.riskNote || asset.description || ""}</p>
            </div>
          `);
          assetsLayerRef.current?.addLayer(marker);
        }
      });

      // 3. Active Landslide Risk Zones
      const landslides = CORRIDOR_LANDSLIDE_ZONES[corridor.id] || [];
      landslides.forEach((lz) => {
        const poly = L.polygon(lz.polygon, {
          color: "#e11d48",
          weight: 1.5,
          fillColor: "#f43f5e",
          fillOpacity: 0.18,
          dashArray: "3, 5",
        });
        poly.bindTooltip(`⚠️ Landslide Risk: ${lz.name}`, { sticky: true });
        hazardsLayerRef.current?.addLayer(poly);
      });
    }

    // B. RESCUER MODE: Distress Incidents & Rescue Bases
    if (mode === "rescuer") {
      // 1. Incidents
      distressBeacons.forEach((beacon) => {
        const isSelected = selectedBeacon?.id === beacon.id;
        const isRescued = beacon.status === "rescued";
        const isDispatched = beacon.status === "dispatched";

        const bgClass = isRescued
          ? "bg-emerald-600"
          : isDispatched
          ? "bg-amber-500"
          : "bg-rose-600 animate-pulse";

        const icon = L.divIcon({
          className: "custom-leaflet-icon",
          html: `
            <div class="relative flex items-center justify-center w-9 h-9 rounded-full ${bgClass} text-white shadow-xl border-2 ${
            isSelected ? "border-white ring-4 ring-rose-400" : "border-white/90"
          } cursor-pointer hover:scale-110 transition-transform">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
                <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
                <circle cx="12" cy="12" r="2"/>
                <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
                <path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
              </svg>
              <span class="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-black text-white font-mono border border-white/40">
                ${beacon.priority}
              </span>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([beacon.lat, beacon.lng], { icon });
        marker.on("click", () => {
          if (onSelectBeacon) onSelectBeacon(beacon);
        });

        marker.bindPopup(`
          <div class="p-2 min-w-[220px] font-sans">
            <div class="flex items-center justify-between text-[11px] font-mono font-bold">
              <span class="${isRescued ? "text-emerald-600" : isDispatched ? "text-amber-600" : "text-rose-600"} uppercase">
                ${beacon.status} SOS
              </span>
              <span class="text-slate-500">Pri: ${beacon.priority}/100</span>
            </div>
            <div class="font-black text-slate-900 text-sm mt-0.5">${beacon.name}</div>
            <p class="text-xs text-slate-600 mt-1 leading-snug">${beacon.detail}</p>
            <div class="text-[10px] text-slate-500 font-mono mt-1.5 pt-1.5 border-t border-slate-200">
              GPS: ${beacon.lat.toFixed(4)}°N, ${beacon.lng.toFixed(4)}°E
              ${beacon.assignedUnit ? `<br>Unit: <strong>${beacon.assignedUnit}</strong>` : ""}
            </div>
          </div>
        `);
        incidentsLayerRef.current?.addLayer(marker);
      });

      // 2. Rescue Bases / Helipads
      const bases = CORRIDOR_RESCUE_BASES[corridor.id] || CORRIDOR_RESCUE_BASES.langtang || [];
      bases.forEach((base) => {
        const icon = L.divIcon({
          className: "custom-leaflet-icon",
          html: `
            <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 text-amber-400 border border-amber-400/80 shadow-md cursor-pointer hover:scale-105">
              <span class="font-mono font-black text-xs">H</span>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([base.lat, base.lng], { icon });
        marker.bindPopup(`
          <div class="p-2 min-w-[180px] font-sans">
            <span class="text-[10px] font-mono text-amber-600 font-bold block uppercase">${base.agency} Forward Base</span>
            <strong class="text-sm text-slate-900 block">${base.name}</strong>
            <span class="text-xs text-slate-500 font-mono block mt-0.5">Helipad: ${base.heliFlightMin}m flight lag</span>
          </div>
        `);
        basesLayerRef.current?.addLayer(marker);
      });

      // 3. Critical Facilities: Health Posts, Schools, Villages, and Shelters
      assets.forEach((asset) => {
        const { iconHtml, popupBadge, badgeColor } = getFacilityIconConfig(asset);

        if (iconHtml) {
          const icon = L.divIcon({
            className: "custom-leaflet-icon",
            html: iconHtml,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const marker = L.marker([asset.lat, asset.lng], { icon });
          marker.bindPopup(`
            <div class="p-2 min-w-[210px] font-sans">
              <span class="text-[10px] font-mono ${badgeColor} font-bold block uppercase">${popupBadge}</span>
              <strong class="text-sm text-slate-900 block mt-0.5">${asset.name}</strong>
              <div class="text-xs text-slate-600 font-mono mt-1">Elev: ${asset.elevation}m ASL</div>
              ${asset.population ? `<div class="text-xs text-slate-700 font-medium">Population: <strong>${asset.population}</strong> residents</div>` : ""}
              ${asset.capacity ? `<div class="text-xs text-slate-700 font-medium">Capacity: <strong>${asset.capacity}</strong> evacuees</div>` : ""}
              ${asset.hazardThresholdMeters ? `<div class="text-xs text-amber-700 font-medium">Flood Threshold: +${asset.hazardThresholdMeters}m surge</div>` : ""}
              <p class="text-[11px] text-slate-500 mt-1 leading-snug">${asset.riskNote || asset.description || ""}</p>
            </div>
          `);
          assetsLayerRef.current?.addLayer(marker);
        }
      });
    }

    // C. ADMIN MODE: Infrastructure Assets, Landslides, and Distress Markers
    if (mode === "admin") {
      // 1. Assets (Rendered with specific facility symbols identical to SAR and Civilian)
      assets.forEach((asset) => {
        const { iconHtml, popupBadge, badgeColor } = getFacilityIconConfig(asset);

        if (iconHtml) {
          const icon = L.divIcon({
            className: "custom-leaflet-icon",
            html: iconHtml,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const marker = L.marker([asset.lat, asset.lng], { icon });
          marker.bindPopup(`
            <div class="p-2 min-w-[210px] font-sans">
              <span class="text-[10px] font-mono ${badgeColor} font-bold block uppercase">${popupBadge}</span>
              <strong class="text-sm text-slate-900 block mt-0.5">${asset.name}</strong>
              <span class="text-xs text-slate-600 font-mono block mt-1">Elevation: ${asset.elevation}m ASL</span>
              ${asset.population ? `<div class="text-xs text-slate-700 font-medium">Population: <strong>${asset.population}</strong> residents</div>` : ""}
              ${asset.capacity ? `<div class="text-xs text-slate-700 font-medium">Capacity: <strong>${asset.capacity}</strong> evacuees</div>` : ""}
              <p class="text-[11px] text-slate-500 mt-1 leading-snug">${asset.riskNote || asset.description || ""}</p>
            </div>
          `);
          assetsLayerRef.current?.addLayer(marker);
        }
      });

      // 2. Landslide Zones
      const landslides = CORRIDOR_LANDSLIDE_ZONES[corridor.id] || [];
      landslides.forEach((lz) => {
        const poly = L.polygon(lz.polygon, {
          color: "#e11d48",
          weight: 1.5,
          fillColor: "#f43f5e",
          fillOpacity: 0.18,
          dashArray: "3, 5",
        });
        poly.bindTooltip(`⚠️ Landslide Risk: ${lz.name}`, { sticky: true });
        hazardsLayerRef.current?.addLayer(poly);
      });

      // 3. Distress Beacons in Admin
      distressBeacons.forEach((beacon) => {
        const icon = L.divIcon({
          className: "custom-leaflet-icon",
          html: `
            <div class="flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 text-white border-2 border-white shadow-lg animate-pulse">
              <span class="font-mono text-[10px] font-black">${beacon.priority}</span>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([beacon.lat, beacon.lng], { icon });
        marker.bindPopup(`
          <div class="p-2 font-sans min-w-[180px]">
            <span class="text-[10px] text-rose-600 font-mono font-bold uppercase">SOS ALERT</span>
            <div class="font-bold text-slate-900 text-xs">${beacon.name}</div>
            <div class="text-[11px] text-slate-600 mt-1">${beacon.detail}</div>
          </div>
        `);
        incidentsLayerRef.current?.addLayer(marker);
      });
    }
  }, [mode, assets, distressBeacons, selectedBeacon, corridor.id, onSelectBeacon]);

  // 4. Render User GPS Position
  useEffect(() => {
    if (!userGpsLayerRef.current) return;
    userGpsLayerRef.current.clearLayers();

    if (!userPosition || mode !== "civilian") return;

    // Glowing User Dot
    const userIcon = L.divIcon({
      className: "custom-leaflet-icon",
      html: `
        <div class="relative flex items-center justify-center w-7 h-7">
          <span class="absolute inline-flex w-full h-full rounded-full bg-sky-400 opacity-75 animate-ping"></span>
          <span class="relative inline-flex w-4 h-4 rounded-full bg-sky-500 border-2 border-white shadow-lg"></span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = L.marker([userPosition.lat, userPosition.lng], { icon: userIcon, zIndexOffset: 1000 });
    marker.bindPopup(`
      <div class="p-2 font-sans min-w-[160px]">
        <span class="text-[10px] font-mono text-sky-600 font-bold uppercase block">📍 Your Location</span>
        <div class="text-xs font-bold text-slate-800 font-mono">
          ${userPosition.lat.toFixed(4)}°N, ${userPosition.lng.toFixed(4)}°E
        </div>
        <div class="text-[11px] text-slate-500 font-mono mt-0.5">
          Alt: ~${Math.round(userPosition.altitude || 2780)}m ASL
        </div>
      </div>
    `);
    userGpsLayerRef.current.addLayer(marker);

    // Accuracy Circle
    if (userPosition.accuracy && userPosition.accuracy > 5) {
      const circle = L.circle([userPosition.lat, userPosition.lng], {
        radius: Math.min(userPosition.accuracy, 100),
        color: "#38bdf8",
        weight: 1,
        fillColor: "#38bdf8",
        fillOpacity: 0.1,
      });
      userGpsLayerRef.current.addLayer(circle);
    }
  }, [userPosition]);

  // Format helpers for SAR metrics
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

  // Filter dispatched teams by role:
  // Civilian: ONLY sees the team dispatched to rescue them (matches civilianId or targetBeaconId).
  // Rescuer: sees all teams in current corridor.
  // Admin: sees all teams nationwide across all corridors.
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

  // 5. Render Dispatched Rescue Teams (Airborne Helicopters & Ground SAR Units)
  useEffect(() => {
    if (!rescueTeamsLayerRef.current) return;
    rescueTeamsLayerRef.current.clearLayers();

    if (visibleRescueTeams.length === 0) return;

    visibleRescueTeams.forEach((team) => {
      const isArrived = team.status === "arrived" || team.status === "evacuating";
      const etaStr = formatEtaTime(team.etaSeconds);
      const distStr = formatDistanceMeters(team.distanceRemainingMeters);

      // A. Planned Direct Flight Vector (start to target)
      const flightVector = L.polyline(
        [
          [team.startPosition.lat, team.startPosition.lng],
          [team.targetPosition.lat, team.targetPosition.lng],
        ],
        {
          color: "#64748b",
          weight: 1.5,
          opacity: 0.35,
          dashArray: "4, 6",
        }
      );
      rescueTeamsLayerRef.current?.addLayer(flightVector);

      // B. Flown Trail Path
      if (team.trail && team.trail.length > 1) {
        const trailLine = L.polyline(
          team.trail.map((pt) => [pt.lat, pt.lng]),
          {
            color: "#475569",
            weight: 2,
            opacity: 0.5,
          }
        );
        rescueTeamsLayerRef.current?.addLayer(trailLine);
      }

      // C. Dynamic Inbound Lead Vector (current to target)
      if (!isArrived) {
        const leadVector = L.polyline(
          [
            [team.currentPosition.lat, team.currentPosition.lng],
            [team.targetPosition.lat, team.targetPosition.lng],
          ],
          {
            color: "#38bdf8",
            weight: 2,
            opacity: 0.8,
            dashArray: "4, 5",
          }
        );
        rescueTeamsLayerRef.current?.addLayer(leadVector);
      }

      // D. Extraction Rendezvous Zone (Civilian focus)
      if (mode === "civilian") {
        const targetRing = L.circle(
          [team.targetPosition.lat, team.targetPosition.lng],
          {
            radius: 40,
            color: "#10b981",
            weight: 1.5,
            fillColor: "#10b981",
            fillOpacity: 0.1,
            dashArray: "3, 3",
          }
        );
        targetRing.bindTooltip("Extraction Rendezvous Zone", {
          sticky: true,
          className: "leaflet-tooltip-minimal",
        });
        rescueTeamsLayerRef.current?.addLayer(targetRing);
      }

      // E. Tactical Moving Helicopter / Vehicle Marker
      const isHeli = team.vehicleType === "helicopter";
      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <!-- Subtle Radar Pulse -->
          <span class="absolute -inset-2 rounded-full bg-sky-400/20 animate-ping"></span>

          <!-- Unit Emblem Badge: Calm Dark Glass with Helicopter Silhouette -->
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#111c2e] text-[#38bdf8] shadow-md border border-[#1e2c44] ring-2 ring-sky-500/30 transition-transform group-hover:scale-105">
            ${
              isHeli
                ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                     <path d="${HELICOPTER_SVG_PATH}"/>
                   </svg>`
                : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                     <rect x="2" y="7" width="20" height="13" rx="2"/>
                     <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/>
                   </svg>`
            }
          </div>

          <!-- Mini Call Sign & Live ETA Tag -->
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-[#0b1320]/90 text-[#f1f5f9] font-mono text-[9px] font-semibold border border-[#1e2c44] shadow">
            ${team.callSign} • ${etaStr}
          </div>
        </div>
      `;

      const heliIcon = L.divIcon({
        className: "custom-leaflet-icon",
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([team.currentPosition.lat, team.currentPosition.lng], {
        icon: heliIcon,
        zIndexOffset: 1200,
      });

      // Hover Tooltip
      marker.bindTooltip(
        `<strong>${team.name}</strong> (${team.callSign})<br>ETA: <strong>${etaStr}</strong> • ${distStr}`,
        { direction: "top", offset: [0, -18], className: "leaflet-tooltip-minimal" }
      );

      // Detailed Interactive Popup
      marker.bindPopup(`
        <div class="p-2.5 font-sans min-w-[210px] bg-[#0b1320] text-[#f1f5f9] rounded-xl border border-[#1e2c44]">
          <div class="flex items-center justify-between pb-1.5 border-b border-[#1c2536]">
            <span class="text-[10px] font-mono text-[#8fa0b5] uppercase font-semibold">
              ${team.agency}
            </span>
            <span class="px-1.5 py-0.2 rounded bg-[#111c2e] text-[#38bdf8] font-mono text-[9px] border border-[#1e2c44]">
              ${team.callSign}
            </span>
          </div>

          <div class="font-bold text-[#f1f5f9] text-xs mt-1.5">${team.name}</div>
          <div class="text-[11px] text-[#8fa0b5] mt-0.5">Target: <strong>${team.targetCivilianName}</strong></div>

          <!-- Live Metrics Grid -->
          <div class="grid grid-cols-2 gap-1.5 my-2 p-2 rounded-lg bg-[#111c2e] border border-[#1e2c44]">
            <div>
              <span class="text-[9px] text-[#8fa0b5] font-mono uppercase block">Arrival</span>
              <span class="text-xs font-mono font-bold text-[#38bdf8]">${etaStr}</span>
            </div>
            <div>
              <span class="text-[9px] text-[#8fa0b5] font-mono uppercase block">Distance</span>
              <span class="text-xs font-mono font-bold text-[#f1f5f9]">${distStr}</span>
            </div>
          </div>

          <div class="text-[10px] text-[#8c96af] space-y-0.5 font-mono">
            <div>Base: <span class="text-[#f1f5f9]">${team.startBaseName}</span></div>
            <div>Radio: <span class="text-[#f1f5f9]">${team.contact}</span></div>
          </div>
        </div>
      `);

      rescueTeamsLayerRef.current?.addLayer(marker);
    });
  }, [visibleRescueTeams, mode]);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none bg-[#0b1320] ${className}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Modern HUD Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
        {/* Engine Switcher Pill */}
        <div className="flex items-center text-xs p-1 rounded-xl bg-[#111c2e]/90 border border-[#1e2c44] shadow-xl backdrop-blur-md">
          <button
            onClick={onSwitchToGoogle}
            className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 font-medium transition-colors cursor-pointer text-xs flex items-center gap-1.5"
            title="Switch to Google Maps Platform (3D Terrain & Satellite)"
          >
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>Google Maps</span>
          </button>
          <div className="px-2.5 py-1.5 rounded-lg bg-sky-600 text-white font-semibold flex items-center gap-1.5 text-xs shadow-sm cursor-default">
            <Layers className="w-3.5 h-3.5 text-white" />
            <span>Leaflet</span>
          </div>
        </div>

        {/* Tile Style Switcher */}
        <button
          onClick={() => {
            setMapType((p) => {
              const next = p === "topo" ? "satellite" : "topo";
              try {
                localStorage.setItem("himalsanket_map_type", next);
              } catch (_) {}
              return next;
            });
          }}
          className="p-2.5 rounded-xl bg-[#111c2e]/90 hover:bg-[#15233a] text-[#8fa0b5] hover:text-[#f1f5f9] border border-[#1e2c44] hover:border-[#2a456c] shadow-lg backdrop-blur-md transition-colors cursor-pointer flex items-center gap-2 text-xs font-semibold"
          title="Toggle Satellite / Topographic Terrain"
        >
          <Layers className="w-4 h-4 text-[#8fa0b5]" />
          <span className="hidden sm:inline">{mapType === "topo" ? "Satellite" : "Topography"}</span>
        </button>

        {/* Recenter Corridor */}
        <button
          onClick={handleRecenter}
          className="p-2.5 rounded-xl bg-[#111c2e]/90 hover:bg-[#15233a] text-[#8fa0b5] hover:text-[#f1f5f9] border border-[#1e2c44] hover:border-[#2a456c] shadow-lg backdrop-blur-md transition-colors cursor-pointer flex items-center gap-2 text-xs font-semibold"
          title="Fit Corridor Bounds"
        >
          <Compass className="w-4 h-4 text-[#8fa0b5]" />
          <span className="hidden sm:inline">Fit Valley</span>
        </button>

        {/* Locate User (Civilian mode only) */}
        {mode === "civilian" && (
          <button
            onClick={handleCenterUser}
            disabled={isLocating}
            className="p-2.5 rounded-xl bg-[#111c2e]/90 hover:bg-[#15233a] text-[#8fa0b5] hover:text-[#f1f5f9] border border-[#1e2c44] hover:border-[#2a456c] shadow-lg backdrop-blur-md transition-colors cursor-pointer flex items-center gap-2 text-xs font-semibold"
            title="Pan to My Coordinates"
          >
            <Navigation className={`w-4 h-4 text-[#8fa0b5] ${isLocating ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">My GPS</span>
          </button>
        )}
      </div>

      {/* Minimal Bottom Legend */}
      <div className="absolute bottom-3 left-3 z-20 px-3.5 py-2 rounded-xl bg-[#111c2e]/90 border border-[#1e2c44] backdrop-blur-md shadow-lg text-xs text-[#8fa0b5] flex items-center gap-3">
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

// ---------------------------------------------------------------------------
// Unified ModernHazardMap Engine Orchestrator
// Defaults to Google Maps Platform (AI Builder Cup Showcase) with seamless
// 1-click fallback to Leaflet High-Res Satellite GIS.
// ---------------------------------------------------------------------------
export function ModernHazardMap(props: ModernHazardMapProps) {
  const [engine, setEngine] = useState<"google" | "leaflet">(() => {
    return (
      (localStorage.getItem("himalsanket_map_engine") as "google" | "leaflet") || "google"
    );
  });

  const handleSwitchEngine = useCallback((nextEngine: "google" | "leaflet") => {
    setEngine(nextEngine);
    try {
      localStorage.setItem("himalsanket_map_engine", nextEngine);
    } catch (_) {}
  }, []);

  if (engine === "google") {
    return (
      <GoogleModernHazardMap
        {...props}
        onSwitchToLeaflet={() => handleSwitchEngine("leaflet")}
      />
    );
  }

  return (
    <LeafletHazardMapInner
      {...props}
      onSwitchToGoogle={() => handleSwitchEngine("google")}
    />
  );
}

