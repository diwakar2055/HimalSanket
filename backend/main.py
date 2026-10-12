import os
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from config import settings
from routes import (
    health_router,
    risk_router,
    simulate_router,
    regions_router,
    analytics_router,
    orchestrator_router,
    telemetry_router
)


# Configure Structured Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S%z"
)
logger = logging.getLogger("himalsanket.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Initializing {settings.app_name} v{settings.version}")
    logger.info(f"Active Weights: {settings.weights.model_dump()}")
    logger.info("Engine ready to evaluate multi-hazard signals.")
    yield
    logger.info("Shutting down HimalSanket Risk Engine.")


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "Production-quality backend risk engine for HimalSanket — "
        "an AI-powered multi-hazard early warning system for Nepal. "
        "Fuses rainfall, seismic tremors, glacial lake expansion, terrain susceptibility, "
        "and crowdsourced ground reports into an explainable disaster risk score."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware (supports React dashboard on any port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time-Ms"]
)


# Timing & Structured Logging Middleware
@app.middleware("http")
async def add_process_time_and_log(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start_time) * 1000, 3)
    response.headers["X-Process-Time-Ms"] = str(duration_ms)

    # Don't clutter logs with repeated health polls
    if request.url.path != "/health":
        logger.info(
            f"{request.method} {request.url.path} "
            f"status={response.status_code} latency={duration_ms}ms"
        )
    return response


# Include Core Routers
app.include_router(health_router)
app.include_router(risk_router)
app.include_router(orchestrator_router)
app.include_router(simulate_router)
app.include_router(regions_router)
app.include_router(analytics_router)
app.include_router(telemetry_router)


# Mount Static Assets and Documentation
static_path = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory=static_path), name="static")


@app.get("/docs-web", response_class=HTMLResponse, tags=["System Overview"])
@app.get("/documentation", response_class=HTMLResponse, tags=["System Overview"])
async def interactive_documentation():
    """
    Renders the rich, interactive visual documentation guide with diagrams and live simulator.
    """
    doc_file = os.path.join(static_path, "docs.html")
    if os.path.exists(doc_file):
        with open(doc_file, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Documentation not found</h1>", status_code=404)


@app.get("/", tags=["System Overview"])
async def root_index():
    """
    API Welcome and Service Navigator
    """
    return {
        "service": settings.app_name,
        "version": settings.version,
        "purpose": "Nepal Multi-Hazard Early Warning Backend (Landslides, GLOF, Flash Floods)",
        "swagger_ui": "/docs",
        "interactive_guide": "/docs-web",
        "endpoints": {
            "health": "GET /health",
            "orchestrate": "POST /orchestrate",
            "orchestrate_sessions": "GET /orchestrate/sessions",
            "evaluate_risk": "POST /risk",
            "simulate_spike": "POST /simulate",
            "regions": "GET /regions",
            "single_region": "GET /regions/{region_id}",
            "visual_docs": "GET /docs-web"
        }
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    host = os.environ.get("HOST", "0.0.0.0")
    logger.info(f"Starting uvicorn server on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
