/**
 * Generating a literary map from Wikidata and Wikipedia.
 *
 * Wikidata knows who wrote in a language, what they wrote, which movements they
 * belonged to and (for some languages) who influenced whom. Coverage differs a
 * lot: English writers have thousands of "influenced by" statements between
 * them, Kannada writers none. So a second, weaker signal is read too: the
 * writers' Wikipedia articles that link to one another ("mentioned with").
 *
 * The query service is slow on big joins, so everything is many small batched
 * queries rather than one large one, cached for the browser session.
 */

import { normalizeGraph } from "../domain/literaryMap";
import { findWorks } from "./wikidataBooks";

const SPARQL = "https://query.wikidata.org/sparql";
const ENTITY = "http://www.wikidata.org/entity/";
const TIMEOUT_MS = 20000;
const BATCH = 100;
const CACHE_PREFIX = "pk.sparql.";

/** How many authors a generated map starts with. */
export const SIZES = { focused: 60, broad: 150, deep: 300 };
const WORKS_PER_AUTHOR = 3;

// Occupations that make someone a literary writer rather than a politician who wrote a memoir.
const LITERARY_OCCUPATIONS = [
  "Q6625963", // novelist
  "Q49757", // poet
  "Q214917", // playwright
  "Q15949613", // short story writer
  "Q11774202", // essayist
  "Q4853732", // children's writer
  "Q1209498", // poet lawyer
];
// Movement maps also take plain "writer": a movement already narrows things down.
const WRITER = "Q36180";
// Someone famous for something else who also published a book or two (an actor's
// short stories, a singer's poems) is left out. Wikidata lists dozens of
// occupations for the famous, "poet" among Madonna's, so the test is the share:
// see withoutCelebrities.
const CORE_LITERARY = ["Q6625963", "Q49757", "Q214917"];
const ANY_LITERARY = [...LITERARY_OCCUPATIONS, WRITER, "Q482980" /* author */, "Q18844224" /* science fiction writer */, "Q4263842" /* literary critic */];
const FAMOUS_FOR_OTHER_THINGS = [
  "Q639669", // musician
  "Q947873", // television presenter
  "Q4610556", // model
  "Q33999", // actor
  "Q10800557", // film actor
  "Q10798782", // television actor
  "Q177220", // singer
  "Q488205", // singer-songwriter
  "Q2252262", // rapper
  "Q245068", // comedian
  "Q82955", // politician
  "Q43845", // businessperson
  "Q2526255", // film director
  "Q11063", // astronomer
  "Q169470", // physicist
];

/**
 * Languages offered in the wizard, with their Wikipedia codes (checked against
 * Wikidata's P424). `large` ones have too many writers for one query and are
 * read one occupation at a time, notable writers only.
 */
