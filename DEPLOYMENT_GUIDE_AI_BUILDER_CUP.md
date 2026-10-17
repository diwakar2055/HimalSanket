# HimalSanket (हिमाल संकेत) — Google Cloud AI Builder Cup Deployment Guide

> **Official Competition Deployment Manual**  
> *Track: Sustainability & Social Impact — Google Cloud AI Builder Cup 2026 (Hack2skill)*  
> *Target Stack: 100% Google Cloud Native (Cloud Run, Vertex AI / Gemini 2.0 Flash, Cloud Firestore)*

---

## 📋 1. AI Builder Cup Rules & Evaluation Criteria

The **Google Cloud AI Builder Cup** (powered by Hack2skill) enforces specific technical and submission requirements. Non-compliance can lead to disqualification or loss of points:

| Rule / Requirement | Competition Specification | How HimalSanket Complies |
| :--- | :--- | :--- |
| **Cloud Hosting Mandate** | **Must** be built and hosted natively on Google Cloud. Third-party clouds (AWS, Azure, Vercel, Netlify) are **not permitted**. | Deployed natively on **Google Cloud Run** (serverless containers) and **Cloud Firestore**. |
| **Mandatory AI Stack** | Must utilize Google Cloud AI / GenAI (Gemini / Vertex AI). | Integrates **Google Gemini 2.0 / 3.8 Flash** via `@google/genai` & `google-genai` Python SDK + **Google TimesFM** time-series forecasting. |
| **Working Prototype URL** | A functional public URL must be accessible to judges for live click-through testing (no `localhost`). | Cloud Run automatically provides public HTTPS endpoints (`*.a.run.app`) with zero maintenance. |
| **Originality & Impact** | Real-world problem alignment with high social impact. | Tackles catastrophic Himalayan disasters (Landslides, GLOFs, Flash Floods) along narrow high-altitude trekking corridors (Langtang, Khumbu). |

### Judging Weightage Breakdown:
1. **Technical Merit & GenAI Implementation (40%)**: Depth of Google Gemini 2.0 Flash reasoning across mathematical hazard telemetry, real-time Firestore persistence, and Cloud Run microservices.
2. **Problem Alignment & Social Impact (25%)**: Transforms Nepal's reactive river-gauge blind spots into proactive hours-ahead multi-hazard alerts.
3. **Innovation & Creativity (25%)**: Multi-hazard weak-signal fusion (Rainfall + Sentinel-2 NDWI lake expansion + Seismic + crowdsourced porter voice notes).
4. **User Experience & Solution Design (10%)**: Spatial GIS corridor tracking, bilingual English/Nepali command alerts, victim distress capsule, and SAR priority queue.

---

## 🏗️ 2. Google Cloud System Architecture

```
                                 [ End Users / SAR Teams / Trekkers ]
                                                  │
                                                  ▼
                        ┌──────────────────────────────────────────────────┐
                        │        Google Cloud Run (Frontend Service)       │
                        │           `himalsanket-frontend`                 │
                        │  • React 19 + Vite Leaflet GIS Dashboard         │
                        │  • Express SSR & Google Maps API Proxy           │
                        └─────────┬───────────────────────────────┬────────┘
                                  │                               │
                                  ▼                               ▼
       ┌──────────────────────────────────────┐       ┌────────────────────────┐
       │ Google Cloud Run (Backend Engine)    │       │  Google Gemini 2.0     │
       │     `himalsanket-risk-engine`        │       │  Flash (Vertex AI)     │
       │ • FastAPI Multi-Hazard Orchestrator  │       │  • Multilingual Chat   │
       │ • Mathematical Signal Fusion         │◄─────►│  • EN/NE Advisories    │
       │ • Sentinel-2 NDWI & TimesFM Models   │       │  • Romanized SMS Alert │
       └──────────────────┬───────────────────┘       └────────────────────────┘
                          │
                          ▼
       ┌──────────────────────────────────────┐
       │        Google Cloud Firestore        │
       │ • Collection: `hazard_sessions`      │
       │ • Audit Trails & Distress Capsules   │
       └──────────────────────────────────────┘
```

---

## ⚡ 3. Deployment Methods

