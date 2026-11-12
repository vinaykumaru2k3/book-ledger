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

import { soundsAlike } from "../domain/soundKey";
import { normalizeTitle, sharpenCoverUrl, withGoogleKey } from "./bookApi";
import { authorNamesOf, findWorks, looksLikeAuthorPhoto, wikipediaCovers } from "./wikidataBooks";

const CACHE_STORAGE_KEY = "pusthaka-cover-cache";
const RECHECK_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const VERIFY_TIMEOUT_MS = 8000;
const MAX_TRIES_PER_SOURCE = 4;

export const COVER_SOURCES = ["wikipedia", "openlibrary", "google"];

/**
 * Raised when the search gets better, so books it missed are looked at again
 * instead of waiting 30 days. 2: Wikidata, spelling variants, author lists on Google.
 */
export const COVER_SEARCH_VERSION = 2;

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
  if (Number.isNaN(checked) || (Number(book.coverCheckVersion) || 1) < COVER_SEARCH_VERSION) return true;
  return now - checked > RECHECK_AFTER_MS;
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

const KANNADA_RUN = /[ಀ-೿][ಀ-೿\s.,'-]*/g;

/**
 * A looser match for catalogue titles: the same title, the same title spelled
 * another way (Kanooru, Kanuru; ಹೆಗ್ಗಡಿತಿ, ಹೆಗ್ಗಡತಿ), or one half of a title
 * printed in both scripts ("ಕೊಳಲು Kolalu").
 */
export function titleSoundsLike(candidate, bookTitle) {
  if (titleMatches(candidate, bookTitle)) return true;
  const a = coreTitle(candidate);
  const b = coreTitle(bookTitle);
  if (soundsAlike(a, b)) return true;
  const kannada = (String(candidate || "").match(KANNADA_RUN) || []).join(" ").trim();
  const latin = String(candidate || "").replace(KANNADA_RUN, " ").trim();
  if (!kannada || !latin) return false;
  return [kannada, latin].some((half) => titleMatches(half, bookTitle) || soundsAlike(coreTitle(half), b));
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

const notAuthor = (book) => (page) => !looksLikeAuthorPhoto(page.thumbnail?.source, [book.author || ""]);
const wikiCandidate = (page) => ({ url: page.thumbnail.source, source: "wikipedia", label: `Wikipedia · ${page.title}` });

/**
 * The book's own Wikidata item knows its Kannada and English Wikipedia pages,
 * whatever the spelling of the title in the library. Covers from both pages.
 */
async function wikidataCandidates(book) {
  const works = await findWorks(book, titleMatches);
  if (!works.length) return [];
  const chosen = works.slice(0, 3);
  const [covers, authors] = await Promise.all([wikipediaCovers(chosen), authorNamesOf(chosen).catch(() => [])]);
  const names = [...authors, book.author || ""];
  return chosen.flatMap((w) =>
    (covers[w.id] || [])
      .filter((c) => !looksLikeAuthorPhoto(c.url, names))
      .map((c) => ({ url: c.url, source: "wikipedia", label: `Wikipedia · ${c.page}` })),
  );
}

/**
 * First the book's Wikidata item. Failing that, at most three calls: the title,
 * then the title with "novel" ("ಕಾದಂಬರಿ"), then, for a Kannada page without an
 * image, its English counterpart.
 */
async function wikipediaCandidates(book) {
  let fromWikidata = [];
  try {
    fromWikidata = await wikidataCandidates(book);
  } catch {
    /* Wikidata unreachable: Wikipedia's own search still answers */
  }
  if (fromWikidata.length) return fromWikidata;
  const title = book.title.trim();
  const lang = KANNADA.test(title) ? "kn" : "en";
  const englishTitles = new Set();
  for (const query of [title, `${title} ${lang === "kn" ? "ಕಾದಂಬರಿ" : "novel"}`]) {
    const pages = bookPages(await getJson(wikipediaSearchUrl(lang, query)), title);
    const withImage = pages.filter((p) => p.thumbnail?.source).filter(notAuthor(book));
    if (withImage.length) return withImage.map(wikiCandidate);
    pages.forEach((p) => p.langlinks?.[0]?.["*"] && englishTitles.add(p.langlinks[0]["*"]));
    if (pages.length) break; // the page exists but has no image: searching again will not help
  }
  if (!englishTitles.size) return [];
  const params = new URLSearchParams({ ...WIKI_IMAGE_PARAMS, prop: "pageimages", titles: [...englishTitles].slice(0, 3).join("|") });
  const data = await getJson(`https://en.wikipedia.org/w/api.php?${params}`);
  return Object.values(data?.query?.pages || {})
    .filter((p) => p.thumbnail?.source && !NOT_A_BOOK.test(qualifier(p.title)))
    .filter(notAuthor(book))
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
    return (data?.docs || []).filter((d) => d.cover_i && titleSoundsLike(d.title, book.title));
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
  const author = String(book.author || "").split(",")[0].trim();
  queries.push(`intitle:"${book.title}"${author ? ` inauthor:"${author}"` : ""}`);
  // Spelled differently in the catalogue: look through the author's books instead.
  if (author) queries.push(`inauthor:"${author}"`);
  const out = [];
  for (const q of queries) {
    let data;
    try {
      const max = q.startsWith("inauthor:") ? 40 : 10;
      data = await getJson(withGoogleKey(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${max}`));
    } catch (error) {
      if (error.status === 429) googleBlocked = true;
      throw error;
    }
    (data?.items || []).forEach((item) => {
      const info = item.volumeInfo || {};
      const link = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
      if (!link) return;
      if (!q.startsWith("isbn:") && !titleSoundsLike(info.title, book.title)) return;
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
