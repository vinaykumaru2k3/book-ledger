// Dev helper: runs the recommendation algorithm against the live Open Library
// for a sample library and prints the result. `npx vite-node scripts/try-recommendations.mjs`
import { normalizeBook } from "../src/domain/book.js";
import { searchOpenLibrary } from "../src/services/bookApi.js";
import { buildTasteProfile, groupRecommendations, pickRecommendations, planQueries, PER_QUERY } from "../src/features/discover/recommendationsModel.js";

const FIELDS =
  "key,title,author_name,cover_i,first_publish_year,number_of_pages_median,subject,isbn,language,ratings_average,ratings_count,readinglog_count";

const library = [
  { title: "Sapiens", author: "Yuval Noah Harari", status: "want", tags: ["History"] },
  { title: "The Hobbit", author: "J. R. R. Tolkien", status: "reading", tags: ["Fantasy"] },
  { title: "Emma", author: "Jane Austen", status: "reading", tags: ["Classics", "Romance"] },
  { title: "Dune", author: "Frank Herbert", status: "done", rating: 5, favorite: true, tags: ["Science Fiction"] },
  { title: "1984", author: "George Orwell", status: "done", rating: 4, tags: ["Classics", "Dystopia"] },
  { title: "ಕರ್ವಾಲೋ", author: "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ", status: "done", rating: 5, favorite: true },
  { title: "ಸಂಸ್ಕಾರ", author: "ಯು. ಆರ್. ಅನಂತಮೂರ್ತಿ", status: "reading" },
  { title: "ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು", author: "ಕೆ. ಶಿವರಾಮ ಕಾರಂತ", status: "want" },
  { title: "Kim", author: "Rudyard Kipling", status: "want", tags: ["Adventure"] },
].map((b, i) => normalizeBook({ id: String(i), ...b }));

const profile = buildTasteProfile(library);
console.log("Authors:", profile.authors.map((a) => `${a.name} ${a.score}`).join(" | "));
console.log("Genres:", profile.genres.map((g) => `${g.name} ${g.score}`).join(" | "));
console.log("Scripts:", profile.scripts.map((s) => s.name).join(", "));
const queries = planQueries(profile);
console.log("\nQueries:", queries.map((q) => `${q.kind}:${q.value}`).join(" | "));
const results = await Promise.all(queries.map(async (query) => ({ query, docs: await searchOpenLibrary({ ...query.params, fields: FIELDS }, PER_QUERY) })));
const picks = pickRecommendations(results, library, { disliked: profile.disliked, readerScripts: new Set(profile.scripts.map((x) => x.script)) });
const { top, rows } = groupRecommendations(picks);
console.log(`\nTop pick: ${top?.title} by ${top?.author} (${top?.reason}) score ${top?.score}`);
rows.forEach((row) => console.log(`\n[${row.kind}] ${row.label}: ${row.reason}\n  ` + row.items.map((i) => `${i.title} by ${i.primaryAuthor}${i.rating ? ` ★${i.rating}` : ""}${i.coverUrl ? "" : " (no cover)"}`).join("\n  ")));
