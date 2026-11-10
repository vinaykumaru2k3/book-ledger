import { describe, expect, it } from "vitest";
import { normalizeBook } from "../../domain/book";
import { normalizeTitle } from "../../services/bookApi";
import {
  alreadyOwned,
  buildTasteProfile,
  groupRecommendations,
  pickRecommendations,
  planQueries,
  reasonFor,
  isSequel,
  shuffled,
  tasteWeight,
  titleKey,
  weightedPick,
} from "./recommendationsModel";
import { curateChart } from "./topChartFilters";

const book = (fields) => normalizeBook({ status: "done", ...fields });
const owned = [
  book({ title: "Dune", author: "Frank Herbert", genres: ["Science Fiction"], rating: 5, favorite: true }),
  book({ title: "Emma", author: "Jane Austen", tags: ["Classics", "Reading"], rating: 4 }),
  book({ title: "Persuasion", author: "Jane Austen", tags: ["Classics"] }),
  book({ title: "Bad Book", author: "Meh Writer", tags: ["Thriller"], rating: 1 }),
  book({ title: "ಕರ್ವಾಲೋ", author: "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ", rating: 5 }),
];

const doc = (key, title, extra = {}) => ({ key, title, author_name: ["A"], cover_i: 1, ...extra });
const fixed = (value = 0.5) => () => value;
const noShuffle = () => 0.999;

describe("tasteWeight", () => {
  it("rewards finished, loved and well-rated books and penalises poor ratings", () => {
    expect(tasteWeight({ status: "done", rating: 5, favorite: true })).toBe(4.5);
    expect(tasteWeight({ status: "want" })).toBe(0.4);
    expect(tasteWeight({ status: "done", rating: 1 })).toBeLessThan(0);
  });
});

describe("buildTasteProfile", () => {
  it("ranks authors and genres by how much you liked them, not just how often they appear", () => {
    const profile = buildTasteProfile(owned);
    // One 5-star favourite outweighs two books by another author.
    expect(profile.authors[0].name).toBe("Frank Herbert");
    expect(profile.topAuthors).toContain("Jane Austen");
    expect(profile.genres.map((g) => g.name)).toContain("classics");
    expect(profile.genres.map((g) => g.name)).not.toContain("reading");
  });

  it("ignores language tags as genres and counts generic tags only a little", () => {
    const profile = buildTasteProfile([
      book({ title: "A", author: "X", tags: ["Fiction", "Kannada"], rating: 5 }),
      book({ title: "B", author: "Y", tags: ["Science Fiction"], rating: 4 }),
    ]);
    const genres = profile.genres.map((g) => g.name);
    expect(genres).not.toContain("kannada");
    expect(genres[0]).toBe("science fiction");
  });

  it("marks authors you rated poorly as disliked and leaves them out of the ranking", () => {
    const profile = buildTasteProfile(owned);
    expect(profile.topAuthors).not.toContain("Meh Writer");
    expect(profile.disliked.has("mehwriter")).toBe(true);
  });

  it("notices the scripts you read and who you read in them", () => {
    const profile = buildTasteProfile(owned);
    expect(profile.scripts).toEqual([expect.objectContaining({ script: "kn", name: "Kannada" })]);
  });

  it("explains a pick with your best-loved book behind it", () => {
    const profile = buildTasteProfile(owned);
    expect(profile.inspiredBy("author", "Jane Austen").title).toBe("Emma");
    expect(profile.inspiredBy("genre", "Science Fiction").title).toBe("Dune");
  });
});

describe("isSequel", () => {
  it("spots later books in a series", () => {
    expect(isSequel("Death's End (The Three-Body Problem Series Book 3)")).toBe(true);
    expect(isSequel("The Dark Forest #2")).toBe(true);
    expect(isSequel("Volume Two")).toBe(true);
    expect(isSequel("The Three-Body Problem (Book 1)")).toBe(false);
    expect(isSequel("Fahrenheit 451")).toBe(false);
  });
});

describe("reasonFor", () => {
  it("words the reason by what you did with the book", () => {
    expect(reasonFor({ title: "Dune", status: "done", rating: 5 }, "x")).toBe("Because you loved Dune");
    expect(reasonFor({ title: "Emma", status: "reading" }, "x")).toBe("While you're reading Emma");
    expect(reasonFor({ title: "Sapiens", status: "want" }, "x")).toBe("Since Sapiens is on your list");
    expect(reasonFor(null, "More by X")).toBe("More by X");
  });
});

describe("weightedPick", () => {
  it("favours strong entries but samples without repeats", () => {
    const entries = [
      { name: "big", score: 100 },
      { name: "small", score: 1 },
      { name: "tiny", score: 1 },
    ];
    expect(weightedPick(entries, 1, fixed(0.5))[0].name).toBe("big");
    expect(new Set(weightedPick(entries, 3, Math.random).map((e) => e.name)).size).toBe(3);
  });
});

