/**
 * How recommendations are chosen. Pure functions (randomness is injectable) so
 * the logic can be tested without the network.
 *
 * 1. `buildTasteProfile` scores every author, genre and writing system in the
 *    library by how much you liked those books: ratings, favourites and having
 *    finished them count; low ratings count against.
 * 2. `planQueries` picks the strongest authors and genres (weighted, so the
 *    list varies a little between refreshes) and one author per non-Latin
 *    script you read, so books in your languages are not crowded out.
 * 3. `pickRecommendations` drops what you own, what you dismissed, books by
 *    authors you rated poorly, reference books, and author results that are
 *    not really by that author; then ranks the rest by how well they match,
 *    how widely read and well rated they are, with a touch of variety.
 * 4. `groupRecommendations` arranges them as a top pick plus themed rows.
 */
import { genreLabels } from "../../domain/library";
import { langOf } from "../../shared/lib/script";
import { itemFromOpenLibraryDoc, looksLikeReferenceBook, normalizeTitle } from "../../services/bookApi";

const FALLBACK_SUBJECTS = ["Fantasy", "Science Fiction", "Mystery", "Historical Fiction", "Classics", "Romance"];
const AUTHOR_QUERIES = 3;
const MIN_SHARE = { author: 0.15, genre: 0.3 }; // ignore weak signals relative to your strongest
const GENRE_QUERIES = 3;
const LANGUAGE_QUERIES = 2;
const MAX_PER_AUTHOR = 2;
const RESULT_COUNT = 24;
const ROW_MINIMUM = 3; // every row (e.g. a language) keeps a few places even if others score higher
export const PER_QUERY = 12;

// Open Library language codes for the scripts we can recognise in titles.
const SCRIPT_CODES = { kn: "kan", hi: "hin", ta: "tam", te: "tel", ml: "mal", bn: "ben", gu: "guj", pa: "pan", ar: "ara", ja: "jpn", ko: "kor", zh: "chi", ru: "rus", el: "gre" };

// Retellings, summaries and companions rather than the book itself.
const DERIVATIVE = /\b(adaptation|adapted|summary|study guide|sparknotes|cliffs ?notes|analysis of|critical essays|companion to|abridged|retold|readers? guide)\b/i;

