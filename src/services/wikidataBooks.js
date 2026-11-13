/**
 * Books from Wikidata, with their covers from Wikipedia.
 *
 * Wikidata knows a literary work by every name it goes by: ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು is
 * also "Mookajjiya Kanasugalu", with its author, year and language. So a reader
 * can type a Kannada title in English letters and still find the Kannada book,
 * and the film or the disambiguation page of the same name is left out.
 *
 * Results are Google-Books-style volumes (id "wd:Q…") so the search list and
 * the book form treat them like any other.
 */

import { kannadaToLatin, soundsAlike } from "../domain/soundKey";

const WIKIDATA = "https://www.wikidata.org/w/api.php";
const KANNADA_LANGUAGE = "Q33673";
const KANNADA_SCRIPT = /[ಀ-೿]/;
export const WIKIDATA_PREFIX = "wd:";

// "instance of" values that make an item a book rather than a film or a person.
const WORK_TYPES = new Set([
  "Q7725634", // literary work
  "Q8261", // novel
  "Q571", // book
  "Q47461344", // written work
  "Q49084", // short story
  "Q1279564", // short story collection
  "Q5185279", // poem
  "Q12106333", // poetry collection
  "Q37484", // epic poem
  "Q25379", // play
  "Q1667921", // novel series
  "Q3331189", // version, edition or translation
  "Q7725310", // series of creative works
  "Q8274", // manga
  "Q725377", // graphic novel
  "Q149537", // novella
]);
const BOOKISH = /novel|book|poem|poetry|epic|play by|short stor|literary|anthology|ಕಾದಂಬರಿ|ಕೃತಿ|ಪುಸ್ತಕ|ಕವನ|ಕಾವ್ಯ|ನಾಟಕ/i;
const NOT_A_BOOK = /film|movie|ಚಲನಚಿತ್ರ|ಸಿನಿಮಾ|disambiguation|ದ್ವಂದ್ವ|television|serial|album|song/i;

// Wikipedia categories that file a page as a book: "ಪುಸ್ತಕಗಳು", "ಕಾದಂಬರಿಗಳು", "1968 novels"...
const BOOK_CATEGORY = /ಪುಸ್ತಕ|ಕಾದಂಬರಿ|ಕೃತಿ|ಕಥಾ ?ಸಂಕಲನ|ಕವನ ?ಸಂಕಲನ|novels|books|short story collections|poetry collections/i;

export const isWikidataId = (id) => String(id || "").startsWith(WIKIDATA_PREFIX);

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

const api = (params) => getJson(`${WIKIDATA}?${new URLSearchParams({ format: "json", origin: "*", ...params })}`);