export const LANGUAGES = [
  { qid: "Q1860", code: "en", label: "English", large: true },
  { qid: "Q33673", code: "kn", label: "Kannada" },
  { qid: "Q1568", code: "hi", label: "Hindi" },
  { qid: "Q9610", code: "bn", label: "Bengali" },
  { qid: "Q5885", code: "ta", label: "Tamil" },
  { qid: "Q8097", code: "te", label: "Telugu" },
  { qid: "Q36236", code: "ml", label: "Malayalam" },
  { qid: "Q1571", code: "mr", label: "Marathi" },
  { qid: "Q5137", code: "gu", label: "Gujarati" },
  { qid: "Q1617", code: "ur", label: "Urdu" },
  { qid: "Q58635", code: "pa", label: "Punjabi" },
  { qid: "Q33810", code: "or", label: "Odia" },
  { qid: "Q29401", code: "as", label: "Assamese" },
  { qid: "Q11059", code: "sa", label: "Sanskrit" },
  { qid: "Q33823", code: "ne", label: "Nepali" },
  { qid: "Q13267", code: "si", label: "Sinhala" },
  { qid: "Q150", code: "fr", label: "French", large: true },
  { qid: "Q188", code: "de", label: "German", large: true },
  { qid: "Q1321", code: "es", label: "Spanish", large: true },
  { qid: "Q652", code: "it", label: "Italian", large: true },
  { qid: "Q5146", code: "pt", label: "Portuguese", large: true },
  { qid: "Q7737", code: "ru", label: "Russian", large: true },
  { qid: "Q809", code: "pl", label: "Polish" },
  { qid: "Q9056", code: "cs", label: "Czech" },
  { qid: "Q7411", code: "nl", label: "Dutch" },
  { qid: "Q9027", code: "sv", label: "Swedish" },
  { qid: "Q9043", code: "no", label: "Norwegian" },
  { qid: "Q9035", code: "da", label: "Danish" },
  { qid: "Q1412", code: "fi", label: "Finnish" },
  { qid: "Q36510", code: "el", label: "Greek" },
  { qid: "Q397", code: "la", label: "Latin" },
  { qid: "Q9067", code: "hu", label: "Hungarian" },
  { qid: "Q7913", code: "ro", label: "Romanian" },
  { qid: "Q8798", code: "uk", label: "Ukrainian" },
  { qid: "Q9299", code: "sr", label: "Serbian" },
  { qid: "Q256", code: "tr", label: "Turkish" },
  { qid: "Q13955", code: "ar", label: "Arabic" },
  { qid: "Q9168", code: "fa", label: "Persian" },
  { qid: "Q9288", code: "he", label: "Hebrew" },
  { qid: "Q8641", code: "yi", label: "Yiddish" },
  { qid: "Q7850", code: "zh", label: "Chinese", large: true },
  { qid: "Q5287", code: "ja", label: "Japanese", large: true },
  { qid: "Q9176", code: "ko", label: "Korean" },
  { qid: "Q9199", code: "vi", label: "Vietnamese" },
  { qid: "Q9217", code: "th", label: "Thai" },
  { qid: "Q9240", code: "id", label: "Indonesian" },
  { qid: "Q7838", code: "sw", label: "Swahili" },
  { qid: "Q9142", code: "ga", label: "Irish" },
  { qid: "Q9309", code: "cy", label: "Welsh" },
];

/* ------------------------------------------------------------------ */
/* Query service                                                       */
/* ------------------------------------------------------------------ */

const memory = new Map();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + text.length.toString(36);
}

function cached(key) {
  if (memory.has(key)) return memory.get(key);
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (raw) {
      const rows = JSON.parse(raw);
      memory.set(key, rows);
      return rows;
    }
  } catch {
    /* storage unavailable or corrupt */
  }
  return undefined;
}

function remember(key, rows) {
  memory.set(key, rows);
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(rows));
  } catch {
    /* storage full: the in-memory copy still serves this page */
  }
}

/** For tests: forget every cached answer. */
export function resetMapSourceCache() {
  memory.clear();
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* nothing to clear */
  }
}

/** A row's values as plain strings, with Wikidata item URLs cut to "Q…". */
const plain = (binding) =>
  Object.fromEntries(Object.entries(binding).map(([k, v]) => [k, v.value.startsWith(ENTITY) ? v.value.slice(ENTITY.length) : v.value]));

/**
 * Runs a SPARQL query (POSTed, so long VALUES lists fit). Gives up after 20 s;
 * tries once more after a pause when the service is busy (429 or 5xx).
 */
