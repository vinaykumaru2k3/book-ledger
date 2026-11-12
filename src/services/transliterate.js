/**
 * English letters to Kannada script, the way a Kannada keyboard would write
 * them: "padmapaani" → ಪದ್ಮಪಾಣಿ, "ganeshaiah" → ಗಣೇಶಯ್ಯ.
 *
 * Many Kannada books are catalogued only in Kannada script, so a search typed
 * in English letters is also run in Kannada. Uses Google Input Tools, which
 * picks the likeliest spelling (ಣ or ನ, ಶ or ಸ) better than any fixed table.
 */

const INPUT_TOOLS = "https://inputtools.google.com/request";
const TIMEOUT_MS = 3000;
const cache = new Map();

const LATIN_ONLY = /^[A-Za-z][A-Za-z\s.'-]*$/;

/** Test hook. */
export function resetTransliteration() {
  cache.clear();
}

/** The Kannada spelling of text typed in English letters, or "" when there is none. Never throws. */
export async function toKannada(text) {
  const query = String(text || "").trim();
  if (query.length < 3 || !LATIN_ONLY.test(query)) return "";
  const key = query.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const params = new URLSearchParams({ text: key, itc: "kn-t-i0-und", num: "1", cp: "0", cs: "1", ie: "utf-8", oe: "utf-8" });
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
  let result = "";
  try {
    const response = await fetch(`${INPUT_TOOLS}?${params}`, controller ? { signal: controller.signal } : undefined);
    const data = response.ok ? await response.json() : null;
    if (data?.[0] === "SUCCESS") result = String(data[1]?.[0]?.[1]?.[0] || "");
  } catch {
    result = "";
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!/[ಀ-೿]/.test(result)) result = "";
  cache.set(key, result);
  return result;
}