describe("planQueries", () => {
  it("asks about your strongest authors and genres, plus a row in each script you read", () => {
    const queries = planQueries(buildTasteProfile(owned), fixed(0.1));
    const kinds = queries.map((q) => q.kind);
    expect(kinds).toContain("author");
    expect(kinds).toContain("genre");
    expect(queries.find((q) => q.kind === "language")).toBeUndefined(); // the Kannada author is already an author query
    expect(queries.filter((q) => q.kind === "author").map((q) => q.value)).toContain("Frank Herbert");
    expect(queries.every((q) => q.reason && q.params)).toBe(true);
    expect(queries.some((q) => q.value === "Meh Writer")).toBe(false);
  });

  it("adds a language row when your Kannada author is not already chosen", () => {
    const many = [
      ...["A1", "A2", "A3", "A4"].map((author) => book({ title: `${author} book`, author, rating: 5, favorite: true })),
      book({ title: "ಕರ್ವಾಲೋ", author: "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ", status: "want" }),
    ];
    const queries = planQueries(buildTasteProfile(many), fixed(0.01));
    const language = queries.find((q) => q.kind === "language");
    expect(language).toMatchObject({ label: "Kannada", value: "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ" });
  });

  it("leaves out weak genres that only one unread book suggests", () => {
    const library = [
      book({ title: "Dune", author: "Frank Herbert", tags: ["Science Fiction"], rating: 5, favorite: true }),
      book({ title: "Emma", author: "Jane Austen", tags: ["Romance"], status: "reading" }),
    ];
    const genres = planQueries(buildTasteProfile(library), fixed(0.1)).filter((q) => q.kind === "genre").map((q) => q.value);
    expect(genres).toEqual(["science fiction"]);
  });

  it("searches genres by relevance (popularity alone pulls in off-genre bestsellers)", () => {
    const genre = planQueries(buildTasteProfile(owned), fixed(0.1)).find((q) => q.kind === "genre");
    expect(genre.params.sort).toBeUndefined();
  });

  it("adds recent catalogue books in each script you read, grouped into that language's row", () => {
    const catalogue = planQueries(buildTasteProfile(owned), fixed(0.1)).find((q) => q.kind === "catalogue");
    expect(catalogue).toMatchObject({ label: "Kannada", group: "language:kn", script: "kn", params: { q: "language:kan", sort: "new" } });
  });

  it("falls back to popular subjects for an empty library", () => {
    const queries = planQueries(buildTasteProfile([]), noShuffle);
    expect(queries).toHaveLength(4);
    expect(queries[0].reason).toMatch(/^Widely read in/);
  });
});

describe("alreadyOwned", () => {
  it("is forgiving about '&', subtitles and co-authors", () => {
    const books = [book({ title: "Pride & Prejudice", author: "Jane Austen" })];
    expect(alreadyOwned(books, { title: "Pride and Prejudice: Annotated", author: "Jane Austen, Someone Else" })).toBe(true);
    expect(alreadyOwned(books, { title: "Emma", author: "Jane Austen" })).toBe(false);
  });
});

describe("titleKey", () => {
  it("matches the same book written with digits or words, with or without 'The'", () => {
    expect(titleKey("1984")).toBe(titleKey("Nineteen Eighty-Four"));
    expect(titleKey("Fahrenheit 451")).toBe(titleKey("Fahrenheit Four Hundred Fifty-One"));
    expect(titleKey("The Hobbit: or There and Back Again")).toBe(titleKey("Hobbit"));
  });

  it("drives ownership checks, including authors written with or without spaces between initials", () => {
    const books = [book({ title: "1984", author: "George Orwell" }), book({ title: "The Hobbit", author: "J. R. R. Tolkien" })];
    expect(alreadyOwned(books, { title: "Nineteen Eighty-Four", author: "George Orwell" })).toBe(true);
    expect(alreadyOwned(books, { title: "The Hobbit", author: "J.R.R. Tolkien" })).toBe(true);
  });
});

describe("normalizeTitle", () => {
  it("keeps letters of every script, so different Kannada titles stay different", () => {
    expect(normalizeTitle("ಕರ್ವಾಲೋ")).not.toBe("");
    expect(normalizeTitle("ಕರ್ವಾಲೋ")).not.toBe(normalizeTitle("ಪರ್ವ"));
    expect(normalizeTitle("Pride & Prejudice!")).toBe("pride and prejudice");
  });
});