export async function sparql(query, { signal, timeout = TIMEOUT_MS } = {}) {
  const key = hash(query);
  const hit = cached(key);
  if (hit) return hit;
  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort);
    const timer = setTimeout(abort, timeout);
    let response;
    try {
      response = await fetch(SPARQL, { method: "POST", body: new URLSearchParams({ query, format: "json" }), signal: controller.signal });
    } catch (error) {
      if (signal?.aborted) throw error;
      const timedOut = new Error("The Wikidata query took too long.");
      timedOut.code = "timeout";
      throw timedOut;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
    if (response.ok) {
      const rows = ((await response.json())?.results?.bindings || []).map(plain);
      remember(key, rows);
      return rows;
    }
    const busy = response.status === 429 || response.status >= 500;
    if (!busy || attempt >= 1) {
      const error = new Error(`Wikidata answered ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    const after = Number(response.headers?.get?.("Retry-After"));
    await wait(Number.isFinite(after) && after > 0 ? Math.min(after, 10) * 1000 : 2000);
  }
}

const values = (qids) => qids.map((q) => `wd:${q}`).join(" ");
const chunks = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};
/** Runs `query(batch)` for each batch of ids, in parallel, and joins the rows. */
const batched = async (qids, query, opts) => (await Promise.all(chunks(qids, BATCH).map((batch) => sparql(query(batch), opts)))).flat();
const year = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
};
const split = (v) => (v ? v.split("|").filter(Boolean) : []);

/* ------------------------------------------------------------------ */
/* Choosing the authors                                                */
/* ------------------------------------------------------------------ */

/**
 * The most notable literary writers in a language, by how many Wikipedias have
 * a page on them. Those Wikidata says *write* in it come first; those who only
 * speak it (a statesman who also wrote poems) after them.
 */
export async function writersInLanguage(language, limit, opts) {
  const one = (occupations, floor = 0) => `
    SELECT ?a (MAX(?sl) AS ?links) (MAX(?w) AS ?writes) WHERE {
      ?a wdt:P6886|wdt:P1412 wd:${language.qid}; wdt:P106 ?occ; wikibase:sitelinks ?sl .
      VALUES ?occ { ${values(occupations)} }
      OPTIONAL { ?a wdt:P6886 wd:${language.qid} . BIND(1 AS ?w) }
      ${floor ? `FILTER(?sl >= ${floor})` : ""}
    } GROUP BY ?a ORDER BY DESC(?links) LIMIT ${limit * 3}`;
  let rows;
  if (!language.large) {
    try {
      rows = await sparql(one(LITERARY_OCCUPATIONS), opts);
    } catch (error) {
      if (error.code !== "timeout" && error.status !== 500) throw error;
    }
  }
  if (!rows) {
    // Too many writers for one query: one occupation at a time, the notable ones only.
    const settled = await Promise.allSettled(LITERARY_OCCUPATIONS.map((occ) => sparql(one([occ], 15), opts)));
    rows = settled.filter((s) => s.status === "fulfilled").flatMap((s) => s.value);
    if (!rows.length) throw settled.find((s) => s.status === "rejected")?.reason || new Error("No writers found.");
  }
  return (await withoutCelebrities(rankAuthors(rows, limit * 2), opts)).slice(0, limit);
}

/**
 * The candidates minus those famous for something other than writing: someone
 * with an occupation like actor, singer or politician, fewer than a fifth of
 * whose occupations are literary, and who is not at least two of novelist, poet
 * and playwright. Byron (a politician) and Blake (a painter) stay; Madonna goes.
 */
export async function withoutCelebrities(qids, opts) {
  if (!qids.length) return qids;
  const list = (ids) => ids.map((q) => `wd:${q}`).join(", ");
  let rows;
  try {
    rows = await batched(
      qids,
      (batch) => `
        SELECT ?a (COUNT(DISTINCT ?o) AS ?all)
               (SUM(IF(?o IN (${list(ANY_LITERARY)}), 1, 0)) AS ?literary)
               (SUM(IF(?o IN (${list(CORE_LITERARY)}), 1, 0)) AS ?core)
               (SUM(IF(?o IN (${list(FAMOUS_FOR_OTHER_THINGS)}), 1, 0)) AS ?other) WHERE {
          VALUES ?a { ${values(batch)} }
          ?a wdt:P106 ?o .
        } GROUP BY ?a`,
      opts
    );
  } catch (error) {
    if (opts?.signal?.aborted) throw error;
    return qids; // better a map with a film star on it than no map
  }
  const celebrity = new Set(
    rows
      .filter((r) => Number(r.other) > 0 && Number(r.core) < 2 && Number(r.literary) / Math.max(1, Number(r.all)) < 0.2)
      .map((r) => r.a)
  );
  return qids.filter((q) => !celebrity.has(q));
}

/** Members of a movement or genre (and its sub-movements). */
export async function writersInMovement(movementQid, limit, opts) {
  const subs = await sparql(`SELECT ?s WHERE { ?s wdt:P279 wd:${movementQid} } LIMIT 30`, opts);
  const movements = [movementQid, ...subs.map((r) => r.s).filter((q) => /^Q\d+$/.test(q))];
  const rows = await sparql(
    `SELECT ?a (MAX(?sl) AS ?links) WHERE {
      VALUES ?m { ${values(movements)} }
      ?a wdt:P135|wdt:P136 ?m; wdt:P31 wd:Q5; wdt:P106 ?occ; wikibase:sitelinks ?sl .
      VALUES ?occ { ${values([...LITERARY_OCCUPATIONS, WRITER])} }
    } GROUP BY ?a ORDER BY DESC(?links) LIMIT ${limit * 2}`,
    opts
  );
  return (await withoutCelebrities(rankAuthors(rows, limit * 2), opts)).slice(0, limit);
}

/** Distinct authors, writers-in-the-language first (when known), then by number of Wikipedia pages. */
export function rankAuthors(rows, limit) {
  const best = new Map();
  rows.forEach((r) => {
    if (!/^Q\d+$/.test(r.a)) return;
    const before = best.get(r.a) || { links: 0, writes: 0 };
    best.set(r.a, { links: Math.max(before.links, Number(r.links) || 0), writes: Math.max(before.writes, Number(r.writes) || 0) });
  });
  return [...best.entries()]
    .sort(([, x], [, y]) => y.writes - x.writes || y.links - x.links)
    .slice(0, limit)
    .map(([qid]) => qid);
}

/* ------------------------------------------------------------------ */
/* Reading what Wikidata knows about them                              */
/* ------------------------------------------------------------------ */

const labelsFor = (variable, langCode) => {
  const native = langCode && langCode !== "en" ? langCode : "";
  return `
    ${native ? `OPTIONAL { ${variable} rdfs:label ?n FILTER(LANG(?n) = "${native}") }` : ""}
    OPTIONAL { ${variable} rdfs:label ?e FILTER(LANG(?e) = "en") }
    OPTIONAL { ${variable} skos:altLabel ?al FILTER(LANG(?al) = "en" ${native ? `|| LANG(?al) = "${native}"` : ""}) }`;
};
const nameOf = (r) => ({ native: r.native || "", en: r.en || "", aliases: split(r.aliases).slice(0, 8) });

/** Names in the map's language and English, and birth and death years. */
export async function authorDetails(qids, langCode, opts) {
  const rows = await batched(
    qids,
    (batch) => `
      SELECT ?a (SAMPLE(?n) AS ?native) (SAMPLE(?e) AS ?en) (GROUP_CONCAT(DISTINCT ?al; separator="|") AS ?aliases)
             (MIN(YEAR(?b)) AS ?born) (MAX(YEAR(?d)) AS ?died) WHERE {
        VALUES ?a { ${values(batch)} }
        ${labelsFor("?a", langCode)}
        OPTIONAL { ?a wdt:P569 ?b }
        OPTIONAL { ?a wdt:P570 ?d }
      } GROUP BY ?a`,
    opts
  );
  return rows.map((r) => ({
    id: r.a,
    qid: r.a,
    kind: "author",
    name: nameOf(r),
    years: { from: year(r.born), to: year(r.died) },
    source: "wikidata",
  }));
}

/**
 * Who influenced whom (P737), who studied under whom (P1066), and the movements
 * each author belonged to (P135). Returns raw statements; ends outside the map
 * are kept so they can be weighed.
 */
export async function authorRelations(qids, opts) {
  const rows = await batched(
    qids,
    (batch) => `
      SELECT ?a ?p ?b WHERE {
        VALUES ?a { ${values(batch)} }
        VALUES ?p { wdt:P737 wdt:P1066 wdt:P135 }
        ?a ?p ?b .
      }`,
    opts
  );
  return rows
    .map((r) => ({ a: r.a, p: r.p.split("/").pop(), b: r.b }))
    .filter((r) => /^Q\d+$/.test(r.b));
}

/**
 * Each author's best-known works: those in the map's language first, then by
 * how many Wikipedias cover them. Two steps, because famous authors have
 * thousands of works on Wikidata: first pick the few per author, then read
 * names and years for those only. `minLinks` skips works almost no Wikipedia
 * covers (raise it for big languages).
 */
export async function worksOf(qids, { languageQid, langCode, perAuthor = WORKS_PER_AUTHOR, minLinks = 1 }, opts) {
  const groups = chunks(qids, 50);
  const rows = (
    await Promise.all(
      groups.map((group) =>
        sparql(
          `SELECT ?w ?a ?links (MAX(?in) AS ?inLanguage) WHERE {
            VALUES ?a { ${values(group)} }
            ?w wdt:P50 ?a; wikibase:sitelinks ?links .
            FILTER(?links >= ${minLinks})
            ${languageQid ? `OPTIONAL { ?w wdt:P407 wd:${languageQid} . BIND(1 AS ?in) }` : ""}
          } GROUP BY ?w ?a ?links`,
          opts
        )
      )
    )
  ).flat();
  const byWork = new Map();
  rows.forEach((r) => {
    if (!/^Q\d+$/.test(r.w)) return;
    if (!byWork.has(r.w)) byWork.set(r.w, { ...r, authors: [] });
    byWork.get(r.w).authors.push(r.a);
  });
  const perAuthorPicked = new Map();
  [...byWork.values()]
    .sort((x, y) => (Number(y.inLanguage) || 0) - (Number(x.inLanguage) || 0) || Number(y.links) - Number(x.links))
    .forEach((w) => {
      w.authors.forEach((a) => {
        const list = perAuthorPicked.get(a) || [];
        if (list.length < perAuthor) perAuthorPicked.set(a, [...list, w]);
      });
    });
  const picked = new Map();
  perAuthorPicked.forEach((list) => list.forEach((w) => picked.set(w.w, w)));
  if (!picked.size) return [];

  const details = await batched(
    [...picked.keys()],
    (batch) => `
      SELECT ?w (SAMPLE(?n) AS ?native) (SAMPLE(?e) AS ?en) (GROUP_CONCAT(DISTINCT ?al; separator="|") AS ?aliases)
             (MIN(YEAR(?d)) AS ?published) WHERE {
        VALUES ?w { ${values(batch)} }
        ${labelsFor("?w", langCode)}
        OPTIONAL { ?w wdt:P577 ?d }
      } GROUP BY ?w`,
    opts
  );
  const about = new Map(details.map((d) => [d.w, d]));
  return [...picked.values()].map((w) => ({
    id: w.w,
    qid: w.w,
    kind: "work",
    name: nameOf(about.get(w.w) || {}),
    years: { from: year(about.get(w.w)?.published) },
    authorIds: w.authors,
    source: "wikidata",
  }));
}

/** Names and spans of movements: inception (P571) or start (P580) to dissolution (P576) or end (P582). */
export async function movementDetails(qids, langCode, opts) {
  if (!qids.length) return [];
  const rows = await batched(
    qids,
    (batch) => `
      SELECT ?m (SAMPLE(?n) AS ?native) (SAMPLE(?e) AS ?en) (GROUP_CONCAT(DISTINCT ?al; separator="|") AS ?aliases)
             (MIN(YEAR(?s)) AS ?from) (MAX(YEAR(?t)) AS ?to) WHERE {
        VALUES ?m { ${values(batch)} }
        ${labelsFor("?m", langCode)}
        OPTIONAL { ?m wdt:P571|wdt:P580 ?s }
        OPTIONAL { ?m wdt:P576|wdt:P582 ?t }
      } GROUP BY ?m`,
    opts
  );
  return rows.map((r) => ({
    id: r.m,
    qid: r.m,
    kind: "movement",
    name: nameOf(r),
    years: { from: year(r.from), to: year(r.to) },
    source: "wikidata",
  }));
}

/**
 * The authors' Wikipedia article titles, per wiki ("kn", "en"): { kn: Map(title → qid) }.
 * One query per wiki with the site written in; a list of sites is several times slower.
 * A wiki whose query fails is just missing.
 */
export async function articleTitles(qids, wikis, opts) {
  const byWiki = {};
  await Promise.all(
    wikis.map(async (wiki) => {
      try {
        const rows = await batched(
          qids,
          (batch) => `
            SELECT ?a ?title WHERE {
              VALUES ?a { ${values(batch)} }
              ?article schema:about ?a; schema:isPartOf <https://${wiki}.wikipedia.org/>; schema:name ?title .
            }`,
          opts
        );
        byWiki[wiki] = new Map(rows.map((r) => [r.title, r.a]));
      } catch (error) {
        if (opts?.signal?.aborted) throw error;
      }
    })
  );
  return byWiki;
}

/* ------------------------------------------------------------------ */
/* Wikipedia: which of these writers' articles link to one another      */
/* ------------------------------------------------------------------ */

const MAX_WIKI_CALLS = 80;
const MENTIONS_PER_AUTHOR = 2;

/** One Wikipedia API call, tried twice; null when it still fails. */
async function askWikipedia(wiki, body, signal) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(`https://${wiki}.wikipedia.org/w/api.php`, { method: "POST", body, signal });
      if (response.ok) return await response.json();
    } catch (error) {
      if (signal?.aborted) throw error;
    }
    if (attempt === 0) await wait(1000);
  }
  return null;
}

