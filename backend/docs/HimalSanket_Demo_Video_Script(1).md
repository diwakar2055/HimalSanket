# HimalSanket — 3-Minute Demo Video Script

**Format:** Screen recording + voiceover. Record the prototype interactions live (don't fake with static screenshots — judges can tell, and a real click-through is more convincing than a mockup).
**Tools:** OBS Studio or Loom for screen capture; a phone voice memo or Audacity for clean narration audio, mixed in afterward.
**Tone:** Calm, direct, a little urgent — this is a rescue tool, not a startup pitch. No hype music under the opening stats.

---

## Scene 1 — Cold Open (0:00–0:15)

**Visual:** Black screen, then fade in on the title slide (HimalSanket, mountain silhouette).

**Voiceover:**
> "On August 26th, 2026, a glacial flood tore through Langtang Valley, Nepal. Over 380 tourists went uncontactable. Eleven days later, rescuers pulled a 60-year-old woman alive from beneath the rubble — found only because a search dog happened to pass by. This is HimalSanket. It's built so the next search doesn't take eleven days."

**On-screen text:** "1,287+ lives lost · 380+ tourists uncontactable · 38 stranded — August 2026"

---

## Scene 2 — The Gap (0:15–0:35)

**Visual:** Deck slide 5 ("Nepal's Warning System Has Four Blind Spots") — show the two-column comparison briefly, then cut to slide 2 (corridor bottleneck cascade).

**Voiceover:**
> "Nepal already has a warning system — but it's reactive, river-gauge only, and blind to landslides, glacial floods, and the exact valleys that double as its busiest trekking routes. One road in, one road out. When it fails, everyone downstream is trapped at once."

---

## Scene 3 — Corridor Risk Dashboard (0:35–1:05)

**Visual:** Screen-record the prototype, "Corridor Risk Dashboard" tab. Click through the four corridors, land on Langtang. Click **"Simulate rainfall spike."** Let the viewer watch the tier badge flip live from Low/Moderate to Critical, and the Gemini briefing box regenerate in English and Nepali.

**Voiceover:**
> "Here's the live risk dashboard. Rainfall, seismic activity, glacial lake growth, and terrain data feed a fusion model — and Gemini turns that into a plain-language alert, in both English and Nepali. Watch what happens when rainfall spikes in Langtang right now."
> *(pause while the tier flips)*
> "That's the alert a trekking agency — or a family back home — would see, in seconds, not days."

**On-screen text (small, corner):** "Signals simulated for this prototype — production pulls from DHM, Earth Engine, and USGS live feeds."

---

## Scene 4 — Crowdsourced Ground Reports (1:05–1:30)

**Visual:** Scroll down to the "Submit a ground report" panel. Click a report type ("Water rising"), toggle "Attach voice note," type a short note, hit submit. Show it appear in the feed.

**Voiceover:**
> "Satellites miss small, fast-forming glacial lakes — but a porter standing next to one won't. Guides, porters, and teahouse owners can flag a hazard with a tap, a note, or a voice message in their own dialect — no literacy or connectivity assumptions required."

---

## Scene 5 — The Distress Capsule (1:30–2:05)

**Visual:** Switch to the "SOS Beacon (victim view)" tab. Select a corridor, type a short distress message ("I'm trapped on the second floor, my leg is stuck"), toggle signal to **"Weak,"** hit **Send SOS.** Let the transmission log play out on screen — GPS delivered, voice/photo queued.

**Voiceover:**
> "This is the idea we're proudest of. If someone is trapped but conscious, HimalSanket sends their location first — the smallest possible payload — so it has the best chance of getting through even a few seconds of signal. Voice and photo follow automatically once connection allows. This is what could have cut that eleven-day search down to hours."

**On-screen text:** "Phase 2 concept — requires at least one signal window to transmit anything."

---

## Scene 6 — Search & Rescue Priority (2:05–2:25)

**Visual:** Switch to "Search & Rescue Priority" tab. Show the SOS entry sitting at the top of the list, tagged "Direct SOS," outranking a manually-added family report.

**Voiceover:**
> "Every report — from a family member, or straight from a survivor — lands in one ranked list, so rescue teams know exactly where to dig first, instead of searching a whole valley blind."

---

## Scene 7 — Built on Google Cloud (2:25–2:45)

**Visual:** Deck slide 11 ("Every Mandatory Requirement, Put to Real Work") — the four-icon Gemini / Cloud Run / Firebase / Earth Engine row.

**Voiceover:**
> "Under the hood: Gemini reasons across satellite imagery, sensor data, and text. Cloud Run scales the backend. Firebase delivers alerts in real time. Earth Engine watches the glacial lakes no one else is watching."

---

## Scene 8 — Close (2:45–3:00)

**Visual:** Deck slide 15 closing frame — navy background, the quote line.

**Voiceover:**
> "Langtang has now flooded and buried its people twice in a decade. HimalSanket exists so there isn't a third time."

**On-screen text:** *"Because Langtang shouldn't happen a third time."*
Team HimalSanket — Amrit, Divakar, Basanta, Sudip · Google Cloud AI Builder Cup 2026

---

## Production notes

- **Captions are not optional.** Many judges skim videos muted first — burn in captions for every voiceover line.
- **Don't demo anything you haven't built.** Scenes 3, 4, 5, and 6 all show real, working prototype interactions — that's deliberate. Nothing in this script asks you to fake a feature that only exists on a roadmap slide.
- **Keep cuts tight.** Screen-record each scene 2–3 times and pick the cleanest take rather than trying to get it perfect live — dead air while clicking around costs more than a jump cut.
- **If you're short on time**, cut Scene 7 first — the tech stack slide matters less than watching the product actually work.
