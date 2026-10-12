# HimalSanket (हिमाल संकेत) — Multi-Hazard Disaster Risk Engine

> **AI-Powered Predictive Multi-Hazard Early Warning Backend for Nepal**  
> *Theme: Sustainability & Social Impact — Google Cloud AI Builder Cup*

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/Framework-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![Cloud Run Ready](https://img.shields.io/badge/Deploy-Google_Cloud_Run-4285F4.svg)](https://cloud.google.com/run)
[![Tests](https://img.shields.io/badge/Tests-23%20Passing-brightgreen.svg)]()

---

## 🏔️ 1. Problem Context & Innovation

Nepal’s Himalayas face a deadly convergence of hydro-meteorological and seismic hazards:
* **Catastrophic Landslides & Mudflows**
* **Glacial Lake Outburst Floods (GLOF)** (e.g., Imja Tsho, Tsho Rolpa, Thorthormi)
* **Flash Floods & River Gorges Bottlenecks** (Langtang, Kali Gandaki, Marsyangdi)

Existing government early-warning systems are **reactive river-gauges only** — issuing alerts *after* downstream floodwaters surge. Narrow Himalayan trekking corridors have one trail in and one trail out; when an upper gorge dams or a moraine lake breaches, downstream settlements and trekking expeditions are trapped without warning.

**HimalSanket** solves this by **fusing multiple weak pre-disaster signals** into an actionable, explainable real-time risk score before failure occurs.

---

## 🧱 2. System Architecture & Mathematical Formulation

The risk engine operates as a deterministic, explainable mathematical fusion pipeline feeding the **React Dashboard**, downstream **Gemini Reasoning Layer**, and emergency dispatch networks.

```
       ┌───────────────────────────────┐
       │   MULTI-SOURCE TELEMETRY      │
       ├───────────────────────────────┤
       │ • 24h Rainfall vs Threshold   │
       │ • Localized Seismic Activity  │
       │ • Glacial Lake % Expansion    │
       │ • Terrain Susceptibility      │
       │ • Crowdsourced Ground Reports │
       └──────────────┬────────────────┘
                      │
                      ▼
       ┌───────────────────────────────┐
       │     SIGNAL NORMALIZATION      │
       │        (Scale: 0.0 - 1.0)     │
       └──────────────┬────────────────┘
                      │
                      ▼
       ┌───────────────────────────────┐
       │      WEIGHTED FUSION DOT      │
       │ Score = Σ (w_i × Signal_i)   │
       └──────────────┬────────────────┘
                      │
                      ▼
       ┌───────────────────────────────┐
       │     OPERATIONAL RISK TIERS    │
       │   Low / Moderate / High / Crit │
       └──────────────┬────────────────┘
                      │
                      ▼
       ┌───────────────────────────────┐
       │     PRE-GEMINI EXPLANATION    │
       │  • Dynamic Key Drivers        │
       │  • Bilingual EN / NE Advisory │
       │  • Structured Action Code     │
       └───────────────────────────────┘
```

### Mathematical Normalization

| Signal | Raw Units | Normalization Function | Default Cap |
| :--- | :--- | :--- | :--- |
| **Rainfall** ($S_{rf}$) | $\text{mm}/24\text{h}$ | $\min(\frac{\text{Rainfall}}{\text{Rain Threshold}}, 1.0)$ | Regional DHM Warning Threshold (e.g., $144\text{ mm}$) |
| **Seismic** ($S_{seis}$) | Richter ($M$) | $\min(\frac{\text{Magnitude}}{\text{Max Seismic Mag}}, 1.0)$ | $4.0\text{ M}$ localized trigger |
| **Glacial Lake** ($S_{lake}$) | Area % $\Delta$ | $\min(\frac{\max(0, \Delta\% lago)}{\text{Max Growth \%}}, 1.0)$ | $+15.0\%$ area expansion |
| **Terrain** ($S_{terr}$) | Susceptibility | $\text{clamp}(\text{Terrain Susceptibility}, 0.0, 1.0)$ | $1.0$ (Steep geomorphic failure slope) |
| **Ground Reports** ($S_{rep}$) | Count / Flags | $\min(\sum (\text{weight} \times \text{boost}), 1.0)$ | $0.18/\text{report}$, voice bonus $1.15\times$, capped at $1.0$ |

### Weighted Fusion

$$\text{Risk Score} = w_{rf} S_{rf} + w_{seis} S_{seis} + w_{lake} S_{lake} + w_{terr} S_{terr} + w_{rep} S_{rep}$$

* **Default Configurable Weights** ($\sum w_i = 1.0$):
  * $w_{rf} = 0.30$ (Rainfall)
  * $w_{lake} = 0.25$ (Glacial Lake Expansion)
  * $w_{seis} = 0.20$ (Seismic Tremor)
  * $w_{rep} = 0.15$ (Ground Validation Reports)
  * $w_{terr} = 0.10$ (Static Terrain Susceptibility)

### Operational Decision Tiers

* **Critical** ($\ge 0.70$, **गम्भीर**): Immediate threat of catastrophic debris cascade or GLOF. Evacuate river corridors; postpone all valley entry; notify Armed Police Force (APF) search & rescue.
* **High** ($0.50 - 0.69$, **उच्च**): Acute slope instability / flash flood probability. Delay non-essential travel; halt gorge passages.
* **Moderate** ($0.30 - 0.49$, **मध्यम**): Pre-monsoon / catchment saturation building. Monitor conditions closely; maintain radio check-ins.
* **Low** ($< 0.30$, **न्यून**): Baseline stability; routine travel advisory in effect.

---

## ⚡ 3. Quickstart & Local Execution

### 1. Prerequisites
Python 3.10+ installed.

### 2. Set Up Virtual Environment & Dependencies
```bash
# Clone or navigate to the repository
cd HimalSanket

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On macOS / Linux:
source .venv/bin/activate

# Install locked dependencies
pip install -r requirements.txt
```

### 3. Run the Risk Engine Server
```bash
# Option A: Run directly with Uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Option B: Run via Python entrypoint
python main.py
```

Open interactive Swagger documentation in your browser:
* **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 📡 4. Core API Endpoints

### 1. `POST /orchestrate` (Master Orchestrator Pipeline)
Executes the unified 4-step early warning orchestration:
1. Calls the **Risk Engine** to fuse sensor signals into normalized metrics and operational tiers.
2. Passes numerical telemetry to **Google Gemini (2.0 Flash)** to generate human-readable briefings (English, Nepali, SMS Romanized) and tactical directives.
3. Saves the session to **Cloud Firestore (Firebase)** under `hazard_sessions` for audit trails and real-time dashboard subscriptions.
4. Returns the **combined JSON** payload directly to the frontend.

```bash
curl -X POST "http://localhost:8000/orchestrate" \
  -H "Content-Type: application/json" \
  -d '{
    "location_id": "langtang",
    "location_name": "Langtang Valley",
    "region": "Rasuwa",
    "rainfall": 78.0,
    "rain_threshold": 144.0,
    "seismic_activity": 2.1,
    "lake_area_change": 5.5,
    "terrain_susceptibility": 0.71,
    "reports": [
      {
        "report_type": "water",
        "label": "Water rising",
        "note": "Stream murky and water level rising rapidly",
        "voice_attached": true
      }
    ]
  }'
```

**Combined JSON Response to Frontend:**
```json
{
  "session_id": "session_langtang_1728662400_a1b2c3",
  "status": "success",
  "timestamp": "2026-10-11T15:30:00Z",
  "orchestration_time_ms": 3.42,
  "location": {
    "location_id": "langtang",
    "location_name": "Langtang Valley",
    "region": "Rasuwa",
    "gps": "28.2096° N, 85.5089° E"
  },
  "risk_assessment": {
    "risk_score": 0.5218,
    "risk_level": "High",
    "risk_level_ne": "उच्च",
    "normalized_signals": { ... },
    "signal_contributions": { ... }
  },
  "gemini_intelligence": {
    "model_used": "Google Gemini 2.0 Flash",
    "briefing_en": "WARNING: Langtang Valley is at HIGH risk (0.52). Elevated signals: rainfall approaching threshold, rapid glacial lake expansion. Active slope instability and flash flood hazard.",
    "briefing_ne": "चेतावनी: Langtang Valley उच्च जोखिममा छ (0.52)। अत्यावश्यक बाहेक पदयात्रा स्थगित गर्नुहोस् र सतर्क रहनुहोस्।",
    "sms_alert_romanized": "HimalSanket HIGH ALERT: Langtang Valley ma jokhim badheko cha. Yatra sthagit garnuhos.",
    "action_directive": "DELAY NON-ESSENTIAL TRAVEL; BRIEF ALL EXPEDITION LEADERS"
  },
  "firestore_sync": {
    "saved": true,
    "collection": "hazard_sessions",
    "session_id": "session_langtang_1728662400_a1b2c3",
    "storage_backend": "Cloud Firestore",
    "synced_at": "2026-10-11T15:30:00Z"
  }
}
```

### 2. `GET /health`
Returns system status, active fusion weights, threshold limits, cache metrics, and uptime.
```bash
curl -X GET "http://localhost:8000/health"
```

### 2. `POST /risk`
Evaluates multi-hazard risk for any incoming corridor telemetry.
```bash
curl -X POST "http://localhost:8000/risk" \
  -H "Content-Type: application/json" \
  -d '{
    "location_id": "langtang",
    "location_name": "Langtang Valley",
    "region": "Rasuwa",
    "gps": "28.2096° N, 85.5089° E",
    "rainfall": 38.0,
    "rain_threshold": 144.0,
    "seismic_activity": 1.8,
    "lake_area_change": 4.0,
    "terrain_susceptibility": 0.71,
    "reports": [
      {
        "report_type": "water",
        "label": "Water rising",
        "note": "Stream murky and volume rising fast",
        "voice_attached": true
      }
    ]
  }'
```

**Response Output:**
```json
{
  "location_id": "langtang",
  "location_name": "Langtang Valley",
  "region": "Rasuwa",
  "gps": "28.2096° N, 85.5089° E",
  "risk_score": 0.3409,
  "risk_level": "Moderate",
  "risk_level_ne": "मध्यम",
  "normalized_signals": {
    "rainfall": 0.2639,
    "seismic": 0.45,
    "lake": 0.2667,
    "terrain": 0.71,
    "reports": 0.2277
  },
  "signal_contributions": {
    "rainfall": 0.0792,
    "seismic": 0.09,
    "lake": 0.0667,
    "terrain": 0.071,
    "reports": 0.0342
  },
  "explanation": {
    "key_drivers": [
      "rapid glacial lake expansion (+4.0%)",
      "elevated localized seismic tremors (1.8 M)",
      "multiple ground anomaly reports (1 field report)"
    ],
    "summary_message": "Langtang Valley is at MODERATE risk. Primary indicators: rapid glacial lake expansion (+4.0%), elevated localized seismic tremors (1.8 M), multiple ground anomaly reports (1 field report). Pre-monsoon / catchment saturation is building.",
    "summary_message_ne": "Langtang Valley मध्यम जोखिममा छ। प्रमुख कारकहरू: ...। जोखिम बढ्दो क्रममा छ, सतर्कता अपनाउनुहोस्।",
    "recommendation": "Monitor conditions closely before departure. Trekking agencies should maintain regular satellite/radio check-ins; no hard restrictions yet.",
    "recommendation_ne": "प्रस्थान अघि मौसम र बाटोको अवस्था नजिकबाट अनुगमन गर्नुहोस्। यात्रा संघसंस्थाहरू सम्पर्कमा रहनुहोस्।",
    "action_code": "MONITOR_CONDITIONS"
  },
  "timestamp": "2026-09-12T14:20:00Z",
  "calculated_in_ms": 1.2
}
```

### 3. `POST /simulate` (Critical Demo Endpoint)
Simulates an acute hazard spike demonstrating the live transition from **Moderate $\rightarrow$ Critical**.
```bash
curl -X POST "http://localhost:8000/simulate" \
  -H "Content-Type: application/json" \
  -d '{
    "location_id": "langtang",
    "rainfall_spike": 75.0,
    "seismic_spike": 1.8,
    "lake_spike": 7.0,
    "additional_reports": 2
  }'
```

**Response Highlights:**
```json
{
  "location_id": "langtang",
  "location_name": "Langtang Valley",
  "transition": "Moderate -> Critical",
  "delta": {
    "risk_score_delta": 0.435,
    "rainfall_delta_mm": 75.0,
    "seismic_delta_magnitude": 1.8,
    "lake_change_delta_pct": 7.0,
    "reports_delta_count": 2.0
  },
  "simulated": {
    "risk_score": 0.7419,
    "risk_level": "Critical",
    "risk_level_ne": "गम्भीर"
  }
}
```

### 4. `GET /regions`
Returns curated high-priority corridors in Nepal with pre-evaluated baseline risk:
* `langtang` — Langtang Valley (Rasuwa)
* `khumbu` — Everest / Khumbu (Solukhumbu)
* `annapurna` — Annapurna Circuit (Manang)
* `manaslu` — Manaslu Circuit (Gorkha)

```bash
curl -X GET "http://localhost:8000/regions"
```

---

## 🧪 5. Automated Verification & Testing

Run the test suite with verbose reporting:
```bash
pytest -v tests/
```
Coverage includes:
* Normalization edge cases (zero values, overflow beyond thresholds, negative values)
* Weight validation & runtime weight override mechanics
* Risk tier boundary classifications
* Live Moderate $\rightarrow$ Critical simulation verification
* LRU/TTL caching behavior and latency checks
* Full HTTP API status codes, validation errors (422), and 404 lookups

---

## ☁️ 6. Deployment to Google Cloud Run

The repository includes a production-grade `Dockerfile` compliant with Google Cloud Run’s container runtime contracts (listens on `$PORT`, executes as non-root user).

### Deploy via Google Cloud CLI:
```bash
# 1. Authenticate with Google Cloud
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID

# 2. Build and Deploy directly to Cloud Run
gcloud run deploy himalsanket-risk-engine \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 1 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars HIMAL_ENVIRONMENT=production
```

---

## 🏆 7. Sustainability & Social Impact Rationale

* **Saves Human Lives**: Directly addresses blind spots in high-mountain valleys where single-point sensor failures historically caused mass casualties (2015 Langtang debris avalanche, 2021 Melamchi flash flood).
* **Democratizes Disaster Intelligence**: Incorporates non-literate ground reports (voice notes from local porters & teahouse owners) alongside satellite and hydrological feeds.
* **Cost-Efficient & Ultra-Lightweight**: Requires zero GPU overhead; executes pure deterministic weighted matrix fusion on micro-instances (<$5/month on Cloud Run).
