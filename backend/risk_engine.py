import time
import logging
from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime, timezone

from config import settings, RiskWeightsSettings, ThresholdsSettings
from models import (
    LocationRiskInput,
    NormalizedSignals,
    SignalContributions,
    RiskLevel,
    NEPALI_RISK_LEVEL_MAP,
    PreGeminiExplanation,
    RiskAssessmentOutput,
    GroundReport,
)

logger = logging.getLogger("himalsanket.risk_engine")


def normalize_rainfall(rainfall: float, threshold: float) -> float:
    """
    Normalizes 24h rainfall relative to the corridor landslide trigger threshold.
    Clamped to [0.0, 1.0].
    """
    if threshold <= 0:
        return 1.0 if rainfall > 0 else 0.0
    ratio = max(0.0, rainfall) / threshold
    return round(min(ratio, 1.0), 4)


def normalize_seismic(seismic: float, max_mag: float = 4.0) -> float:
    """
    Normalizes local seismic magnitude against the critical localized hazard scale.
    Clamped to [0.0, 1.0].
    """
    if max_mag <= 0:
        return 1.0 if seismic > 0 else 0.0
    ratio = max(0.0, seismic) / max_mag
    return round(min(ratio, 1.0), 4)


def normalize_lake_growth(change_pct: float, max_growth_pct: float = 15.0) -> float:
    """
    Normalizes moraine-dammed glacial lake area expansion percentage.
    Capped at max_growth_pct (default 15%). Clamped to [0.0, 1.0].
    Negative growth (drainage without rupture or sensor noise) yields 0.0.
    """
    if max_growth_pct <= 0:
        return 1.0 if change_pct > 0 else 0.0
    positive_change = max(0.0, change_pct)
    ratio = positive_change / max_growth_pct
    return round(min(ratio, 1.0), 4)


def normalize_terrain(terrain: float) -> float:
    """
    Clamps geomorphic terrain susceptibility score to [0.0, 1.0].
    """
    return round(min(max(0.0, terrain), 1.0), 4)


def normalize_reports(
    reports: List[Any],
    boost_per_report: float = 0.18,
    max_cap: float = 1.0
) -> float:
    """
    Computes crowdsourced ground validation score.
    Applies count-based boost, with additional weighting for high-severity keywords
    or voice recordings from on-the-ground witnesses.
    """
    if not reports:
        return 0.0

    score = 0.0
    for r in reports:
        item_boost = boost_per_report
        # Check if structured report with voice or specific hazard category
        if isinstance(r, GroundReport):
            if r.voice_attached:
                item_boost *= 1.15
            if r.report_type in ("water", "crack", "sound"):
                item_boost *= 1.10
        elif isinstance(r, dict):
            if r.get("voice_attached") or r.get("voice"):
                item_boost *= 1.15
            if r.get("report_type") in ("water", "crack", "sound") or r.get("id") in ("water", "crack", "sound"):
                item_boost *= 1.10

        score += item_boost

    return round(min(score, max_cap), 4)


def determine_risk_level(score: float, thresholds: Optional[ThresholdsSettings] = None) -> RiskLevel:
    """
    Categorizes the fused numerical hazard score into operational tiers:
    - >= 0.70: Critical
    - >= 0.50: High
    - >= 0.30: Moderate
    - <  0.30: Low
    """
    th = thresholds or settings.thresholds
    if score >= th.tier_critical:
        return RiskLevel.CRITICAL
    elif score >= th.tier_high:
        return RiskLevel.HIGH
    elif score >= th.tier_moderate:
        return RiskLevel.MODERATE
    else:
        return RiskLevel.LOW


