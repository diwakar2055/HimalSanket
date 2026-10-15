/**
 * HimalSanket API Client: Connects the React Frontend to the FastAPI Backend Orchestrator.
 * 
 * Orchestrator Flow:
 * 1. Sends telemetry & reports to POST /orchestrate
 * 2. Receives combined JSON:
 *    - Pure physics Risk Engine calculations
 *    - Google Gemini AI multi-lingual briefings (English, Nepali, SMS Romanized)
 *    - Cloud Firestore persistence receipt & session tracking
 */

const RISK_ENGINE_API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_RISK_ENGINE_API) ||
  "http://localhost:8080";

export interface OrchestratedLocationInput {
  location_id: string;
  location_name?: string;
  region?: string;
  gps?: string;
  rainfall: number;
  rain_threshold: number;
  seismic_activity: number;
  lake_area_change: number;
  terrain_susceptibility: number;
  reports?: Array<{
    id?: string | number;
    report_type?: string;
    label?: string;
    note?: string;
    voice_attached?: boolean;
    timestamp?: string;
  }>;
}

export interface OrchestratedAssessmentResponse {
  session_id: string;
  status: string;
  timestamp: string;
  orchestration_time_ms: number;
  location: {
    location_id: string;
    location_name: string;
    region: string;
    gps?: string;
  };
  risk_assessment: {
    risk_score: number;
    risk_level: "Low" | "Moderate" | "High" | "Critical";
    risk_level_ne: string;
    normalized_signals: {
      rainfall: number;
      seismic: number;
      lake: number;
      terrain: number;
      reports: number;
    };
    signal_contributions: {
      rainfall: number;
      seismic: number;
      lake: number;
      terrain: number;
      reports: number;
    };
    explanation: {
      key_drivers: string[];
      summary_message: string;
      summary_message_ne: string;
      recommendation: string;
      recommendation_ne: string;
      action_code: string;
    };
    calculated_in_ms: number;
  };
  gemini_intelligence: {
    model_used: string;
    briefing_en: string;
    briefing_ne: string;
    sms_alert_romanized: string;
    action_directive: string;
    is_live_gemini_call: boolean;
  };
  firestore_sync: {
    saved: boolean;
    collection: string;
    session_id: string;
    storage_backend: string;
    synced_at: string;
    error?: string | null;
  };
}

/**
 * Executes the full end-to-end multi-hazard assessment pipeline via the Backend Orchestrator.
 */
export async function evaluateOrchestratedRisk(
  input: OrchestratedLocationInput
): Promise<OrchestratedAssessmentResponse> {
  const response = await fetch(`${RISK_ENGINE_API_BASE}/orchestrate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Orchestration failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

/**
 * Retrieves a past assessment session directly from Firebase Firestore.
 */
export async function getSessionFromFirestore(sessionId: string): Promise<any> {
  const response = await fetch(`${RISK_ENGINE_API_BASE}/orchestrate/sessions/${sessionId}`);
  if (!response.ok) {
    throw new Error(`Failed to load session ${sessionId}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetches recent assessment history recorded in Firestore for the dashboard timeline.
 */
export async function listRecentSessions(limit: number = 20): Promise<any[]> {
  const response = await fetch(`${RISK_ENGINE_API_BASE}/orchestrate/sessions?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to list sessions: ${response.statusText}`);
  }
  return response.json();
}

export interface SentinelSatelliteLake {
  lake_id: string;
  lake_name: string;
  corridor_id: string;
  region: string;
  elevation_m: number;
  gps: string;
  center: { lat: number; lng: number };
  sensor: string;
  band_combination: string;
  baseline_date: string;
  current_date: string;
  baseline_area_km2: number;
  current_area_km2: number;
  area_change_pct: number;
  water_mask_status: string;
  satellite_tile_preview: string;
  description: string;
}

export interface DownstreamCascadeStation {
  station: string;
  arrival_min: number;
  status: string;
}

export interface LiveTelemetryResponse {
  sensed_at: string;
  active_scenario: string;
  corridor: {
    corridor_id: string;
    name: string;
    region: string;
    gps: string;
    rainfall: number;
    rain_threshold: number;
    seismic_activity: number;
    seismic_epicenter?: {
      lat: number;
      lng: number;
      depth_km: number;
      label: string;
    };
    lake_area_change: number;
    terrain_susceptibility: number;
    reports: any[];
    active_drivers?: string[];
    last_sentinel_pass?: string;
    live_gauge_station?: string;
  };
  sentinel_satellite_lake: SentinelSatelliteLake;
  seismic_waveform: {
    magnitude: number;
    epicenter?: {
      lat: number;
      lng: number;
      depth_km: number;
      label: string;
    };
    status: string;
  };
  downstream_cascade: DownstreamCascadeStation[];
  risk_assessment: {
    location_id: string;
    location_name: string;
    region: string;
    gps?: string;
    risk_score: number;
    risk_level: "Low" | "Moderate" | "High" | "Critical";
    risk_level_ne: string;
    normalized_signals: {
      rainfall: number;
      seismic: number;
      lake: number;
      terrain: number;
      reports: number;
    };
    signal_contributions: {
      rainfall: number;
      seismic: number;
      lake: number;
      terrain: number;
      reports: number;
    };
    explanation: {
      key_drivers: string[];
      summary_message: string;
      summary_message_ne: string;
      recommendation: string;
      recommendation_ne: string;
      action_code: string;
    };
    timestamp: string;
    calculated_in_ms: number;
  };
  gemini_intelligence: {
    corridor_name: string;
    risk_level: string;
    model_used: string;
    briefing_en: string;
    briefing_ne: string;
    sms_alert_romanized: string;
    action_directive: string;
    is_live_gemini_call: boolean;
  };
}

/**
 * Fetches real-time sensed telemetry & evaluated multi-hazard risk from the backend.
 */
export async function fetchLiveTelemetry(corridorId: string = "langtang"): Promise<LiveTelemetryResponse> {
  const response = await fetch(`${RISK_ENGINE_API_BASE}/telemetry/live/${corridorId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch live telemetry: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Triggers a disaster presentation scenario on the backend live feeder.
 */
export async function triggerPresentationScenario(
  scenarioId: string,
  corridorId: string = "langtang"
): Promise<{ status: string; active_scenario: string; description: string; telemetry: any }> {
  const response = await fetch(`${RISK_ENGINE_API_BASE}/telemetry/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario_id: scenarioId, corridor_id: corridorId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to trigger scenario: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetches monitored Sentinel-2 glacial lake catalog.
 */
/**
 * Executes TimesFM time-series predictive rainfall forecasting via backend foundation model.
 */
export async function fetchTimesfmForecast(
  corridorId: string = "langtang",
  corridorName: string = "Langtang Valley",
  historicalRain: number[] = [3.2, 4.1, 5.0, 6.8, 8.4, 14.2, 19.5, 16.0, 11.2, 7.8, 5.1, 4.0],
  threshold: number = 144.0,
  horizon: number = 24
): Promise<any> {
  const response = await fetch(`${RISK_ENGINE_API_BASE}/ai/predict/rainfall`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      corridor_id: corridorId,
      corridor_name: corridorName,
      rain_threshold_24h: threshold,
      historical_hourly_rain: historicalRain,
      forecast_horizon_hours: horizon,
    }),
  });
  if (!response.ok) {
    throw new Error(`TimesFM forecast failed (${response.status}): ${response.statusText}`);
  }
  return response.json();
}

