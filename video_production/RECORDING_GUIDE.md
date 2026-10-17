# HimalSanket: Grand-Prize Video Recording Guide & Cuesheet
**Google Cloud AI Builder Cup 2026 — Theme: Sustainability & Social Impact**  
**Team HimalSanket: Amrit, Divakar, Basanta, Sudip**  
**Total Runtime: 3 minutes 50 seconds (230.7s)**  
**Voice: `en-US-ChristopherNeural` (Broadcaster Documentary Narrator)**

---

## 🏆 Competition Rubric Alignment Checklist

Before recording, ensure your screen captures visually highlight these four core judging pillars:

- [x] **Theme (Sustainability & Social Impact)**: Solves real-world Himalayan flash flood & GLOF vulnerability in Nepal; protects tourists, porters, and mountain villagers.
- [x] **Technical Sophistication (Google Cloud AI Stack)**:
  - **Google Gemini 2.0 / 3.8 Flash**: Multimodal reasoning, bilingual tactical briefings, voice transcript keyword extraction.
  - **Google TimesFM**: Time-Series Foundation Model forecasting 24h precipitation spikes before rain hits the ground.
  - **Google Cloud Run**: Serverless containerized microservice orchestrator running deterministic mathematical risk engine.
  - **Cloud Firestore**: Real-time incident, SOS capsule, and rescuer dispatch synchronization.
  - **Sentinel-2 Multispectral NDWI**: 10m satellite imagery monitoring moraine lakes at 4,950m.
- [x] **Product Polish & Usability**: 3 unified roles (Admin Operations, Offline-first Civilian PWA, Search & Rescue Helicopter Command).
- [x] **Zero Hallucination Disaster Safety**: Deterministic 5-signal mathematical fusion engine (30% Rain, 25% Lake, 20% Seismic, 15% Ground, 10% Slope).

---

## 🎬 Minute-by-Minute Screen Recording Cuesheet

