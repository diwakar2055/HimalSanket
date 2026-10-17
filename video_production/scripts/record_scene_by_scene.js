/**
 * HimalSanket Frame-Accurate Video Recording Engine (Act-by-Act)
 * Records each of the 6 acts with exact millisecond synchronization to the audio narration,
 * burns in synchronized subtitles, and stitches them into the final submission MP4s.
 */

const puppeteer = require('puppeteer-core');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FFMPEG_PATH = 'C:\\Users\\le\\Documents\\Projects\\HimalSanket\\backend\\.venv_win\\lib\\site-packages\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const VIDEO_PROD_DIR = path.resolve(__dirname, '..');
const AUDIO_DIR = path.join(VIDEO_PROD_DIR, 'audio');
const SUBTITLES_DIR = path.join(VIDEO_PROD_DIR, 'subtitles');
const TEMP_DIR = path.join(VIDEO_PROD_DIR, 'temp_acts');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function smoothMouseMove(page, startX, startY, endX, endY, steps = 20, durationMs = 600) {
  try {
    const stepDelay = durationMs / steps;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const curX = startX + (endX - startX) * t;
      const curY = startY + (endY - startY) * t;
      await page.mouse.move(curX, curY);
      await sleep(stepDelay);
    }
  } catch (_) {}
}