/**
 * Pairs of authors whose Wikipedia articles link to each other's, on one wiki,
 * as [qidA, qidB, 1 or 2] (2 when each page links to the other).
 * `titles` is Map(title → qid). Asks 50 articles at a time which of the other
 * 50 they link to; POSTed, because 100 titles in Kannada script are too long for a URL.
 */
export async function wikipediaMentions(wiki, titles, { signal } = {}) {
  const list = [...titles.keys()];
  const groups = chunks(list, 50);
  const pairs = new Map();
  let calls = 0;
  const jobs = groups.flatMap((from) => groups.map((to) => [from, to]));
  // Four requests at a time: quick enough, and polite to Wikipedia.
  const worker = async () => {
    while (jobs.length) {
      const [from, to] = jobs.shift();
      let more = {};
      while (more && calls < MAX_WIKI_CALLS) {
        calls += 1;
        const body = new URLSearchParams({
          action: "query",
          format: "json",
          origin: "*",
          prop: "links",
          pllimit: "max",
          titles: from.join("|"),
          pltitles: to.join("|"),
          ...more,
        });
        const data = await askWikipedia(wiki, body, signal);
        if (!data) break; // this batch is lost; the others still count
        Object.values(data?.query?.pages || {}).forEach((page) =>
          (page.links || []).forEach((l) => {
            const a = titles.get(page.title);
            const b = titles.get(l.title);
            if (!a || !b || a === b) return;
            const key = a < b ? `${a}|${b}` : `${b}|${a}`;
            pairs.set(key, (pairs.get(key) || 0) + 1);
          })
        );
        more = data?.continue || null;
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return [...pairs].map(([key, count]) => [...key.split("|"), count]);
}

/* ------------------------------------------------------------------ */
/* Putting a map together                                              */
/* ------------------------------------------------------------------ */

/**
 * Influence and study links among the given authors, plus movements and
 * outside influencers worth adding: a movement or an outside writer counts
 * when at least `minShared` of the authors point to it.
 */
function linksFromRelations(relations, authorIds, { minShared = 2, maxOutside = 0 } = {}) {
  const inside = new Set(authorIds);
  const links = [];
  const movementVotes = new Map();
  const outsideVotes = new Map();
  relations.forEach(({ a, p, b }) => {
    if (!inside.has(a)) return;
    if (p === "P135") {
      movementVotes.set(b, (movementVotes.get(b) || 0) + 1);
      links.push({ from: a, to: b, type: "member_of", source: "wikidata" });
      return;
    }
    // "a influenced by b" is drawn b → a; "a student of b" stays a → b.
    const link = p === "P737" ? { from: b, to: a, type: "influenced", source: "wikidata" } : { from: a, to: b, type: "student_of", source: "wikidata" };
    links.push(link);
    if (!inside.has(b)) outsideVotes.set(b, (outsideVotes.get(b) || 0) + 1);
  });
  // On a big map a movement needs two members, or every stray label becomes a region.
  const movementFloor = Math.max(minShared, authorIds.length > 20 ? 2 : 1);
  const movements = [...movementVotes.entries()].filter(([, n]) => n >= movementFloor).map(([q]) => q);
  const outside = [...outsideVotes.entries()]
    .filter(([, n]) => n >= minShared)
    .sort((x, y) => y[1] - x[1])
    .slice(0, maxOutside)
    .map(([q]) => q);
  return { links, movements, outside };
}

const step = (onProgress, stage, counts) => onProgress?.({ stage, ...counts });

/**
 * Builds a whole map's graph for a set of authors: their details, works,
 * movements, influence links and Wikipedia mentions. `extraWorks` are works
 * that must be on the map (a reader's own books).
 */
async function assemble(authorIds, { languageQid, langCode, minShared, minWorkLinks = 1, extraWorks = [], onProgress, signal }) {
  const opts = { signal };
  const counts = { authors: authorIds.length, works: 0, movements: 0, links: 0 };
  step(onProgress, "relations", counts);
  const relations = await authorRelations(authorIds, opts);
  const { movements, outside } = linksFromRelations(relations, authorIds, { minShared, maxOutside: Math.ceil(authorIds.length / 10) });
  const everyone = [...authorIds, ...outside];
  const { links } = linksFromRelations(relations, everyone, { minShared });
  counts.authors = everyone.length;
  counts.movements = movements.length;
  counts.links = links.filter((l) => l.type !== "member_of" || movements.includes(l.to)).length;

  step(onProgress, "details", counts);
  const [authors, works, movementNodes] = await Promise.all([
    authorDetails(everyone, langCode, opts),
    worksOf(authorIds, { languageQid, langCode, minLinks: minWorkLinks }, opts),
    movementDetails(movements, langCode, opts),
  ]);
  const allWorks = [...works, ...extraWorks.filter((w) => !works.some((x) => x.id === w.id))];
  counts.works = allWorks.length;
  step(onProgress, "mentions", counts);

  const wikis = [...new Set([langCode, "en"].filter(Boolean))];
  let mentionLinks = [];
  try {
    const titles = await articleTitles(everyone, wikis, opts);
    const found = await Promise.all(wikis.map((w) => (titles[w]?.size ? wikipediaMentions(w, titles[w], { signal }) : [])));
    const strong = new Set(links.filter((l) => l.type !== "member_of").map((l) => [l.from, l.to].sort().join("|")));
    // How strongly each pair is tied: one point per page linking the other, on each wiki.
    const weight = new Map();
    found.flat().forEach(([a, b, count]) => {
      const key = `${a}|${b}`;
      if (!strong.has(key)) weight.set(key, (weight.get(key) || 0) + count);
    });
    // Famous writers' pages link to everyone; keep the strongest ties, two per author on average.
    mentionLinks = [...weight.entries()]
      .sort((x, y) => y[1] - x[1])
      .slice(0, everyone.length * MENTIONS_PER_AUTHOR)
      .map(([key]) => {
        const [a, b] = key.split("|");
        return { from: a, to: b, type: "mentioned", source: "wikipedia" };
      });
  } catch (error) {
    if (signal?.aborted) throw error;
    // Mentions are a bonus: a map without them is still a map.
  }

  const wrote = allWorks.flatMap((w) => (w.authorIds || []).filter((a) => everyone.includes(a)).map((a) => ({ from: a, to: w.id, type: "wrote", source: "wikidata" })));
  const graph = normalizeGraph({
    nodes: [...authors, ...allWorks, ...movementNodes],
    links: [...links, ...mentionLinks, ...wrote],
  });
  counts.links = graph.links.filter((l) => l.type !== "wrote" && l.type !== "member_of").length;
  step(onProgress, "done", counts);
  return graph;
}

/**
 * Generates a map's graph. `scope` is { kind: "language", qid, langCode },
 * { kind: "movement", qid, langCode? } or { kind: "library" } with `books`.
 * `size` is a key of SIZES. `onProgress` hears { stage, authors, works, movements, links }.
 */
export async function generateMap({ scope, size = "focused", books = [], onProgress, signal, sameTitle = defaultSameTitle }) {
  const limit = SIZES[size] || SIZES.focused;
  const opts = { signal };
  step(onProgress, "authors", { authors: 0, works: 0, movements: 0, links: 0 });

  if (scope.kind === "language") {
    const language = LANGUAGES.find((l) => l.qid === scope.qid) || { qid: scope.qid, code: scope.langCode, large: false };
    const authors = await writersInLanguage(language, limit, opts);
    // Famous writers of big languages have thousands of works; only read the widely covered ones.
    const minWorkLinks = language.large ? 3 : 1;
    return assemble(authors, { languageQid: language.qid, langCode: language.code || scope.langCode, minShared: 2, minWorkLinks, onProgress, signal });
  }

  if (scope.kind === "movement") {
    const authors = await writersInMovement(scope.qid, limit, opts);
    const graph = await assemble(authors, { langCode: scope.langCode, minShared: 1, minWorkLinks: 3, onProgress, signal });
    // The movement itself is always on its own map, with every member linked to it.
    if (!graph.nodes.some((n) => n.id === scope.qid)) {
      const [movement] = await movementDetails([scope.qid], scope.langCode, opts);
      if (movement) {
        const memberLinks = graph.nodes.filter((n) => n.kind === "author" && authors.includes(n.id)).map((n) => ({ from: n.id, to: scope.qid, type: "member_of", source: "wikidata" }));
        return normalizeGraph({ nodes: [...graph.nodes, movement], links: [...graph.links, ...memberLinks] });
      }
    }
    return graph;
  }

  if (scope.kind === "library") {
    const { authorIds, works } = await libraryWorks(books.slice(0, 150), { sameTitle, signal, onProgress });
    return assemble(authorIds.slice(0, limit), { langCode: scope.langCode, minShared: 1, extraWorks: works, onProgress, signal });
  }

  throw new Error(`Unknown map scope: ${scope.kind}`);
}

function defaultSameTitle(a, b) {
  const clean = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return clean(a) === clean(b);
}

/** The reader's books as Wikidata works, and their authors. Four lookups at a time. */
async function libraryWorks(books, { sameTitle, signal, onProgress }) {
  const found = new Map();
  let done = 0;
  const queue = [...books];
  const worker = async () => {
    while (queue.length) {
      if (signal?.aborted) return;
      const book = queue.shift();
      try {
        const [work] = await findWorks(book, sameTitle);
        if (work) found.set(work.id, work);
      } catch {
        /* a book Wikidata does not know is simply not on the map */
      }
      done += 1;
      step(onProgress, "library", { books: done, of: books.length, authors: 0, works: found.size, movements: 0, links: 0 });
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const authorCount = new Map();
  const works = [...found.values()].map((entity) => {
    const authorIds = (entity.claims?.P50 || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
    authorIds.forEach((a) => authorCount.set(a, (authorCount.get(a) || 0) + 1));
    const date = entity.claims?.P577?.[0]?.mainsnak?.datavalue?.value?.time;
    return {
      id: entity.id,
      qid: entity.id,
      kind: "work",
      name: {
        native: entity.labels?.kn?.value || "",
        en: entity.labels?.en?.value || "",
        aliases: [],
      },
      years: { from: date ? year(date.replace(/^\+/, "")) : undefined },
      authorIds,
      source: "wikidata",
    };
  });
  const authorIds = [...authorCount.entries()].sort((x, y) => y[1] - x[1]).map(([a]) => a);
  return { authorIds, works };
}

/**
 * One node's neighbourhood, for "grow from here": who influenced the author,
 * whom they influenced, their teachers and students, and the best-known
 * members of their movements. Returns a graph to merge into the map.
 */
export async function growFrom(qid, { langCode, limit = 15, signal } = {}) {
  const opts = { signal };
  const rows = await sparql(
    `SELECT ?x ?rel (SAMPLE(?m) AS ?movement) (MAX(?sl) AS ?links) WHERE {
      {
        wd:${qid} wdt:P737 ?x . BIND("influencedBy" AS ?rel)
      } UNION {
        ?x wdt:P737 wd:${qid} . BIND("influenced" AS ?rel)
      } UNION {
        wd:${qid} wdt:P1066 ?x . BIND("teacher" AS ?rel)
      } UNION {
        ?x wdt:P1066 wd:${qid} . BIND("student" AS ?rel)
      } UNION {
        wd:${qid} wdt:P135 ?m . ?x wdt:P135 ?m; wdt:P31 wd:Q5 . BIND("peer" AS ?rel)
      }
      # Without the hint the planner starts from every item's sitelinks and times out.
      ?x wikibase:sitelinks ?sl . hint:Prior hint:runLast true .
    } GROUP BY ?x ?rel ORDER BY DESC(?links) LIMIT ${limit * 3}`,
    opts
  );
  const picked = new Map();
  let peers = 0;
  rows.forEach((r) => {
    if (r.x === qid || !/^Q\d+$/.test(r.x) || picked.has(r.x) || picked.size >= limit) return;
    if (r.rel === "peer") {
      if (peers >= limit / 3) return;
      peers += 1;
    }
    picked.set(r.x, r);
  });
  const ids = [...picked.keys()];
  const movementIds = [...new Set([...picked.values()].filter((r) => r.rel === "peer").map((r) => r.movement))].filter((m) => /^Q\d+$/.test(m || ""));
  const [authors, movements] = await Promise.all([authorDetails(ids, langCode, opts), movementDetails(movementIds, langCode, opts)]);
  const LINK = {
    influencedBy: (x) => [{ from: x, to: qid, type: "influenced" }],
    influenced: (x) => [{ from: qid, to: x, type: "influenced" }],
    teacher: (x) => [{ from: qid, to: x, type: "student_of" }],
    student: (x) => [{ from: x, to: qid, type: "student_of" }],
    // A movement peer is linked through the movement they share, not to each other.
    peer: (x, r) => [
      { from: x, to: r.movement, type: "member_of" },
      { from: qid, to: r.movement, type: "member_of" },
    ],
  };
  const links = ids.flatMap((x) => LINK[picked.get(x).rel](x, picked.get(x)).map((l) => ({ ...l, source: "wikidata" })));
  return { nodes: [...authors, ...movements], links };
}
