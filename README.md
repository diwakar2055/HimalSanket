# HimalSanket (हिमाल संकेत) — Full-Stack Multi-Hazard Early Warning System

> **Unified Workspace**: Complete production repository containing the FastAPI Risk Engine Backend & Orchestrator and the React 19 Interactive GIS Frontend Dashboard.

---

## 📁 Repository Structure

```
himalsanket-fullstack/
├── backend/                  # Python FastAPI Backend & Orchestrator
│   ├── main.py               # Application entrypoint & router assembly
│   ├── risk_engine.py        # Multi-hazard fusion mathematical engine
│   ├── ai_reasoner.py        # Google Gemini 2.0 / 3.8 Flash multimodal reasoning layer
│   ├── firestore_service.py  # Cloud Firestore (Firebase) persistence service
│   ├── timesfm_forecaster.py # Google TimesFM time-series rainfall forecasting
│   ├── satellite_analyzer.py # Sentinel-2 NDWI glacial lake surface area expansion analyzer
│   ├── audio_processor.py    # Voice note transcription & hazard keyword detector
│   ├── routes/               # API routers (/orchestrate, /risk, /simulate, /regions, /ai)
│   └── tests/                # Automated pytest suite
│
└── frontend/                 # React 19 + TypeScript + Vite + Leaflet GIS Dashboard
    ├── src/
    │   ├── App.tsx           # Multi-hazard corridor monitoring dashboard
    │   ├── components/       # Leaflet & Google Maps, Gemini Chatbot, Error Boundaries
    │   ├── data/             # GIS river paths (Langtang Khola, Dudh Koshi) & asset datasets
    │   └── services/         # Orchestrator API integration (riskEngineApi.ts)
    ├── server.ts             # Express development / SSR server with Gemini chat endpoint
    └── package.json          # Node dependencies (React 19, Leaflet, Tailwind v4, Lucide)
```

---

## 🚀 Quickstart: Running Both Services

### 1. Start the Backend Orchestrator (Port 8000)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # On Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
* **Swagger API Docs**: http://localhost:8000/docs
* **Master Orchestrator Endpoint**: `POST http://localhost:8000/orchestrate`

### 2. Start the Frontend Dashboard (Port 3000)
```bash
cd frontend
npm install
npm run dev
```
* **Interactive Dashboard**: http://localhost:3000

---

## 🔄 The Master Orchestration Pipeline

```
Frontend (React 19)
       │
       ▼  POST /orchestrate
Backend Orchestrator (FastAPI)
       │
       ├─► 1. Calls Risk Engine (Fused mathematical risk score: 0.0 - 1.0)
       ├─► 2. Calls Google Gemini (English, Nepali, & SMS Romanized advisories)
       ├─► 3. Saves Session to Firebase Firestore (hazard_sessions collection)
       │
       ▼  Combined JSON Response
Frontend Updates:
  • Hazard badge ('Critical' / 'High' / 'Moderate' / 'Low')
  • Leaflet map river cascade & vulnerable asset markers
  • Gemini tactical briefing card in English and Nepali
  • SMS alert text for feature phone dispatches
```