// Dictionaries, lexicons and grammars, in English and Indian languages.
const REFERENCE = /dictionary|encyclopa?edia|lexicon|grammar|thesaurus|ನಿಘಂಟು|ಕೋಶ|शब्दकोश|कोश/i;
// A later book in a series ("Book 3", "#2", "Volume 2"): only worth suggesting from the author's own row.
const SEQUEL_NUMBER = /(book|volume|vol|part|#)\s*(\d+|two|three|four|five|six|seven)/i;

// Magazine and journal issues ("issue 21-22", Kannada "ಸಂಚಿಕೆ", Hindi "अंक").
const PERIODICAL = /\b(issue|journal|magazine|bulletin|newsletter|vol\.?|volume \d)\b|ಸಂಚಿಕೆ|अंक/i;
// Titles written only in Latin letters (with digits, punctuation and accents).
const LATIN_ONLY = /^[\p{Script=Latin}\p{N}\p{P}\p{Z}\p{S}\p{M}]*$/u;

const SCRIPT_NAMES = {
  kn: "Kannada",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  bn: "Bengali",
  gu: "Gujarati",
  pa: "Punjabi",
  ar: "Arabic",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ru: "Russian",
  el: "Greek",
};

// Tags too broad to say much about taste: they still count, but only a little.
const GENERIC_GENRES = new Set(["fiction", "nonfiction", "non-fiction", "general", "novel", "novels", "literature", "fiction general", "books"]);
// Language names used as tags ("Kannada") describe the language, not the genre.
const LANGUAGE_TAGS = new Set(["english", ...Object.values(SCRIPT_NAMES).map((name) => name.toLowerCase())]);

export function shuffled(list, random = Math.random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * How strongly a book speaks for your taste. Finishing, loving and rating a
 * book raise it; a low rating makes it negative (a signal to avoid).
 */
export function tasteWeight(book) {
  let weight = { done: 1, reading: 0.8, want: 0.4 }[book.status] ?? 0.4;
  if (book.rating) weight += { 5: 2, 4: 1, 3: 0, 2: -1.6, 1: -2.6 }[Math.round(book.rating)] ?? 0;
  if (book.favorite) weight += 1.5;
  return Math.round(weight * 10) / 10;
}

/** An author name reduced for comparison: "J.R.R. Tolkien" and "J. R. R. Tolkien" match. */
export const authorKey = (name = "") => normalizeTitle(name).replace(/\s+/g, "");

/** A summary, retelling, dictionary or magazine issue rather than a book to read. */
export const isNotTheBook = (title = "") => DERIVATIVE.test(title) || REFERENCE.test(title) || PERIODICAL.test(title);

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const below100 = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`);
/** Numbers spelled the way titles use them: 1984 -> "nineteen eighty four", 451 -> "four hundred fifty one". */
function spell(n) {
  if (n < 100) return below100(n);
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${below100(n % 100)}` : ""}`;
  if (n >= 1100 && n < 2000) return `${below100(Math.floor(n / 100))} ${n % 100 ? below100(n % 100) : "hundred"}`;
  return String(n);
}
/** A title for ownership checks: subtitle dropped, numbers spelled out, leading article ignored. */
export function titleKey(title = "") {
  return normalizeTitle(title.split(/[:;]/)[0].replace(/\d+/g, (d) => ` ${spell(Number(d))} `).replace(/-/g, " "))
    .replace(/^(the|a|an) /, "");
}
const rank = (scores) =>
  Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, score]) => ({ name, score }));

export function buildTasteProfile(books) {
  const authorScores = {};
  const genreScores = {};
  const scriptAuthors = {};
  const best = {};

  books.forEach((book) => {
    const weight = tasteWeight(book);
    const author = book.author?.trim();
    if (author) {
      authorScores[author] = (authorScores[author] || 0) + weight;
      const script = langOf(book.title || "") || langOf(author);
      if (script) {
        scriptAuthors[script] = scriptAuthors[script] || {};
        scriptAuthors[script][author] = (scriptAuthors[script][author] || 0) + weight;
      }
    }
    genreLabels(book).forEach((genre) => {
      if (LANGUAGE_TAGS.has(genre)) return;
      genreScores[genre] = (genreScores[genre] || 0) + weight * (GENERIC_GENRES.has(genre) ? 0.25 : 1);
    });
    // Remember the best-loved book behind each author and genre, to explain picks.
    [`author:${author}`, ...genreLabels(book).map((g) => `genre:${g}`)].forEach((key) => {
      if (!best[key] || weight > best[key].weight) best[key] = { book, weight };
    });
  });

  const disliked = new Set(
    Object.entries(authorScores)
      .filter(([, score]) => score < 0)
      .map(([name]) => authorKey(name))
  );

  return {
    authors: rank(authorScores),
    genres: rank(genreScores),
    scripts: Object.entries(scriptAuthors)
      .map(([script, scores]) => ({ script, name: SCRIPT_NAMES[script] || script, authors: rank(scores) }))
      .filter((entry) => entry.authors.length)
      .sort((a, b) => b.authors[0].score - a.authors[0].score),
    disliked,
    bookCount: books.length,
    /** The best-loved book from your library behind an author or genre. */
    inspiredBy: (kind, key) => best[`${kind}:${kind === "genre" ? key.toLowerCase() : key}`]?.book || null,
    // Kept for callers that only want the ranked names.
    get topAuthors() {
      return this.authors.map((a) => a.name);
    },
    get topGenres() {
      return this.genres.map((g) => g.name);
    },
  };
}

/** Why an author or genre was chosen, worded by what you did with the book behind it. */
export function reasonFor(book, fallback) {
  if (!book) return fallback;
  if (book.favorite || book.rating >= 4 || (book.status === "done" && !(book.rating > 0 && book.rating < 3))) return `Because you loved ${book.title}`;
  if (book.status === "reading") return `While you're reading ${book.title}`;
  if (book.status === "want") return `Since ${book.title} is on your list`;
  return `Because you read ${book.title}`;
}

