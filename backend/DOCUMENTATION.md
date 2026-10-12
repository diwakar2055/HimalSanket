# HimalSanket: Complete Beginner-Friendly Guide & System Architecture

> **AI-Powered Multi-Hazard Early Warning Backend for Nepal**  
> *Written in simple, plain English with diagrams and practical real-world flows.*  
> *Google Cloud AI Builder Cup 2026 — Theme: Sustainability & Social Impact*  
> *Team HimalSanket: Amrit, Divakar, Basanta, Sudip*

---

## 🧭 Table of Contents
1. [The Big Picture: What Problem Does This Solve?](#1-the-big-picture-what-problem-does-this-solve)
2. [What is Sentinel-2 Satellite Imagery & How Does It Work?](#2-what-is-sentinel-2-satellite-imagery--how-does-it-work)
3. [How Are Ground Voice Recordings Analyzed by AI?](#3-how-are-ground-voice-recordings-analyzed-by-ai)
4. [How Does All Data Flow Into the Risk Engine?](#4-how-does-all-data-flow-into-the-risk-engine)
5. [The Risk Engine Explained: How 5 Numbers Become 1 Score](#5-the-risk-engine-explained-how-5-numbers-become-1-score)
6. [How the Frontend Dashboard Uses This Backend](#6-how-the-frontend-dashboard-uses-this-backend)
7. [Maps & Downstream River Networks (Which Villages Will Flood?)](#7-maps--downstream-river-networks-which-villages-will-flood)
8. [Google TimesFM & Predictive Weather Spikes](#8-google-timesfm--predictive-weather-spikes)
9. [Complete API Reference with Example Requests](#9-complete-api-reference-with-example-requests)

---

## 1. The Big Picture: What Problem Does This Solve?

Imagine a beautiful, deep mountain valley in Nepal like **Langtang** or **Everest (Khumbu)**:
* Thousands of tourists, local Sherpas, porters, and teahouse families live and trek along the canyon floor.
* There is **only one foot trail in and one foot trail out**.
* High above them (at 5,000 meters altitude), huge glaciers hold massive lakes behind natural dams made of loose dirt, ice, and moraine rocks.

### The Danger:
1. **Cloudbursts (Heavy Rain)**: Monsoon clouds slam into Himalayan cliffs, dropping 100mm of rain in a few hours.
2. **Glacial Lake Outburst Floods (GLOF)**: When a glacier calves or rain overfills a glacial lake, the dirt dam bursts. A catastrophic tsunami of ice, boulders, and water charges down the narrow canyon at 60 km/h.
3. **Landslides**: Saturated hillsides collapse, blocking the river, forming a temporary dam, and then bursting through downstream villages.

### Why Existing Government Systems Fail:
Nepal's current warning systems are **river gauges only** (a sensor placed on a bridge pole in the river).
* That means alerts only go off **after** the flood has already hit the sensor!
* In a narrow canyon, downstream villages only get 10–15 minutes of warning. People cannot run up a steep cliff in 10 minutes in the pitch dark.

### The HimalSanket Solution:
We don't wait for the flood to hit a bridge. We combine **weak pre-disaster signals** (rain forecasts, satellite lake pictures, earthquake tremors, and porter voice notes) to calculate an early warning **hours before the flood occurs**.

---

## 2. What is Sentinel-2 Satellite Imagery & How Does It Work?

### "What is Sentinel-2?"
The European Space Agency (ESA) operates two free satellites in space called **Sentinel-2**. Every 5 days, they fly over Nepal and photograph every mountain, river, and glacier.

### "How is a satellite photo different from my phone's camera?"
Your smartphone camera only captures **Visible Light**: Red, Green, and Blue (RGB).

Sentinel-2 has **superhuman eyes** (13 different light bands). Specifically, it sees **Near-Infrared (NIR)** light, which humans cannot see.

### Why Near-Infrared is the Secret to Detecting Water (NDWI):
* **Water is a light sponge for Near-Infrared**: Pure water swallows (absorbs) almost 100% of Near-Infrared light. In an infrared image, water looks **pitch black**.
* **Rock, snow, ice, and dirt reflect Near-Infrared light brightly**.

Scientists created a famous formula called **NDWI (Normalized Difference Water Index)**:

$$\text{NDWI} = \frac{\text{Green Light} - \text{Near-Infrared Light}}{\text{Green Light} + \text{Near-Infrared Light}}$$

### How a Satellite Picture Becomes a Risk Number (Step-by-Step):

```
Step 1: Satellite flies over Langtang / Everest glacial lake.
              │
              ▼
Step 2: Calculate NDWI formula on every pixel.
        • If NDWI > 0.30 ➔ The pixel is WATER 💧
        • If NDWI ≤ 0.30 ➔ The pixel is ROCK or ICE 🪨
              │
              ▼
Step 3: Count the water pixels.
        • Suppose we count 12,800 water pixels.
        • Each Sentinel-2 pixel is 10m × 10m = 100 square meters.
        • Lake Area = 12,800 × 100 m² = 1,280,000 m² = 1.28 km²
              │
              ▼
Step 4: Compare Today's Area vs Baseline (Last Month's Area):
        • Baseline Area = 1.28 km²
        • Today's Area  = 1.42 km²
        • Growth Delta  = ((1.42 - 1.28) / 1.28) × 100% = +10.9% Expansion!
              │
              ▼
Step 5: Send '+10.9%' to the Risk Engine!
        • Normal lake melt is +1% to +3%.
        • A +10.9% jump means the lake is rapidly overfilling!
        • Risk Engine flags GLOF surge alert!
```

### "How does the backend actually get this satellite image?"
* Sentinel-2 images are completely free and public.
* We query the **Google Earth Engine (GEE) API** or **Copernicus Data Space** using the lake's GPS bounding box (e.g. `[27.98° N, 86.92° E]` for Imja Tsho).
* Our backend endpoint `POST /ai/analyze/satellite` accepts these multi-temporal satellite area readings, computes the growth delta %, and calculates the normalized hazard score ($0.0 - 1.0$).

---

## 3. How Are Ground Voice Recordings Analyzed by AI?

### The Real-World Problem on Mountain Trails:
When a local porter, trekking guide, or teahouse owner in Langtang sees muddy water rising or rocks tumbling:
* They are often walking in cold, pouring rain.
* They may speak local dialects (Nepali, Tamang, Sherpa).
* They **cannot stop to type long English text messages** on a keyboard!
* Instead, they tap one big button on our mobile app and speak a **10-second voice note**:
  > *"खोला धमिलो भएर एकदमै तीव्र गतिमा बढ्दै छ, माथिबाट ठूलो गडगडाएको आवाज आयो!"*  
  > *(The river is murky and rising fast, a loud rumbling sound came from above!)*

### How Our AI Analyzes What the Audio Says (Step-by-Step):

```
Porter's Phone (Audio .wav) ──► HimalSanket Backend (POST /ai/process/voice-report)
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │ 1. Speech-to-Text / Audio Multimodal Input    │
                 │    Google Gemini 2.0 Flash or Whisper listens │
                 │    to the audio file and transcribes text.   │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │ 2. Multilingual Hazard Keyword Extraction     │
                 │    Scans for danger words:                    │
                 │    • "पानी बढ्यो" / "water rising" ➔ WATER    │
                 │    • "पहिरो" / "landslide / crack" ➔ LANDSLIDE│
                 │    • "ठूलो आवाज" / "rumbling" ➔ SOUND / GLOF  │
                 │    • "गुहार" / "trapped" ➔ SOS DISTRESS       │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │ 3. Score Boost Calculation                    │
                 │    • Base boost: 0.18 points                  │
                 │    • Voice recording bonus: +15% confidence   │
                 │    • Acute category bonus (water/crack): +10% │
                 │    ➔ Total Report Boost: 0.228 points         │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                       Added to Risk Engine Reports Array!
```

---

## 4. How Does All Data Flow Into the Risk Engine?

Here is the complete, real-world pipeline from sensors in the mountains to the final warning screen:

```
[ Automated Rain Gauges ] ──► Hourly rainfall (mm) ───────┐
(Nepal DHM Weather Stns)                                   │
                                                           ▼
[ USGS Seismological Feed ] ──► Earthquake magnitude (M) ─► ┌───────────────────────────┐
                                                            │   HimalSanket Backend     │
[ Sentinel-2 Satellites ] ──► Lake Area Growth (%) ───────► │   (FastAPI on Cloud Run)  │
(Google Earth Engine)                                       │                           │
                                                            │   • Normalizes all inputs │
[ Local Porter Voice App ] ─► AI Voice Transcription ─────► │   • Runs Weighted Fusion  │
(Mobile PWA / Radio)                                        │   • Prepares Action Plan  │
                                                            └─────────────┬─────────────┘
                                                                          │
                                         ┌────────────────────────────────┴────────────────────────────────┐
                                         ▼                                                                 ▼
                        ┌─────────────────────────────────┐                               ┌─────────────────────────────────┐
                        │   Google Gemini 2.0 Flash       │                               │   React Frontend Dashboard      │
                        │   Generates plain language:     │                               │   • Live Corridor Cards         │
                        │   • English briefing            │                               │   • Interactive Map & Polygons  │
                        │   • Nepali translation          │                               │   • Downstream River Cascade    │
                        │   • 140-char SMS for 2G phones  │                               │   • SOS Rescue Priority List    │
                        └─────────────────────────────────┘                               └─────────────────────────────────┘
```

---

## 5. The Risk Engine Explained: How 5 Numbers Become 1 Score

The Risk Engine in `risk_engine.py` is the **mathematical core**.

### Why Not Just Ask an LLM (Like ChatGPT) to Guess the Score?
LLMs are creative language models. If you give an LLM 5 numbers, one day it might say `0.72` and the next day `0.65`. In disaster safety, **a system cannot guess or hallucinate**. Identical sensor data must produce the exact same score every single time.

### The 5 Signals & Their Weights:
Every signal is first squashed into a normalized score between `0.0` (safe) and `1.0` (danger):

| Signal | Real Value | Normalization Formula | Why It Matters in Nepal | Weight |
| :--- | :--- | :--- | :--- | :---: |
| **Rainfall** | e.g. $113\text{ mm}$ | $\min(\frac{\text{Rainfall}}{\text{Threshold } 144\text{mm}}, 1.0) = \mathbf{0.78}$ | Rain triggers 80% of landslides. | **30%** (0.30) |
| **Glacial Lake** | e.g. $+11\%$ | $\min(\frac{\text{Growth } 11\%}{15\%}, 1.0) = \mathbf{0.73}$ | GLOFs destroy entire valleys. | **25%** (0.25) |
| **Seismic** | e.g. $3.6\text{ M}$ | $\min(\frac{\text{Magnitude } 3.6}{4.0\text{M}}, 1.0) = \mathbf{0.90}$ | Earthquakes shake moraines loose. | **20%** (0.20) |
| **Ground Reports** | e.g. 2 voice reports | $\min(\sum \text{boosts}, 1.0) = \mathbf{0.44}$ | Porters see what satellites miss. | **15%** (0.15) |
| **Terrain Slope** | e.g. $0.71$ | Clamped $0.0 \text{ to } 1.0 = \mathbf{0.71}$ | Steep gorges speed up mudflows. | **10%** (0.10) |

### The Final Fusion Calculation:
$$\text{Final Risk Score} = (0.30 \times 0.78) + (0.25 \times 0.73) + (0.20 \times 0.90) + (0.15 \times 0.44) + (0.10 \times 0.71)$$
$$\text{Final Risk Score} = 0.234 + 0.183 + 0.180 + 0.066 + 0.071 = \mathbf{0.734} \quad (\text{CRITICAL!})$$

### The 4 Risk Tiers:
* **$< 0.30$ (Low / न्यून)**: Normal conditions. Standard monitoring.
* **$0.30 - 0.49$ (Moderate / मध्यम)**: Saturation building. Monitor closely; maintain radio check-ins.
* **$0.50 - 0.69$ (High / उच्च)**: Acute landslide/flood threat. Delay non-essential travel; halt gorge crossings.
* **$\ge 0.70$ (Critical / गम्भीर)**: Catastrophic flood imminent. Postpone all entry; evacuate gorge floors immediately.

---

## 6. How the Frontend Dashboard Uses This Backend

The frontend dashboard (built in React) connects to our FastAPI backend using standard HTTP `fetch()` requests.

### How React Gets the Data:
1. When the dashboard loads, it calls:
   ```javascript
   const response = await fetch("http://localhost:8000/regions");
   const regions = await response.json();
   ```
   *This loads all 4 corridors (Langtang, Everest, Annapurna, Manaslu) with their current baseline scores and live status.*

2. When a user clicks **"Simulate rainfall spike"**:
   ```javascript
   const response = await fetch("http://localhost:8000/simulate", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ location_id: "langtang" })
   });
   const result = await response.json();
   ```
   *The backend calculates the spike in under 2 milliseconds and returns:*
   * `transition`: `"Moderate -> Critical"`
   * `baseline.risk_score`: `0.31`
   * `simulated.risk_score`: `0.74`
   * The React dashboard immediately flips the badge from yellow to flashing red!

3. When an operator triggers a full **Multi-Hazard Assessment** (`POST /orchestrate`):
   ```javascript
   const response = await fetch("http://localhost:8000/orchestrate", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       location_id: "langtang",
       rainfall: 78.0,
       rain_threshold: 144.0,
       seismic_activity: 2.1,
       lake_area_change: 5.5,
       terrain_susceptibility: 0.71,
       reports: []
     })
   });
   const combinedData = await response.json();
   ```
   **What happens under the hood? (The 4-Step Orchestration Flow)**:
   * **Step 1**: The backend calls the **Risk Engine** to fuse all 5 signals into normalized numbers and an operational tier (`Moderate`, `High`, or `Critical`).
   * **Step 2**: The backend feeds these numbers to **Google Gemini (2.0 Flash)** to produce natural language briefings in English, Nepali (नेपाली), and SMS Romanized format.
   * **Step 3**: The backend saves the entire session to **Cloud Firestore (Firebase)** under the `hazard_sessions` collection for audit trails and real-time dashboard sync.
   * **Step 4**: The backend returns the **combined JSON** containing the Risk numbers + Gemini briefings + Firestore sync status back to the frontend in a single response!


---

## 7. Maps & Downstream River Networks (Which Villages Will Flood?)

### "Can the dashboard use a map to indicate risk zones?"
**Yes!** Every corridor has exact GPS coordinates in the API (e.g. Langtang: `28.2096° N, 85.5089° E`).
In React, using **Mapbox GL** or **Leaflet**, you render:
1. **The Danger Zone Polygon / Circle**: A glowing circle centered on the corridor:
   * Green if Low
   * Yellow if Moderate
   * Orange if High
   * Pulsing Red if Critical

### "Can the dashboard show which river networks will be affected downstream?"
**Yes! Water flows downhill.** A flood starting in upper Langtang does not stay in Langtang; it rushes down the **Langtang Khola** into the **Trishuli River**, threatening downstream highway bridges, hydropower dams, and bazaar towns.

Our new endpoint `GET /ai/river-network/{corridor_id}` returns the exact downstream river polyline coordinates and the **vulnerable settlements with flood wave travel times**:

```
[ Langtang Upper Glacial Lake (4,950m) ]
                  │
                  ▼ (Floods in 18 minutes)
        [ Lama Hotel Gorge (2,470m) ] ── Trail bridges & teahouses
                  │
                  ▼ (Floods in 38 minutes)
        [ Syabrubesi Confluence (1,460m) ] ── Highway bridge & main bazaar
                  │
                  ▼ (Floods in 55 minutes)
        [ Mailung Hydropower Dam (1,120m) ] ── Worker camps & intake tunnels
                  │
                  ▼ (Floods in 78 minutes)
        [ Betrawati Bazaar (620m) ] ── Historic market & Nuwakot bridge
```

The frontend map draws this river line in flashing red and displays:
* *"Flood wave arriving at Syabrubesi in 38 minutes — sound sirens now!"*

---

## 8. Google TimesFM & Predictive Weather Spikes

### What is Google TimesFM?
**TimesFM** is Google's pre-trained Foundation Model for Time Series forecasting.

Instead of only looking at the past, TimesFM looks at the last 24 hours of hourly rain and **forecasts the next 24 hours**.

### How It Works in Code:
Call `POST /ai/predict/rainfall` with historical hourly rain:
```json
{
  "corridor_id": "langtang",
  "historical_hourly_rain": [1.2, 2.5, 3.8, 5.0, 8.5, 14.0],
  "forecast_horizon_hours": 24
}
```
**TimesFM Output**:
* `predicted_hourly_rain_mm`: `[18.9, 21.2, 17.5, ...]`
* `projected_24h_rainfall_total_mm`: `112.5 mm`
* `atmospheric_surge_detected`: `true`
* `threshold_exceedance_probability`: `0.88`

The Risk Engine uses this predicted rainfall to trigger an evacuation alert **before** the cloudburst hits the ground!

---

## 9. Complete API Reference

| Endpoint | Method | Plain English Purpose | What to Send |
| :--- | :---: | :--- | :--- |
| **`/orchestrate`** | POST | **Master Orchestrator**: Runs Risk Engine ➔ Gemini ➔ Firestore ➔ Frontend JSON | `{"location_id": "langtang", "rainfall": 75, ...}` |
| **`/orchestrate/sessions`** | GET | **Session History**: Fetch past assessment runs from Firestore | `?limit=20` |
| **`/orchestrate/sessions/{id}`** | GET | **Session Lookup**: Fetch specific session document from Firestore | None |
| **`/health`** | GET | Check if backend is alive & healthy | None |
| **`/regions`** | GET | Get all 4 Nepal corridors with baseline data | None |
| **`/risk`** | POST | Evaluate risk for any custom sensor numbers | JSON with rainfall, seismic, lake, terrain, reports |
| **`/simulate`** | POST | Live judging demo: flips Moderate $\rightarrow$ Critical | `{"location_id": "langtang"}` |
| **`/ai/predict/rainfall`** | POST | **TimesFM**: Predict rainfall 6h–24h into future | `{"historical_hourly_rain": [...]}` |
| **`/ai/analyze/satellite`**| POST | **Sentinel-2**: Calculate lake expansion delta % | `{"observations": [{"date": "...", "surface_area_km2": 1.28}, ...]}` |
| **`/ai/process/voice-report`** | POST | **Voice AI**: Extract hazard keywords from audio | `{"raw_transcript": "खोला बढ्यो..."}` |
| **`/ai/river-network/{id}`**| GET | **River Map**: Downstream coordinates & villages | e.g. `/ai/river-network/langtang` |
| **`/ai/briefing`** | POST | **Gemini 2.0**: Plain language English & Nepali alert | JSON with score and active drivers |
| **`/docs-web`** | GET | Visual interactive website with sliders | None (open in browser) |

---

## 🚀 How to Run the System Right Now

1. **Activate the Virtual Environment & Start Server**:
   ```powershell
   cd c:\Users\amrit\Downloads\HimalSanket
   .\.venv\Scripts\Activate.ps1
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

2. **Open the Interactive Visual Documentation**:
   * Visit: **[http://localhost:8000/docs-web](http://localhost:8000/docs-web)**
   * Move the sliders to see the math calculate live!
   * Click **"Simulate Cloudburst Spike"** to watch the tier turn from Moderate to Critical!

3. **Run the Test Suite**:
   ```powershell
   pytest tests/
   ```
   *All 29 automated tests will pass in ~1 second!*
