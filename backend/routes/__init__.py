from .health import router as health_router
from .risk import router as risk_router
from .simulate import router as simulate_router
from .regions import router as regions_router
from .analytics import router as analytics_router
from .orchestrator import router as orchestrator_router
from .telemetry import router as telemetry_router

__all__ = [
    "health_router",
    "risk_router",
    "simulate_router",
    "regions_router",
    "analytics_router",
    "orchestrator_router",
    "telemetry_router"
]


