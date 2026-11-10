/**
 * The Top Books charts: which books belong in a genre, and in what order.
 *
 * Open Library's subject search is popularity-sorted but loose: a famous book
 * collects subject tags from dozens of editions and translations, so "Harry
 * Potter" turns up under science fiction and "Pride and Prejudice" under
 * history. Instead of trusting a single tag, each candidate's whole subject
 * list is scored against every genre, and it only enters a chart when that
 * genre is one of its dominant ones.
 */
import { itemFromOpenLibraryDoc, looksLikeReferenceBook } from "../../services/bookApi";
import { authorKey, isNotTheBook, titleKey } from "./recommendationsModel";

export const CANDIDATES = 120; // fetch plenty: many are filtered out
export const CHART_SIZE = 50;
const MAX_PER_AUTHOR = 2;
const MIN_PAGES = 40; // below this it is a pamphlet or a picture book
const MIN_SCORE = 4; // two subjects that name the genre outright, or more that hint at it
const DOMINANCE = 0.75; // and it must be close to the book's strongest rival genre, or ahead of it
const CLASSIC_UNTIL = 1965; // published at least sixty years ago
const RECENT_YEARS = 10;

export const CHART_FIELDS = [
  "key",
  "title",
  "author_name",
  "cover_i",
  "first_publish_year",
  "number_of_pages_median",
  "subject",
  "isbn",
  "language",
  "readinglog_count",
  "currently_reading_count",
  "ratings_average",
  "ratings_count",
  "editions",
  "editions.title",
  "editions.language",
].join(",");

// `kind` decides the rivals a genre competes with (fiction against fiction, nonfiction against nonfiction).
export const GENRES = [
  { id: "fantasy", label: "Fantasy", kind: "fiction", query: { subject: "fantasy" }, blurb: "Magic, quests and other worlds" },
  { id: "science_fiction", label: "Science fiction", kind: "fiction", query: { subject: "science_fiction" }, blurb: "Futures, far planets and what-ifs" },
  { id: "mystery", label: "Mystery & crime", kind: "fiction", query: { subject: "detective_and_mystery_stories" }, blurb: "Detectives, killers and the clue you missed" },
  { id: "romance", label: "Romance", kind: "fiction", query: { subject: "romance" }, blurb: "Love stories, old and new" },
  { id: "classics", label: "Classics", kind: "classic", query: { subject: "classic_literature" }, blurb: `Literature from before ${CLASSIC_UNTIL + 1} that readers still reach for` },
  { id: "indian", label: "Indian writing", kind: "indian", query: { q: 'subject:"indic fiction" OR subject:"india, fiction"' }, blurb: "Novels and stories from and about India" },
  // Nonfiction searches leave fiction out up front: famous novels carry "History" and "Biography" tags too.
  { id: "biography", label: "Biography", kind: "nonfiction", query: { q: "subject:biography -subject:fiction" }, blurb: "Lives, memoirs and autobiographies" },
  { id: "history", label: "History", kind: "nonfiction", query: { q: "subject:history -subject:fiction" }, blurb: "Empires, wars and the people who lived through them" },
  { id: "self_help", label: "Self-help", kind: "nonfiction", query: { q: 'subject:"self-help" -subject:fiction' }, blurb: "Habits, minds and better days" },
  { id: "business", label: "Business", kind: "nonfiction", query: { q: "subject:business -subject:fiction" }, blurb: "Money, work and building things" },
];

