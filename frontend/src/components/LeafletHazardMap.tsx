import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  MapAsset,
  CorridorConfig,
  CORRIDOR_SENTINEL_LAKES,
} from "../data/hazardMapData";
import {
  Key,
  Layers,
  MapPin,
  Globe2,
  Activity,
  Satellite,
  Waves,
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
}: LeafletHazardMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const riverPolylineRef = useRef<L.Polyline | null>(null);
  const bufferPolylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapType, setMapType] = useState<"satellite" | "topo" | "street">("satellite");

  // Tile layer URLs
  const tileSources = {
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      maxZoom: 18,
    },
    topo: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
      maxZoom: 17,
    },
    street: {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    },
  };

  // Initialize Map
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

      // Add attribution in bottom right
      L.control.attribution({ position: "bottomright" }).addTo(map);

      // Add custom zoom control in top right
      L.control.zoom({ position: "topright" }).addTo(map);

      const source = tileSources[mapType];
      tileLayerRef.current = L.tileLayer(source.url, {
        attribution: source.attribution,
        maxZoom: source.maxZoom,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Invalidate size once container layout settles
      setTimeout(() => {
        map.invalidateSize();
      }, 150);

      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update base tile layer when mapType changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const source = tileSources[mapType];
    tileLayerRef.current = L.tileLayer(source.url, {
      attribution: source.attribution,
      maxZoom: source.maxZoom,
    }).addTo(map);
  }, [mapType]);

  // Center/pan map when corridor changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([corridor.center.lat, corridor.center.lng], corridor.zoom, {
      duration: 1.2,
    });
  }, [corridor]);

  // Center map on selected asset
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedAsset) return;
    map.flyTo([selectedAsset.lat, selectedAsset.lng], Math.max(map.getZoom(), 14), {
      duration: 0.8,
    });
  }, [selectedAsset]);

  // Update River & Hazard Buffer Polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean up previous lines
    if (riverPolylineRef.current) {
      map.removeLayer(riverPolylineRef.current);
      riverPolylineRef.current = null;
    }
    if (bufferPolylineRef.current) {
      map.removeLayer(bufferPolylineRef.current);
      bufferPolylineRef.current = null;
    }

    const latLngs: [number, number][] = corridor.riverPath.map((p) => [p.lat, p.lng]);

    // Hazard Buffer Line (expands with surgeLevel)
    if (activeLayers.hazardZone) {
      const bufferWeight = Math.min(16 + simulatedWaterRise * 10, 60);
      const bufferColor =
        simulatedWaterRise > 3
          ? "#ef4444"
          : simulatedWaterRise > 1.5
          ? "#f59e0b"
          : "#0284c7";
      const bufferOpacity = Math.min(0.28 + simulatedWaterRise * 0.08, 0.7);

      bufferPolylineRef.current = L.polyline(latLngs, {
        color: bufferColor,
        weight: bufferWeight,
        opacity: bufferOpacity,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
    }

    // Cyan River Line
    riverPolylineRef.current = L.polyline(latLngs, {
      color: "#06b6d4",
      weight: 4,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
  }, [corridor, activeLayers.hazardZone, simulatedWaterRise]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    assets.forEach((asset) => {
      const status = getDynamicStatus(asset);
      const isSelected = selectedAsset?.id === asset.id;

      // Color themes based on status
      const colorHex =
        status === "critical"
          ? "#ef4444"
          : status === "advisory"
          ? "#f59e0b"
          : "#10b981";

      const letter =
        asset.type === "people"
          ? "👥"
          : asset.type === "school"
          ? "🏫"
          : asset.type === "bridge"
          ? "🌉"
          : "🏥";

      const iconHtml = `
        <div style="position: relative; width: 34px; height: 34px; cursor: pointer;">
          ${
            status === "critical"
              ? `<div style="position: absolute; inset: -4px; border-radius: 9999px; background-color: rgba(239, 68, 68, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ""
          }
          <div style="
            position: relative;
            width: 34px;
            height: 34px;
            border-radius: 9999px;
            background-color: ${colorHex};
            border: 2px solid ${isSelected ? "#38bdf8" : "#ffffff"};
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transform: ${isSelected ? "scale(1.2)" : "scale(1)"};
            transition: transform 0.2s;
          ">
            ${letter}
          </div>
          <div style="
            position: absolute;
            top: 36px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(4px);
            color: #ffffff;
            font-size: 10px;
            font-weight: 600;
            padding: 1px 5px;
            border-radius: 4px;
            white-space: nowrap;
            border: 1px solid rgba(255,255,255,0.2);
            pointer-events: none;
            box-shadow: 0 2px 4px rgba(0,0,0,0.4);
          ">
            ${asset.name.split(" ")[0]}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "himal-custom-marker",
        html: iconHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([asset.lat, asset.lng], { icon: customIcon });
      marker.on("click", () => {
        onSelectAsset(asset);
      });

      layerGroup.addLayer(marker);
    });

    // 1. Render Seismic Tremor Epicenter & Animated Shockwaves
    if (seismicEpicenter && typeof seismicEpicenter.lat === "number" && typeof seismicEpicenter.lng === "number" && seismicMagnitude && seismicMagnitude >= 1.0) {
      const isSevere = seismicMagnitude >= 3.0;
      const waveHtml = `
        <div style="position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="position: absolute; width: 76px; height: 76px; border-radius: 9999px; background: rgba(239, 68, 68, 0.22); animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 52px; height: 52px; border-radius: 9999px; border: 2px dashed ${isSevere ? '#ef4444' : '#f59e0b'}; opacity: 0.8; animation: spin 10s linear infinite;"></div>
          <div style="
            position: relative;
            width: 32px;
            height: 32px;
            border-radius: 9999px;
            background: ${isSevere ? '#dc2626' : '#d97706'};
            border: 2px solid #ffffff;
            box-shadow: 0 0 16px rgba(239, 68, 68, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 13px;
          ">⚡</div>
          <div style="
            position: absolute;
            top: 48px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.95);
            color: ${isSevere ? '#fca5a5' : '#fde68a'};
            font-size: 10px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 4px;
            white-space: nowrap;
            border: 1px solid ${isSevere ? 'rgba(239, 68, 68, 0.5)' : 'rgba(245, 158, 11, 0.5)'};
            box-shadow: 0 2px 8px rgba(0,0,0,0.6);
            pointer-events: none;
          ">
            ⚡ ${seismicMagnitude.toFixed(1)} M Epicenter
          </div>
        </div>
      `;
      const seismicIcon = L.divIcon({
        className: "himal-seismic-icon",
        html: waveHtml,
        iconSize: [80, 80],
        iconAnchor: [40, 40],
      });
      const sMarker = L.marker([seismicEpicenter.lat, seismicEpicenter.lng], { icon: seismicIcon });
      sMarker.bindPopup(`
        <div style="font-size: 12px; color: #1e293b; padding: 4px;">
          <b style="color: #dc2626;">USGS Tremor: ${seismicEpicenter.label || "Regional Tremor"}</b><br/>
          Magnitude: <b>${seismicMagnitude.toFixed(1)} M</b><br/>
          Depth: <b>${seismicEpicenter.depth_km || 8} km</b> (Shallow Mountain Fault)<br/>
          Status: <b>Active Ground Shockwave Radiating</b>
        </div>
      `);
      layerGroup.addLayer(sMarker);
    }

    // 2. Render Sentinel-2 Glacial Lake Marker at high altitude headwaters
    const lakeData = corridor?.id ? CORRIDOR_SENTINEL_LAKES[corridor.id] : null;
    if (lakeData && lakeData.center && typeof lakeData.center.lat === "number" && typeof lakeData.center.lng === "number") {
      const changePct = Number(lakeAreaChangePct ?? lakeData.areaChangePct ?? 4);
      const isCritical = changePct >= 10.0;
      const lakeHtml = `
        <div style="position: relative; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="position: absolute; width: 68px; height: 68px; border-radius: 9999px; background: ${isCritical ? 'rgba(225, 29, 72, 0.3)' : 'rgba(6, 182, 212, 0.25)'}; animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="
            position: relative;
            width: 36px;
            height: 36px;
            border-radius: 9999px;
            background: ${isCritical ? '#be123c' : '#0284c7'};
            border: 2px solid #38bdf8;
            box-shadow: 0 0 16px rgba(6, 182, 212, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
          ">🛰️</div>
          <div style="
            position: absolute;
            top: 44px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.95);
            color: ${isCritical ? '#fda4af' : '#67e8f9'};
            font-size: 10px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 4px;
            white-space: nowrap;
            border: 1px solid ${isCritical ? 'rgba(225, 29, 72, 0.6)' : 'rgba(6, 182, 212, 0.6)'};
            box-shadow: 0 2px 8px rgba(0,0,0,0.6);
          ">
            Sentinel-2 (+${changePct.toFixed(1)}%)
          </div>
        </div>
      `;
      const lakeIcon = L.divIcon({
        className: "himal-sentinel-lake-icon",
        html: lakeHtml,
        iconSize: [70, 70],
        iconAnchor: [35, 35],
      });
      const lMarker = L.marker([lakeData.center.lat, lakeData.center.lng], { icon: lakeIcon });
      lMarker.on("click", () => {
        if (onInspectSentinelLake) {
          onInspectSentinelLake();
        }
      });
      lMarker.bindPopup(`
        <div style="font-size: 12px; color: #1e293b; padding: 4px;">
          <b>${lakeData.lakeName}</b> (${lakeData.elevationM}m ASL)<br/>
          Sentinel-2 Area: <b>${lakeData.currentAreaKm2} km²</b> (+${changePct.toFixed(1)}%)<br/>
          NDWI Status: <b style="color: ${isCritical ? '#dc2626' : '#0284c7'};">${lakeData.waterMaskStatus}</b><br/>
          <i>Click marker to open Sentinel-2 satellite imagery inspector</i>
        </div>
      `);
      layerGroup.addLayer(lMarker);
    }
  }, [
    assets,
    selectedAsset,
    simulatedWaterRise,
    getDynamicStatus,
    corridor,
    seismicMagnitude,
    seismicEpicenter,
    lakeAreaChangePct,
    onInspectSentinelLake,
  ]);


  return (
    <div className={`relative w-full h-full bg-[#0c141d] rounded-xl overflow-hidden flex flex-col border border-white/10 ${className || "min-h-[420px]"}`}>
      {/* Top Map View Controls */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none flex-wrap gap-2">
        {/* Layer / Tile switcher */}
        <div className="pointer-events-auto flex items-center bg-[#131d2a]/90 backdrop-blur-md p-1 rounded-lg border border-white/15 shadow-xl text-xs">
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
            Carto / Relief
          </button>
        </div>

        {/* Google Maps Bridge / API Key Actions */}
        <div className="pointer-events-auto flex items-center gap-2">
          {onOpenKeyModal && (
            <button
              onClick={onOpenKeyModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-md border transition-all cursor-pointer shadow-lg ${
                hasGoogleKey
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30"
                  : "bg-amber-500/20 border-amber-500/40 text-amber-200 hover:bg-amber-500/30"
              }`}
              title="Configure Google Maps API Key"
            >
              <Key className="w-3.5 h-3.5" />
              {hasGoogleKey ? "Google Maps Key Active" : "Add Google Maps Key"}
            </button>
          )}

          {onSwitchToGoogleView && (
            <button
              onClick={onSwitchToGoogleView}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#131d2a]/90 border border-white/20 text-slate-200 hover:bg-white/10 transition-all cursor-pointer shadow-lg backdrop-blur-md"
              title="Switch to Google Maps Platform"
            >
              <Globe2 className="w-3.5 h-3.5 text-teal-400" />
              Google Maps Engine
            </button>
          )}
        </div>
      </div>

      {/* Map DOM target */}
      <div ref={mapContainerRef} className="w-full flex-1 z-10" />

      {/* Footer Info */}
      <div className="bg-[#0b131e] px-4 py-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 z-20">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-teal-400" />
          <span>
            {corridor.name} ({corridor.region}) &mdash; {corridor.centerName}
          </span>
        </div>
        <div className="text-slate-400 text-[11px] flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live Real-World Satellite Tiles Loaded (Zero Key Required)
        </div>
      </div>
    </div>
  );
}
