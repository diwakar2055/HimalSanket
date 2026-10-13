/**
 * High-Precision GIS Mathematical Utilities for Geodesic Buffers,
 * Downstream Flow Bearings, and Inundation Impact Submergence Checks.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_METERS = 6371000;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Calculates geodesic distance between two points in meters using Haversine formula
 */
export function getDistanceMeters(p1: LatLng, p2: LatLng): number {
  const lat1 = p1.lat * DEG_TO_RAD;
  const lat2 = p2.lat * DEG_TO_RAD;
  const dLat = (p2.lat - p1.lat) * DEG_TO_RAD;
  const dLng = (p2.lng - p1.lng) * DEG_TO_RAD;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates initial compass bearing from p1 to p2 in degrees (0 to 360)
 */
export function getBearingDegrees(p1: LatLng, p2: LatLng): number {
  const lat1 = p1.lat * DEG_TO_RAD;
  const lat2 = p2.lat * DEG_TO_RAD;
  const dLng = (p2.lng - p1.lng) * DEG_TO_RAD;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const brng = Math.atan2(y, x) * RAD_TO_DEG;
  return (brng + 360) % 360;
}

/**
 * Generates closed geodesic polygon coordinates for a lateral buffer along a polyline
 * @param path River centerline coordinates
 * @param lateralMeters Half-width of the buffer in physical meters
 * @returns Array of [lat, lng] coordinates forming a closed polygon
 */
export function generateGeodesicBufferPolygon(
  path: LatLng[],
  lateralMeters: number
): [number, number][] {
  if (!path || path.length < 2 || lateralMeters <= 0) return [];

  const leftPoints: [number, number][] = [];
  const rightPoints: [number, number][] = [];

  for (let i = 0; i < path.length; i++) {
    const cur = path[i];
    const prev = i > 0 ? path[i - 1] : null;
    const next = i < path.length - 1 ? path[i + 1] : null;

    // Calculate tangent vector in local meters
    const cosLat = Math.cos(cur.lat * DEG_TO_RAD);
    const mPerDegLat = 110800;
    const mPerDegLng = 111320 * cosLat;

    let dx = 0;
    let dy = 0;

    if (prev && next) {
      // Average direction
      const dx1 = (cur.lng - prev.lng) * mPerDegLng;
      const dy1 = (cur.lat - prev.lat) * mPerDegLat;
      const dx2 = (next.lng - cur.lng) * mPerDegLng;
      const dy2 = (next.lat - cur.lat) * mPerDegLat;
      dx = dx1 + dx2;
      dy = dy1 + dy2;
    } else if (next) {
      dx = (next.lng - cur.lng) * mPerDegLng;
      dy = (next.lat - cur.lat) * mPerDegLat;
    } else if (prev) {
      dx = (cur.lng - prev.lng) * mPerDegLng;
      dy = (cur.lat - prev.lat) * mPerDegLat;
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) {
      leftPoints.push([cur.lat, cur.lng]);
      rightPoints.push([cur.lat, cur.lng]);
      continue;
    }

    // Normalized tangent unit vector
    const ux = dx / len;
    const uy = dy / len;

    // Left normal (-uy, ux)
    const normLx = -uy;
    const normLy = ux;

    // Right normal (uy, -ux)
    const normRx = uy;
    const normRy = -ux;

    const dLatL = (normLy * lateralMeters) / mPerDegLat;
    const dLngL = (normLx * lateralMeters) / mPerDegLng;

    const dLatR = (normRy * lateralMeters) / mPerDegLat;
    const dLngR = (normRx * lateralMeters) / mPerDegLng;

    leftPoints.push([cur.lat + dLatL, cur.lng + dLngL]);
    rightPoints.push([cur.lat + dLatR, cur.lng + dLngR]);
  }

  // Reverse right points to form a single continuous closed boundary loop
  rightPoints.reverse();
  return [...leftPoints, ...rightPoints];
}

/**
 * Projects a point onto a line segment and returns minimum distance in meters
 */
function distancePointToSegment(
  p: LatLng,
  a: LatLng,
  b: LatLng
): number {
  const cosLat = Math.cos(p.lat * DEG_TO_RAD);
  const mPerDegLat = 110800;
  const mPerDegLng = 111320 * cosLat;

  // Local metric coordinates with respect to 'a'
  const px = (p.lng - a.lng) * mPerDegLng;
  const py = (p.lat - a.lat) * mPerDegLat;
  const bx = (b.lng - a.lng) * mPerDegLng;
  const by = (b.lat - a.lat) * mPerDegLat;

  const segmentLenSq = bx * bx + by * by;
  if (segmentLenSq === 0) {
    return Math.sqrt(px * px + py * py);
  }

  // Projection parameter t
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / segmentLenSq));
  const projX = t * bx;
  const projY = t * by;

  const dx = px - projX;
  const dy = py - projY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Determines whether a coordinate falls within a specified meter distance of a polyline
 */
export function isPointWithinBuffer(
  point: LatLng,
  path: LatLng[],
  bufferMeters: number
): { isWithin: boolean; distanceMeters: number } {
  if (!path || path.length < 2) {
    return { isWithin: false, distanceMeters: Infinity };
  }

  let minDist = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const d = distancePointToSegment(point, path[i], path[i + 1]);
    if (d < minDist) {
      minDist = d;
      if (minDist <= bufferMeters) {
        // Early exit optimization
        break;
      }
    }
  }

  return {
    isWithin: minDist <= bufferMeters,
    distanceMeters: Math.round(minDist),
  };
}

/**
 * Generates downstream sample points along a river path suitable for flow direction arrows
 * Returns sampled positions and bearings spaced approximately every `spacingMeters`
 */
export function sampleRiverFlowVectors(
  path: LatLng[],
  spacingMeters: number = 600
): Array<{ lat: number; lng: number; bearing: number }> {
  if (!path || path.length < 2) return [];

  const vectors: Array<{ lat: number; lng: number; bearing: number }> = [];
  let accumulatedDist = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    const segDist = getDistanceMeters(p1, p2);

    accumulatedDist += segDist;
    if (accumulatedDist >= spacingMeters) {
      accumulatedDist = 0;
      const midLat = (p1.lat + p2.lat) / 2;
      const midLng = (p1.lng + p2.lng) / 2;
      const bearing = getBearingDegrees(p1, p2);
      vectors.push({ lat: midLat, lng: midLng, bearing });
    }
  }

  return vectors;
}