describe("pickRecommendations", () => {
  const genreQuery = { kind: "genre", value: "classics", label: "Classics", reason: "r", inspiringBook: null, weight: 0.8 };
  const authorQuery = { kind: "author", value: "Jane Austen", label: "Jane Austen", reason: "Because you loved Emma", inspiringBook: null, weight: 1 };

  it("drops owned books, duplicates, reference books and what you dismissed", () => {
    const docs = [
      doc("1", "Dune", { author_name: ["Frank Herbert"] }),
      doc("2", "New Book"),
      doc("3", "new book!"),
      doc("4", "Physics Textbook"),
      doc("5", "Hidden One", { author_name: ["B"] }),
    ];
    const picks = pickRecommendations([{ query: genreQuery, docs }], owned, { random: fixed(0), hidden: new Set(["5"]) });
    expect(picks.map((p) => p.title)).toEqual(["New Book"]);
  });

  it("keeps books without a cover (most Kannada books have none) but ranks covered ones a little higher", () => {
    const docs = [doc("1", "ಮಲೆಗಳಲ್ಲಿ ಮದುಮಗಳು", { cover_i: undefined, author_name: ["ಕುವೆಂಪು"] }), doc("2", "Covered", { author_name: ["B"] })];
    const picks = pickRecommendations([{ query: genreQuery, docs }], [], { random: fixed(0), readerScripts: new Set(["kn"]) });
    expect(picks.map((p) => p.title)).toEqual(["Covered", "ಮಲೆಗಳಲ್ಲಿ ಮದುಮಗಳು"]);
  });

  it("only trusts author results that are really by that author, and skips books named after them", () => {
    const docs = [
      doc("1", "Jane Austen", { author_name: ["Some Biographer"] }),
      doc("2", "Jane Austen", { author_name: ["Jane Austen"] }),
      doc("3", "Sense and Sensibility", { author_name: ["Jane Austen"] }),
      doc("4", "Pride and Prejudice and Zombies", { author_name: ["Seth Grahame-Smith"] }),
    ];
    const picks = pickRecommendations([{ query: authorQuery, docs }], [], { random: fixed(0) });
    expect(picks.map((p) => p.title)).toEqual(["Sense and Sensibility"]);
  });

  it("skips adaptations and summaries of a book", () => {
    const docs = [doc("1", "1984 (adaptation)", { author_name: ["Michael Dean"] }), doc("2", "Summary of Sapiens", { author_name: ["B"] }), doc("3", "Real Book", { author_name: ["C"] })];
    expect(pickRecommendations([{ query: genreQuery, docs }], [], { random: fixed(0) }).map((p) => p.title)).toEqual(["Real Book"]);
  });

  it("keeps only books written in the script a language row is for", () => {
    const query = { kind: "catalogue", value: "Kannada", label: "Kannada", group: "language:kn", script: "kn", reason: "r", inspiringBook: null, weight: 0.45 };
    const docs = [doc("1", "Macbeth", { author_name: ["Shakespeare"] }), doc("2", "ಗೊಂಡರ ರಾಮಾಯಣ", { author_name: ["ಬೋರಲಿಂಗಯ್ಯ"], cover_i: undefined })];
    const picks = pickRecommendations([{ query, docs }], [], { random: fixed(0), readerScripts: new Set(["kn"]) });
    expect(picks.map((p) => p.title)).toEqual(["ಗೊಂಡರ ರಾಮಾಯಣ"]);
    expect(picks[0].queryKey).toBe("language:kn");
  });

  it("skips magazine and journal issues", () => {
    const docs = [doc("1", "ರುಜುವಾತು ಸಂಚಿಕೆ 21-22", { author_name: ["X"] }), doc("2", "Granta Issue 140", { author_name: ["Y"] }), doc("3", "A Novel", { author_name: ["Z"] })];
    expect(pickRecommendations([{ query: genreQuery, docs }], [], { random: fixed(0), readerScripts: new Set(["kn"]) }).map((p) => p.title)).toEqual(["A Novel"]);
  });

  it("only suggests titles in Latin script or a script you already read", () => {
    const docs = [doc("1", "ההיסטוריה של המחר", { author_name: ["X"] }), doc("2", "Cadáver exquisito", { author_name: ["Y"] }), doc("3", "ಪರ್ವ", { author_name: ["Z"] })];
    const titles = (scripts) => pickRecommendations([{ query: genreQuery, docs }], [], { random: fixed(0), readerScripts: new Set(scripts) }).map((p) => p.title).sort();
    expect(titles([])).toEqual(["Cadáver exquisito"]);
    expect(titles(["kn"])).toEqual(["Cadáver exquisito", "ಪರ್ವ"]);
  });

  it("skips dictionaries and sequels in theme rows, but allows sequels from the author's own row", () => {
    const docs = [
      doc("1", "ಹಳಗನ್ನಡ ಅರ್ಥಕೋಶ", { author_name: ["X"] }),
      doc("2", "An English Dictionary", { author_name: ["Y"] }),
      doc("3", "Death's End (Book 3)", { author_name: ["Liu"] }),
      doc("4", "A Standalone", { author_name: ["Z"] }),
    ];
    expect(pickRecommendations([{ query: genreQuery, docs }], [], { random: fixed(0), readerScripts: new Set(["kn"]) }).map((p) => p.title)).toEqual(["A Standalone"]);
    const authorDocs = [doc("5", "Children of Dune (Dune Book 3)", { author_name: ["Jane Austen"] })];
    expect(pickRecommendations([{ query: authorQuery, docs: authorDocs }], [], { random: fixed(0) })).toHaveLength(1);
  });

  it("wants an edition in a language you read", () => {
    const docs = [doc("1", "Um casamento arranjado", { author_name: ["X"], language: ["por"] }), doc("2", "Married", { author_name: ["Y"], language: ["por", "eng"] })];
    expect(pickRecommendations([{ query: genreQuery, docs }], [], { random: fixed(0) }).map((p) => p.title)).toEqual(["Married"]);
  });

  it("never suggests authors you rated poorly", () => {
    const docs = [doc("1", "Another Bad One", { author_name: ["Meh Writer"] }), doc("2", "Fine", { author_name: ["B"] })];
    const { disliked } = buildTasteProfile(owned);
    expect(pickRecommendations([{ query: genreQuery, docs }], [], { random: fixed(0), disliked }).map((p) => p.title)).toEqual(["Fine"]);
  });

  it("ranks widely read, well-rated books first instead of shuffling", () => {
    const docs = [
      doc("1", "Obscure", { author_name: ["X"] }),
      doc("2", "Beloved Classic", { author_name: ["Y"], readinglog_count: 9000, ratings_count: 400, ratings_average: 4.4 }),
    ];
    const picks = pickRecommendations([{ query: genreQuery, docs }], [], { random: fixed(0) });
    expect(picks[0].title).toBe("Beloved Classic");
    expect(picks[0].rating).toBe(4.4);
  });

  it("boosts a book that several of your tastes found", () => {
    const shared = doc("s", "Shared Pick", { author_name: ["Jane Austen"] });
    const other = doc("o", "Solo Pick", { author_name: ["Z"] });
    const picks = pickRecommendations(
      [
        { query: genreQuery, docs: [other, shared] },
        { query: { ...genreQuery, value: "romance", label: "Romance" }, docs: [shared] },
      ],
      [],
      { random: fixed(0) }
    );
    expect(picks[0].title).toBe("Shared Pick");
  });

  it("keeps at most two books per author", () => {
    const docs = ["a", "b", "c"].map((t) => doc(t, `Title ${t}`));
    expect(pickRecommendations([{ query: genreQuery, docs }], [], { random: fixed(0) })).toHaveLength(2);
  });
});

