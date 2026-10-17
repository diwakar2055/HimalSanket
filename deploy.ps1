# ==============================================================================
# HimalSanket — Google Cloud AI Builder Cup Deployment Script (PowerShell)
# Deploys Backend and Frontend to Google Cloud Run
# ==============================================================================

[CmdletBinding()]
param(
    [string]$ProjectId = "",
    [string]$Region = "asia-south1",
    [string]$GeminiApiKey = "",
    [string]$GoogleMapsApiKey = ""
)

$ErrorActionPreference = "Stop"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  HimalSanket (हिमाल संकेत) — Google Cloud AI Builder Cup Deploy " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Verify gcloud CLI
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "`nError: 'gcloud' CLI is not found in your PATH." -ForegroundColor Red
    Write-Host "Tip: You can deploy in 1 click from Google Cloud Shell (https://shell.cloud.google.com) without installing anything locally!`n" -ForegroundColor Yellow
    exit 1
}

# 2. Project ID
if ([string]::IsNullOrWhiteSpace($ProjectId)) {
    $activeProj = (& gcloud config get-value project 2>$null).Trim()
    if (-not [string]::IsNullOrWhiteSpace($activeProj) -and $activeProj -ne "(unset)") {
        $ProjectId = $activeProj
    } else {
        $ProjectId = Read-Host "Enter your Google Cloud Project ID"
    }
}
& gcloud config set project $ProjectId
Write-Host "Using Google Cloud Project: $ProjectId" -ForegroundColor Green

# 3. Prompt for API Keys if not provided
if ([string]::IsNullOrWhiteSpace($GeminiApiKey)) {
    $GeminiApiKey = Read-Host "Enter your Google Gemini API Key"
}
if ([string]::IsNullOrWhiteSpace($GoogleMapsApiKey)) {
    $GoogleMapsApiKey = Read-Host "Enter your Google Maps API Key (optional, press Enter to skip)"
}

Write-Host "`nStep 1: Enabling mandatory Google Cloud APIs..." -ForegroundColor Yellow
& gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com firestore.googleapis.com aiplatform.googleapis.com --project=$ProjectId

Write-Host "`nStep 2: Deploying Backend Orchestrator to Google Cloud Run..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\backend"
& gcloud run deploy himalsanket-risk-engine `
    --source . `
    --region=$Region `
    --platform=managed `
    --allow-unauthenticated `
    --min-instances=0 `
    --max-instances=5 `
    --memory=512Mi `
    --cpu=1 `
    --set-env-vars="HIMAL_ENVIRONMENT=production,GEMINI_API_KEY=$GeminiApiKey,FIREBASE_PROJECT_ID=$ProjectId" `
    --project=$ProjectId

$BackendUrl = (& gcloud run services describe himalsanket-risk-engine --region=$Region --format="value(status.url)" --project=$ProjectId).Trim()
Write-Host "✓ Backend successfully deployed at: $BackendUrl" -ForegroundColor Green

Write-Host "`nStep 3: Deploying Frontend Dashboard to Google Cloud Run..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\frontend"
& gcloud run deploy himalsanket-frontend `
    --source . `
    --region=$Region `
    --platform=managed `
    --allow-unauthenticated `
    --min-instances=0 `
    --max-instances=5 `
    --memory=512Mi `
    --cpu=1 `
    --set-build-env-vars="VITE_RISK_ENGINE_API=$BackendUrl,VITE_GOOGLE_MAPS_API_KEY=$GoogleMapsApiKey" `
    --set-env-vars="NODE_ENV=production,GEMINI_API_KEY=$GeminiApiKey,VITE_RISK_ENGINE_API=$BackendUrl,VITE_GOOGLE_MAPS_API_KEY=$GoogleMapsApiKey" `
    --project=$ProjectId

$FrontendUrl = (& gcloud run services describe himalsanket-frontend --region=$Region --format="value(status.url)" --project=$ProjectId).Trim()
Set-Location -Path $PSScriptRoot

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "🎉 DEPLOYMENT COMPLETE FOR AI BUILDER CUP! 🎉" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Frontend Live URL (Submit to Hack2skill): $FrontendUrl" -ForegroundColor Green
Write-Host "Backend API URL:                         $BackendUrl" -ForegroundColor Green
Write-Host "Swagger API Docs:                        $BackendUrl/docs" -ForegroundColor Green
Write-Host "Interactive Visual Guide:                $BackendUrl/docs-web" -ForegroundColor Green
Write-Host "`nAll components are 100% running natively on Google Cloud (Cloud Run, Vertex AI/Gemini, Firestore)."