def extract_key_drivers(
    input_data: LocationRiskInput,
    norm: NormalizedSignals,
    thresholds: Optional[ThresholdsSettings] = None
) -> List[str]:
    """
    Identifies the primary physical signals driving the elevated risk score.
    """
    th = thresholds or settings.thresholds
    drivers = []

    if norm.rainfall >= th.driver_threshold_rainfall:
        pct_of_thresh = (input_data.rainfall / input_data.rain_threshold) * 100
        drivers.append(f"rainfall approaching threshold ({input_data.rainfall:.0f}mm / {input_data.rain_threshold:.0f}mm, {pct_of_thresh:.0f}%)")

    if norm.lake >= th.driver_threshold_lake:
        drivers.append(f"rapid glacial lake expansion (+{input_data.lake_area_change:.1f}%)")

    if norm.seismic >= th.driver_threshold_seismic:
        drivers.append(f"elevated localized seismic tremors ({input_data.seismic_activity:.1f} M)")

    if norm.reports >= th.driver_threshold_reports:
        count = len(input_data.reports)
        drivers.append(f"multiple ground anomaly reports ({count} field report{'s' if count != 1 else ''})")

    if norm.terrain >= th.driver_threshold_terrain and not drivers:
        drivers.append(f"steep geomorphic landslide susceptibility ({input_data.terrain_susceptibility:.2f})")

    if not drivers:
        drivers.append("all environmental baseline signals within normal limits")

    return drivers


def generate_explanation(
    input_data: LocationRiskInput,
    norm: NormalizedSignals,
    risk_level: RiskLevel,
    thresholds: Optional[ThresholdsSettings] = None
) -> PreGeminiExplanation:
    """
    Generates explainable, deterministic pre-Gemini reasoning output.
    Provides concise summaries and action recommendations in both English and Nepali.
    """
    name = input_data.location_name or "Target Corridor"
    drivers = extract_key_drivers(input_data, norm, thresholds)
    drivers_str = ", ".join(drivers)

    if risk_level == RiskLevel.LOW:
        summary_en = (
            f"{name} is currently at LOW risk. Environmental signals are within normal limits; "
            f"{drivers[0]}. Routine travel advisory in effect."
        )
        summary_ne = (
            f"{name} हाल न्यून जोखिममा छ। वातावरणीय परिस्थिति सामान्य दायराभित्र छ। "
            f"नियमित यात्रा सल्लाह लागू छ।"
        )
        rec_en = "Routine travel advisory in effect. Continue standard hydrological and satellite monitoring."
        rec_ne = "नियमित यात्रा सल्लाह लागू छ। सामान्य अनुगमन जारी राख्नुहोस्।"
        action_code = "ROUTINE_MONITORING"

    elif risk_level == RiskLevel.MODERATE:
        summary_en = (
            f"{name} is at MODERATE risk. Primary indicators: {drivers_str}. "
            f"Pre-monsoon / catchment saturation is building."
        )
        summary_ne = (
            f"{name} मध्यम जोखिममा छ। प्रमुख कारकहरू: {drivers_str}। "
            f"जोखिम बढ्दो क्रममा छ, सतर्कता अपनाउनुहोस्।"
        )
        rec_en = "Monitor conditions closely before departure. Trekking agencies should maintain regular satellite/radio check-ins; no hard restrictions yet."
        rec_ne = "प्रस्थान अघि मौसम र बाटोको अवस्था नजिकबाट अनुगमन गर्नुहोस्। यात्रा संघसंस्थाहरू सम्पर्कमा रहनुहोस्।"
        action_code = "MONITOR_CONDITIONS"

    elif risk_level == RiskLevel.HIGH:
        summary_en = (
            f"{name} is at HIGH risk. Alert triggered by {drivers_str}. "
            f"High probability of localized slope instability or flash flooding."
        )
        summary_ne = (
            f"{name} उच्च जोखिममा छ। {drivers_str} का कारण चेतावनी जारी गरिएको छ। "
            f"पहिरो तथा आकस्मिक बाढीको सम्भावना उच्च छ।"
        )
        rec_en = "Recommend delaying non-essential entry and briefing agencies before departure. Halt foot travel through narrow gorges."
        rec_ne = "अत्यावश्यक बाहेक यात्रा स्थगित गर्न सिफारिस गरिन्छ। जोखिमयुक्त गल्छी तथा खोला किनारबाट टाढा रहनुहोस्।"
        action_code = "DELAY_NON_ESSENTIAL_TRAVEL"

    else:  # CRITICAL
        summary_en = (
            f"{name} is at CRITICAL multi-hazard risk! Severe convergence of {drivers_str}. "
            f"Immediate threat of catastrophic landslide damming or GLOF cascade."
        )
        summary_ne = (
            f"{name} गम्भीर (अति उच्च) जोखिममा छ! {drivers_str} को गम्भीर संयोजन। "
            f"विनाशकारी पहिरो वा हिमताल विस्फोटको तत्काल खतरा।"
        )
        rec_en = "Recommend postponing entry and notifying registered trekking groups immediately. Evacuate active flood paths and alert Armed Police Force (APF) search teams."
        rec_ne = "उक्त क्षेत्रमा तत्काल प्रवेश निषेध गर्नुहोस् र सबै ट्रेकिङ टोलीलाई जानकारी दिनुहोस्। तटीय क्षेत्र तुरुन्त खाली गर्नुहोस्।"
        action_code = "EVACUATE_AVOID_ENTRY"

    return PreGeminiExplanation(
        key_drivers=drivers,
        summary_message=summary_en,
        summary_message_ne=summary_ne,
        recommendation=rec_en,
        recommendation_ne=rec_ne,
        action_code=action_code
    )