const ids = (entity, property) =>
  (entity?.claims?.[property] || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
const firstValue = (entity, property) => entity?.claims?.[property]?.[0]?.mainsnak?.datavalue?.value;
const label = (entity, lang) => entity?.labels?.[lang]?.value || "";

/** Items whose label or alias starts with the query, in the query's script. */
export async function searchItems(query, limit = 12) {
  const lang = KANNADA_SCRIPT.test(query) ? "kn" : "en";
  const data = await api({ action: "wbsearchentities", type: "item", search: query, language: lang, uselang: lang, limit: String(limit) });
  return data?.search || [];
}

/** Full entities (labels in English and Kannada, claims, Wikipedia page titles). */
export async function getEntities(qids, props = "labels|claims|sitelinks|aliases", { languages = "en|kn", sites = "knwiki|enwiki" } = {}) {
  if (!qids.length) return {};
  const data = await api({
    action: "wbgetentities",
    ids: qids.slice(0, 50).join("|"),
    props,
    languages,
    sitefilter: sites,
  });
  return data?.entities || {};
}

function isWork(entity, description = "") {
  if (!entity || entity.missing !== undefined) return false;
  const types = ids(entity, "P31");
  if (types.includes("Q5") || NOT_A_BOOK.test(description)) return false;
  return types.some((t) => WORK_TYPES.has(t)) || BOOKISH.test(description);
}

const isKannadaWork = (entity) => ids(entity, "P407").includes(KANNADA_LANGUAGE) || Boolean(entity?.sitelinks?.knwiki && !entity?.sitelinks?.enwiki);

/**
 * Every name the work goes by, in both languages. `aliases: false` leaves out
 * the alternative names, which anyone can add and are sometimes wrong.
 */
export function namesOf(entity, { aliases = true } = {}) {
  const names = [label(entity, "kn"), label(entity, "en")];
  if (aliases) ["kn", "en"].forEach((lang) => (entity?.aliases?.[lang] || []).forEach((a) => names.push(a.value)));
  Object.values(entity?.sitelinks || {}).forEach((s) => names.push(s.title.replace(/\s*\(.*\)\s*$/, "")));
  return [...new Set(names.filter(Boolean))];
}

/**
 * True when an image is a photo of the author rather than a cover: a novel's
 * page without a cover often shows its author ("Kuvempu.jpg").
 */
export function looksLikeAuthorPhoto(url, authorNames) {
  let file = String(url || "").split("?")[0].split("/").pop() || "";
  try {
    file = decodeURIComponent(file);
  } catch {
    /* keep it encoded */
  }
  file = file.replace(/^\d+px-/, "").toLowerCase();
  const fileLatin = kannadaToLatin(file);
  return authorNames
    .flatMap((name) => [name, kannadaToLatin(name)])
    .flatMap((name) => String(name || "").toLowerCase().split(/[^\p{L}\p{M}]+/u))
    .filter((part) => [...part].length >= 4)
    .some((part) => file.includes(part) || fileLatin.includes(part));
}

/** English and Kannada names of the works' authors. */
export async function authorNamesOf(works) {
  const authorIds = [...new Set(works.flatMap((e) => ids(e, "P50")))];
  const authors = await getEntities(authorIds, "labels");
  return Object.values(authors).flatMap((a) => [label(a, "en"), label(a, "kn")]).filter(Boolean);
}

/**
 * Many Kannada books on Wikidata are bare: no type, no description, only a
 * Wikipedia page. Those whose page is filed under a books category count as books.
 */
async function filedAsBooks(entities) {
  const books = new Set();
  for (const lang of ["kn", "en"]) {
    const pairs = entities.filter((e) => e.sitelinks?.[`${lang}wiki`] && !books.has(e.id)).map((e) => [e.id, e.sitelinks[`${lang}wiki`].title]);
    if (!pairs.length) continue;
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      prop: "categories",
      clshow: "!hidden",
      cllimit: "max",
      redirects: "1",
      titles: pairs.map(([, title]) => title).join("|"),
    });
    try {
      const data = await getJson(`https://${lang}.wikipedia.org/w/api.php?${params}`);
      const renamed = Object.fromEntries([...(data?.query?.normalized || []), ...(data?.query?.redirects || [])].map((r) => [r.to, r.from]));
      Object.values(data?.query?.pages || {}).forEach((page) => {
        if (!(page.categories || []).some((c) => BOOK_CATEGORY.test(c.title))) return;
        const asked = renamed[page.title] || page.title;
        pairs.filter(([, title]) => title === asked || title === page.title).forEach(([qid]) => books.add(qid));
      });
    } catch {
      /* that Wikipedia is unreachable: the item stays unconfirmed */
    }
  }
  return books;
}

const isBare = (entity, description) =>
  Boolean(entity) && entity.missing === undefined && !ids(entity, "P31").length && !description && Boolean(entity.sitelinks?.knwiki || entity.sitelinks?.enwiki);

/* ---------- authors named in the Wikipedia introduction ---------- */

const WROTE = /\s*(?:ಬರೆದ|ರಚಿಸಿದ|ರಚಿಸಿರುವ|ಬರೆದಿರುವ|ರಚನೆಯ)/;
const HONORIFIC_WORD = /^(?:ಅವರು|ರವರು|ಅವರ|ರವರ)$/;
const HONORIFIC_END = /(?:ರವರು|ಅವರು|ರವರ|ಅವರ|ರು)$/;
const TITLE_WORD = /^(?:ಡಾ\.?|ಶ್ರೀ|ಪ್ರೊ\.?|Dr\.?)$/;

