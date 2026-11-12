/**
 * Real book covers, found on the web.
 *
 * Sources, in the order the user chose: Wikipedia (which has covers for many
 * Kannada and Indian novels), Open Library, then Google Books. A book that none
 * of them knows keeps the designed jacket.
 *
 * Every candidate must match the book's title (so an author's page or a film of
 * the same name is skipped) and must load as a portrait image of a sensible size
 * (which drops placeholders, author photos and landscapes).
 *
 * Free of React and Firestore: the controller decides when to look and saves.
 */

import { normalizeTitle, sharpenCoverUrl, withGoogleKey } from "./bookApi";

const CACHE_STORAGE_KEY = "pusthaka-cover-cache";
const RECHECK_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const VERIFY_TIMEOUT_MS = 8000;
const MAX_TRIES_PER_SOURCE = 4;

export const COVER_SOURCES = ["wikipedia", "openlibrary", "google"];

const KANNADA = /[ಀ-೿]/;

const cache = new Map(); // key -> { url, source } | null
const inflight = new Map();
let cacheLoaded = false;
let googleBlocked = false; // set after a 429 so the rest of the session skips Google

function loadCache() {
  if (cacheLoaded) return;
  cacheLoaded = true;
  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY);
    if (raw) Object.entries(JSON.parse(raw)).forEach(([k, v]) => cache.set(k, v));
  } catch {
    /* storage unavailable or corrupt: start empty */
  }
}

function persistCache() {
  try {
    sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(Object.fromEntries(cache)));
  } catch {
    /* storage unavailable or full */
  }
}

/** Test hook: forget the session cache and the Google block. */
export function resetCoverSearch() {
  cache.clear();
  inflight.clear();
  cacheLoaded = true;
  googleBlocked = false;
}

const coverKey = (book) => `${book.isbn || ""}|${book.title || ""}|${book.author || ""}`.toLowerCase();

/** True when the book has no cover, the user has not removed one, and it was not searched recently. */
export function needsCover(book, now = Date.now()) {
  if (!book || book.coverUrl || book.coverSource === "removed") return false;
  if (!book.title || book.title === "Untitled") return false;
  const checked = book.coverCheckedAt ? Date.parse(book.coverCheckedAt) : NaN;
  return Number.isNaN(checked) || now - checked > RECHECK_AFTER_MS;
}

/** The core of a title: no "(novel)"-style qualifier, no subtitle, no leading article. */
export function coreTitle(title) {
  const base = String(title || "")
    .replace(/\s*[([].*?[)\]]\s*/g, " ")
    .split(/\s[:\-–—|]\s|:\s*/)[0];
  return normalizeTitle(base).replace(/^(the|a|an) /, "");
}

export function titleMatches(candidate, bookTitle) {
  const a = coreTitle(candidate);
  return Boolean(a) && a === coreTitle(bookTitle);
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

const cleanIsbn = (isbn) => String(isbn || "").replace(/[^0-9Xx]/g, "");

/* ---------- Wikipedia ---------- */

const WIKI_IMAGE_PARAMS = { action: "query", format: "json", origin: "*", piprop: "thumbnail", pithumbsize: "600", pilicense: "any" };

function wikipediaSearchUrl(lang, query) {
  const params = new URLSearchParams({
    ...WIKI_IMAGE_PARAMS,
    generator: "search",
    gsrsearch: query,
    gsrlimit: "8",
    // On Kannada pages also ask for the English counterpart, which often has the image.
    prop: lang === "kn" ? "pageimages|langlinks" : "pageimages",
    ...(lang === "kn" ? { lllang: "en" } : {}),
  });
  return `https://${lang}.wikipedia.org/w/api.php?${params}`;
}

// Pages about something other than the book: the film, the TV serial, the franchise...
const NOT_A_BOOK = /film|movie|ಚಲನಚಿತ್ರ|ಸಿನಿಮಾ|series|serial|ಧಾರಾವಾಹಿ|franchise|album|song|soundtrack|character|game|play|disambiguation|ದ್ವಂದ್ವ/i;
const A_BOOK = /novel|book|ಕಾದಂಬರಿ|ಪುಸ್ತಕ|ಕೃತಿ/i;
const qualifier = (pageTitle) => (String(pageTitle).match(/[([]([^)\]]*)[)\]]/) || [])[1] || "";

/** Wikipedia pages about this book, best first (an explicit "(novel)" before a bare title). */
function bookPages(data, title) {
  return Object.values(data?.query?.pages || {})
    .filter((p) => titleMatches(p.title, title) && !NOT_A_BOOK.test(qualifier(p.title)))
    .sort((a, b) => (A_BOOK.test(qualifier(b.title)) - A_BOOK.test(qualifier(a.title))) || (a.index || 0) - (b.index || 0));
}

const wikiCandidate = (page) => ({ url: page.thumbnail.source, source: "wikipedia", label: `Wikipedia · ${page.title}` });

/**
 * At most three calls: the title, then the title with "novel" ("ಕಾದಂಬರಿ"), then,
 * for a Kannada page without an image, its English counterpart.
 */
