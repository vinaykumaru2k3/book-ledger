/**
 * How recommendations are chosen. Pure functions (randomness is injectable) so
 * the logic can be tested without the network.
 *
 * 1. `buildTasteProfile` ranks the authors and genres in your library.
 * 2. `planQueries` picks a few of them (or popular subjects for an empty library).
 * 3. After the catalogue answers, `pickRecommendations` drops what you own,
 *    duplicates, textbooks and coverless editions.
 */
import { genreLabels, isInLibrary } from "../../domain/library";
import { itemFromOpenLibraryDoc, looksLikeReferenceBook, normalizeTitle } from "../../services/bookApi";

const FALLBACK_SUBJECTS = ["Fantasy", "Science Fiction", "Self-Help", "History", "Mystery"];
const QUERIES_PER_KIND = 3;
const MAX_PER_AUTHOR = 2;
const RESULT_COUNT = 8;

export function shuffled(list, random = Math.random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const rankByCount = (counts) =>
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

export function buildTasteProfile(books) {
  const authorCounts = {};
  const genreCounts = {};

  books.forEach((book) => {
    const author = book.author?.trim();
    if (author) authorCounts[author] = (authorCounts[author] || 0) + 1;
    genreLabels(book).forEach((genre) => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
  });

  return {
    topAuthors: rankByCount(authorCounts),
    topGenres: rankByCount(genreCounts),
    bookCount: books.length,
    /** A book from your library that explains why this author/genre was chosen. */
    inspiredBy: (kind, key) =>
      kind === "author"
        ? books.find((book) => book.author?.trim() === key) || null
        : books.find((book) => genreLabels(book).includes(key.toLowerCase())) || null,
  };
}

/** `[{ param, value, reason, inspiringBook }]`: what to ask Open Library. */
export function planQueries(profile, random = Math.random) {
  const queries = [
    ...shuffled(profile.topAuthors, random).slice(0, QUERIES_PER_KIND).map((author) => ({
      param: "author",
      value: author,
      reason: `Written by ${author}`,
      inspiringBook: profile.inspiredBy("author", author),
    })),
    ...shuffled(profile.topGenres, random).slice(0, QUERIES_PER_KIND).map((genre) => ({
      param: "subject",
      value: genre,
      reason: `In the genre "${genre}"`,
      inspiringBook: profile.inspiredBy("genre", genre),
    })),
  ];

  if (queries.length) return queries;
  return shuffled(FALLBACK_SUBJECTS, random)
    .slice(0, QUERIES_PER_KIND)
    .map((subject) => ({ param: "subject", value: subject, reason: `Popular in ${subject}`, inspiringBook: null }));
}

/**
 * `results` is an array (one per query) of `{ query, docs }`. Returns up to
 * `RESULT_COUNT` shuffled recommendation items the reader does not already own.
 */
export function pickRecommendations(results, books, random = Math.random) {
  const seenKeys = new Set();
  const seenTitles = new Set();
  const perAuthor = {};
  const picks = [];

  results.forEach(({ query, docs }) => {
    docs.forEach((doc) => {
      if (!doc.key || !doc.title || seenKeys.has(doc.key)) return;
      const item = itemFromOpenLibraryDoc(doc);
      if (isInLibrary(books, item.title, item.author)) return;

      const title = normalizeTitle(item.title);
      if (seenTitles.has(title)) return;
      if ((perAuthor[item.primaryAuthor] || 0) >= MAX_PER_AUTHOR) return;
      if (looksLikeReferenceBook(item.title)) return;
      if (!item.coverUrl) return;

      seenKeys.add(doc.key);
      seenTitles.add(title);
      perAuthor[item.primaryAuthor] = (perAuthor[item.primaryAuthor] || 0) + 1;
      picks.push({ ...item, reason: query.reason, inspiringBook: query.inspiringBook });
    });
  });

  return shuffled(picks, random).slice(0, RESULT_COUNT);
}
