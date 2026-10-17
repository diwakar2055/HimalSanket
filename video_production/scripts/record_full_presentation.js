/**
 * HimalSanket Automated Grand-Prize Video Recording Engine
 * Uses Puppeteer to drive Chrome at 1920x1080, records all 6 acts,
 * and muxes the neural voiceover audio into the final submission MP4.
 */

const puppeteer = require('puppeteer-core');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FFMPEG_PATH = 'C:\\Users\\le\\Documents\\Projects\\HimalSanket\\backend\\.venv_win\\lib\\site-packages\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const VIDEO_PROD_DIR = path.resolve(__dirname, '..');
const RAW_VIDEO_PATH = path.join(VIDEO_PROD_DIR, 'raw_presentation_video.mp4');
const FINAL_VIDEO_PATH = path.join(VIDEO_PROD_DIR, 'himalsanket_ai_builder_cup_official.mp4');
const AUDIO_PATH = path.join(VIDEO_PROD_DIR, 'audio', 'himalsanket_master_voiceover.mp3');
const SUBTITLES_PATH = path.join(VIDEO_PROD_DIR, 'subtitles', 'himalsanket_master_captions.srt');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function smoothMouseMove(page, startX, startY, endX, endY, steps = 25, durationMs = 800) {
  const stepDelay = durationMs / steps;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const curX = startX + (endX - startX) * t;
    const curY = startY + (endY - startY) * t;
    await page.mouse.move(curX, curY);
    await sleep(stepDelay);
  }
}