// Per genre: `core` subjects say it outright (worth 2); `support` subjects hint at it (worth 1).
const VOCAB = {
  fantasy: {
    core: /\bfantasy\b|fantastic fiction/,
    support: /\bmagic\b|wizard|witch|dragon|\belves\b|\belf\b|fairies|fairy tales|sorcer|mytholog|\bgods\b|\bquests?\b|imaginary wars/,
  },
  science_fiction: {
    core: /science[ -]?fiction|\bsci-?fi\b|dystopi|cyberpunk|space opera/,
    support:
      /space (travel|flight|ships?|warfare|colonies)|interplanetary|interstellar|\baliens?\b|extraterrestrial|\brobots?\b|artificial intelligence|time travel|life on other planets|androids?|post-?apocalyptic|human-alien|genetic engineering|virtual reality|\bmars\b/,
  },
  mystery: {
    core: /myster|detective|whodunit|crime fiction|police procedural|private investigators?/,
    support: /\bcrime\b|\bmurder|thriller|suspense|\bpolice\b|criminal investigation|espionage|\bspy\b|\bspies\b|kidnapping|\bmissing persons\b/,
  },
  romance: {
    core: /romance|love stories|romantic/,
    support: /man-woman relationships|courtship|\blove\b|dating|\bweddings?\b|first loves?/,
  },
  // Not a chart of its own: a rival, so ghost stories don't fill the fantasy chart.
  horror: {
    core: /horror|ghost stories|paranormal fiction/,
    support: /vampires|zombies|\bghosts\b|haunted|\bdemons?\b|serial murderers/,
  },
  self_help: {
    core: /self-help|self help|self-actualization|personal growth|self-realization|conduct of life/,
    support: /\bsuccess\b|happiness|\bhabits?\b|motivation|mindfulness|self-esteem|attitude|positive psychology|time management|change \(psychology\)|self-confidence/,
  },
  business: {
    core: /\bbusiness\b|management|entrepreneur|\binvest|\bfinance\b|economics|marketing|leadership/,
    support: /\bmoney\b|wealth|corporat|negotiation|strategic planning|\bstocks?\b|startup|\bselling\b|personal finance/,
  },
  history: {
    // "History and criticism" is literary criticism, not history.
    core: /\bhistory\b(?! and criticism)|historiography/,
    support: /\bwars?\b|civilization|\bancient\b|revolution|empire|antiquities|world war|medieval|politics and government|social conditions|military/,
  },
  biography: {
    core: /biograph|memoir|autobiograph/,
    support: /\bdiaries\b|correspondence|personal narratives|childhood and youth|\bfamilies\b/,
  },
  // Rivals only, so Plato, the Bible and "A Brief History of Time" don't count as history.
  philosophy: { core: /philosoph|ethics|metaphysics|stoic/, support: /political science|\bpower\b|existentialism|\blogic\b/ },
  religion: { core: /religio|bible|christian|theolog|spiritual|buddhis|hinduism|islam|\bgod\b|yoga/, support: /\bchurch|prayer|meditation|sacred|\bsex\b|sexual/ },
  science: {
    core: /\bscience\b(?![ -]?fiction)|physics|cosmology|astronomy|biology|evolution|mathematics|neuroscience/,
    support: /\buniverse\b|space and time|genetics|\bmedicine\b|\bherbs?\b/,
  },
  psychology: { core: /psycholog|persuasion|interpersonal relations|social influence/, support: /manipulat|\bmind\b|emotions|cognition|thought and thinking/ },
};

const RIVALS = {
  fiction: ["fantasy", "science_fiction", "mystery", "romance", "horror"],
  nonfiction: ["self_help", "business", "history", "biography", "philosophy", "religion", "science", "psychology"],
};

const FICTION = /fiction|\bnovels?\b|short stories|\bstories\b|ficción|romans, nouvelles|juvenile literature|\bplays\b|\bdrama\b|\bpoetry\b/;
const LITERATURE = /fiction|\bnovels?\b|short stories|\bplays\b|\bdrama\b|\bpoetry\b|classic|literature/;
const INDIA = /\bindia\b|\bindic\b|\bindian (fiction|literature|authors?)|bengal|kerala|karnataka|bombay|mumbai|delhi|calcutta|kolkata|madras|chennai|bangalore|bengaluru|punjab|hindu|kannada|hindi|tamil|telugu|malayalam|urdu/;

// Study aids that borrow a famous title ("Slaughterhouse Five (Monarch Notes)").
const STUDY_AID = /\bnotes\b|commentary|\bcriticism\b|\bguide to\b/i;

const subjectsOf = (doc) => [...new Set((doc.subject || []).map((s) => s.toLowerCase().trim()))];

/** How strongly a book's subjects point at each genre. */
export function genreScores(subjects) {
  const scores = {};
  for (const [genre, { core, support }] of Object.entries(VOCAB)) {
    scores[genre] = subjects.reduce((sum, s) => sum + (core.test(s) ? 2 : support.test(s) ? 1 : 0), 0);
  }
  return scores;
}

/** Is this genre one of the book's dominant ones, not a stray tag? */
function dominates(scores, genreId, rivals) {
  const own = scores[genreId];
  const strongestRival = Math.max(0, ...rivals.filter((g) => g !== genreId).map((g) => scores[g]));
  return own >= MIN_SCORE && own >= strongestRival * DOMINANCE;
}

/** Does this Open Library doc really belong in the genre's chart? */
export function belongsTo(doc, genre) {
  const subjects = subjectsOf(doc);
  const fiction = subjects.filter((s) => FICTION.test(s)).length;
  const year = Number(doc.first_publish_year) || 0;

  switch (genre.kind) {
    case "fiction":
      return dominates(genreScores(subjects), genre.id, RIVALS.fiction);
    case "nonfiction": {
      // A novel tagged "History" (or "Biography") is still a novel.
      if (fiction > Math.max(2, subjects.length * 0.1)) return false;
      const scores = genreScores(subjects);
      if (Math.max(...RIVALS.fiction.map((g) => scores[g])) > scores[genre.id]) return false;
      return dominates(scores, genre.id, RIVALS.nonfiction);
    }
    case "classic":
      return year > 0 && year <= CLASSIC_UNTIL && fiction > 0 && subjects.some((s) => LITERATURE.test(s));
    case "indian":
      // "Translations into Hindi" says where a book sold, not where it is from.
      return fiction > 0 && subjects.filter((s) => INDIA.test(s) && !/translat/.test(s)).length >= 2;
    default:
      return true;
  }
}