/** Weighted sampling without replacement: stronger entries are likelier, never certain. */
export function weightedPick(entries, count, random = Math.random) {
  const pool = [...entries];
  const picked = [];
  while (picked.length < count && pool.length) {
    const total = pool.reduce((sum, e) => sum + e.score, 0);
    let target = random() * total;
    let index = pool.findIndex((e) => (target -= e.score) <= 0);
    if (index < 0) index = pool.length - 1;
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

const titleCase = (text) => text.replace(/\b\p{L}/gu, (c) => c.toUpperCase());

/**
 * `[{ kind, param, value, label, reason, inspiringBook, weight, params }]`:
 * what to ask Open Library. `weight` (0 to 1) is how strongly it reflects your taste.
 */
export function planQueries(profile, random = Math.random) {
  const topAuthor = profile.authors[0]?.score || 1;
  const topGenre = profile.genres[0]?.score || 1;
  const queries = [];
  const usedAuthors = new Set();

  const strongAuthors = profile.authors.slice(0, 8).filter((a) => a.score >= topAuthor * MIN_SHARE.author);
  const strongGenres = profile.genres.slice(0, 8).filter((g) => g.score >= topGenre * MIN_SHARE.genre);

  weightedPick(strongAuthors, AUTHOR_QUERIES, random).forEach(({ name, score }) => {
    usedAuthors.add(name);
    const inspiringBook = profile.inspiredBy("author", name);
    queries.push({
      kind: "author",
      value: name,
      label: name,
      reason: reasonFor(inspiringBook, `More by ${name}`),
      inspiringBook,
      weight: Math.min(score / topAuthor, 1),
      params: { author: name },
    });
  });

  // One author for each non-Latin script you read, so those books get a row too.
  profile.scripts.slice(0, LANGUAGE_QUERIES).forEach(({ script, name: language, authors }) => {
    const pick = authors.find((a) => !usedAuthors.has(a.name));
    if (pick) {
      usedAuthors.add(pick.name);
      queries.push({
        kind: "language",
        value: pick.name,
        label: language,
        group: `language:${script}`,
        reason: `In ${language}, like ${pick.name}`,
        inspiringBook: profile.inspiredBy("author", pick.name),
        weight: 0.75,
        params: { author: pick.name },
      });
    }
    if (SCRIPT_CODES[script]) {
      queries.push({
        kind: "catalogue",
        value: language,
        label: language,
        group: `language:${script}`,
        script,
        reason: `Recently catalogued in ${language}`,
        inspiringBook: null,
        weight: 0.45,
        params: { q: `language:${SCRIPT_CODES[script]}`, sort: "new" },
      });
    }
  });

  weightedPick(strongGenres, GENRE_QUERIES, random).forEach(({ name, score }) => {
    queries.push({
      kind: "genre",
      value: name,
      label: titleCase(name),
      reason: `Loved in ${titleCase(name)}`,
      inspiringBook: profile.inspiredBy("genre", name),
      weight: Math.min(score / topGenre, 1) * 0.85,
      params: { subject: name },
    });
  });

  if (queries.length) return queries;
  return shuffled(FALLBACK_SUBJECTS, random)
    .slice(0, 4)
    .map((subject) => ({
      kind: "popular",
      value: subject,
      label: subject,
      reason: `Widely read in ${subject}`,
      inspiringBook: null,
      weight: 0.5,
      params: { subject, sort: "readinglog" },
    }));
}

/** Is a catalogue book already in the library? Forgiving about subtitles, "&" and co-authors. */
export function alreadyOwned(books, item) {
  // An omnibus ("Animal Farm / Nineteen Eighty-Four") counts as owned if any part is.
  const titles = item.title.split(" / ").map(titleKey);
  const authors = item.author.split(",").map(authorKey);
  return books.some((book) => {
    if (!titles.includes(titleKey(book.title || ""))) return false;
    const owned = authorKey(book.author || "");
    return !owned || authors.some((a) => a === owned || a.includes(owned) || owned.includes(a));
  });
}

/** Is this a later book in a series (book 2 or beyond)? */
export function isSequel(title) {
  const match = title.match(SEQUEL_NUMBER);
  if (!match) return false;
  const value = match[2].toLowerCase();
  const number = Number(value) || ["one", "two", "three", "four", "five", "six", "seven"].indexOf(value) + 1;
  return number > 1;
}

/** Does a result really come from the author we asked about? (Search is fuzzy.) */
function byAuthor(item, author) {
  const wanted = authorKey(author);
  const surname = normalizeTitle(author).split(" ").pop() || "";
  return item.author.split(",").some((name) => {
    const key = authorKey(name);
    return key === wanted || key.includes(wanted) || wanted.includes(key) || (surname.length > 3 && key.endsWith(surname));
  });
}

/**
 * `results` is an array (one per query) of `{ query, docs }`. Returns up to
 * `RESULT_COUNT` items, best match first, each with `reason`, `kind`,
 * `label`, `inspiringBook` and `score`.
 */
export function pickRecommendations(results, books, { random = Math.random, hidden = new Set(), disliked = new Set(), readerScripts = new Set() } = {}) {
  const byTitle = new Map();
  const readerLanguages = new Set(["eng", ...[...readerScripts].map((script) => SCRIPT_CODES[script]).filter(Boolean)]);

  results.forEach(({ query, docs }) => {
    docs.forEach((doc, position) => {
      if (!doc.key || !doc.title || hidden.has(doc.key)) return;
      const item = itemFromOpenLibraryDoc(doc);
      const title = normalizeTitle(item.title);
      if (!title || alreadyOwned(books, item) || looksLikeReferenceBook(item.title) || DERIVATIVE.test(item.title)) return;
      if (query.script && langOf(item.title) !== query.script) return; // keep only books written in that script
      if (PERIODICAL.test(item.title) || REFERENCE.test(item.title)) return;
      if (query.kind !== "author" && isSequel(item.title)) return;
      // An edition in a language you read (English, or one of your scripts).
      if (item.languages?.length && !item.languages.some((code) => readerLanguages.has(code))) return;
      // Only titles you can read: Latin script, or a script you already read in.
      if (!LATIN_ONLY.test(item.title) && !readerScripts.has(langOf(item.title))) return;
      if (disliked.has(authorKey(item.primaryAuthor))) return;
      if (query.kind === "author" || query.kind === "language") {
        if (!byAuthor(item, query.value)) return;
        if (title.replace(/\s+/g, "") === authorKey(query.value)) return; // a book *about* the author, named after them
      }

      const score =
        query.weight * 3 +
        Math.log10(1 + item.readers) * 0.45 +
        (item.rating ? item.rating - 3.5 : 0) +
        (item.coverUrl ? 0.4 : 0) +
        (1 - position / PER_QUERY) * 0.5 +
        random() * 0.6;

      const existing = byTitle.get(title);
      if (existing) {
        existing.bonus += 0.8; // found by more than one of your tastes
        if (score > existing.base) Object.assign(existing, { base: score, item, query });
        return;
      }
      byTitle.set(title, { item, query, base: score, bonus: 0 });
    });
  });

  const perAuthor = {};
  const ranked = [...byTitle.values()]
    .map((entry) => ({ ...entry, score: entry.base + entry.bonus, group: entry.query.group || `${entry.query.kind}:${entry.query.value}` }))
    .sort((a, b) => b.score - a.score)
    .filter(({ item }) => {
      const key = authorKey(item.primaryAuthor);
      perAuthor[key] = (perAuthor[key] || 0) + 1;
      return perAuthor[key] <= MAX_PER_AUTHOR;
    });

  // Give every row its best few first, then fill the rest by score.
  const perGroup = {};
  const reserved = new Set(
    ranked.filter((entry) => (perGroup[entry.group] = (perGroup[entry.group] || 0) + 1) <= ROW_MINIMUM)
  );
  const chosen = [...reserved, ...ranked.filter((entry) => !reserved.has(entry))].slice(0, RESULT_COUNT);

  return chosen
    .sort((a, b) => b.score - a.score)
    .map(({ item, query, score }) => ({
      ...item,
      reason: query.reason,
      kind: query.kind,
      label: query.label,
      queryKey: query.group || `${query.kind}:${query.value}`,
      inspiringBook: query.inspiringBook,
      score: Math.round(score * 100) / 100,
    }));
}

/**
 * Arranges ranked picks for the page: the single best match as the top pick,
 * then one row per query (author, language, genre), strongest rows first.
 */
export function groupRecommendations(picks) {
  if (!picks.length) return { top: null, rows: [] };
  const [top, ...rest] = picks;
  const rows = new Map();
  rest.forEach((pick) => {
    if (!rows.has(pick.queryKey)) rows.set(pick.queryKey, { key: pick.queryKey, kind: pick.kind, label: pick.label, reason: pick.reason, inspiringBook: pick.inspiringBook, items: [] });
    rows.get(pick.queryKey).items.push(pick);
  });
  return {
    top,
    rows: [...rows.values()].filter((row) => row.items.length).sort((a, b) => b.items[0].score - a.items[0].score),
  };
}
