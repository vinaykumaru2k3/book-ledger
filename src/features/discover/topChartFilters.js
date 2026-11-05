/**
 * Filtering rules for the Top Books charts. Open Library subject searches are
 * noisy (translations, textbooks, mis-tagged fiction), so each candidate is
 * checked before it earns a place in the chart.
 */
import { looksLikeReferenceBook, normalizeTitle } from "../../services/bookApi";

export const GENRES = [
  { id: "fantasy", label: "Fantasy", subjectKey: "fantasy" },
  { id: "science_fiction", label: "Sci-Fi", subjectKey: "science_fiction" },
  { id: "mystery", label: "Mystery", subjectKey: "detective_and_mystery_stories" },
  { id: "classics", label: "Classics", subjectKey: "classics" },
  { id: "self_help", label: "Self-Help", subjectKey: "self-help" },
  { id: "business", label: "Business", subjectKey: "business" },
  { id: "history", label: "History", subjectKey: "history" },
  { id: "biography", label: "Biography", subjectKey: "biography" },
  { id: "romance", label: "Romance", subjectKey: "romance" },
];

export function isProbablyEnglish(title, language = []) {
  if (language.length > 0 && !language.includes("eng")) {
    return false;
  }
  
  const lower = title.toLowerCase();
  
  const foreignPrefixes = [
    "el ", "la ", "los ", "las ", "un ", "una ", "uno ", "del ", "al ", 
    "le ", "les ", "des ", "une ", "du ", "et ", "dans ", "avec ",
    "das ", "der ", "die ", "ein ", "eine ", "und ", "mit ",
    "o ", "os ", "um ", "uma ", "com ", "para "
  ];
  
  if (foreignPrefixes.some(pref => lower.startsWith(pref))) {
    return false;
  }
  
  const foreignStopWords = [" y ", " de ", " con ", " par ", " pour ", " und ", " sur ", " del "];
  for (const word of foreignStopWords) {
    if (lower.includes(word)) {
      if (word === " y " && !lower.includes(" and ")) return false;
      if (word === " de " && !lower.includes(" of ") && !lower.includes(" the ")) return false;
      if (word === " con " && !lower.includes(" with ")) return false;
      if (word === " und " && !lower.includes(" and ")) return false;
      if (![" y ", " de ", " con ", " und "].includes(word)) return false;
    }
  }

  return true;
}