/**
 * The English edition's title when the work's own title is in another
 * language ("Het Achterhuis" is shown as "The Diary of a Young Girl"), with
 * cataloguers' notes like "[12 stories]" removed.
 */
export function displayTitle(doc) {
  const edition = doc.editions?.docs?.[0];
  const english = edition?.language?.includes("eng") ? edition.title : "";
  // Keep an English original ("And Then There Were None", not a reprint's old title), and
  // never take an edition titled after the author ("Machiavelli" for "The Prince").
  const useEdition =
    english &&
    !(LATIN.test(doc.title) && ENGLISH_WORDS.test(doc.title)) &&
    !(doc.author_name || []).some((name) => authorKey(name).includes(authorKey(english)));
  return cleanTitle(useEdition ? english : doc.title);
}

const LATIN = /^[\p{Script=Latin}\p{N}\p{P}\p{Z}\p{S}\p{M}]*$/u;
const ENGLISH_WORDS =
  /\b(the|and|of|a|an|to|in|is|my|with|for|on|at|from|how|you|your|i|it|we|are|this|that|there|what|who|all|one|none|were|was|me|man|life|world|story|love|war|time|day|night|girl|boy|house|home|little|great|new|last|good|art|history|rich|power|think|habits|mind)\b/i;

/** Cataloguers' notes ("[12 stories]", "(Collector's Edition)", " - Complete Authorized Edition") removed. */
export function cleanTitle(title) {
  return title
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/\s*\([^)]*\b(edition|collection|classics?|illustrated|unabridged)\b[^)]*\)/gi, "")
    .replace(/\s+-\s+[^-]*\b(edition|collection)\b.*$/i, "")
    .replace(/\s+(complete collection|collector's edition)$/i, "")
    .trim();
}

/** Has the work been published in English? (Every chart entry should be readable here.) */
function hasEnglishEdition(doc) {
  const edition = doc.editions?.docs?.[0];
  if (edition?.language) return edition.language.includes("eng");
  return !doc.language?.length || doc.language.includes("eng");
}

/**
 * The chart for a genre from raw Open Library docs (ordered by popularity):
 * right genre, in English, one entry per title, at most two per author, no
 * omnibuses, summaries or reference books, with a cover. Returns Discover
 * items in popularity order, ranked.
 */
export function curateChart(docs, genreId) {
  const genre = GENRES.find((g) => g.id === genreId);
  if (!genre) return [];
  const seenTitles = new Set();
  const perAuthor = {};
  const chart = [];

  for (const doc of docs) {
    if (!doc.key || !doc.title || !doc.cover_i) continue;
    const title = displayTitle(doc);
    if (title.includes(" / ") || isNotTheBook(title) || looksLikeReferenceBook(title) || STUDY_AID.test(title)) continue;
    if (doc.number_of_pages_median && doc.number_of_pages_median < MIN_PAGES) continue;
    if (!hasEnglishEdition(doc) || !belongsTo(doc, genre)) continue;

    const key = titleKey(title);
    const author = authorKey(doc.author_name?.[0] || "");
    if (seenTitles.has(key) || (author && (perAuthor[author] || 0) >= MAX_PER_AUTHOR)) continue;

    seenTitles.add(key);
    perAuthor[author] = (perAuthor[author] || 0) + 1;
    chart.push({
      ...itemFromOpenLibraryDoc({ ...doc, title }),
      readers: doc.readinglog_count || 0,
      readingNow: doc.currently_reading_count || 0,
      ratingCount: doc.ratings_count || 0,
      rank: chart.length + 1,
    });
    if (chart.length >= CHART_SIZE) break;
  }
  return chart;
}

// A rating pulled toward the average until enough readers have rated it, so
// a 5.0 from three people doesn't beat a 4.4 from four hundred.
const PRIOR_MEAN = 3.8;
const PRIOR_WEIGHT = 40;
export function lovedScore(item) {
  const count = item.ratingCount || 0;
  const average = item.rating || PRIOR_MEAN;
  return (average * count + PRIOR_MEAN * PRIOR_WEIGHT) / (count + PRIOR_WEIGHT);
}

export const CHART_MODES = [
  { id: "read", label: "Most read" },
  { id: "loved", label: "Best loved" },
  { id: "recent", label: "Recent" },
];

/** The chart reordered for a mode, re-ranked from 1. */
export function chartFor(chart, mode, now = new Date()) {
  let list = chart;
  if (mode === "loved") {
    list = [...chart].sort((a, b) => lovedScore(b) - lovedScore(a));
  } else if (mode === "recent") {
    const since = now.getFullYear() - RECENT_YEARS;
    list = chart.filter((item) => Number(item.publishedYear) >= since);
  }
  return list.map((item, index) => ({ ...item, rank: index + 1 }));
}

export const recentSince = (now = new Date()) => now.getFullYear() - RECENT_YEARS;