/**
 * The author a Kannada Wikipedia introduction names: "ಡಾ. ಕೆ.ಎನ್.ಗಣೇಶಯ್ಯರವರು
 * ಬರೆದ…" gives "ಕೆ.ಎನ್.ಗಣೇಶಯ್ಯ". "" when the sentence does not say who wrote it.
 */
export function authorFromIntro(text, title = "") {
  const intro = String(text || "").split("\n")[0];
  const match = intro.match(WROTE);
  if (!match) return "";
  const titleWords = new Set(String(title).split(/\s+/));
  const words = intro
    .slice(0, match.index)
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !HONORIFIC_WORD.test(w));
  const name = [];
  for (let i = words.length - 1; i >= 0 && name.length < 3; i -= 1) {
    const word = words[i];
    if (titleWords.has(word) || /[,;:()]$/.test(word)) break;
    if (TITLE_WORD.test(word)) break;
    name.unshift(word);
  }
  if (!name.length) return "";
  const last = name.length - 1;
  if ([...name[last]].length > 4) name[last] = name[last].replace(HONORIFIC_END, "");
  return name.join(" ").replace(/^[.\s]+|[,\s]+$/g, "");
}

/** Introductions of the works' Kannada Wikipedia pages, by Wikidata id. */
async function kannadaIntros(entities) {
  const pairs = entities.filter((e) => e.sitelinks?.knwiki).map((e) => [e.id, e.sitelinks.knwiki.title]);
  if (!pairs.length) return {};
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    prop: "extracts",
    exintro: "1",
    explaintext: "1",
    exlimit: "max",
    redirects: "1",
    titles: pairs.map(([, title]) => title).join("|"),
  });
  const data = await getJson(`https://kn.wikipedia.org/w/api.php?${params}`);
  const renamed = Object.fromEntries([...(data?.query?.normalized || []), ...(data?.query?.redirects || [])].map((r) => [r.to, r.from]));
  const intros = {};
  Object.values(data?.query?.pages || {}).forEach((page) => {
    const asked = renamed[page.title] || page.title;
    pairs.filter(([, title]) => title === asked || title === page.title).forEach(([qid]) => (intros[qid] = page.extract || ""));
  });
  return intros;
}

/* ---------- covers from the work's Wikipedia pages ---------- */

const PORTRAIT = (t) => t?.source && t.width >= 80 && t.height >= t.width * 1.15;

/** Portrait page images for the work's Kannada and English Wikipedia pages, Kannada first. */
export async function wikipediaCovers(entities, size = 600) {
  const byWiki = { kn: [], en: [] };
  entities.forEach((e) => {
    if (e?.sitelinks?.knwiki) byWiki.kn.push([e.id, e.sitelinks.knwiki.title]);
    if (e?.sitelinks?.enwiki) byWiki.en.push([e.id, e.sitelinks.enwiki.title]);
  });
  const covers = {}; // qid -> [{ url, page }]
  for (const lang of ["kn", "en"]) {
    const pairs = byWiki[lang];
    if (!pairs.length) continue;
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: String(size),
      pilicense: "any",
      redirects: "1",
      titles: pairs.map(([, title]) => title).join("|"),
    });
    let data;
    try {
      data = await getJson(`https://${lang}.wikipedia.org/w/api.php?${params}`);
    } catch {
      continue;
    }
    const renamed = Object.fromEntries([...(data?.query?.normalized || []), ...(data?.query?.redirects || [])].map((r) => [r.to, r.from]));
    Object.values(data?.query?.pages || {}).forEach((page) => {
      if (!PORTRAIT(page.thumbnail)) return;
      const asked = renamed[page.title] || page.title;
      pairs
        .filter(([, title]) => title === asked || title === page.title)
        .forEach(([qid]) => (covers[qid] ||= []).push({ url: page.thumbnail.source, page: `${lang}: ${page.title}` }));
    });
  }
  return covers;
}

/* ---------- works as search results ---------- */