### **Act 1: The Himalayan Bottleneck & The Fatal Blind Spot (0:00 – 0:38 | 38s)**
* **Screen**: [`video_production/slides/index.html`](file:///c:/Users/le/Documents/Projects/HimalSanket/video_production/slides/index.html) (Slide 1: Problem & Stats). Press **F11** for Full Screen.
* **Exact Voiceover**:
  > *"In August 2026, a catastrophic glacial flood tore through Langtang Valley, leaving over 380 tourists uncontactable and claiming thousands of lives. In steep Himalayan canyons, there is only one foot trail in, and one trail out. Today's government warning systems rely solely on physical river sensors downstream. Sirens sound only after bridges are already washing away, giving people ten minutes to scale vertical cliffs in the pitch dark. This is HimalSanket: an AI-powered multi-hazard early warning and autonomous rescue system built so the next search doesn't take eleven days."*
* **On-Screen Action**:
  1. Hover cursor over the three big glass cards:
     - **1,287+** Lives Lost in Himalayan Floods
     - **380+** Stranded in Single Valley Cuts
     - **10-15m** Legacy In-River Sensor Warning Window
  2. Move cursor to the bottom banner emphasizing the **HimalSanket Shift**: predicting hazards *hours before impact*.
  3. At 0:37, click **"2. Live Prototype"** in the top navigation or switch tabs to `http://localhost:3000`.

---

### **Act 2: The Multi-Hazard Fused Engine & Satellite Eyes (0:38 – 1:24 | 46s)**
* **Screen**: [`AdminCommandDashboard.tsx`](file:///c:/Users/le/Documents/Projects/HimalSanket/frontend/src/components/admin/AdminCommandDashboard.tsx) (`http://localhost:3000` or Embedded in Slide 2).
* **Exact Voiceover**:
  > *"HimalSanket doesn't guess or hallucinate. Our deterministic fusion engine combines five continuous vectors: catchment rainfall at thirty percent weight, Sentinel-2 glacial lake expansion at twenty-five percent, USGS seismic tremors at twenty percent, porter ground reports at fifteen percent, and geomorphic slope at ten percent. Using European Space Agency Sentinel-2 multispectral imagery, our pipeline monitors moraine lakes at five thousand meters altitude, tracking normalized difference water index expansion pixel by pixel. Simultaneously, Google's TimesFM foundation model forecasts precipitation spikes twenty-four hours in advance, allowing mountain communities to evacuate long before cloudbursts hit the ground."*
* **On-Screen Action**:
  1. Hover smoothly across the **Top 5 Executive Metric Cards**:
     - *Fused Risk Index* (0.31 / 1.0 - Moderate)
     - *Catchment Rain* (38mm / 144mm)
     - *Glacial Lake Area* (+4.0% NDWI)
     - *Active SOS Alerts* (0 Pending)
     - *Active SAR Fleet* (3 Units Ready)
  2. Click **Sentinel Glacial Lake (GLOF)** modal (`SentinelLakeModal.tsx`):
     - Drag the **Before / After Split Slider** back and forth, showing the high-altitude lake water mask expansion at 4,950m elevation. Close modal.
  3. Click **Precipitation Forecast** modal (`TimesfmForecastChart.tsx`):
     - Hover over the **Google TimesFM 24h predictive hourly forecast curve** showing atmospheric surge probability. Close modal.

---

### **Act 3: Live Emergency Drill, Hydrodynamics & Gemini Synthesis (1:24 – 2:05 | 41s)**
* **Screen**: Still on **Admin Command Dashboard**.
* **Exact Voiceover**:
  > *"Watch what happens during an active emergency drill. When sensors detect an acute cloudburst surge, our FastAPI orchestrator on Google Cloud Run recalculates corridor risk in milliseconds, escalating from Moderate to Critical. Our GIS hydrodynamic model computes downstream wave arrival times: eighteen minutes to Lama Hotel gorge, thirty-eight minutes to Syabrubesi, and seventy-eight minutes to the Betrawati arterial bridge. Instantly, Google Gemini synthesizes telemetry into localized action directives in English, native Nepali, compressed SMS alerts for 2G phones, and one-click official SITREP reports for Nepal's Disaster Management Authority."*
* **On-Screen Action**:
  1. In the right operations drawer, click **"Cloudburst Spike"** or **"GLOF Outburst"** under Drill Scenarios:
     - Watch the **Fused Risk Index** badge snap from green/blue Moderate to flashing red **Critical (0.78 / 1.0)**!
  2. Drag the **Flood Surge Simulator** slider from `0m` to `+3.5m Rise`:
     - Show the Leaflet GIS river buffer expand laterally across the canyon floor.
  3. Click the **Valley Elevation Profile** modal (`ValleyElevationProfileModal.tsx`):
     - Show the 2D cross-section from 4,950m down to 620m, highlighting the flood wave arrival times to Lama Hotel (18 min) and Syabrubesi (38 min). Close modal.
  4. Point to the **Gemini Bilingual Tactical Briefing** box in English and native Nepali (नेपाली), plus the SMS draft for 2G phones.
  5. Click **SITREP Briefing** (`SitrepExportModal.tsx`) to show the official military/government NDRRMA emergency report.

---

### **Act 4: Grassroots Civilian PWA & Multimodal Voice AI (2:06 – 2:46 | 40s)**
* **Screen**: Click the role switcher in the header to switch to **Civilian / Trekker PWA** (`CivilianDashboard.tsx`).
* **Exact Voiceover**:
  > *"Disaster tools fail if people on the ground cannot use them. For local guides, porters, and trekkers, HimalSanket operates as an offline-first Progressive Web App. Porters walking through freezing monsoon rain cannot type text on a phone. With one tap, they record a ten-second voice note in their native dialect. Google Gemini transcribes the audio, extracting critical danger keywords like murky floodwaters, landslide cracks, or acoustic rumblings, directly boosting risk confidence. Trekkers can also consult our Gemini AI Safety Copilot for real-time trail guidance based on their live GPS elevation and distance to hazard zones."*
* **On-Screen Action**:
  1. Highlight the trekker HUD: Live GPS elevation (2,780m), distance to hazard zone (350m to safe ground), and safe shelters list.
  2. Click the **Voice Recorder** button (`VoiceRecorderModal.tsx`):
     - Show the Nepali hazard lexicon (*«पहिरो» - Landslide, «धमिलो» - Murky floodwaters, «गडगडाएको» - Subterranean rumblings*).
     - Simulate or record 3 seconds of voice, submit, and show the confidence score boost applied.
  3. Open the **Gemini AI Safety Copilot** web chat (`GeminiWebChatWindow.tsx`):
     - Show conversational response giving immediate safe evacuation guidance to the trekker.

---

### **Act 5: SOS Distress Capsule & Autonomous SAR Helicopter Dispatch (2:47 – 3:22 | 35s)**
* **Screen**: In Civilian View, tap the prominent red **Send SOS Beacon** button, then switch to **Search & Rescue Command** (`RescuerDashboard.tsx`).
* **Exact Voiceover**:
  > *"When disaster strikes and a civilian is trapped, every kilobyte matters. HimalSanket's SOS Distress Capsule transmits ultralight micro-packets with exact GPS coordinates first, guaranteed to puncture fleeting 2G signal windows. At Search and Rescue headquarters, incoming distress calls are automatically prioritized by elevation vulnerability and medical urgency. With one click, commanders dispatch search and rescue helicopter sorties, streaming live telemetry, terrain clearance vectors, and real-time flight tracking directly to rescue teams."*
* **On-Screen Action**:
  1. In Civilian view, tap **Send SOS Beacon** — highlight the *Distress Capsule GPS payload queued*.
  2. Switch role to **Search & Rescue Command**:
     - See the stranded trekker's distress beacon appear at the top of the **Prioritized Rescue Triage Queue**.
  3. Click **"Dispatch SAR-NAT-8"** (Helicopter sortie).
  4. Watch the helicopter flight icon move across the GIS map with the live countdown ETA timer.

---

### **Act 6: Google Cloud Architecture & The Defining Mission (3:23 – 3:50 | 27s)**
* **Screen**: Switch back to [`video_production/slides/index.html`](file:///c:/Users/le/Documents/Projects/HimalSanket/video_production/slides/index.html) (Slide 3: Architecture & Outro).
* **Exact Voiceover**:
  > *"Under the hood, Google Gemini provides multimodal reasoning and multilingual briefings. Google TimesFM delivers predictive rainfall forecasting. Cloud Run powers our microservice orchestrator, and Cloud Firestore synchronizes life-saving alerts in real time. Langtang has flooded and buried its people twice in a decade. HimalSanket exists so there isn't a third time. Thank you."*
* **On-Screen Action**:
  1. Highlight the Google Cloud ecosystem grid:
     - **Google Gemini** (Multimodal reasoning & briefings)
     - **Google TimesFM** (24h predictive rainfall forecasting)
     - **Cloud Run** (Containerized deterministic mathematical orchestrator)
     - **Cloud Firestore** (Real-time reactive SOS and fleet sync)
  2. Hold view on the memorable final quote:
     > *"Langtang has flooded twice in a decade. HimalSanket exists so there isn't a third time."*  
     > *Team HimalSanket: Amrit, Divakar, Basanta, Sudip · Google Cloud AI Builder Cup 2026*

---

## 🛠️ Editing & Finishing Checklist

1. **Audio File**: Use `video_production/audio/himalsanket_master_voiceover.mp3` (continuous 3m50s track).
2. **Subtitles**: Use `video_production/subtitles/himalsanket_master_captions.srt` (burn into your video editor or upload as closed captions).
3. **Pacing**: Total duration is **3:50**, safely under the 4-minute maximum.
