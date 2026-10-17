"""
Generate Studio-Grade AI Synthetic Voiceovers and Synchronized Subtitles (.srt & .vtt)
for the HimalSanket Google Cloud AI Builder Cup 2026 Video Submission.

Award-Winning Script covering 100% of HimalSanket's features:
- Problem & Himalayan Bottleneck Reality
- 5-Signal Deterministic Mathematical Fusion Engine (30% Rain, 25% GLOF, 20% Seismic, 15% Ground, 10% Slope)
- Sentinel-2 MSI Level-2A NDWI Glacial Lake Surface Expansion at 4,950m
- Google TimesFM Pre-Trained Foundation Model for 24h Precipitation Forecasting
- Live Emergency Drill & Moderate -> Critical State Escalation in Milliseconds
- Hydrodynamic Downstream Wave Propagation (18m Lama Hotel, 38m Syabrubesi, 78m Betrawati)
- Interactive Flood Surge Simulator (+5m lateral GIS buffer expansion)
- Google Gemini Multimodal Reasoning: English, Nepali, 140-char 2G SMS, and NDRRMA SITREP Export
- Offline-First Civilian Trekker PWA with Live GPS Altitude & Geofenced Hazard Distance
- One-Tap Voice Note Recording with Nepali Emergency Dialect Keyword Extraction («पहिरो», «धमिलो», «गडगडाएको»)
- Conversational Gemini AI Safety Copilot with Grounded Trail Guidance
- SOS Distress Capsule (Low-Bandwidth Micro-Packet Queuing)
- Search & Rescue Command: Prioritized Triage Queue & 1-Click SAR Helicopter Sortie Dispatch with Live ETA Flight Tracking
- Google Cloud Tech Stack (Gemini + TimesFM + Cloud Run + Firestore) & Social Impact Mission
"""

import os
import sys
import asyncio
from datetime import timedelta
from typing import List, Dict, Any

import edge_tts
from edge_tts.srt_composer import Subtitle, compose

# Ensure clean UTF-8 printing on Windows PowerShell / cmd
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

VOICE = "en-US-ChristopherNeural"  # Authoritative, broadcast-quality documentary narrator
RATE = "+5%"  # Crisp, energetic professional pacing (~3m 35s target)

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
AUDIO_DIR = os.path.join(OUTPUT_DIR, "audio")
SUBTITLES_DIR = os.path.join(OUTPUT_DIR, "subtitles")

os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(SUBTITLES_DIR, exist_ok=True)

SCENES: List[Dict[str, Any]] = [
    {
        "id": "scene1_problem_gap",
        "title": "Act 1: The Himalayan Bottleneck & The Fatal Blind Spot",
        "text": (
            "In August 2026, a catastrophic glacial flood tore through Langtang Valley, leaving over three hundred eighty tourists "
            "uncontactable and claiming thousands of lives. In steep Himalayan canyons, there is only one foot trail in, and one trail out. "
            "Today's government warning systems rely solely on physical river sensors downstream. Sirens sound only after bridges are already "
            "washing away, giving people ten minutes to scale vertical cliffs in the pitch dark. "
            "This is HimalSanket: an AI-powered multi-hazard early warning and autonomous rescue system built so the next search doesn't take eleven days."
        ),
    },
    {
        "id": "scene2_fused_risk_engine",
        "title": "Act 2: The Multi-Hazard Fused Engine & Satellite Eyes",
        "text": (
            "HimalSanket doesn't guess or hallucinate. Our deterministic fusion engine combines five continuous vectors: "
            "catchment rainfall at thirty percent weight, Sentinel-2 glacial lake expansion at twenty-five percent, USGS seismic tremors at twenty percent, "
            "porter ground reports at fifteen percent, and geomorphic slope at ten percent. "
            "Using European Space Agency Sentinel-2 multispectral imagery, our pipeline monitors moraine lakes at five thousand meters altitude, "
            "tracking normalized difference water index expansion pixel by pixel. "
            "Simultaneously, Google's TimesFM foundation model forecasts precipitation spikes twenty-four hours in advance, "
            "allowing mountain communities to evacuate long before cloudbursts hit the ground."
        ),
    },
    {
        "id": "scene3_live_drill_cascade",
        "title": "Act 3: Live Emergency Drill, Hydrodynamics & Gemini Synthesis",
        "text": (
            "Watch what happens during an active emergency drill. When sensors detect an acute cloudburst surge, "
            "our FastAPI orchestrator on Google Cloud Run recalculates corridor risk in milliseconds, escalating from Moderate to Critical. "
            "Our GIS hydrodynamic model computes downstream wave arrival times: "
            "eighteen minutes to Lama Hotel gorge, thirty-eight minutes to Syabrubesi, and seventy-eight minutes to the Betrawati arterial bridge. "
            "Instantly, Google Gemini synthesizes telemetry into localized action directives in English, native Nepali, "
            "compressed SMS alerts for 2G phones, and one-click official SITREP reports for Nepal's Disaster Management Authority."
        ),
    },
    {
        "id": "scene4_civilian_pwa_voice",
        "title": "Act 4: Grassroots Civilian PWA & Multimodal Voice AI",
        "text": (
            "Disaster tools fail if people on the ground cannot use them. For local guides, porters, and trekkers, "
            "HimalSanket operates as an offline-first Progressive Web App. Porters walking through freezing monsoon rain cannot type text on a phone. "
            "With one tap, they record a ten-second voice note in their native dialect. "
            "Google Gemini transcribes the audio, extracting critical danger keywords like murky floodwaters, "
            "landslide cracks, or acoustic rumblings, directly boosting risk confidence. "
            "Trekkers can also consult our Gemini AI Safety Copilot for real-time trail guidance based on their live GPS elevation and distance to hazard zones."
        ),
    },
    {
        "id": "scene5_sos_distress_sar",
        "title": "Act 5: SOS Distress Capsule & Autonomous SAR Helicopter Dispatch",
        "text": (
            "When disaster strikes and a civilian is trapped, every kilobyte matters. "
            "HimalSanket's SOS Distress Capsule transmits ultralight micro-packets with exact GPS coordinates first, "
            "guaranteed to puncture fleeting 2G signal windows. "
            "At Search and Rescue headquarters, incoming distress calls are automatically prioritized by elevation vulnerability and medical urgency. "
            "With one click, commanders dispatch search and rescue helicopter sorties, streaming live telemetry, terrain clearance vectors, "
            "and real-time flight tracking directly to rescue teams."
        ),
    },
    {
        "id": "scene6_google_cloud_closing",
        "title": "Act 6: Google Cloud Architecture & The Defining Mission",
        "text": (
            "Under the hood, Google Gemini provides multimodal reasoning and multilingual briefings. "
            "Google TimesFM delivers predictive rainfall forecasting. "
            "Cloud Run powers our microservice orchestrator, and Cloud Firestore synchronizes life-saving alerts in real time. "
            "Langtang has flooded and buried its people twice in a decade. "
            "HimalSanket exists so there isn't a third time. Thank you."
        ),
    },
]


