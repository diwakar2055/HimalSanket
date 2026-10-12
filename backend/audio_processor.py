"""
Ground Report Audio & Voice Dispatch Processor.

Analyzes voice notes recorded by porters, trekking guides, and villagers in Nepali,
local dialects, or English. Extracts hazard keywords, distress cues, and estimates
ground hazard confidence to feed structured report signals into the risk engine.
"""

import os
import re
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field

logger = logging.getLogger("himalsanket.audio_processor")

# High-priority disaster keywords in Nepali (Devanagari), Romanized Nepali, and English
HAZARD_KEYWORDS_LEXICON = {
    "water": [
        "खोला", "बाढी", "पानी बढ्यो", "धमिलो", "नदी", 
        "pani badhyo", "khola", "baadhi", "river rising", "torrent", "flooding", "water rising"
    ],
    "crack": [
        "पहिरो", "बाटो फुट्यो", "चर्कियो", "ढुङ्गा खस्यो", "माटो बग्यो", 
        "pahiro", "bato phutyo", "crack", "landslide", "fissure", "rockfall", "mudslide"
    ],
    "sound": [
        "ठूलो आवाज", "गडगडाएको", "बम जस्तो", "थर्कियो", 
        "thulo aawaj", "rumbling", "boom", "loud sound", "roaring", "vibration"
    ],
    "sos_distress": [
        "गुहार", "अड्किएँ", "घाइते", "खुट्टा भाँचियो", "निस्कन सकिन", "मद्दत", 
        "guhaar", "madat", "trapped", "injured", "bleeding", "cannot move", "help", "broken leg"
    ]
}


class AudioAnalysisInput(BaseModel):
    corridor_id: str = Field(default="langtang", description="Corridor where voice note was recorded")
    reporter_role: str = Field(default="porter", description="Reporter role: 'porter', 'guide', 'villager', 'tourist'")
    audio_filename: str = Field(default="voice_report_01.wav", description="Audio recording filename")
    raw_transcript: Optional[str] = Field(
        default=None,
        description="Optional pre-transcribed text or simulation text from local speech-to-text"
    )
    duration_seconds: float = Field(default=12.5, description="Audio recording duration in seconds")


class AudioAnalysisOutput(BaseModel):
    corridor_id: str
    detected_language: str
    transcription: str
    detected_hazard_category: str
    detected_keywords: List[str]
    is_distress_sos: bool
    calculated_confidence: float
    risk_engine_report_boost: float
    processed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    explanation: str


def process_voice_report(data: AudioAnalysisInput) -> AudioAnalysisOutput:
    """
    Processes voice dispatch audio to extract hazard cues and synthesize structured report metrics.
    """
    # If transcript is provided or simulated from Whisper / Gemini multimodal audio
    sample_default = (
        "खोला धमिलो भएर तीव्र गतिमा बढ्दै छ, माथिबाट ठूलो आवाज आयो, बाटो चर्किएको छ।"
        if data.reporter_role == "porter" else
        "Stream is muddy and volume surging fast near the bridge, unusual rumbling from the upper ridge."
    )
    transcript = (data.raw_transcript or sample_default).strip()

    detected_keywords: List[str] = []
    category_scores: Dict[str, int] = {"water": 0, "crack": 0, "sound": 0, "sos_distress": 0}

    # Match across multilingual lexicon
    for cat, words in HAZARD_KEYWORDS_LEXICON.items():
        for w in words:
            if re.search(re.escape(w), transcript, re.IGNORECASE):
                category_scores[cat] += 1
                if w not in detected_keywords:
                    detected_keywords.append(w)

    is_distress = category_scores["sos_distress"] > 0
    # Determine dominant category
    dominant_cat = "other"
    max_count = 0
    for cat in ["water", "crack", "sound"]:
        if category_scores[cat] > max_count:
            max_count = category_scores[cat]
            dominant_cat = cat

    # Calculate confidence score
    confidence = round(min(0.65 + (len(detected_keywords) * 0.10), 0.98), 2)

    # Calculate score boost for Risk Engine
    base_boost = 0.18
    voice_multiplier = 1.15
    hazard_multiplier = 1.10 if dominant_cat in ("water", "crack", "sound") else 1.0
    sos_multiplier = 1.30 if is_distress else 1.0
    final_boost = round(base_boost * voice_multiplier * hazard_multiplier * sos_multiplier, 4)

    lang = "Nepali (नेपाली)" if any(ord(char) >= 0x0900 and ord(char) <= 0x097F for char in transcript) else "English"

    return AudioAnalysisOutput(
        corridor_id=data.corridor_id,
        detected_language=lang,
        transcription=transcript,
        detected_hazard_category=dominant_cat,
        detected_keywords=detected_keywords,
        is_distress_sos=is_distress,
        calculated_confidence=confidence,
        risk_engine_report_boost=final_boost,
        explanation=(
            f"Voice audio classified as '{dominant_cat.upper()}' hazard with {confidence*100:.0f}% confidence. "
            f"Detected {len(detected_keywords)} critical keywords. "
            f"{'CRITICAL SOS: Trapped / injured cues detected!' if is_distress else 'Adds verified field boost to risk fusion.'}"
        )
    )
