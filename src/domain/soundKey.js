/**
 * Matching titles by how they sound, across scripts.
 *
 * Kannada books are written in English letters in many ways: ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು
 * is "Mookajjiya Kanasugalu" or "Mukajjiya kanasugaḷu", ಕಾನೂರು ಹೆಗ್ಗಡತಿ is
 * "Kanuru Heggaditi" or "Kanooru Heggadathi". A sound key keeps only the
 * consonant skeleton of a title (after writing Kannada in Latin letters), so
 * all of those spellings, and the Kannada original, share one key.
 */

const INDEPENDENT_VOWELS = {
  "ಅ": "a", "ಆ": "aa", "ಇ": "i", "ಈ": "ii", "ಉ": "u", "ಊ": "uu", "ಋ": "ru", "ೠ": "ruu",
  "ಎ": "e", "ಏ": "ee", "ಐ": "ai", "ಒ": "o", "ಓ": "oo", "ಔ": "au",
};

const CONSONANTS = {
  "ಕ": "k", "ಖ": "kh", "ಗ": "g", "ಘ": "gh", "ಙ": "n",
  "ಚ": "ch", "ಛ": "chh", "ಜ": "j", "ಝ": "jh", "ಞ": "n",
  "ಟ": "t", "ಠ": "th", "ಡ": "d", "ಢ": "dh", "ಣ": "n",
  "ತ": "t", "ಥ": "th", "ದ": "d", "ಧ": "dh", "ನ": "n",
  "ಪ": "p", "ಫ": "ph", "ಬ": "b", "ಭ": "bh", "ಮ": "m",
  "ಯ": "y", "ರ": "r", "ಱ": "r", "ಲ": "l", "ವ": "v", "ಶ": "sh", "ಷ": "sh", "ಸ": "s", "ಹ": "h", "ಳ": "l", "ೞ": "l",
};

const VOWEL_SIGNS = {
  "ಾ": "aa", "ಿ": "i", "ೀ": "ii", "ು": "u", "ೂ": "uu", "ೃ": "ru", "ೄ": "ruu",
  "ೆ": "e", "ೇ": "ee", "ೈ": "ai", "ೊ": "o", "ೋ": "oo", "ೌ": "au",
};

const VIRAMA = "್";
const OTHER = { "ಂ": "m", "ಃ": "h", "ೕ": "", "ೖ": "", "಼": "" };
const DIGITS = "೦೧೨೩೪೫೬೭೮೯";

/** Kannada written in plain Latin letters ("ಮೂಕಜ್ಜಿಯ" → "muukajjiya"); other text passes through. */
export function kannadaToLatin(text) {
  const chars = [...String(text || "")];
  let out = "";
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (CONSONANTS[ch]) {
      out += CONSONANTS[ch];
      const next = chars[i + 1];
      if (VOWEL_SIGNS[next] !== undefined) {
        out += VOWEL_SIGNS[next];
        i += 1;
      } else if (next === VIRAMA) {
        i += 1;
      } else {
        out += "a"; // the inherent vowel
      }
    } else if (INDEPENDENT_VOWELS[ch]) out += INDEPENDENT_VOWELS[ch];
    else if (OTHER[ch] !== undefined) out += OTHER[ch];
    else if (DIGITS.includes(ch)) out += String(DIGITS.indexOf(ch));
    else if (ch === VIRAMA || VOWEL_SIGNS[ch] !== undefined) continue;
    else out += ch;
  }
  return out;
}

/**
 * The consonant skeleton of a title in any spelling: "Mookajjiya Kanasugalu",
 * "mukajjiya kanasugaḷu" and ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು all give "mkjknsgl".
 */
export function soundKey(text) {
  return kannadaToLatin(text)
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/ph/g, "f")
    .replace(/w/g, "v")
    .replace(/z/g, "j")
    .replace(/q/g, "k")
    .replace(/x/g, "ks")
    .replace(/c(?!h)/g, "k")
    .replace(/([bcdfgjklmnpqrstvxz])h/g, "$1") // aspirates: "th" and "t", "dh" and "d"
    .replace(/[aeiouy]/g, "")
    .replace(/m/g, "n") // the anusvara is written m or n
    .replace(/(.)\1+/g, "$1");
}

/** True when two titles sound the same; short keys are too ambiguous to trust. */
export function soundsAlike(a, b) {
  const x = soundKey(a);
  return x.length >= 3 && x === soundKey(b);
}
