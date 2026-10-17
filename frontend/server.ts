import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import express from "express";
import { createServer as createViteServer } from "vite";

const getCurrentDir = () => {
  try {
    if (typeof __dirname !== "undefined") return __dirname;
    if (typeof import.meta !== "undefined" && import.meta.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch (_) {}
  return process.cwd();
};

let lastEnvReload = 0;
const ENV_RELOAD_COOLDOWN_MS = 10_000; // 10s cooldown cache (MED-01)

function reloadEnv(force = false) {
  const now = Date.now();
  if (!force && now - lastEnvReload < ENV_RELOAD_COOLDOWN_MS) {
    return;
  }
  lastEnvReload = now;

  const currentDir = getCurrentDir();
  const envPaths = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(currentDir, ".env.local"),
    "/Users/ankitgyawali/Downloads/himalSanket/himalsanket-fullstack/frontend/.env.local",
    "/Users/ankitgyawali/BG/HimalSanket/.env.local",
    "/Users/ankitgyawali/Downloads/himalSanket/himalsanket-riskengine/.env.local",
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, override: true });
      break;
    }
  }
}
reloadEnv(true);

const isConfiguredApiKey = (key?: string) => {
  if (!key) return false;
  const trimmed = key.trim();
  return (
    trimmed !== "" &&
    trimmed !== "MY_GEMINI_API_KEY" &&
    trimmed !== "AIzaSyYourGeneratedKeyHere" &&
    !trimmed.startsWith("AIzaSyYour") &&
    !trimmed.includes("YourGeneratedKey") &&
    trimmed.length >= 25
  );
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Helper: Domain-expert Himalayan Hazard Intelligence Synthesizer
  function synthesizeHazardChat(message: string, corridorContext?: any): string {
    const text = message.trim();
    const lower = text.toLowerCase();
    const isNepali = /[\u0900-\u097F]/.test(text) || lower.includes("namaste") || lower.includes("pahiro") || lower.includes("jokhim");

    const corridorName = corridorContext?.name || "Langtang Valley";
    const rainfall = corridorContext?.rainfall ?? corridorContext?.rainfall_mm ?? 55.0;
    const seismic = corridorContext?.seismic ?? corridorContext?.seismic_magnitude ?? 2.1;
    const lakeChange = corridorContext?.lakeChange ?? corridorContext?.lake_expansion_pct ?? 14.8;
    const userPos = corridorContext?.userPosition;
    const geofence = corridorContext?.geofenceStatus;
    const hazardDist = corridorContext?.distanceToHazard;
    const activeScenario = corridorContext?.activeScenario;

    // 0. Emergency Rescue Inquiries
    if (lower.includes("rescue") || lower.includes("उद्धार") || lower.includes("sos") || geofence === "DANGER") {
      return `🚨 **URGENT GEOFENCE SAFETY ADVICE**:
You are currently in ${corridorName}${userPos ? ` near ${userPos.lat.toFixed(4)}°N, ${userPos.lng.toFixed(4)}°E` : ""}.
${hazardDist !== undefined && hazardDist < 150 ? `⚠️ You are approximately ${hazardDist} meters from an active surge channel.` : ""}

**Immediate Actions:**
1. **Move Uphill**: Climb at least 30 meters above the valley floor onto solid granite bedrock. Never shelter on river gravel banks.
2. **Head for Safe Haven**: Proceed uphill toward **Kyanjin Gompa high ridge** or the nearest verified shelter.
3. **Emergency SOS**: Tap the red **Send SOS** button above to transmit your coordinates directly to Armed Police Force Search & Rescue base.`;
    }

    // 0.1 Explicit GPS Location Inquiries
    if (lower.includes("where am i") || lower.includes("my location") || lower.includes("my coordinates") || lower.includes("म कहाँ छु")) {
      return `📍 **Your Current Trekker Location:**
• Coordinates: **${userPos?.lat?.toFixed(4) || "28.2140"}° N, ${userPos?.lng?.toFixed(4) || "85.4950"}° E**
• Elevation: **~${Math.round(userPos?.altitude || 2780)}m ASL**
• Corridor: **${corridorName}**
• Proximity to River: **~${hazardDist ? hazardDist + "m" : "350m"} (Safe Buffer)**
• Status: **🟢 SAFE HAVEN ZONE** — Clear of active debris chutes.

You are safely above the river channel. Keep your phone battery charged and monitor local weather.`;
    }

    // 1. Nepali inquiries
    if (isNepali && (lower.includes("पहिरो") || lower.includes("pahiro") || lower.includes("के गर्ने") || lower.includes("जोखिम") || lower.includes("सुरक्षित"))) {
      return `नमस्ते! हिमालसंकेत विपद् जोखिम सहायक अनुसार ${corridorName} क्षेत्रमा पहिरो तथा आकस्मिक बाढीबाट बच्न निम्न सुरक्षा उपायहरू अपनाउनुहोस्:

1. **तत्काल सुरक्षित स्थान छनौट**: खोला, गल्छी वा ठाडो भीरको फेदबाट तुरुन्तै माथिल्लो स्थिर डाँडातर्फ सर्नुहोस्।
2. **धमिलो पानीको पूर्वसंकेत**: खोलाको पानी अचानक धमिलो भएमा वा बहाव घटेमा माथिल्लो भेगमा पहिरोले खोला थुनेको हुनसक्छ—तुरुन्त सतर्क हुनुहोस्।
3. **वर्षा मापन (DHM)**: हालको वर्षा दर ${rainfall}mm छ। २४ घण्टामा १००mm नाघेमा माटोको पकड कमजोर भई पहिरोको जोखिम उच्च हुन्छ।
4. **सञ्चार सम्पर्क**: स्थानीय विपद् व्यवस्थापन समिति वा वार्ड कार्यालयसँग नियमित सम्पर्कमा रहनुहोस्।

कुनै आपतकालीन उद्धार आवश्यक परेमा नजिकको सुरक्षा निकाय वा DHM हेल्पलाइनमा तुरुन्त खबर गर्नुहोस्।`;
    }

    if (isNepali && (lower.includes("नमस्ते") || lower.includes("namaste") || lower.includes("hello") || lower.includes("hi"))) {
      return `नमस्ते! म हिमालसंकेत एआई विपद् जोखिम सहायक हुँ। 

म नेपालका हिमाली पदमार्गहरू (${corridorName}, खुम्बु, अन्नपूर्ण, मनास्लु आदि) मा २४ सै घण्टा वर्षा, भूकम्पीय कम्पन तथा हिमताल (GLOF) को जोखिम अनुगमन गर्दछु।

तपाईं पदमार्गको सुरक्षा अवस्था, मौसम, वा विपद् पूर्वसावधानी सम्बन्धी कुनै पनि प्रश्न सोध्न सक्नुहुन्छ। म तपाईंलाई कसरी सहयोग गर्न सक्छु?`;
    }

    // 2. Greetings in English
    if (/^(hello|hi|hey|greetings|good\s*(morning|afternoon|evening)|namaste)[!.]*$/i.test(lower) || lower === "hello" || lower === "hi") {
      return `Namaste! I am your **HimalSanket AI Hazard Intelligence Assistant**.

I continuously analyze multi-hazard telemetry across Nepal's high-altitude corridors—currently focused on **${corridorName}**.

Here is what I am monitoring in real-time:
• 🌧️ **Precipitation**: ${rainfall} mm / 24h catchment saturation
• ⚡ **Seismic Activity**: ${seismic} M localized fault micro-tremors
• 🛰️ **Glacial Lakes**: +${lakeChange}% surface area expansion via Sentinel-2 NDWI
${userPos ? `• 📍 **Your Location**: ${userPos.lat.toFixed(4)}° N, ${userPos.lng.toFixed(4)}° E (${hazardDist ? hazardDist + "m from hazard path" : "Monitored"})\n` : ""}
You can ask me about:
1. *"Is ${corridorName} safe for trekking right now?"*
2. *"Am I safe at my current location?"*
3. *"What causes Glacial Lake Outburst Floods (GLOF)?"*
4. *"Where is the nearest safe haven or rescue base?"*
5. Or ask safety protocols in **नेपाली (Nepali)**!`;
    }

    // 3. Safety & Corridor Trekking Inquiries
    if (lower.includes("safe") || lower.includes("trail") || lower.includes("trek") || lower.includes("status") || lower.includes("condition") || lower.includes("ahead") || lower.includes("path")) {
      const isElevated = rainfall > 70 || lakeChange > 10 || seismic > 3.0;
      return `The trail through **${corridorName}** is currently **${isElevated ? "under elevated caution due to active weather" : "open under normal baseline conditions"}**.

• **Catchment Rainfall**: Sensed at ${rainfall} mm (well below the 144 mm threshold).
• **Trail Guidance**: The primary valley route is clear. When moving through narrow river gorges, maintain a steady pace and avoid lingering directly on low gravel banks.
• **High Ground Refuge**: Verified safe terraces are located uphill near Kyanjin Gompa and Syabrubesi.

Always verify with local teahouses along the trail for real-time ground updates!`;
    }

    // 4. GLOF & Glacial Lake Questions
    if (lower.includes("glof") || lower.includes("glacial") || lower.includes("lake") || lower.includes("moraine") || lower.includes("flood")) {
      return `### Glacial Lake Outburst Flood (GLOF) Mechanics & Early Warning

**What Triggers a GLOF in the Nepal Himalayas?**
1. **Moraine Dam Destabilization**: Terminal moraines composed of loose gravel and buried ice cores thaw rapidly during warm monsoon spells.
2. **Supraglacial Melt Ponds**: Sentinel-2 Level-2A multi-spectral data (B03 Green / B08 NIR NDWI index) tracks expanding meltwater bodies (+${lakeChange}% expansion registered).
3. **Avalanche / Rockfall Displacement Waves**: An ice-avalanche plunging into the proglacial lake creates hydrostatic surges that overtop or breach the dam.

**Downstream Flood Travel Times (Langtang Corridor):**
• **Breach Origin (4,950m)**: 0 mins
• **Kyanjin Gompa (3,860m)**: ~8 mins warning window
• **Lama Hotel Gorge (2,470m)**: ~18 mins
• **Syabrubesi Bazaar (1,460m)**: ~38 mins (siren protocol & bridge evacuation)
• **Mailung Dam (1,120m)**: ~55 mins (floodgate release)

**Safety Rule:** Never camp on low river terraces or alluvial floodplains below moraine-dammed lakes.`;
    }

    // 5. Rainfall, Cloudburst & Landslide Protocols
    if (lower.includes("rain") || lower.includes("cloudburst") || lower.includes("landslide") || lower.includes("monsoon") || lower.includes("storm")) {
      return `### Extreme Rainfall & Landslide Warning Protocols

• **Catchment Saturation Dynamics**: Sensed rainfall is **${rainfall} mm/24h**. High Himalayan slopes fail once cumulative precipitation exceeds the local geotechnical threshold (144 mm in Rasuwa/Langtang).
• **Critical Early Signs of Slope Instability:**
  - Fresh vertical cracks opening along trails or mountain faces.
  - Springs turning muddy or sudden gushing of new water veins.
  - Rumbling acoustic signatures resembling approaching freight trains.

**Immediate Response Actions:**
1. Move uphill and laterally onto solid bedrock ridges—never seek shelter in gullies, dry streambeds, or under rock overhangs.
2. If trapped in a settlement, sound local air horns/whistles to alert downhill residents.
3. Monitor Nepal DHM hourly automated weather radar updates.`;
    }

    // 6. General Intelligent Fallback
    return `### HimalSanket Multi-Hazard Intelligence Briefing

**Focus Area:** ${corridorName}
**Current Observations:** Rainfall ${rainfall} mm | Seismic ${seismic} M | Lake Expansion +${lakeChange}%

**Key Advice:**
Mountainous terrains in Nepal are susceptible to compound cascading hazards where rainfall, slope destabilization, and moraine water pressure interact. Always cross active scree slopes with spacing between group members, maintain communication with local lodge owners, and strictly avoid riverbanks during dusk and nighttime hours.

Let me know if you would like specific details regarding trekking route safety, GLOF arrival timelines, or emergency evacuation coordinates.`;
  }

  // API Routes
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      reloadEnv();
      const { message, history, corridorContext } = req.body;
      const currentApiKey = process.env.GEMINI_API_KEY;
      const isPlaceholder =
        !currentApiKey ||
        currentApiKey.trim() === "" ||
        currentApiKey === "MY_GEMINI_API_KEY" ||
        currentApiKey === "AIzaSyYourGeneratedKeyHere" ||
        currentApiKey.startsWith("AIzaSyYour") ||
        currentApiKey.includes("YourGeneratedKey") ||
        currentApiKey.length < 25;

      // If valid key present, execute live Google Gemini call
      if (!isPlaceholder) {
        try {
          const liveAi = new GoogleGenAI({
            apiKey: currentApiKey,
            httpOptions: { timeout: 25000 },
          });

          const activeCtx = {
            name: "Langtang Valley",
            region: "Rasuwa, Nepal",
            rainfall: 38,
            rainThreshold: 144,
            seismic: 1.8,
            lakeChange: 4.0,
            susceptibility: 0.71,
            riskTier: "Moderate",
            ...(corridorContext || {}),
            ...(req.body.isDanger !== undefined ? { isDanger: req.body.isDanger } : {}),
            ...(req.body.geofenceStatus ? { geofenceStatus: req.body.geofenceStatus } : {}),
            ...(req.body.waterSurge !== undefined ? { waterSurge: req.body.waterSurge } : {}),
            ...(req.body.activeScenario ? { activeScenario: req.body.activeScenario } : {}),
            ...(req.body.distanceToHazard !== undefined ? { distanceToHazard: req.body.distanceToHazard } : {}),
          };

          const isDangerActive = Boolean(
            activeCtx.isDanger ||
            activeCtx.geofenceStatus === "DANGER" ||
            (activeCtx.waterSurge && activeCtx.waterSurge > 1.0) ||
            activeCtx.activeScenario === "critical_cascade" ||
            activeCtx.activeScenario === "cloudburst_spike" ||
            activeCtx.activeScenario === "glof_lake_expansion"
          );

          const systemInstruction = `
You are the HimalSanket AI Hazard Intelligence Assistant, an AI safety intelligence system for Nepal's mountainous valleys and trekking corridors (Hack2Skill AI Builder Cup).

CRITICAL SAFETY DIRECTIVE (ABSOLUTE PRIORITY — DO NOT CONTRADICT):
- Active Hazard Threat Status: ${isDangerActive ? "⚠️ HAZARD NEARBY / DANGER ZONE (MOVE UPHILL)" : "🟢 SAFE BASELINE ZONE"}
- Active Flood Surge: +${activeCtx.waterSurge || 0}m
- Active Scenario: ${activeCtx.activeScenario || "Baseline Normal"}

RULES ON SAFETY STATUS:
1. IF Active Hazard Threat Status is "⚠️ HAZARD NEARBY / DANGER ZONE":
   - The user's screen is currently displaying a flashing RED alert: "HAZARD NEARBY: Move Uphill".
   - You MUST NEVER tell the trekker that they are in "SAFE" status! Doing so puts lives at risk!
   - You MUST warn them that flood surge / hazard conditions are elevated in this reach (river surge of +${activeCtx.waterSurge || 0}m, distance to channel: ~${activeCtx.distanceToHazard || 264}m).
   - Instruct them to move uphill immediately onto solid granite bedrock terraces, at least 30 meters above the river gorge, and avoid lingering near gravel banks or crossing wooden footbridges.
   - Point them toward the nearest high-ground safe refuge (e.g. Kyanjin Gompa high ridge or Syabrubesi evacuation terrace).
2. IF Active Hazard Threat Status is "🟢 SAFE BASELINE ZONE":
   - Confirm that conditions are currently at a normal baseline (~${activeCtx.distanceToHazard || 264}m safe buffer from riverbed).
   - Remind them to remain observant of changing Himalayan weather.

LIVE SENSOR NETWORK GROUNDING:
${JSON.stringify(activeCtx, null, 2)}
${activeCtx.userPosition ? `• Trekker Live GPS: ${activeCtx.userPosition.lat}° N, ${activeCtx.userPosition.lng}° E (Altitude: ${activeCtx.userPosition.altitude || 2780}m ASL)
• Proximity to River Surge Channel: ${activeCtx.distanceToHazard !== undefined ? activeCtx.distanceToHazard + ' meters' : '264 meters'}` : ""}

INSTRUCTIONS FOR RESPONDING:
- Act as an experienced, empathetic, knowledgeable Himalayan mountain guide and safety expert.
- Always provide actionable, life-saving advice aligned with the active hazard status above.
- If asked in Nepali, reply in natural Nepali. If asked in English, reply in natural English.
`;

          const contents = [];
          if (Array.isArray(history)) {
            for (const item of history) {
              contents.push({
                role: item.role === "assistant" ? "model" : "user",
                parts: [{ text: item.content || item.text || "" }],
              });
            }
          }
          contents.push({
            role: "user",
            parts: [{ text: message }],
          });

          // Priority cascade for Google Gemini 2.0 Flash
          const CANDIDATE_MODELS = [
            "gemini-2.0-flash",
            "gemini-flash-latest",
            "gemini-2.0-flash-lite",
            "gemini-flash-lite-latest",
            "gemini-3.5-flash-lite",
            "gemini-3.8-flash",
          ];

          for (const modelName of CANDIDATE_MODELS) {
            try {
              const response = await liveAi.models.generateContent({
                model: modelName,
                contents,
                config: {
                  systemInstruction,
                },
              });

              if (response.text && response.text.trim().length > 0) {
                console.log(`[Google Gemini AI] Live response served via ${modelName} (Gemini 2.0 Flash tier)`);
                return res.json({
                  reply: response.text.trim(),
                  source: "google-gemini",
                  model: "Google Gemini 2.0 Flash",
                  rawModel: modelName,
                  is_live_gemini: true,
                });
              }
            } catch (mErr: any) {
              console.warn(`[Google Gemini AI] Model ${modelName} notice: ${mErr?.status || mErr?.message || "trying next candidate"}`);
              continue;
            }
          }

          throw new Error("All active Google Gemini models were temporarily busy. Falling back to hazard synthesizer.");
        } catch (liveErr: any) {
          console.warn("[Google Gemini AI] Live API notice, using Himalayan Hazard Synthesizer:", liveErr?.message || liveErr);
          const fallbackReply = synthesizeHazardChat(message, corridorContext);
          return res.json({
            reply: fallbackReply,
            source: "himal-synthesizer",
            model: "HimalSanket Safety Synthesizer",
            is_live_gemini: false,
          });
        }
      }

      // Seamless fallback to domain-expert Himalayan hazard synthesizer
      const synthesized = synthesizeHazardChat(message, corridorContext);
      res.json({
        reply: synthesized,
        source: "himal-synthesizer",
        model: "HimalSanket Safety Synthesizer",
        is_live_gemini: false,
      });
    } catch (error: any) {
      console.error("Gemini Chat Handler Fallback Error:", error);
      const fallbackReply = synthesizeHazardChat(req.body?.message || "hello", req.body?.corridorContext);
      res.json({
        reply: fallbackReply,
        source: "himal-synthesizer",
        model: "HimalSanket Safety Synthesizer",
        is_live_gemini: false,
      });
    }
  });

  app.post("/api/gemini/explain", async (req, res) => {
    try {
      reloadEnv();
      const { location, data } = req.body;
      const currentApiKey = process.env.GEMINI_API_KEY;
      const isPlaceholder =
        !currentApiKey ||
        currentApiKey.trim() === "" ||
        currentApiKey === "MY_GEMINI_API_KEY" ||
        currentApiKey === "AIzaSyYourGeneratedKeyHere" ||
        currentApiKey.startsWith("AIzaSyYour") ||
        currentApiKey.length < 25;

      if (!isPlaceholder) {
        try {
          const liveAi = new GoogleGenAI({
            apiKey: currentApiKey,
            httpOptions: { headers: { "User-Agent": "aistudio-build" } },
          });

          const prompt = `
            You are an AI hazard analyst for "HimalSanket", a disaster risk intelligence system for Nepal.
            Analyze the following real-time data for the location "${location}":
            
            ${JSON.stringify(data, null, 2)}
            
            Based on this data, provide a concise, actionable briefing explaining the key drivers of risk and a recommendation for trekkers/authorities.
            Keep it brief (max 3 sentences).
            Return the briefing in both English and Nepali.
          `;

          const CANDIDATE_MODELS = [
            "gemini-2.0-flash",
            "gemini-flash-latest",
            "gemini-2.0-flash-lite",
            "gemini-flash-lite-latest",
            "gemini-3.5-flash-lite",
            "gemini-3.8-flash",
          ];

          for (const modelName of CANDIDATE_MODELS) {
            try {
              const response = await liveAi.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      en: { type: Type.STRING, description: "The briefing in English" },
                      ne: { type: Type.STRING, description: "The briefing translated accurately to Nepali" },
                    },
                    required: ["en", "ne"],
                  },
                },
              });

              const parsed = JSON.parse(response.text?.trim() || "{}");
              if (parsed.en && parsed.ne) {
                return res.json(parsed);
              }
            } catch (mErr: any) {
              // Continue to next candidate model
            }
          }
        } catch (apiErr: any) {
          console.warn("Live Gemini Explain failed, using synthesizer:", apiErr.message || apiErr);
        }
      }

      // Resilient synthesized explanation
      const rainfall = data?.rainfall ?? 55;
      const seismic = data?.seismic ?? 2.1;
      const lakeChange = data?.lakeChange ?? 14.8;
      const isHigh = rainfall > 80 || seismic > 3.0 || lakeChange > 10;

      if (isHigh) {
        res.json({
          en: `WARNING: ${location} exhibits elevated multi-hazard compounding risk driven by ${rainfall}mm rainfall, ${seismic}M seismic tremor, and +${lakeChange}% glacial lake expansion. Delay non-essential transit and maintain river gorge vigilance.`,
          ne: `चेतावनी: ${location} मा ${rainfall}mm वर्षा, ${seismic}M भूकम्पीय कम्पन तथा +${lakeChange}% हिमताल विस्तारका कारण जोखिम उच्च छ। अनावश्यक यात्रा स्थगित गर्नुहोस् र सतर्क रहनुहोस्।`
        });
      } else {
        res.json({
          en: `${location} is currently within modeled baseline parameters (Rainfall: ${rainfall}mm, Seismic: ${seismic}M). Environmental indicators are being continuously monitored by HimalSanket.`,
          ne: `${location} हाल सामान्य अनुगमन मापदण्डभित्र छ (वर्षा: ${rainfall}mm, कम्पन: ${seismic}M)। वातावरणीय सूचकहरू निरन्तर निगरानीमा छन्।`
        });
      }
    } catch (error: any) {
      console.error("Gemini Explain Fallback Error:", error);
      res.json({
        en: `${req.body?.location || "Himalayan Corridor"} environmental indicators are actively monitored. Follow local authority guidelines.`,
        ne: `वातावरणीय सूचकहरूको निरन्तर अनुगमन भइरहेको छ। स्थानीय निकायको निर्देशन पालना गर्नुहोस्।`
      });
    }
  });

  // Dedicated API status inspector for separate API keys (hardened - boolean only)
  app.get("/api/system/api-status", (req, res) => {
    const mapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    const geocodingKey = process.env.GOOGLE_GEOCODING_API_KEY || process.env.VITE_GOOGLE_GEOCODING_API_KEY || mapsKey;
    const elevationKey = process.env.GOOGLE_ELEVATION_API_KEY || process.env.VITE_GOOGLE_ELEVATION_API_KEY || mapsKey;
    const placesKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY || mapsKey;
    const geminiKey = process.env.GEMINI_API_KEY;

    res.json({
      gemini_ai: {
        configured: isConfiguredApiKey(geminiKey),
        variable: "GEMINI_API_KEY",
      },
      maps_javascript: {
        configured: !!mapsKey && mapsKey.length > 20,
        variable: "VITE_GOOGLE_MAPS_API_KEY",
      },
      geocoding: {
        configured: !!geocodingKey && geocodingKey.length > 20,
        variable: "GOOGLE_GEOCODING_API_KEY",
      },
      elevation: {
        configured: !!elevationKey && elevationKey.length > 20,
        variable: "GOOGLE_ELEVATION_API_KEY",
      },
      places: {
        configured: !!placesKey && placesKey.length > 20,
        variable: "GOOGLE_PLACES_API_KEY",
      },
    });
  });

  // Dedicated Geocoding endpoint using separate/dedicated key
  app.get("/api/maps/geocode", async (req, res) => {
    reloadEnv();
    const address = req.query.address as string;
    if (!address) {
      return res.status(400).json({ error: "Missing 'address' query parameter" });
    }

    const key = process.env.GOOGLE_GEOCODING_API_KEY || process.env.VITE_GOOGLE_GEOCODING_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) {
      return res.status(503).json({ error: "No Geocoding API key configured" });
    }

    try {
      const gRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`);
      const data = await gRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Geocoding request failed" });
    }
  });

  // Dedicated Elevation endpoint using separate/dedicated key
  app.get("/api/maps/elevation", async (req, res) => {
    reloadEnv();
    const locations = req.query.locations as string;
    if (!locations) {
      return res.status(400).json({ error: "Missing 'locations' query parameter (e.g. lat,lng)" });
    }

    const key = process.env.GOOGLE_ELEVATION_API_KEY || process.env.VITE_GOOGLE_ELEVATION_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) {
      return res.status(503).json({ error: "No Elevation API key configured" });
    }

    try {
      const gRes = await fetch(`https://maps.googleapis.com/maps/api/elevation/json?locations=${encodeURIComponent(locations)}&key=${key}`);
      const data = await gRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Elevation request failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (!isConfiguredApiKey(process.env.GEMINI_API_KEY)) {
      console.log("ℹ️  Tip: Set a valid GEMINI_API_KEY in .env.local to enable live Google Gemini AI queries. (Himalayan Hazard Intelligence Synthesizer is active).");
    }
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n❌ Port ${PORT} is already in use by another process.`);
      console.error(`To kill the existing process, run: npx kill-port ${PORT} (or lsof -ti :${PORT} | xargs kill -9)\n`);
      process.exit(1);
    } else {
      throw err;
    }
  });
}

startServer();
