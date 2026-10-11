import { GoogleGenAI, Type } from "@google/genai";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, history, corridorContext } = req.body;

      const systemInstruction = `
You are the HimalSanket AI Hazard Intelligence Assistant, specialized in disaster risk intelligence for mountainous and river corridor regions in Nepal (Langtang, Khumbu, Annapurna, Manaslu, etc.).
Your goal is to answer questions about landslides, floods, GLOF (Glacial Lake Outburst Floods), seismic activity, trekking route safety, and emergency response.
You communicate clearly, calmly, and objectively.
Support questions in both English and Nepali. When asked in Nepali, respond in clear Nepali. When asked in English, respond in English.
${corridorContext ? `Current active corridor context:\n${JSON.stringify(corridorContext, null, 2)}` : ""}
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

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction,
        },
      });

      const reply = response.text || "I couldn't process that hazard query. Please try again.";
      res.json({ reply });
    } catch (error: any) {
      console.error("Gemini Chat API Error:", error);
      res.status(500).json({ error: "Failed to communicate with AI assistant." });
    }
  });

  app.post("/api/gemini/explain", async (req, res) => {
    try {
      const { location, data } = req.body;

      const prompt = `
        You are an AI hazard analyst for "HimalSanket", a disaster risk intelligence system for Nepal.
        Analyze the following real-time data for the location "${location}":
        
        ${JSON.stringify(data, null, 2)}
        
        Based on this data, provide a concise, actionable briefing explaining the key drivers of risk and a recommendation for trekkers/authorities.
        Keep it brief (max 3 sentences).
        Return the briefing in both English and Nepali.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              en: {
                type: Type.STRING,
                description: "The briefing in English",
              },
              ne: {
                type: Type.STRING,
                description: "The briefing translated accurately to Nepali",
              },
            },
            required: ["en", "ne"],
          },
        },
      });

      const result = JSON.parse(response.text?.trim() || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Failed to generate AI reasoning." });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
