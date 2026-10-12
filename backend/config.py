from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator
from typing import List, Optional


class RiskWeightsSettings(BaseSettings):
    """
    Configurable signal weights for multi-hazard fusion.
    Total weights must sum to 1.0.
    """
    model_config = SettingsConfigDict(env_prefix="HIMAL_WEIGHT_", case_sensitive=False)

    rainfall: float = Field(
        default=0.30,
        ge=0.0,
        le=1.0,
        description="Weight for 24h rainfall relative to regional threshold"
    )
    seismic: float = Field(
        default=0.20,
        ge=0.0,
        le=1.0,
        description="Weight for recent localized seismic activity"
    )
    lake: float = Field(
        default=0.25,
        ge=0.0,
        le=1.0,
        description="Weight for glacial lake surface area expansion percentage"
    )
    terrain: float = Field(
        default=0.10,
        ge=0.0,
        le=1.0,
        description="Weight for static geomorphic/slope landslide susceptibility"
    )
    reports: float = Field(
        default=0.15,
        ge=0.0,
        le=1.0,
        description="Weight for crowdsourced ground verification reports"
    )

    @model_validator(mode="after")
    def check_weights_sum(self):
        total = self.rainfall + self.seismic + self.lake + self.terrain + self.reports
        if abs(total - 1.0) > 0.001:
            raise ValueError(
                f"Fusion weights must sum to 1.0 (got {total:.4f}). "
                f"rainfall={self.rainfall}, seismic={self.seismic}, "
                f"lake={self.lake}, terrain={self.terrain}, reports={self.reports}"
            )
        return self


class ThresholdsSettings(BaseSettings):
    """
    Configurable scaling caps and risk tier boundaries.
    """
    model_config = SettingsConfigDict(env_prefix="HIMAL_THRESH_", case_sensitive=False)

    # Scaling caps for normalizations
    seismic_max_magnitude: float = Field(
        default=4.0,
        gt=0.0,
        description="Magnitude threshold representing full 1.0 normalized seismic hazard"
    )
    lake_change_max_pct: float = Field(
        default=15.0,
        gt=0.0,
        description="Glacial lake expansion percentage corresponding to 1.0 normalized risk"
    )
    report_boost_per_report: float = Field(
        default=0.18,
        gt=0.0,
        description="Multiplier for each verified ground report"
    )
    report_max_cap: float = Field(
        default=1.0,
        gt=0.0,
        description="Maximum normalized score contribution from ground reports"
    )

    # Risk Tier Boundaries
    tier_moderate: float = Field(default=0.30, ge=0.0, le=1.0)
    tier_high: float = Field(default=0.50, ge=0.0, le=1.0)
    tier_critical: float = Field(default=0.70, ge=0.0, le=1.0)

    # Driver explanation trigger thresholds (normalized)
    driver_threshold_rainfall: float = Field(default=0.35)
    driver_threshold_lake: float = Field(default=0.15)
    driver_threshold_seismic: float = Field(default=0.30)
    driver_threshold_reports: float = Field(default=0.15)
    driver_threshold_terrain: float = Field(default=0.60)


class Settings(BaseSettings):
    """
    Global application settings for HimalSanket Risk Engine.
    """
    model_config = SettingsConfigDict(env_prefix="HIMAL_", case_sensitive=False)

    app_name: str = "HimalSanket Multi-Hazard Risk Engine"
    version: str = "1.0.0"
    environment: str = "production"
    debug: bool = False
    cors_origins: List[str] = ["*"]
    cache_ttl_seconds: int = 300
    cache_max_size: int = 1000

    # Firebase / Firestore Orchestrator Configuration
    firestore_enabled: bool = True
    firestore_collection: str = "hazard_sessions"
    firebase_project_id: Optional[str] = None
    firestore_emulator_host: Optional[str] = None

    weights: RiskWeightsSettings = Field(default_factory=RiskWeightsSettings)
    thresholds: ThresholdsSettings = Field(default_factory=ThresholdsSettings)


settings = Settings()