describe("groupRecommendations", () => {
  it("makes the best match the top pick and groups the rest into rows, strongest first", () => {
    const pick = (id, queryKey, score) => ({ id, queryKey, score, kind: "genre", label: queryKey, reason: "r" });
    const { top, rows } = groupRecommendations([pick("1", "a", 9), pick("2", "b", 8), pick("3", "a", 7), pick("4", "b", 6)]);
    expect(top.id).toBe("1");
    expect(rows.map((r) => r.key)).toEqual(["b", "a"]);
    expect(rows[0].items.map((i) => i.id)).toEqual(["2", "4"]);
  });

  it("is empty for no picks", () => {
    expect(groupRecommendations([])).toEqual({ top: null, rows: [] });
  });
});

describe("curateChart", () => {
  it("keeps one entry per title, two per author, and requires a cover", () => {
    const docs = [
      doc("1", "Fantasy One", { subject: ["Fantasy"], language: ["eng"] }),
      doc("2", "Fantasy One", { subject: ["Fantasy"] }),
      doc("3", "Fantasy Two", { subject: ["Fantasy"] }),
      doc("4", "Fantasy Three", { subject: ["Fantasy"] }),
      doc("5", "Fantasy Four", { subject: ["Fantasy"], author_name: ["B"], cover_i: undefined }),
    ];
    expect(curateChart(docs, "fantasy").map((d) => d.key)).toEqual(["1", "3"]);
  });

  it("rejects non-English editions", () => {
    const docs = [doc("1", "Un libro", { subject: ["Fantasy"], language: ["spa"] })];
    expect(curateChart(docs, "fantasy")).toEqual([]);
  });
});

describe("shuffled", () => {
  it("returns a permutation without changing the input", () => {
    const input = [1, 2, 3, 4];
    const out = shuffled(input);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4]);
  });
});
