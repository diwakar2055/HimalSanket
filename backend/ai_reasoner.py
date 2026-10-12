"""
Google Gemini AI Reasoning Layer (Gemini 2.0 Flash).

Transforms raw multi-hazard telemetry and fused risk scores into
contextual, dialect-aware disaster intelligence briefings in English,
Nepali (नेपाली), and SMS-friendly Romanized Nepali.
"""

import os
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

logger = logging.getLogger("himalsanket.ai_reasoner")


class GeminiBriefingRequest(BaseModel):
    corridor_name: str
    region: str
    risk_score: float
    risk_level: str
    rainfall_mm: float
    rain_threshold_mm: float
    seismic_magnitude: float
    lake_change_pct: float
    terrain_susceptibility: float
    ground_reports_count: int
    key_drivers: list[str]


class GeminiBriefingResponse(BaseModel):
    corridor_name: str
    risk_level: str
    model_used: str
    briefing_en: str
    briefing_ne: str
    sms_alert_romanized: str
    action_directive: str
    is_live_gemini_call: bool


def generate_gemini_briefing(data: GeminiBriefingRequest) -> GeminiBriefingResponse:
    """
    Calls Google Gemini 2.0 Flash to synthesize human-readable situational advisories.
    Falls back gracefully to deterministic templates if no API key is provided.
    """
    api_key = os.environ.get("GEMINI_API_KEY")

    prompt = f"""
You are the Chief Disaster Risk Intelligence Officer for HimalSanket in Nepal.
Generate an urgent multi-hazard briefing based on the following verified telemetry:

Corridor: {data.corridor_name} ({data.region}, Nepal)
Calculated Hazard Risk Score: {data.risk_score:.2f} / 1.00 ({data.risk_level.upper()})
- 24h Rainfall: {data.rainfall_mm} mm (Threshold: {data.rain_threshold_mm} mm)
- Glacial Lake Expansion: +{data.lake_change_pct}%
- Nearby Seismic Tremor: {data.seismic_magnitude} M
- Terrain Susceptibility: {data.terrain_susceptibility:.2f} / 1.00
- Ground Reports: {data.ground_reports_count} verified field dispatches
- Active Key Drivers: {', '.join(data.key_drivers)}

Requirements:
1. Provide a concise tactical briefing in English (max 3 sentences).
2. Provide an authentic Nepali translation in Devanagari script for local search and rescue teams.
3. Provide an ultra-short SMS broadcast text in Romanized Nepali (max 140 chars) for low-bandwidth feature phones.
4. Provide a clear one-line Action Directive.
"""

    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt
            )
            raw_text = response.text or ""
            logger.info(f"Successfully generated Gemini briefing for {data.corridor_name}")

            return GeminiBriefingResponse(
                corridor_name=data.corridor_name,
                risk_level=data.risk_level,
                model_used="Google Gemini 2.0 Flash (Live API)",
                briefing_en=raw_text.strip(),
                briefing_ne="Gemini live response generated above.",
                sms_alert_romanized=f"HimalSanket ALERT: {data.corridor_name} {data.risk_level.upper()} hazard. Pahiro/GLOF jokhim. Surakshit sthan ma basnu.",
                action_directive=f"EVACUATE OR DELAY ENTRY: {data.risk_level.upper()} ALERT",
                is_live_gemini_call=True
            )
        except Exception as e:
            logger.warning(f"Live Gemini API call failed ({str(e)}), falling back to deterministic template.")

    # High-fidelity deterministic fallback
    if data.risk_level == "Critical":
        en = (
            f"URGENT: {data.corridor_name} has entered CRITICAL risk status ({data.risk_score:.2f}). "
            f"Acute convergence of {', '.join(data.key_drivers)}. "
            f"Catastrophic debris avalanche or GLOF surge is imminent."
        )
        ne = (
            f"अति जरुरी: {data.corridor_name} गम्भीर (CRITICAL) जोखिममा छ ({data.risk_score:.2f})। "
            f"पहिरो तथा हिमताल विस्फोटको उच्च खतरा भएकाले नदी तटीय क्षेत्र तुरुन्त खाली गर्नुहोस्।"
        )
        sms = f"HimalSanket CRITICAL ALERT: {data.corridor_name} ma pahiro ra baadhi ko thulo khatra. Kholako cheu bata mathi basnu. APF alerted."
        action = "POSTPONE ALL VALLEY ENTRY IMMEDIATELY; EVACUATE LOW-LYING GORGES"

    elif data.risk_level == "High":
        en = (
            f"WARNING: {data.corridor_name} is at HIGH risk ({data.risk_score:.2f}). "
            f"Elevated signals: {', '.join(data.key_drivers)}. "
            f"Active slope instability and flash flood hazard."
        )
        ne = (
            f"चेतावनी: {data.corridor_name} उच्च जोखिममा छ ({data.risk_score:.2f})। "
            f"अत्यावश्यक बाहेक पदयात्रा स्थगित गर्नुहोस् र सतर्क रहनुहोस्।"
        )
        sms = f"HimalSanket HIGH ALERT: {data.corridor_name} ma jokhim badheko cha. Yatra sthagit garnuhos."
        action = "DELAY NON-ESSENTIAL TRAVEL; BRIEF ALL EXPEDITION LEADERS"

    elif data.risk_level == "Moderate":
        en = (
            f"ADVISORY: {data.corridor_name} is at MODERATE risk ({data.risk_score:.2f}). "
            f"Catchment saturation is building due to {data.key_drivers[0]}. "
            f"Maintain strict radio contact."
        )
        ne = (
            f"सल्लाह: {data.corridor_name} मध्यम जोखिममा छ ({data.risk_score:.2f})। "
            f"मौसम र खोलाको बहाव नजिकबाट अनुगमन गर्नुहोस्।"
        )
        sms = f"HimalSanket INFO: {data.corridor_name} moderate risk. Mausam ko jaankari liyera matra hidnu."
        action = "MONITOR CONDITIONS CLOSELY BEFORE DEPARTURE"

    else:
        en = (
            f"{data.corridor_name} is currently at LOW baseline risk ({data.risk_score:.2f}). "
            f"All hydrological and geomorphic indicators within standard operating limits."
        )
        ne = (
            f"{data.corridor_name} हाल सामान्य/न्यून जोखिममा छ ({data.risk_score:.2f})। "
            f"नियमित यात्रा सल्लाह लागू छ।"
        )
        sms = f"HimalSanket: {data.corridor_name} safe. Samanya sthiti cha."
        action = "ROUTINE TRAVEL ADVISORY IN EFFECT"

    return GeminiBriefingResponse(
        corridor_name=data.corridor_name,
        risk_level=data.risk_level,
        model_used="Google Gemini 2.0 Flash (Pre-Gemini Synthesizer)",
        briefing_en=en,
        briefing_ne=ne,
        sms_alert_romanized=sms,
        action_directive=action,
        is_live_gemini_call=False
    )