const year = (entity) => {
  const time = firstValue(entity, "P577")?.time || "";
  const match = time.match(/^[+-]?(\d{1,4})-/);
  return match ? match[1] : "";
};

const pages = (entity) => {
  const amount = Number(String(firstValue(entity, "P1104")?.amount || "").replace("+", ""));
  return amount > 0 ? amount : "";
};

function volumeFromWork(entity, description, authors, cover, introAuthor = "") {
  const kannada = isKannadaWork(entity);
  const primary = kannada ? "kn" : "en";
  const other = kannada ? "en" : "kn";
  const title = label(entity, primary) || label(entity, other);
  const otherTitle = label(entity, other);
  const authorNames = ids(entity, "P50")
    .map((qid) => label(authors[qid], primary) || label(authors[qid], other))
    .filter(Boolean);
  if (!authorNames.length && introAuthor) authorNames.push(introAuthor);
  const blurb = [otherTitle && otherTitle !== title ? otherTitle : "", description].filter(Boolean).join(" · ");
  return {
    id: `${WIKIDATA_PREFIX}${entity.id}`,
    volumeInfo: {
      title,
      authors: authorNames,
      publishedDate: year(entity),
      pageCount: pages(entity),
      categories: [],
      description: blurb,
      language: kannada ? "kn" : "en",
      imageLinks: cover ? { thumbnail: cover } : null,
      industryIdentifiers: [],
    },
    wikidata: {
      qid: entity.id,
      knwiki: entity.sitelinks?.knwiki?.title || "",
      enwiki: entity.sitelinks?.enwiki?.title || "",
      kannada,
    },
  };
}

/**
 * Literary works whose name in English or Kannada starts with the query, as
 * volumes, best match first. A Kannada work is titled in Kannada even when it
 * was found by its English spelling.
 */
export async function searchWikidataBooks(query, { limit = 5 } = {}) {
  const text = String(query || "").trim();
  if (text.length < 3) return [];
  const hits = (await searchItems(text, 15)).filter((h) => !NOT_A_BOOK.test(h.description || ""));
  if (!hits.length) return [];
  const entities = await getEntities(hits.map((h) => h.id));
  const bare = hits.filter((h) => isBare(entities[h.id], h.description || "")).map((h) => entities[h.id]);
  const confirmed = bare.length ? await filedAsBooks(bare.slice(0, 10)) : new Set();
  const works = hits
    .filter((h) => isWork(entities[h.id], h.description || "") || confirmed.has(h.id))
    .slice(0, limit)
    .map((h) => ({ entity: entities[h.id], description: h.description || "" }));
  if (!works.length) return [];

  const authorIds = [...new Set(works.flatMap(({ entity }) => ids(entity, "P50")))];
  const authorless = works.map((w) => w.entity).filter((e) => !ids(e, "P50").length);
  const [authors, covers, intros] = await Promise.all([
    getEntities(authorIds, "labels").catch(() => ({})),
    wikipediaCovers(works.map((w) => w.entity)).catch(() => ({})),
    kannadaIntros(authorless).catch(() => ({})),
  ]);
  return works.map(({ entity, description }) => {
    const names = ids(entity, "P50").flatMap((qid) => [label(authors[qid], "en"), label(authors[qid], "kn")]);
    const cover = (covers[entity.id] || []).find((c) => !looksLikeAuthorPhoto(c.url, names));
    const introAuthor = authorFromIntro(intros[entity.id], label(entity, "kn"));
    return volumeFromWork(entity, description, authors, cover?.url, introAuthor);
  });
}

/* ---------- finding a book's work, for covers ---------- */

/**
 * How well a work's names match the book's title, in any spelling or script:
 * 2 by its title or Wikipedia page, 1 only by an alternative name, 0 not at all.
 */
export function titleMatchStrength(entity, title, sameTitle) {
  const matches = (name) => sameTitle(name, title) || soundsAlike(name, title);
  if (namesOf(entity, { aliases: false }).some(matches)) return 2;
  return namesOf(entity).some(matches) ? 1 : 0;
}

