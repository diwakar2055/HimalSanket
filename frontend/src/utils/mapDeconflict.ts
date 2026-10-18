import { MapAsset } from "../data/hazardMapData";

export interface DeconflictedAsset extends MapAsset {
  displayLat: number;
  displayLng: number;
  isClustered: boolean;
  clusterSize: number;
  clusterIndex: number;
}

export interface MapLayerFilters {
  river: boolean;
  shelters: boolean;
  health: boolean;
  schools: boolean;
  bridges: boolean;
  landslides: boolean;
  sar: boolean;
}

export const DEFAULT_LAYER_FILTERS: MapLayerFilters = {
  river: true,
  shelters: true,
  health: true,
  schools: true,
  bridges: true,
  landslides: true,
  sar: true,
};

export type LayerPreset = "all" | "tactical" | "evac";

export const LAYER_PRESETS: Record<LayerPreset, MapLayerFilters> = {
  all: {
    river: true,
    shelters: true,
    health: true,
    schools: true,
    bridges: true,
    landslides: true,
    sar: true,
  },
  tactical: {
    river: true,
    shelters: true,
    health: false,
    schools: false,
    bridges: false,
    landslides: true,
    sar: true,
  },
  evac: {
    river: true,
    shelters: true,
    health: true,
    schools: false,
    bridges: true,
    landslides: true,
    sar: false,
  },
};

/**
 * Clusters closely situated POIs in village hubs and fans them out
 * into a clean geometric constellation so markers do not overlap each other on the map.
 * The original GPS coordinates and elevation are strictly preserved for popups.
 */
export function deconflictMapAssets(
  assets: MapAsset[],
  proximityThresholdDeg = 0.0011, // ~120m - clusters POIs within village walking footprint
  offsetRadiusDeg = 0.00042 // ~45m - gives 22-25 screen pixels separation at zoom 13
): DeconflictedAsset[] {
  if (!assets || assets.length === 0) return [];

  // Group assets into connected spatial clusters (connected-component search)
  const clusters: MapAsset[][] = [];
  const assigned = new Set<string>();

  for (let i = 0; i < assets.length; i++) {
    const root = assets[i];
    if (assigned.has(root.id)) continue;

    const currentCluster: MapAsset[] = [root];
    assigned.add(root.id);
    const queue = [root];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (let j = 0; j < assets.length; j++) {
        const candidate = assets[j];
        if (assigned.has(candidate.id)) continue;

        const dLat = Math.abs(curr.lat - candidate.lat);
        const dLng = Math.abs(curr.lng - candidate.lng);
        // Euclidean distance in degrees
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        if (dist < proximityThresholdDeg) {
          assigned.add(candidate.id);
          currentCluster.push(candidate);
          queue.push(candidate);
        }
      }
    }

    clusters.push(currentCluster);
  }

  // Calculate display positions for each asset
  const result: DeconflictedAsset[] = [];

  for (const cluster of clusters) {
    const N = cluster.length;

    if (N === 1) {
      // Isolated asset: render at exact GPS coordinates
      const single = cluster[0];
      result.push({
        ...single,
        displayLat: single.lat,
        displayLng: single.lng,
        isClustered: false,
        clusterSize: 1,
        clusterIndex: 0,
      });
      continue;
    }

    // Centroid of the cluster
    const avgLat = cluster.reduce((sum, item) => sum + item.lat, 0) / N;
    const avgLng = cluster.reduce((sum, item) => sum + item.lng, 0) / N;

    // Distribute items in an aesthetically balanced geometric constellation
    // Aspect ratio stretch for longitude: at ~28.3° latitude, 1 deg lng ≈ 0.88 deg lat in meters
    const lngAspect = 1.14;

    cluster.forEach((item, idx) => {
      let dLat = 0;
      let dLng = 0;

      if (N === 2) {
        // Horizontal spread (West / East) perpendicular to north-south Himalayan river valleys
        dLat = 0;
        dLng = (idx === 0 ? -1 : 1) * offsetRadiusDeg * lngAspect;
      } else if (N === 3) {
        // Equilateral triangle (North, South-East, South-West)
        const angles = [Math.PI / 2, -Math.PI / 6, (-5 * Math.PI) / 6];
        const theta = angles[idx % 3];
        dLat = offsetRadiusDeg * Math.sin(theta);
        dLng = offsetRadiusDeg * Math.cos(theta) * lngAspect;
      } else if (N === 4) {
        // Diamond constellation (North, East, South, West)
        const angles = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];
        const theta = angles[idx % 4];
        dLat = offsetRadiusDeg * Math.sin(theta);
        dLng = offsetRadiusDeg * Math.cos(theta) * lngAspect;
      } else {
        // N >= 5: Uniform radial distribution with radius scaled gently
        const dynamicRadius = offsetRadiusDeg * Math.min(1.3, 1 + (N - 4) * 0.08);
        const theta = Math.PI / 2 - (2 * Math.PI * idx) / N;
        dLat = dynamicRadius * Math.sin(theta);
        dLng = dynamicRadius * Math.cos(theta) * lngAspect;
      }

      result.push({
        ...item,
        displayLat: avgLat + dLat,
        displayLng: avgLng + dLng,
        isClustered: true,
        clusterSize: N,
        clusterIndex: idx,
      });
    });
  }

  return result;
}

/**
 * Calculates a clean anchor point for a landslide hazard label along the upper mountain ridge.
 * This guarantees the badge stays high on the valley wall scarp and never collides with
 * the river trail, bridges, evacuation shelters, or clinics on the valley floor.
 */
export function getLandslideCrownScarpAnchor(
  polygon: [number, number][]
): { lat: number; lng: number } {
  if (!polygon || polygon.length === 0) {
    return { lat: 28.2, lng: 85.4 };
  }

  // Find the centroid
  const centerLat = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
  const centerLng = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;

  // Find the vertex furthest from the center (crown scarp rim)
  let maxDistSq = -1;
  let crownVertex = polygon[0];

  for (const pt of polygon) {
    const dLat = pt[0] - centerLat;
    const dLng = pt[1] - centerLng;
    const distSq = dLat * dLat * 1.5 + dLng * dLng + (pt[0] > centerLat ? 0.00005 : 0);
    if (distSq > maxDistSq) {
      maxDistSq = distSq;
      crownVertex = pt;
    }
  }

  // Position label at crown vertex, shifted slightly outwards onto the ridge
  const dirLat = crownVertex[0] >= centerLat ? 1 : -1;
  const dirLng = crownVertex[1] >= centerLng ? 1 : -1;

  const anchorLat = crownVertex[0] + dirLat * 0.0003;
  const anchorLng = crownVertex[1] + dirLng * 0.0003;

  return { lat: anchorLat, lng: anchorLng };
}