### Method A: 1-Click Browser Deployment via Google Cloud Shell (Recommended)

*You do not need to install anything on your personal computer.*

1. Open **[Google Cloud Shell](https://shell.cloud.google.com/)** in your browser.
2. Ensure your GCP project is selected:
   ```bash
   gcloud config set project YOUR_GCP_PROJECT_ID
   ```
3. Clone the repository and navigate into it:
   ```bash
   git clone https://github.com/diwakar2055/HimalSanket.git
   cd HimalSanket
   git checkout dev-frontend-backend
   ```
4. Run the automated deployment script:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```
5. The script will:
   - Enable all necessary GCP APIs (`run.googleapis.com`, `firestore.googleapis.com`, `aiplatform.googleapis.com`, `cloudbuild.googleapis.com`).
   - Containerize and deploy the **Backend Orchestrator** to Cloud Run.
   - Inject the Backend URL into the **Frontend Dashboard** and deploy it to Cloud Run.
   - Output your final public submission URLs.

---

### Method B: Manual Step-by-Step Deployment (gcloud CLI)

If you have the `gcloud` CLI installed on your machine:

#### Step 1: Authenticate and Set Project
```bash
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID
```

#### Step 2: Enable Google Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  aiplatform.googleapis.com
```

#### Step 3: Deploy Backend (Risk Engine & Orchestrator)
```bash
cd backend

gcloud run deploy himalsanket-risk-engine \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars HIMAL_ENVIRONMENT=production,GEMINI_API_KEY=YOUR_GEMINI_API_KEY,FIREBASE_PROJECT_ID=YOUR_GCP_PROJECT_ID
```
*Note the deployed Backend URL from the command output, e.g., `https://himalsanket-risk-engine-xyz-as.a.run.app`.*

#### Step 4: Deploy Frontend (GIS Dashboard)
```bash
cd ../frontend

gcloud run deploy himalsanket-frontend \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --set-build-env-vars VITE_RISK_ENGINE_API=https://himalsanket-risk-engine-xyz-as.a.run.app,VITE_GOOGLE_MAPS_API_KEY=YOUR_MAPS_KEY \
  --set-env-vars NODE_ENV=production,GEMINI_API_KEY=YOUR_GEMINI_API_KEY,VITE_RISK_ENGINE_API=https://himalsanket-risk-engine-xyz-as.a.run.app,VITE_GOOGLE_MAPS_API_KEY=YOUR_MAPS_KEY
```

---

## 🔑 4. Environment Variables Reference

### Backend (`himalsanket-risk-engine`):
- `GEMINI_API_KEY`: Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/) or Vertex AI.
- `FIREBASE_PROJECT_ID`: Your GCP Project ID for Cloud Firestore persistence.
- `HIMAL_ENVIRONMENT`: Set to `production`.
- `PORT`: Automatically injected by Cloud Run (`8080`).

### Frontend (`himalsanket-frontend`):
- `VITE_RISK_ENGINE_API`: Full URL of the deployed backend Cloud Run service.
- `GEMINI_API_KEY`: API key for Gemini chat assistant in `server.ts`.
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps JavaScript API key (optional; Leaflet GIS falls back automatically).
- `NODE_ENV`: Set to `production`.

---

## 📦 5. Final Submission Checklist for Hack2skill Portal

Before submitting your project on the Hack2skill AI Builder Cup submission page:

- [ ] **Working Demo URL**: The live HTTPS link to `himalsanket-frontend-*.a.run.app`. Test it in an Incognito window to confirm anyone can access it.
- [ ] **Interactive API / Swagger Docs**: Verify `https://himalsanket-risk-engine-*.a.run.app/docs` and `https://himalsanket-risk-engine-*.a.run.app/docs-web` are live.
- [ ] **Public GitHub Repository**: Ensure the repository is Public, clean, and includes the README and architecture details.
- [ ] **3-Minute Demo Video**: Record your live screen walkthrough following the script in [HimalSanket_Demo_Video_Script(1).md](file:///h:/Projects/himalsanket/backend/docs/HimalSanket_Demo_Video_Script%281%29.md).
- [ ] **Theme Alignment**: Clearly tag the submission under **"Sustainability & Social Impact"**.
