#!/usr/bin/env bash
# ==============================================================================
# HimalSanket — Google Cloud AI Builder Cup One-Click Deployment Script
# Deploys Backend and Frontend as serverless microservices to Google Cloud Run
# ==============================================================================

set -e

# Visual colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}  HimalSanket (हिमाल संकेत) — Google Cloud AI Builder Cup Deploy ${NC}"
echo -e "${CYAN}================================================================${NC}"

# Check for gcloud CLI
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: 'gcloud' CLI is not found.${NC}"
    echo "Tip: Run this script inside Google Cloud Shell (https://shell.cloud.google.com) where gcloud is pre-installed!"
    exit 1
fi

# Detect or ask for GCP Project ID
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || true)
if [ -z "$CURRENT_PROJECT" ] || [ "$CURRENT_PROJECT" = "(unset)" ]; then
    read -rp "Enter your Google Cloud Project ID: " GCP_PROJECT_ID
    gcloud config set project "$GCP_PROJECT_ID"
else
    GCP_PROJECT_ID="$CURRENT_PROJECT"
    echo -e "Using active GCP Project: ${GREEN}$GCP_PROJECT_ID${NC}"
fi

# Region selection (asia-south1 / Mumbai or us-central1 / Iowa)
DEFAULT_REGION="asia-south1"
read -rp "Enter GCP Region (default: $DEFAULT_REGION): " REGION
REGION=${REGION:-$DEFAULT_REGION}

# API Keys
if [ -z "$GEMINI_API_KEY" ]; then
    read -rp "Enter your Google Gemini API Key: " GEMINI_API_KEY
fi

if [ -z "$VITE_GOOGLE_MAPS_API_KEY" ]; then
    read -rp "Enter your Google Maps API Key (optional, press Enter to skip): " VITE_GOOGLE_MAPS_API_KEY
fi

echo -e "\n${YELLOW}Step 1: Enabling mandatory Google Cloud APIs...${NC}"
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    firestore.googleapis.com \
    aiplatform.googleapis.com \
    --project="$GCP_PROJECT_ID"

echo -e "\n${YELLOW}Step 2: Deploying Backend Orchestrator & Risk Engine to Cloud Run...${NC}"
cd backend

gcloud run deploy himalsanket-risk-engine \
    --source . \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --min-instances=0 \
    --max-instances=5 \
    --memory=512Mi \
    --cpu=1 \
    --set-env-vars="HIMAL_ENVIRONMENT=production,GEMINI_API_KEY=$GEMINI_API_KEY,FIREBASE_PROJECT_ID=$GCP_PROJECT_ID" \
    --project="$GCP_PROJECT_ID"

BACKEND_URL=$(gcloud run services describe himalsanket-risk-engine --region="$REGION" --format="value(status.url)" --project="$GCP_PROJECT_ID")
echo -e "${GREEN}✓ Backend successfully deployed at:${NC} $BACKEND_URL"

cd ..

echo -e "\n${YELLOW}Step 3: Deploying Frontend Dashboard to Cloud Run...${NC}"
cd frontend

gcloud run deploy himalsanket-frontend \
    --source . \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --min-instances=0 \
    --max-instances=5 \
    --memory=512Mi \
    --cpu=1 \
    --set-build-env-vars="VITE_RISK_ENGINE_API=$BACKEND_URL,VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY" \
    --set-env-vars="NODE_ENV=production,GEMINI_API_KEY=$GEMINI_API_KEY,VITE_RISK_ENGINE_API=$BACKEND_URL,VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY" \
    --project="$GCP_PROJECT_ID"

FRONTEND_URL=$(gcloud run services describe himalsanket-frontend --region="$REGION" --format="value(status.url)" --project="$GCP_PROJECT_ID")
echo -e "${GREEN}✓ Frontend successfully deployed at:${NC} $FRONTEND_URL"

cd ..

echo -e "\n${CYAN}================================================================${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE FOR AI BUILDER CUP! 🎉${NC}"
echo -e "${CYAN}================================================================${NC}"
echo -e "Frontend Live URL (Submit to Hack2skill): ${GREEN}$FRONTEND_URL${NC}"
echo -e "Backend API URL:                         ${GREEN}$BACKEND_URL${NC}"
echo -e "Swagger API Docs:                        ${GREEN}$BACKEND_URL/docs${NC}"
echo -e "Interactive Visual Guide:                ${GREEN}$BACKEND_URL/docs-web${NC}"
echo -e "\nAll components are 100% running natively on Google Cloud (Cloud Run, Vertex AI/Gemini, Firestore)."