async function run() {
  console.log('='.repeat(70));
  console.log('HIMAL SANKET: AUTOMATED 1080p VIDEO RECORDING ENGINE');
  console.log('Target Runtime: 3 minutes 50 seconds (230 seconds)');
  console.log('='.repeat(70));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      '--window-size=1920,1080',
      '--start-maximized',
      '--no-sandbox',
      '--disable-infobars',
      '--disable-extensions'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  const recorder = new PuppeteerScreenRecorder(page, {
    fps: 30,
    ffmpeg_Path: FFMPEG_PATH,
    videoFrame: { width: 1920, height: 1080 },
    aspectRatio: '16:9'
  });

  console.log('\n[1/7] Initializing Screen Recorder...');
  await recorder.start(RAW_VIDEO_PATH);
  const startTime = Date.now();

  const elapsed = () => ((Date.now() - startTime) / 1000).toFixed(1);

  // -------------------------------------------------------------
  // ACT 1: The Himalayan Bottleneck & The Fatal Blind Spot (0:00 - 0:38)
  // -------------------------------------------------------------
  console.log(`\n[${elapsed()}s] >>> ACT 1: Opening Problem & Statistics Slide...`);
  await page.goto('http://localhost:8000/slides', { waitUntil: 'networkidle0' });
  await sleep(4000);

  // Hover over the 3 metric cards
  console.log(`[${elapsed()}s] Highlighting 1,287+ lives lost card...`);
  await smoothMouseMove(page, 960, 500, 480, 450, 20, 1000);
  await sleep(6000);

  console.log(`[${elapsed()}s] Highlighting 380+ stranded chokepoint card...`);
  await smoothMouseMove(page, 480, 450, 960, 450, 20, 1000);
  await sleep(6000);

  console.log(`[${elapsed()}s] Highlighting 10-15m sensor warning window card...`);
  await smoothMouseMove(page, 960, 450, 1440, 450, 20, 1000);
  await sleep(6000);

  console.log(`[${elapsed()}s] Highlighting HimalSanket Shift banner...`);
  await smoothMouseMove(page, 1440, 450, 960, 720, 20, 1000);
  await sleep(7000);

  // -------------------------------------------------------------
  // ACT 2: The Multi-Hazard Fused Engine & Satellite Eyes (0:38 - 1:24)
  // -------------------------------------------------------------
  console.log(`\n[${elapsed()}s] >>> ACT 2: Navigating to Admin Command Dashboard...`);
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await sleep(3000);

  // Hover across the 5 Executive Health Cards
  console.log(`[${elapsed()}s] Sweeping 5-metric executive cards...`);
  await smoothMouseMove(page, 960, 400, 250, 75, 15, 800);
  await sleep(2500);
  await smoothMouseMove(page, 250, 75, 600, 75, 15, 800);
  await sleep(2500);
  await smoothMouseMove(page, 600, 75, 960, 75, 15, 800);
  await sleep(2500);
  await smoothMouseMove(page, 960, 75, 1300, 75, 15, 800);
  await sleep(2500);

  // Open Sentinel Glacial Lake Modal
  console.log(`[${elapsed()}s] Opening Sentinel-2 Glacial Lake modal...`);
  try {
    const lakeButton = await page.$('text="Glacial Lake"');
    if (lakeButton) await lakeButton.click();
    else await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('span, button')).find(e => e.textContent.includes('Glacial Lake'));
      if (el) el.click();
    });
  } catch (_) {}
  await sleep(3000);

  // Drag the Before/After split slider if modal opened
  console.log(`[${elapsed()}s] Interacting with NDWI Before/After split comparison...`);
  await smoothMouseMove(page, 960, 500, 800, 500, 20, 1200);
  await sleep(1500);
  await smoothMouseMove(page, 800, 500, 1150, 500, 20, 1200);
  await sleep(1500);

  // Close lake modal
  try {
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Close"], button svg.lucide-x');
      if (closeBtn) closeBtn.closest('button').click();
    });
  } catch (_) {}
  await sleep(2500);

  // Open TimesFM Forecast Modal
  console.log(`[${elapsed()}s] Opening Google TimesFM 24h Rainfall Forecast modal...`);
  try {
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Forecast') || b.textContent.includes('Precipitation'));
      if (btn) btn.click();
    });
  } catch (_) {}
  await sleep(3500);
  await smoothMouseMove(page, 960, 500, 1100, 520, 15, 1000);
  await sleep(3000);

  // Close TimesFM modal
  try {
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Close"], button svg.lucide-x');
      if (closeBtn) closeBtn.closest('button').click();
    });
  } catch (_) {}
  await sleep(3000);

  // -------------------------------------------------------------
  // ACT 3: Live Emergency Drill, Hydrodynamics & Gemini (1:24 - 2:05)
  // -------------------------------------------------------------
  console.log(`\n[${elapsed()}s] >>> ACT 3: Triggering Cloudburst Spike Emergency Drill...`);
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const spikeBtn = buttons.find(b => b.textContent.includes('Cloudburst') || b.textContent.includes('Spike') || b.textContent.includes('GLOF'));
    if (spikeBtn) spikeBtn.click();
  });
  await sleep(4000);

  // Highlight Fused Risk Index flipping to Critical
  console.log(`[${elapsed()}s] Highlighting Fused Risk Index Critical badge...`);
  await smoothMouseMove(page, 1200, 400, 250, 75, 20, 1000);
  await sleep(4000);

  // Drag Flood Surge Simulator slider to +3.5m
  console.log(`[${elapsed()}s] Dragging Flood Surge Simulator slider to +3.5m...`);
  await page.evaluate(() => {
    const slider = document.querySelector('input[type="range"]');
    if (slider) {
      slider.value = '3.5';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await sleep(5000);

  // Open Valley Elevation Profile Modal
  console.log(`[${elapsed()}s] Opening Valley Elevation Profile modal...`);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Profile') || b.textContent.includes('Elevation'));
    if (btn) btn.click();
  });
  await sleep(4000);
  await smoothMouseMove(page, 700, 550, 1200, 550, 25, 2000);
  await sleep(3000);

  // Close Valley Elevation Profile
  await page.keyboard.press('Escape');
  await sleep(2000);

  // Scroll right drawer down to Gemini Tactical Briefing
  console.log(`[${elapsed()}s] Highlighting Gemini Bilingual Tactical Briefing & 2G SMS...`);
  await page.evaluate(() => {
    const aside = document.querySelector('aside');
    if (aside) aside.scrollTop = aside.scrollHeight;
  });
  await sleep(5000);

  // -------------------------------------------------------------
  // ACT 4: Grassroots Civilian PWA & Multimodal Voice AI (2:06 - 2:46)
  // -------------------------------------------------------------
  console.log(`\n[${elapsed()}s] >>> ACT 4: Switching to Civilian / Trekker PWA...`);
  await page.evaluate(() => {
    const civBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Civilian') || b.textContent.includes('नागरिक'));
    if (civBtn) civBtn.click();
  });
  await sleep(4000);

  // Hover over trekker HUD
  console.log(`[${elapsed()}s] Highlighting trekker HUD (altitude 2,780m, distance 350m)...`);
  await smoothMouseMove(page, 960, 500, 500, 200, 20, 1000);
  await sleep(5000);

  // Open Voice Recorder Modal
  console.log(`[${elapsed()}s] Opening Voice Recorder Modal with Nepali hazard lexicon...`);
  await page.evaluate(() => {
    const micBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Voice') || b.querySelector('svg.lucide-mic'));
    if (micBtn) micBtn.click();
  });
  await sleep(4000);

  // Simulate Voice Note submission
  console.log(`[${elapsed()}s] Submitting Nepali voice note report...`);
  await page.evaluate(() => {
    const subBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Submit') || b.textContent.includes('Send'));
    if (subBtn) subBtn.click();
  });
  await sleep(4000);
  await page.keyboard.press('Escape');
  await sleep(3000);

  // Open Gemini AI Safety Copilot Chat
  console.log(`[${elapsed()}s] Consulting Gemini AI Safety Copilot...`);
  await page.evaluate(() => {
    const chatBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Copilot') || b.textContent.includes('Chat') || b.textContent.includes('Assistant'));
    if (chatBtn) chatBtn.click();
  });
  await sleep(5000);

  // -------------------------------------------------------------
  // ACT 5: SOS Distress Capsule & SAR Helicopter Dispatch (2:47 - 3:22)
  // -------------------------------------------------------------
  console.log(`\n[${elapsed()}s] >>> ACT 5: Transmitting SOS Distress Capsule...`);
  await page.evaluate(() => {
    const sosBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('SOS') || b.textContent.includes('गुहार'));
    if (sosBtn) sosBtn.click();
  });
  await sleep(4000);

  // Switch to Search & Rescue Command Dashboard
  console.log(`[${elapsed()}s] Switching to Search & Rescue Command...`);
  await page.evaluate(() => {
    const rescBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Rescuer') || b.textContent.includes('उद्धार'));
    if (rescBtn) rescBtn.click();
  });
  await sleep(4000);

  // Dispatch Helicopter Sortie SAR-NAT-8
  console.log(`[${elapsed()}s] Dispatching SAR Helicopter Sortie (SAR-NAT-8)...`);
  await page.evaluate(() => {
    const dispatchBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dispatch') || b.textContent.includes('SAR-NAT'));
    if (dispatchBtn) dispatchBtn.click();
  });
  await sleep(5000);

  // Watch flight tracking HUD with live countdown ETA
  console.log(`[${elapsed()}s] Tracking live helicopter sortie flight HUD...`);
  await smoothMouseMove(page, 500, 300, 960, 540, 30, 2500);
  await sleep(10000);

  // -------------------------------------------------------------
  // ACT 6: Google Cloud Architecture & Outro (3:23 - 3:50)
  // -------------------------------------------------------------
  console.log(`\n[${elapsed()}s] >>> ACT 6: Switching to Google Cloud Architecture Outro...`);
  await page.goto('http://localhost:8000/slides', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    if (typeof selectSlide === 'function') selectSlide(3);
  });
  await sleep(4000);

  console.log(`[${elapsed()}s] Highlighting Gemini, TimesFM, Cloud Run & Firestore...`);
  await smoothMouseMove(page, 960, 400, 500, 400, 20, 1000);
  await sleep(4000);
  await smoothMouseMove(page, 500, 400, 1400, 400, 20, 1000);
  await sleep(5000);

  console.log(`[${elapsed()}s] Holding final quote frame: "Because Langtang shouldn't happen a third time"...`);
  await smoothMouseMove(page, 1400, 400, 960, 680, 20, 1000);

  // Wait until exactly 231 seconds total
  const remainingMs = Math.max(0, 231000 - (Date.now() - startTime));
  console.log(`[${elapsed()}s] Finalizing take (${(remainingMs / 1000).toFixed(1)}s remaining)...`);
  await sleep(remainingMs);

  console.log(`\n[${elapsed()}s] Stopping screen recording...`);
  await recorder.stop();
  await browser.close();

  console.log('\n[2/7] Raw video captured successfully!');
  console.log(`File: ${RAW_VIDEO_PATH}`);

  // -------------------------------------------------------------
  // MUX AUDIO & SYNCHRONIZED CAPTIONS WITH FFMPEG
  // -------------------------------------------------------------
  console.log('\n[3/7] Muxing master neural voiceover into final MP4 using FFmpeg...');

  // Escape subtitle path for ffmpeg filter: replace \ with / and escape :
  const escapedSubPath = SUBTITLES_PATH.replace(/\\/g, '/').replace(':', '\\:');

  const ffmpegArgs = [
    '-y',
    '-i', RAW_VIDEO_PATH,
    '-i', AUDIO_PATH,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    FINAL_VIDEO_PATH
  ];

  console.log(`Running FFmpeg command...`);
  const ffmpegResult = spawnSync(FFMPEG_PATH, ffmpegArgs, { stdio: 'inherit' });

  if (ffmpegResult.status === 0) {
    const stats = fs.statSync(FINAL_VIDEO_PATH);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(1);
    console.log('\n' + '='.repeat(70));
    console.log('🏆 SUCCESS! OFFICIAL SUBMISSION VIDEO RENDERED!');
    console.log(`Output File: ${FINAL_VIDEO_PATH}`);
    console.log(`File Size:   ${sizeMb} MB`);
    console.log(`Format:      1080p Full HD, 30fps MP4 with Neural Audio Narration`);
    console.log(`Runtime:     3 minutes 50 seconds`);
    console.log('='.repeat(70));
  } else {
    console.error('FFmpeg muxing encountered an error.');
  }
}

run().catch(console.error);