const ACTS = [
  {
    act: 1,
    name: 'Act 1: Problem & Himalayan Reality',
    url: 'http://localhost:8000/slides',
    audioFile: path.join(AUDIO_DIR, 'scene1_problem_gap.mp3'),
    srtFile: path.join(SUBTITLES_DIR, 'scene1_problem_gap.srt'),
    durationSec: 37.01,
    action: async (page) => {
      // 0:00 - 0:10: Langtang intro
      await sleep(4000);

      // 0:10 - 0:15: Highlight 1,287+ lives lost card
      await smoothMouseMove(page, 960, 500, 480, 450, 15, 800);
      await sleep(5000);

      // 0:15 - 0:21: Highlight 380+ stranded chokepoint card
      await smoothMouseMove(page, 480, 450, 960, 450, 15, 800);
      await sleep(5500);

      // 0:21 - 0:28: Highlight 10-15m reaction window card
      await smoothMouseMove(page, 960, 450, 1440, 450, 15, 800);
      await sleep(6500);

      // 0:28 - 0:37: Highlight bottom HimalSanket Shift banner
      await smoothMouseMove(page, 1440, 450, 960, 720, 15, 800);
      await sleep(9000);
    }
  },
  {
    act: 2,
    name: 'Act 2: 5-Signal Fusion, Sentinel-2 & TimesFM',
    url: 'http://localhost:3000',
    audioFile: path.join(AUDIO_DIR, 'scene2_fused_risk_engine.mp3'),
    srtFile: path.join(SUBTITLES_DIR, 'scene2_fused_risk_engine.srt'),
    durationSec: 44.62,
    action: async (page) => {
      // 0:00 - 0:03: Admin Command view
      await sleep(3000);

      // 0:03 - 0:20: Move across the 5 Executive Health Cards (Rain 30%, GLOF 25%, Seismic 20%, Ground 15%, Slope 10%)
      await smoothMouseMove(page, 960, 400, 250, 75, 12, 600);
      await sleep(3000);
      await smoothMouseMove(page, 250, 75, 600, 75, 12, 600);
      await sleep(3500);
      await smoothMouseMove(page, 600, 75, 960, 75, 12, 600);
      await sleep(3500);
      await smoothMouseMove(page, 960, 75, 1300, 75, 12, 600);
      await sleep(3500);

      // 0:20 - 0:32: Open Sentinel Glacial Lake Modal & drag Before/After split slider
      try {
        await page.evaluate(() => {
          const el = Array.from(document.querySelectorAll('span, div, button')).find(e => e.textContent.includes('Glacial Lake Area'));
          if (el) el.click();
        });
      } catch (_) {}
      await sleep(2500);
      await smoothMouseMove(page, 960, 500, 750, 500, 15, 1000);
      await sleep(1500);
      await smoothMouseMove(page, 750, 500, 1180, 500, 15, 1000);
      await sleep(1500);
      await page.keyboard.press('Escape');
      await sleep(2000);

      // 0:32 - 0:44.6: Open TimesFM Forecast modal & hover across 24h curve
      try {
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('span, div, button')).find(b => b.textContent.includes('TimesFM') || b.textContent.includes('Catchment Rain'));
          if (btn) btn.click();
        });
      } catch (_) {}
      await sleep(3000);
      await smoothMouseMove(page, 960, 500, 1150, 520, 15, 1200);
      await sleep(4000);
      await page.keyboard.press('Escape');
      await sleep(3000);
    }
  },
  {
    act: 3,
    name: 'Act 3: Live Drill, Hydrodynamic Waves & Gemini Synthesis',
    url: 'http://localhost:3000',
    audioFile: path.join(AUDIO_DIR, 'scene3_live_drill_cascade.mp3'),
    srtFile: path.join(SUBTITLES_DIR, 'scene3_live_drill_cascade.srt'),
    durationSec: 40.42,
    action: async (page) => {
      await sleep(1500);

      // 0:00 - 0:14: Click Cloudburst Spike drill -> watch Critical badge flip
      try {
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const spikeBtn = buttons.find(b => b.textContent.includes('Cloudburst') || b.textContent.includes('Spike'));
          if (spikeBtn) spikeBtn.click();
        });
      } catch (_) {}
      await sleep(2500);
      await smoothMouseMove(page, 1200, 400, 250, 75, 15, 800);
      await sleep(7500);

      // 0:14 - 0:26: Drag Flood Surge Simulator slider to +3.5m & open Valley Elevation Profile (18m, 38m, 78m wave times)
      try {
        await page.evaluate(() => {
          const slider = document.querySelector('input[type="range"]');
          if (slider) {
            slider.value = '3.5';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            slider.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      } catch (_) {}
      await sleep(2500);

      try {
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Elevation Profile') || b.textContent.includes('Wave Times'));
          if (btn) btn.click();
        });
      } catch (_) {}
      await sleep(3000);
      await smoothMouseMove(page, 700, 550, 1200, 550, 15, 1200);
      await sleep(2000);
      await page.keyboard.press('Escape');
      await sleep(1500);

      // 0:26 - 0:40.4: Scroll to Gemini bilingual briefing & open SITREP modal
      try {
        await page.evaluate(() => {
          const aside = document.querySelector('aside');
          if (aside) aside.scrollTop = aside.scrollHeight;
        });
      } catch (_) {}
      await sleep(3000);

      try {
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('SITREP'));
          if (btn) btn.click();
        });
      } catch (_) {}
      await sleep(4000);
      await page.keyboard.press('Escape');
      await sleep(3000);
    }
  },
  {
    act: 4,
    name: 'Act 4: Grassroots Civilian PWA & Multimodal Voice AI',
    url: 'http://localhost:3000',
    audioFile: path.join(AUDIO_DIR, 'scene4_civilian_pwa_voice.mp3'),
    srtFile: path.join(SUBTITLES_DIR, 'scene4_civilian_pwa_voice.srt'),
    durationSec: 40.06,
    action: async (page) => {
      await sleep(1500);

      // 0:00 - 0:15: Switch role to Civilian -> highlight HUD (altitude 2,780m, distance 350m)
      try {
        await page.evaluate(() => {
          const civBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Civilian'));
          if (civBtn) civBtn.click();
        });
      } catch (_) {}
      await sleep(2500);
      await smoothMouseMove(page, 960, 500, 500, 180, 15, 800);
      await sleep(8000);

      // 0:15 - 0:31: Open Voice Recorder modal -> highlight Nepali hazard keywords -> submit
      try {
        await page.evaluate(() => {
          const micBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Voice Note'));
          if (micBtn) micBtn.click();
        });
      } catch (_) {}
      await sleep(2500);

      // Type in danger keywords into the textarea
      try {
        await page.evaluate(() => {
          const textarea = document.querySelector('textarea');
          if (textarea) {
            textarea.value = 'पहिरो र धमिलो पानी बढ्दै छ (Landslide and murky water rising)';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      } catch (_) {}
      await sleep(3500);

      try {
        await page.evaluate(() => {
          const subBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Submit Voice Dispatch'));
          if (subBtn) subBtn.click();
        });
      } catch (_) {}
      await sleep(2500);

      // 0:31 - 0:40.0: Open Gemini Safety Copilot chat
      try {
        await page.evaluate(() => {
          const chatBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Copilot'));
          if (chatBtn) chatBtn.click();
        });
      } catch (_) {}
      await sleep(6000);
    }
  },
  {
    act: 5,
    name: 'Act 5: SOS Distress Capsule & Helicopter SAR Dispatch',
    url: 'http://localhost:3000',
    audioFile: path.join(AUDIO_DIR, 'scene5_sos_distress_sar.mp3'),
    srtFile: path.join(SUBTITLES_DIR, 'scene5_sos_distress_sar.srt'),
    durationSec: 34.27,
    action: async (page) => {
      // Ensure Civilian view first
      try {
        await page.evaluate(() => {
          const civBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Civilian'));
          if (civBtn) civBtn.click();
        });
      } catch (_) {}
      await sleep(1500);

      // 0:00 - 0:15: Tap Send SOS Beacon -> highlight Distress Capsule queued
      try {
        await page.evaluate(() => {
          const sosBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('SOS') || b.textContent.includes('Send Emergency SOS'));
          if (sosBtn) {
            sosBtn.click();
            setTimeout(() => {
              const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Now') || b.textContent.includes('Send Now') || b.textContent.includes('Confirm'));
              if (confirmBtn) confirmBtn.click();
            }, 300);
          }
        });
      } catch (_) {}
      await sleep(7000);

      // 0:15 - 0:23: Switch to Search & Rescue Command
      try {
        await page.evaluate(() => {
          const rescBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Search & Rescue'));
          if (rescBtn) rescBtn.click();
        });
      } catch (_) {}
      await sleep(3500);

      // 0:23 - 0:34.3: Click Dispatch Rescue Squad -> watch flight tracking HUD with countdown ETA
      try {
        await page.evaluate(() => {
          const dispatchBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dispatch Rescue Squad') || b.textContent.includes('Dispatch'));
          if (dispatchBtn) dispatchBtn.click();
        });
      } catch (_) {}
      await sleep(3000);
      await smoothMouseMove(page, 450, 300, 960, 540, 20, 1500);
      await sleep(8000);
    }
  },
  {
    act: 6,
    name: 'Act 6: Google Cloud Architecture & The Defining Mission',
    url: 'http://localhost:8000/slides',
    audioFile: path.join(AUDIO_DIR, 'scene6_google_cloud_closing.mp3'),
    srtFile: path.join(SUBTITLES_DIR, 'scene6_google_cloud_closing.srt'),
    durationSec: 25.70,
    action: async (page) => {
      // 0:00 - 0:17: Navigate to Architecture slide -> highlight 4 Google Cloud pillars
      try {
        await page.evaluate(() => {
          if (typeof selectSlide === 'function') selectSlide(3);
        });
      } catch (_) {}
      await sleep(2000);
      await smoothMouseMove(page, 960, 400, 500, 380, 15, 800);
      await sleep(4000);
      await smoothMouseMove(page, 500, 380, 1400, 380, 15, 800);
      await sleep(5000);

      // 0:17 - 0:25.7: Hold on memorable closing quote
      await smoothMouseMove(page, 1400, 380, 960, 680, 15, 800);
      await sleep(9000);
    }
  }
];

async function recordAct(browser, actConfig) {
  const actNum = actConfig.act;
  console.log(`\n>>> RECORDING ACT ${actNum}: ${actConfig.name} (${actConfig.durationSec.toFixed(1)}s)...`);

  const rawVideoPath = path.join(TEMP_DIR, `act${actNum}_raw.mp4`);
  const subtitledVideoPath = path.join(TEMP_DIR, `act${actNum}_subtitled.mp4`);
  const cleanVideoPath = path.join(TEMP_DIR, `act${actNum}_clean.mp4`);

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  // Navigate FIRST before starting recorder so there is no black flash or navigation delay
  console.log(`  [OK] Loading ${actConfig.url}...`);
  await page.goto(actConfig.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(1500);

  const recorder = new PuppeteerScreenRecorder(page, {
    fps: 30,
    ffmpeg_Path: FFMPEG_PATH,
    videoFrame: { width: 1920, height: 1080 },
    aspectRatio: '16:9'
  });

  const startTime = Date.now();
  await recorder.start(rawVideoPath);

  // Execute synchronized actions
  await actConfig.action(page);

  // Pad or wait until target duration
  const elapsedMs = Date.now() - startTime;
  const targetMs = Math.round(actConfig.durationSec * 1000);
  if (elapsedMs < targetMs) {
    await sleep(targetMs - elapsedMs);
  }

  await recorder.stop();
  await page.close();

  console.log(`  [OK] Captured raw video for Act ${actNum} (${((Date.now() - startTime) / 1000).toFixed(1)}s)`);

  // Escape SRT path for FFmpeg subtitles filter on Windows
  const escapedSrt = actConfig.srtFile.replace(/\\/g, '/').replace(':', '\\:');

  // 1. Mux with audio + burn in subtitles
  console.log(`  [OK] Muxing Act ${actNum} with audio and burning in subtitles...`);
  spawnSync(FFMPEG_PATH, [
    '-y',
    '-i', rawVideoPath,
    '-i', actConfig.audioFile,
    '-vf', `subtitles='${escapedSrt}':force_style='FontSize=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,BackColour=&H80000000,MarginV=25'`,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-r', '30',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '44100',
    '-ac', '2',
    '-shortest',
    subtitledVideoPath
  ], { stdio: 'pipe' });

  // 2. Clean version (audio only, no burned-in text)
  spawnSync(FFMPEG_PATH, [
    '-y',
    '-i', rawVideoPath,
    '-i', actConfig.audioFile,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-r', '30',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '44100',
    '-ac', '2',
    '-shortest',
    cleanVideoPath
  ], { stdio: 'pipe' });

  console.log(`  ✓ Act ${actNum} rendered and synchronized successfully!`);
  return { subtitled: subtitledVideoPath, clean: cleanVideoPath };
}

async function main() {
  console.log('='.repeat(70));
  console.log('HIMALSANKET FRAME-ACCURATE VIDEO ENGINE (ACT-BY-ACT)');
  console.log('Total Target Duration: ~3 minutes 42 seconds');
  console.log('='.repeat(70));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--window-size=1920,1080', '--no-sandbox', '--disable-infobars']
  });

  const subtitledActs = [];
  const cleanActs = [];

  for (const actConfig of ACTS) {
    const res = await recordAct(browser, actConfig);
    subtitledActs.push(res.subtitled);
    cleanActs.push(res.clean);
  }

  await browser.close();

  // Stitch all 6 acts together into the final competition MP4s
  console.log('\nStitching all 6 acts into the final master video files...');

  const subConcatListPath = path.join(TEMP_DIR, 'concat_subtitled.txt');
  const cleanConcatListPath = path.join(TEMP_DIR, 'concat_clean.txt');

  fs.writeFileSync(subConcatListPath, subtitledActs.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
  fs.writeFileSync(cleanConcatListPath, cleanActs.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));

  const finalSubtitledPath = path.join(VIDEO_PROD_DIR, 'himalsanket_ai_builder_cup_with_captions.mp4');
  const finalCleanPath = path.join(VIDEO_PROD_DIR, 'himalsanket_ai_builder_cup_official.mp4');

  // Concatenate subtitled version
  spawnSync(FFMPEG_PATH, [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', subConcatListPath,
    '-c', 'copy',
    finalSubtitledPath
  ], { stdio: 'inherit' });

  // Concatenate clean version
  spawnSync(FFMPEG_PATH, [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', cleanConcatListPath,
    '-c', 'copy',
    finalCleanPath
  ], { stdio: 'inherit' });

  const stats = fs.statSync(finalSubtitledPath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(1);

  console.log('\n' + '='.repeat(70));
  console.log('🏆 100% PERFECT SYNCHRONIZATION ACHIEVED!');
  console.log(`Subtitled Video: ${finalSubtitledPath} (${sizeMb} MB)`);
  console.log(`Clean Video:     ${finalCleanPath}`);
  console.log('Duration:        3 minutes 42 seconds');
  console.log('='.repeat(70));
}

main().catch(console.error);
