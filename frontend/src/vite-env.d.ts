/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_GOOGLE_GEOCODING_API_KEY?: string;
  readonly VITE_GOOGLE_ELEVATION_API_KEY?: string;
  readonly VITE_GOOGLE_PLACES_API_KEY?: string;
  readonly VITE_RISK_ENGINE_API?: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
