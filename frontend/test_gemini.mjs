import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
dotenv.config();

import { GoogleGenAI } from "@google/genai";

const key = process.env.GEMINI_API_KEY;

console.log("=================================================");
console.log("    HimalSanket: Google Gemini API Live Test     ");
console.log("=================================================\n");

if (!key || key.trim() === "" || key === "AIzaSyYourGeneratedKeyHere") {
  console.log("⚠️  STATUS: No valid key found in .env.local.");
  console.log("👉 Paste your API key from https://aistudio.google.com/apikey into .env.local, then run this test again!\n");
  process.exit(1);
}

console.log(`🔑 Key detected: ${key.substring(0, 8)}...${key.substring(key.length - 4)} (Length: ${key.length})`);
console.log("📡 Querying Google Gemini API...\n");

const ai = new GoogleGenAI({ apiKey: key });

const CANDIDATE_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

async function runTest() {
  let anySuccess = false;

  for (const model of CANDIDATE_MODELS) {
    process.stdout.write(`• Testing model "${model}"... `);
    try {
      const startTime = Date.now();
      const response = await ai.models.generateContent({
        model,
        contents: "In 1 sentence, give an urgent mountain landslide safety tip for Nepal in English and Nepali.",
      });
      const latency = Date.now() - startTime;
      console.log(`✅ SUCCESS (${latency}ms)!\n`);
      console.log("---------------- Live AI Response ----------------");
      console.log(response.text?.trim());
      console.log("--------------------------------------------------\n");
      console.log(`🎉 Model "${model}" is live and fully functional with your API key!`);
      anySuccess = true;
      break;
    } catch (error) {
      const msg = error.message || String(error);
      if (msg.includes("404") || msg.includes("no longer available")) {
        console.log(`⚠️  Deprecated / 404`);
      } else if (msg.includes("429") || msg.includes("quota")) {
        console.log(`⚠️  Quota Limit Reached (Free Tier: limit 0)`);
      } else if (msg.includes("403") || msg.includes("denied access")) {
        console.log(`⚠️  403 Access Denied on this project`);
      } else {
        console.log(`❌ Error: ${msg.slice(0, 80)}`);
      }
    }
  }

  if (!anySuccess) {
    console.log("\n--------------------------------------------------");
    console.log("💡 Diagnostic Summary:");
    console.log("Google accepted your API key, but this Google Cloud project");
    console.log("currently has a 0-request quota limit for generative models.");
    console.log("\n👉 How to fix in 30 seconds:");
    console.log("1. Open https://aistudio.google.com/apikey");
    console.log("2. Sign in with a standard Google account (e.g. @gmail.com)");
    console.log("3. Click 'Create API key' -> 'Create in new project'");
    console.log("4. Paste the new key into .env.local and run this test again!");
    console.log("--------------------------------------------------");
  }
}

runTest();