export function validateGenre(book, genreId) {
  const subjects = (book.subject || []).map(s => s.toLowerCase());
  const title = (book.title || "").toLowerCase();
  const matchWord = (arr, word) => arr.some(s => new RegExp(`\\b${word}\\b`, 'i').test(s));

  switch (genreId) {
    case "fantasy":
      return matchWord(subjects, "fantasy") || matchWord(subjects, "magic") || matchWord(subjects, "wizards") || 
             matchWord(subjects, "witches") || matchWord(subjects, "monsters") || matchWord(subjects, "dragons") || 
             matchWord(subjects, "fairy") || matchWord(subjects, "mythology");

    case "science_fiction":
      return matchWord(subjects, "science fiction") || matchWord(subjects, "sci-fi") || matchWord(subjects, "space") || 
             matchWord(subjects, "dystopian") || matchWord(subjects, "future") || matchWord(subjects, "aliens") || 
             matchWord(subjects, "robots") || matchWord(subjects, "time travel") || matchWord(subjects, "futurology") || 
             title.includes("space") || title.includes("star");

    case "mystery":
      return matchWord(subjects, "mystery") || matchWord(subjects, "detective") || matchWord(subjects, "crime") || 
             matchWord(subjects, "thriller") || matchWord(subjects, "suspense") || matchWord(subjects, "murder") ||
             matchWord(subjects, "espionage") || matchWord(subjects, "spy");

    case "classics":
      const pubYear = Number(book.first_publish_year);
      if (pubYear && pubYear > 1975) return false;
      return matchWord(subjects, "classics") || matchWord(subjects, "classic") || matchWord(subjects, "fiction") || 
             matchWord(subjects, "novels") || matchWord(subjects, "poetry") || matchWord(subjects, "drama");

    case "self_help":
      const isSelfHelp = matchWord(subjects, "self-help") || matchWord(subjects, "personal growth") || 
                         matchWord(subjects, "motivation") || matchWord(subjects, "success") || 
                         matchWord(subjects, "happiness") || matchWord(subjects, "habits") || 
                         matchWord(subjects, "self-actualization") ||
                         title.includes("habits") || title.includes("success") || title.includes("power of");
      if (!isSelfHelp) return false;
      if (matchWord(subjects, "fiction") || matchWord(subjects, "fantasy") || matchWord(subjects, "magic")) return false;
      return true;

    case "business":
      const isBusiness = matchWord(subjects, "business") || matchWord(subjects, "finance") || 
                         matchWord(subjects, "economics") || matchWord(subjects, "management") || 
                         matchWord(subjects, "marketing") || matchWord(subjects, "investing") || 
                         matchWord(subjects, "money") || matchWord(subjects, "entrepreneurship") ||
                         title.includes("think and grow");
      if (!isBusiness) return false;
      if (matchWord(subjects, "fiction") || matchWord(subjects, "fantasy") || matchWord(subjects, "magic")) return false;
      return true;

    case "history":
      const isHistory = matchWord(subjects, "history") || matchWord(subjects, "historical") || 
                        matchWord(subjects, "war") || matchWord(subjects, "revolution") || 
                        matchWord(subjects, "ancient") || matchWord(subjects, "politics") || 
                        matchWord(subjects, "civilization") || matchWord(subjects, "empire");
      if (!isHistory) return false;
      
      const hasFantasy = matchWord(subjects, "magic") || matchWord(subjects, "wizards") || 
                         matchWord(subjects, "ghosts") || matchWord(subjects, "monsters") || 
                         matchWord(subjects, "dragons") || matchWord(subjects, "elves") || 
                         matchWord(subjects, "vampires");
      if (hasFantasy) return false;
      
      if (matchWord(subjects, "fiction") && !matchWord(subjects, "historical fiction")) return false;
      if (matchWord(subjects, "investing") || matchWord(subjects, "securities") || matchWord(subjects, "personal finance")) return false;
      return true;

    case "biography":
      const isBio = matchWord(subjects, "biography") || matchWord(subjects, "memoir") || 
                    matchWord(subjects, "autobiography") || matchWord(subjects, "diaries") || 
                    matchWord(subjects, "letters") || matchWord(subjects, "biographies");
      if (!isBio) return false;
      if (matchWord(subjects, "fiction") || matchWord(subjects, "magic") || matchWord(subjects, "fantasy")) return false;
      return true;

    case "romance":
      return matchWord(subjects, "romance") || matchWord(subjects, "love stories") || matchWord(subjects, "romantic");

    default:
      return true;
  }
}


const MAX_PER_AUTHOR = 2;
const MIN_PAGES = 25; // below this it is a pamphlet
const CHART_SIZE = 50;

/**
 * Picks the chart from raw Open Library docs (ordered by popularity): one entry
 * per title, at most two per author, right genre, English, not a textbook,
 * with a cover. Returns the docs in rank order.
 */
export function curateChart(docs, genreId) {
  const seenKeys = new Set();
  const seenTitles = new Set();
  const perAuthor = {};
  const chart = [];

  for (const doc of docs) {
    if (!doc.key || !doc.title || seenKeys.has(doc.key)) continue;

    const title = normalizeTitle(doc.title);
    if (seenTitles.has(title)) continue;

    const author = doc.author_name?.[0] || "Unknown Author";
    if ((perAuthor[author] || 0) >= MAX_PER_AUTHOR) continue;

    if (!validateGenre(doc, genreId)) continue;
    if (!isProbablyEnglish(doc.title, doc.language)) continue;
    if (looksLikeReferenceBook(doc.title)) continue;
    if (!doc.cover_i) continue;
    if (doc.number_of_pages_median && doc.number_of_pages_median < MIN_PAGES) continue;

    seenKeys.add(doc.key);
    seenTitles.add(title);
    perAuthor[author] = (perAuthor[author] || 0) + 1;
    chart.push(doc);
    if (chart.length >= CHART_SIZE) break;
  }
  return chart;
}