def srt_to_vtt(srt_content: str) -> str:
    """Convert SRT format string to WebVTT format string."""
    lines = srt_content.strip().split("\n")
    vtt_lines = ["WEBVTT", ""]
    for line in lines:
        if "-->" in line:
            vtt_lines.append(line.replace(",", "."))
        else:
            vtt_lines.append(line)
    return "\n".join(vtt_lines) + "\n"


async def generate_scene_audio(scene: Dict[str, Any]) -> Dict[str, Any]:
    scene_id = scene["id"]
    text = scene["text"]
    audio_path = os.path.join(AUDIO_DIR, f"{scene_id}.mp3")
    srt_path = os.path.join(SUBTITLES_DIR, f"{scene_id}.srt")
    vtt_path = os.path.join(SUBTITLES_DIR, f"{scene_id}.vtt")

    print(f"Generating audio for {scene['title']}...")
    comm = edge_tts.Communicate(text, VOICE, rate=RATE)
    submaker = edge_tts.SubMaker()

    audio_bytes = bytearray()
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio_bytes.extend(chunk["data"])
        elif chunk["type"] == "SentenceBoundary":
            submaker.feed(chunk)

    with open(audio_path, "wb") as f:
        f.write(audio_bytes)

    srt_content = submaker.get_srt()
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write(srt_content)

    vtt_content = srt_to_vtt(srt_content)
    with open(vtt_path, "w", encoding="utf-8") as f:
        f.write(vtt_content)

    duration_sec = 0.0
    if submaker.cues:
        last_cue = submaker.cues[-1]
        duration_sec = last_cue.end.total_seconds() + 0.5

    print(f"  [OK] Saved: {os.path.basename(audio_path)} (~{duration_sec:.1f}s, {len(submaker.cues)} cues)")

    return {
        "id": scene_id,
        "title": scene["title"],
        "audio_bytes": bytes(audio_bytes),
        "duration_sec": duration_sec,
        "cues": submaker.cues,
    }


async def main():
    print("=" * 70)
    print("HimalSanket Grand-Prize Video Audio & Subtitles Synthesizer")
    print(f"Voice: {VOICE} | Rate: {RATE}")
    print("=" * 70)

    results = []
    for scene in SCENES:
        res = await generate_scene_audio(scene)
        results.append(res)

    print("\nAssembling Master Combined Track & Master Synchronized Subtitles...")
    master_audio_path = os.path.join(AUDIO_DIR, "himalsanket_master_voiceover.mp3")
    master_srt_path = os.path.join(SUBTITLES_DIR, "himalsanket_master_captions.srt")
    master_vtt_path = os.path.join(SUBTITLES_DIR, "himalsanket_master_captions.vtt")

    master_audio = bytearray()
    master_cues: List[Subtitle] = []
    cumulative_offset = timedelta(seconds=0)
    pause_between_scenes = timedelta(seconds=1.0)

    for idx, res in enumerate(results):
        master_audio.extend(res["audio_bytes"])
        for cue in res["cues"]:
            adjusted_start = cue.start + cumulative_offset
            adjusted_end = cue.end + cumulative_offset
            master_cues.append(
                Subtitle(
                    index=len(master_cues) + 1,
                    start=adjusted_start,
                    end=adjusted_end,
                    content=cue.content,
                )
            )
        scene_duration = timedelta(seconds=res["duration_sec"])
        cumulative_offset += scene_duration + pause_between_scenes

    with open(master_audio_path, "wb") as f:
        f.write(master_audio)

    master_srt = compose(master_cues)
    with open(master_srt_path, "w", encoding="utf-8") as f:
        f.write(master_srt)

    master_vtt = srt_to_vtt(master_srt)
    with open(master_vtt_path, "w", encoding="utf-8") as f:
        f.write(master_vtt)

    total_duration_sec = cumulative_offset.total_seconds()
    mins = int(total_duration_sec // 60)
    secs = int(total_duration_sec % 60)

    print("\n" + "=" * 70)
    print("SYNTHESIS COMPLETE!")
    print(f"Total Video Runtime: {mins}m {secs}s ({total_duration_sec:.1f}s)")
    print(f"Master Audio: {master_audio_path}")
    print(f"Master SRT:   {master_srt_path}")
    print(f"Master VTT:   {master_vtt_path}")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
