import React from "react";
import {
  GoogleModernHazardMap,
  GoogleModernHazardMapProps,
} from "./GoogleModernHazardMap";

export type ModernHazardMapProps = GoogleModernHazardMapProps;

/**
 * ModernHazardMap
 * Powered exclusively by Google Maps Platform with high-resolution Satellite,
 * Terrain, and Hybrid GIS layers, live SAR flight vectors, and automated POI deconfliction.
 */
export function ModernHazardMap(props: ModernHazardMapProps) {
  return <GoogleModernHazardMap {...props} />;
}

export { GoogleModernHazardMap };
export default ModernHazardMap;