def evaluate_location_risk(
    input_data: LocationRiskInput,
    weights_override: Optional[RiskWeightsSettings] = None
) -> RiskAssessmentOutput:
    """
    Main risk engine entrypoint.
    Executes:
    1. Normalization of all 5 physical and crowdsourced signals
    2. Configurable weighted fusion:
       score = (w_rain * norm_rain) + (w_seismic * norm_seismic) +
               (w_lake * norm_lake) + (w_terrain * norm_terrain) +
               (w_reports * norm_reports)
    3. Categorical risk tier determination (Low, Moderate, High, Critical)
    4. Deterministic Pre-Gemini explainability and bilingual recommendations
    5. Latency tracking and timestamping
    """
    start_time = time.perf_counter()

    # Determine active weights
    weights = (
        input_data.custom_weights
        or weights_override
        or settings.weights
    )

    # 1. Normalize signals
    norm_rain = normalize_rainfall(input_data.rainfall, input_data.rain_threshold)
    norm_seismic = normalize_seismic(
        input_data.seismic_activity,
        settings.thresholds.seismic_max_magnitude
    )
    norm_lake = normalize_lake_growth(
        input_data.lake_area_change,
        settings.thresholds.lake_change_max_pct
    )
    norm_terrain = normalize_terrain(input_data.terrain_susceptibility)
    norm_reports = normalize_reports(
        input_data.reports,
        settings.thresholds.report_boost_per_report,
        settings.thresholds.report_max_cap
    )

    normalized_signals = NormalizedSignals(
        rainfall=norm_rain,
        seismic=norm_seismic,
        lake=norm_lake,
        terrain=norm_terrain,
        reports=norm_reports
    )

    # 2. Weighted fusion
    contrib_rain = round(weights.rainfall * norm_rain, 4)
    contrib_seismic = round(weights.seismic * norm_seismic, 4)
    contrib_lake = round(weights.lake * norm_lake, 4)
    contrib_terrain = round(weights.terrain * norm_terrain, 4)
    contrib_reports = round(weights.reports * norm_reports, 4)

    raw_score = (
        contrib_rain +
        contrib_seismic +
        contrib_lake +
        contrib_terrain +
        contrib_reports
    )
    # Clamped final risk score to [0.0, 1.0]
    final_score = round(min(max(0.0, raw_score), 1.0), 4)

    signal_contributions = SignalContributions(
        rainfall=contrib_rain,
        seismic=contrib_seismic,
        lake=contrib_lake,
        terrain=contrib_terrain,
        reports=contrib_reports
    )

    # 3. Categorical Risk Level
    risk_level = determine_risk_level(final_score, settings.thresholds)
    risk_level_ne = NEPALI_RISK_LEVEL_MAP.get(risk_level, "न्यून")

    # 4. Structured pre-Gemini reasoning explanation
    explanation = generate_explanation(input_data, normalized_signals, risk_level, settings.thresholds)

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 3)

    return RiskAssessmentOutput(
        location_id=input_data.location_id,
        location_name=input_data.location_name or "Target Corridor",
        region=input_data.region or "Nepal",
        gps=input_data.gps,
        risk_score=final_score,
        risk_level=risk_level,
        risk_level_ne=risk_level_ne,
        normalized_signals=normalized_signals,
        signal_contributions=signal_contributions,
        explanation=explanation,
        timestamp=datetime.now(timezone.utc),
        calculated_in_ms=elapsed_ms
    )
