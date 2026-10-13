/**
 * High-Reliability Bilingual Hazard Voice Synthesizer (English & Nepali).
 * 
 * Preserves the browser/OS default voice (preferred by the user) without forcing
 * third-party or artificial accents.
 * 
 * When speaking English:
 * - Speaks the English advisory directly using the user's preferred default system voice.
 * 
 * When speaking Nepali:
 * - Automatically provides phonetic Romanized Nepali transliteration.
 * - Allows the user's favorite default voice to pronounce every Nepali word clearly and audibly,
 *   preventing default TTS engines from silently skipping Devanagari characters.
 */

const CONSONANTS: Record<string, string> = {
  क: "k",
  ख: "kh",
  ग: "g",
  घ: "gh",
  ङ: "ng",
  च: "ch",
  छ: "chh",
  ज: "j",
  झ: "jh",
  ञ: "ny",
  ट: "t",
  ठ: "th",
  ड: "d",
  ढ: "dh",
  ण: "n",
  त: "t",
  थ: "th",
  द: "d",
  ध: "dh",
  न: "n",
  प: "p",
  फ: "ph",
  ब: "b",
  भ: "bh",
  म: "m",
  य: "y",
  र: "r",
  ल: "l",
  व: "w",
  श: "sh",
  ष: "sh",
  स: "s",
  ह: "h",
  क्ष: "ksh",
  त्र: "tr",
  ज्ञ: "gya",
  श्र: "shr",
};

const VOWELS: Record<string, string> = {
  अ: "a",
  आ: "aa",
  इ: "i",
  ई: "i",
  उ: "u",
  ऊ: "u",
  ऋ: "ri",
  ए: "e",
  ऐ: "ai",
  ओ: "o",
  औ: "au",
  अं: "am",
  अः: "aha",
};

const MATRAS: Record<string, string> = {
  "ा": "a",
  "ि": "i",
  "ी": "i",
  "ु": "u",
  "ू": "u",
  "ृ": "ri",
  "े": "e",
  "ै": "ai",
  "ो": "o",
  "ौ": "au",
  "ं": "n",
  "ँ": "n",
  "ः": "h",
};

const DIGITS: Record<string, string> = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

/**
 * Phonetically transliterates Devanagari Nepali text into natural Romanized words
 * that the user's preferred default TTS engine can articulate cleanly.
 */
export function devanagariToPhoneticRomanized(text: string): string {
  if (!text) return "";

  let out = "";
  const len = text.length;

  for (let i = 0; i < len; i++) {
    // Check two-character conjuncts first
    const twoChar = text.slice(i, i + 2);
    if (CONSONANTS[twoChar]) {
      const base = CONSONANTS[twoChar];
      i++;
      const next = text[i + 1];
      if (next === "्") {
        out += base;
        i++;
      } else if (next && MATRAS[next]) {
        out += base;
      } else {
        const isEnd = !next || " ,.!?।;:-\n\r\t()[]\"'".includes(next);
        out += isEnd ? base : base + "a";
      }
      continue;
    }

    const ch = text[i];
    const prev = i > 0 ? text[i - 1] : " ";
    const next = i + 1 < len ? text[i + 1] : "";

    if (DIGITS[ch]) {
      out += DIGITS[ch];
    } else if (VOWELS[ch]) {
      out += VOWELS[ch];
    } else if (MATRAS[ch]) {
      out += MATRAS[ch];
    } else if (ch === "्") {
      // halant (consumed by consonant handling)
    } else if (CONSONANTS[ch]) {
      const base = CONSONANTS[ch];
      if (next === "्") {
        out += base;
        i++; // skip halant
      } else if (next && MATRAS[next]) {
        out += base;
      } else {
        const isEnd = !next || " ,.!?।;:-\n\r\t()[]\"'".includes(next);
        const isPrevBoundary = !prev || " ,.!?।;:-\n\r\t()[]\"'".includes(prev);
        const isStandalone = isPrevBoundary && isEnd;

        if (ch === "छ") {
          out += "chha";
        } else if (isStandalone && ["र", "त", "न"].includes(ch)) {
          out += base + "a";
        } else if (isEnd) {
          out += base;
        } else {
          out += base + "a";
        }
      }
    } else if (ch === "।") {
      out += ". ";
    } else {
      out += ch;
    }
  }

  // Clean extra spaces and punctuation artifacts
  return out.replace(/\s+/g, " ").trim();
}

/**
 * Returns voice configuration. Retained for backwards-compatibility;
 * returns null voice so browser defaults to user's preferred natural voice.
 */
export function findBestVoice(_isNepali: boolean): {
  voice: SpeechSynthesisVoice | null;
  useDevanagari: boolean;
} {
  return { voice: null, useDevanagari: false };
}

export interface BroadcastOptions {
  text: string;
  isNepali: boolean;
  rate?: number;
  romanizedFallback?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

/**
 * Emergency Voice Broadcast Dispatcher.
 * Uses the user's preferred native default browser voice for both English and Nepali.
 */
export function playHazardVoiceBroadcast({
  text,
  isNepali,
  rate = 1.0,
  romanizedFallback,
  onStart,
  onEnd,
  onError,
}: BroadcastOptions): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("SpeechSynthesis not supported on this browser.");
    if (onError) onError();
    return;
  }

  // Cancel any active speech immediately
  window.speechSynthesis.cancel();

  // If text is Nepali or contains Devanagari, convert to phonetic Romanized Nepali
  // so the default voice pronounces every single word audibly and cleanly.
  let textToSpeak = text;
  const hasDevanagari = /[\u0900-\u097F]/.test(text);

  if (isNepali || hasDevanagari) {
    const transliterated = devanagariToPhoneticRomanized(text);
    textToSpeak = transliterated || romanizedFallback || text;
  }

  // Clean markdown syntax, emojis, and broadcast tokens
  const cleanSpeech = textToSpeak
    .replace(/\*\*/g, "")
    .replace(/###/g, "")
    .replace(/##/g, "")
    .replace(/#/g, "")
    .replace(/`/g, "")
    .replace(/🚨/g, "Emergency Alert! ")
    .replace(/⚠️/g, "Warning! ")
    .replace(/⚡/g, "Directive! ")
    .replace(/🔊/g, "")
    .trim();

  if (!cleanSpeech) {
    if (onEnd) onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanSpeech);

  // Preserve the user's preferred default system voice (do NOT set utterance.voice)
  utterance.lang = "en-US";
  utterance.rate = Math.max(0.7, Math.min(rate, 1.5));
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    if (onStart) onStart();
  };

  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    console.warn("Speech synthesis error:", e);
    if (onEnd) onEnd();
    if (onError) onError();
  };

  window.speechSynthesis.speak(utterance);
}