/** The works that match best, and how well. */
function bestMatches(entities, title, sameTitle) {
  const scored = entities.map((e) => [e, titleMatchStrength(e, title, sameTitle)]).filter(([, score]) => score > 0);
  const strength = Math.max(0, ...scored.map(([, score]) => score));
  return { works: scored.filter(([, score]) => score === strength).map(([e]) => e), strength };
}

/**
 * The Wikidata works for a book in the library: by its saved id when it came
 * from Wikidata, else by title, else among its author's works. `sameTitle` is
 * the cover search's title comparison.
 */
export async function findWorks(book, sameTitle) {
  const title = String(book.title || "").trim();
  if (isWikidataId(book.sourceKey)) {
    const entities = await getEntities([book.sourceKey.slice(WIKIDATA_PREFIX.length)]);
    return Object.values(entities).filter((e) => isWork(e));
  }

  const hits = (await searchItems(title, 10)).filter((h) => !NOT_A_BOOK.test(h.description || ""));
  const found = await getEntities(hits.map((h) => h.id));
  const candidates = hits.map((h) => [found[h.id], h.description || ""]).filter(([e, d]) => isWork(e, d)).map(([e]) => e);
  const byTitle = bestMatches(candidates, title, sameTitle);
  if (byTitle.strength === 2 || !book.author) return byTitle.works;

  // Spelled differently from Wikidata's title (ಹೆಗ್ಗಡಿತಿ, ಹೆಗ್ಗಡತಿ), or found only by
  // an alternative name: look among the author's works too.
  const author = (await searchItems(String(book.author).split(",")[0].trim(), 5)).find((h) => !NOT_A_BOOK.test(h.description || ""));
  if (!author) return byTitle.works;
  const listed = await api({ action: "query", list: "search", srsearch: `haswbstatement:P50=${author.id}`, srlimit: "50" });
  const workIds = (listed?.query?.search || []).map((r) => r.title).filter((t) => /^Q\d+$/.test(t));
  const byAuthor = bestMatches(Object.values(await getEntities(workIds)).filter((e) => isWork(e)), title, sameTitle);
  return byAuthor.strength >= byTitle.strength && byAuthor.works.length ? byAuthor.works : byTitle.works;
}

/** The plain-text introduction of one Wikipedia page, or "". */
async function wikipediaExtract(lang, title) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    prop: "extracts",
    exintro: "1",
    explaintext: "1",
    redirects: "1",
    titles: title,
  });
  const data = await getJson(`https://${lang}.wikipedia.org/w/api.php?${params}`);
  return Object.values(data?.query?.pages || {})[0]?.extract?.trim() || "";
}

/** A short introduction to the work from its Wikipedia page, in the book's language first. */
export async function wikipediaIntro({ knwiki, enwiki, kannada }) {
  const order = kannada ? [["kn", knwiki], ["en", enwiki]] : [["en", enwiki], ["kn", knwiki]];
  for (const [lang, title] of order) {
    if (!title) continue;
    try {
      const text = await wikipediaExtract(lang, title);
      if (text) return text;
    } catch {
      /* try the other language */
    }
  }
  return "";
}

const introCache = new Map();

/**
 * The Wikipedia introduction of a Wikidata item, from the first of `langs`
 * that has a page: `{ text, lang, title, url }`, or null. Read live and kept
 * only for this visit (never stored), so it is always credited to Wikipedia.
 */
export async function itemIntro(qid, langs = ["en"]) {
  const order = [...new Set(langs.filter((l) => /^[a-z-]{2,12}$/.test(l)))];
  const key = `${qid}|${order.join(",")}`;
  if (introCache.has(key)) return introCache.get(key);
  const entity = (await getEntities([qid], "sitelinks", { languages: "en", sites: order.map((l) => `${l}wiki`).join("|") }))[qid];
  let result = null;
  for (const lang of order) {
    const title = entity?.sitelinks?.[`${lang}wiki`]?.title;
    if (!title) continue;
    try {
      const text = await wikipediaExtract(lang, title);
      if (text) {
        result = { text, lang, title, url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}` };
        break;
      }
    } catch {
      /* try the next language */
    }
  }
  introCache.set(key, result);
  return result;
}