async function wikipediaCandidates(book) {
  const title = book.title.trim();
  const lang = KANNADA.test(title) ? "kn" : "en";
  const englishTitles = new Set();
  for (const query of [title, `${title} ${lang === "kn" ? "ಕಾದಂಬರಿ" : "novel"}`]) {
    const pages = bookPages(await getJson(wikipediaSearchUrl(lang, query)), title);
    const withImage = pages.filter((p) => p.thumbnail?.source);
    if (withImage.length) return withImage.map(wikiCandidate);
    pages.forEach((p) => p.langlinks?.[0]?.["*"] && englishTitles.add(p.langlinks[0]["*"]));
    if (pages.length) break; // the page exists but has no image: searching again will not help
  }
  if (!englishTitles.size) return [];
  const params = new URLSearchParams({ ...WIKI_IMAGE_PARAMS, prop: "pageimages", titles: [...englishTitles].slice(0, 3).join("|") });
  const data = await getJson(`https://en.wikipedia.org/w/api.php?${params}`);
  return Object.values(data?.query?.pages || {})
    .filter((p) => p.thumbnail?.source && !NOT_A_BOOK.test(qualifier(p.title)))
    .map(wikiCandidate);
}

/* ---------- Open Library ---------- */

async function openLibraryCandidates(book) {
  const out = [];
  const isbn = cleanIsbn(book.isbn);
  if (isbn) out.push({ url: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`, source: "openlibrary", label: "Open Library · ISBN" });

  const search = async (withAuthor) => {
    const params = new URLSearchParams({ title: book.title, limit: "10", fields: "title,author_name,cover_i" });
    if (withAuthor && book.author) params.set("author", book.author);
    const data = await getJson(`https://openlibrary.org/search.json?${params}`);
    return (data?.docs || []).filter((d) => d.cover_i && titleMatches(d.title, book.title));
  };
  let docs = await search(true);
  if (!docs.length && book.author) docs = await search(false);
  const seen = new Set();
  docs.forEach((d) => {
    if (seen.has(d.cover_i)) return;
    seen.add(d.cover_i);
    out.push({ url: `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`, source: "openlibrary", label: `Open Library · ${d.title}` });
  });
  return out;
}

/* ---------- Google Books ---------- */

async function googleCandidates(book) {
  if (googleBlocked) return [];
  const isbn = cleanIsbn(book.isbn);
  const queries = [];
  if (isbn) queries.push(`isbn:${isbn}`);
  queries.push(`intitle:"${book.title}"${book.author ? ` inauthor:"${book.author}"` : ""}`);
  const out = [];
  for (const q of queries) {
    let data;
    try {
      data = await getJson(withGoogleKey(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10`));
    } catch (error) {
      if (error.status === 429) googleBlocked = true;
      throw error;
    }
    (data?.items || []).forEach((item) => {
      const info = item.volumeInfo || {};
      const link = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
      if (!link) return;
      if (!q.startsWith("isbn:") && !titleMatches(info.title, book.title)) return;
      out.push({ url: sharpenCoverUrl(link), source: "google", label: `Google Books · ${info.title || ""}`.trim() });
    });
    if (out.length) break;
  }
  return out;
}

const FINDERS = { wikipedia: wikipediaCandidates, openlibrary: openLibraryCandidates, google: googleCandidates };

/**
 * Runs one source; a failure there is an empty list, never an error. `failed`
 * says the answer is not definitive (offline, rate limited). Google's keyless
 * quota is exhausted so often that a 429 there counts as a plain miss.
 */
async function fromSource(source, book) {
  try {
    return { list: await FINDERS[source](book), failed: false };
  } catch (error) {
    return { list: [], failed: !(source === "google" && error.status === 429) };
  }
}

/** Thrown by findBestCover when nothing was found but a source could not be asked: try again later. */
export class CoverSearchIncomplete extends Error {
  constructor() {
    super("Cover search incomplete");
    this.name = "CoverSearchIncomplete";
  }
}

/* ---------- Verification ---------- */

/** Resolves true when the URL loads as a portrait image at least 80px wide. Browser only. */
export function verifyCover(url) {
  if (typeof Image === "undefined" || !url) return Promise.resolve(false);
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => done(false), VERIFY_TIMEOUT_MS);
    function done(ok) {
      clearTimeout(timer);
      img.onload = img.onerror = null;
      resolve(ok);
    }
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      done(w >= 80 && h >= w * 1.15);
    };
    img.onerror = () => done(false);
    img.referrerPolicy = "no-referrer";
    img.src = url;
  });
}

function dedupe(list) {
  const seen = new Set();
  return list.filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true)));
}

/**
 * The first verified cover, walking Wikipedia, Open Library, then Google Books.
 * Resolves to { url, source }, or null when no source has one. Rejects with
 * CoverSearchIncomplete when nothing was found but a source failed. Cached for the tab.
 */
export function findBestCover(book, { verify = verifyCover } = {}) {
  if (!book?.title) return Promise.resolve(null);
  loadCache();
  const key = coverKey(book);
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (inflight.has(key)) return inflight.get(key);

  const run = (async () => {
    let found = null;
    let incomplete = false;
    for (const source of COVER_SOURCES) {
      const { list, failed } = await fromSource(source, book);
      incomplete ||= failed;
      for (const candidate of dedupe(list).slice(0, MAX_TRIES_PER_SOURCE)) {
        if (await verify(candidate.url)) {
          found = { url: candidate.url, source };
          break;
        }
      }
      if (found) break;
    }
    if (!found && incomplete) throw new CoverSearchIncomplete();
    cache.set(key, found);
    persistCache();
    return found;
  })().finally(() => inflight.delete(key));

  inflight.set(key, run);
  return run;
}

/** Every verified cover from all sources, in source order, for the picker. */
export async function findCoverCandidates(book, { verify = verifyCover } = {}) {
  if (!book?.title?.trim()) return [];
  const results = await Promise.all(COVER_SOURCES.map((source) => fromSource(source, book)));
  const candidates = dedupe(results.flatMap(({ list }) => list.slice(0, 6)));
  const checks = await Promise.all(candidates.map((c) => verify(c.url)));
  return candidates.filter((_, i) => checks[i]);
}
