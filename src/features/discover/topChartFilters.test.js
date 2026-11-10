import { describe, expect, it } from "vitest";
import { GENRES, belongsTo, chartFor, cleanTitle, curateChart, displayTitle, genreScores, lovedScore } from "./topChartFilters";

const genre = (id) => GENRES.find((g) => g.id === id);
const FANTASY = ["Fantasy", "Fantasy fiction", "Magic", "Wizards", "Fiction"];
const doc = (key, title, extra = {}) => ({
  key,
  title,
  author_name: ["A"],
  cover_i: 1,
  subject: FANTASY,
  language: ["eng"],
  readinglog_count: 100,
  ...extra,
});

describe("genreScores", () => {
  it("counts subjects that name a genre twice as much as hints", () => {
    const scores = genreScores(["science fiction", "robots", "fiction"]);
    expect(scores.science_fiction).toBe(3);
    expect(scores.fantasy).toBe(0);
  });

  it("does not read literary criticism as history", () => {
    expect(genreScores(["russian literature, history and criticism"]).history).toBe(0);
  });
});

describe("belongsTo", () => {
  it("keeps a book out of a genre it is only tagged with in passing", () => {
    // Harry Potter collects a stray "Science fiction" tag from some edition.
    const potter = { subject: [...FANTASY, "Witches", "Dragons", "Science fiction"] };
    expect(belongsTo(potter, genre("fantasy"))).toBe(true);
    expect(belongsTo(potter, genre("science_fiction"))).toBe(false);
  });

  it("needs more than one tag to place a book", () => {
    expect(belongsTo({ subject: ["Fantasy", "Fiction", "Friendship"] }, genre("fantasy"))).toBe(false);
  });

  it("keeps novels out of nonfiction charts", () => {
    const novel = { subject: ["History", "Fiction, romance, historical", "Love stories", "Romance fiction", "Regency"] };
    expect(belongsTo(novel, genre("history"))).toBe(false);
  });

  it("keeps philosophy and religion out of history", () => {
    const plato = { subject: ["Philosophy", "Political science", "Ethics", "History"] };
    expect(belongsTo(plato, genre("history"))).toBe(false);
    const history = { subject: ["World history", "Civilization", "History", "Empires"] };
    expect(belongsTo(history, genre("history"))).toBe(true);
  });

  it("calls literature from before 1966 a classic", () => {
    expect(belongsTo({ subject: ["Fiction", "Classic literature"], first_publish_year: 1813 }, genre("classics"))).toBe(true);
    expect(belongsTo({ subject: ["Fiction", "Classic literature"], first_publish_year: 1997 }, genre("classics"))).toBe(false);
    expect(belongsTo({ subject: ["Military art and science", "Classics"], first_publish_year: 1900 }, genre("classics"))).toBe(false);
  });

  it("counts Indian writing by its setting, not by translations", () => {
    expect(belongsTo({ subject: ["Fiction", "India, fiction", "Kerala (India)"] }, genre("indian"))).toBe(true);
    expect(belongsTo({ subject: ["Fiction", "Translations into Hindi", "Translations into Tamil"] }, genre("indian"))).toBe(false);
  });
});

describe("displayTitle", () => {
  const withEdition = (title, editionTitle, extra = {}) => ({ title, author_name: ["A"], editions: { docs: [{ title: editionTitle, language: ["eng"] }] }, ...extra });

  it("shows the English edition's title for a work catalogued in another language", () => {
    expect(displayTitle(withEdition("Het Achterhuis", "The Diary of a Young Girl"))).toBe("The Diary of a Young Girl");
    expect(displayTitle(withEdition("Преступление и наказание", "Crime and Punishment"))).toBe("Crime and Punishment");
  });

  it("keeps an English original title", () => {
    expect(displayTitle(withEdition("And Then There Were None", "Ten Little Indians"))).toBe("And Then There Were None");
  });

  it("never takes an edition named after the author", () => {
    expect(displayTitle(withEdition("Il Principe", "Machiavelli", { author_name: ["Niccolò Machiavelli"] }))).toBe("Il Principe");
  });
});

describe("cleanTitle", () => {
  it("drops cataloguers' notes", () => {
    expect(cleanTitle("The Adventures of Sherlock Holmes [12 stories]")).toBe("The Adventures of Sherlock Holmes");
    expect(cleanTitle("Twisted Love (Collector's Edition)")).toBe("Twisted Love");
    expect(cleanTitle("Little Women - Complete Authorized Edition")).toBe("Little Women");
    expect(cleanTitle("Dune")).toBe("Dune");
  });
});

describe("curateChart", () => {
  it("ranks one entry per title and at most two per author, with covers", () => {
    const docs = [
      doc("1", "Fantasy One"),
      doc("2", "Fantasy One"),
      doc("3", "Fantasy Two"),
      doc("4", "Fantasy Three"),
      doc("5", "Fantasy Four", { author_name: ["B"], cover_i: undefined }),
      doc("6", "Fantasy Five", { author_name: ["C"] }),
    ];
    const chart = curateChart(docs, "fantasy");
    expect(chart.map((d) => d.id)).toEqual(["1", "3", "6"]);
    expect(chart.map((d) => d.rank)).toEqual([1, 2, 3]);
  });

  it("treats an author's spellings as one author", () => {
    const docs = [doc("1", "One", { author_name: ["J.R.R. Tolkien"] }), doc("2", "Two", { author_name: ["J. R. R. Tolkien"] }), doc("3", "Three", { author_name: ["JRR Tolkien"] })];
    expect(curateChart(docs, "fantasy")).toHaveLength(2);
  });

  it("leaves out omnibuses, study aids and works with no English edition", () => {
    const docs = [
      doc("1", "Rage / Roadwork"),
      doc("2", "Dune (Monarch Notes)", { author_name: ["B"] }),
      doc("3", "Un libro", { author_name: ["C"], language: ["spa"] }),
      doc("4", "Kept", { author_name: ["D"] }),
    ];
    expect(curateChart(docs, "fantasy").map((d) => d.title)).toEqual(["Kept"]);
  });

  it("carries readers, ratings and how many are reading it now", () => {
    const [item] = curateChart([doc("1", "One", { readinglog_count: 900, currently_reading_count: 40, ratings_average: 4.26, ratings_count: 80 })], "fantasy");
    expect(item).toMatchObject({ readers: 900, readingNow: 40, rating: 4.3, ratingCount: 80 });
  });

  it("is empty for an unknown chart", () => {
    expect(curateChart([doc("1", "One")], "nope")).toEqual([]);
  });
});

describe("chartFor", () => {
  const chart = [
    { id: "a", rating: 4.0, ratingCount: 900, publishedYear: "1990", rank: 1 },
    { id: "b", rating: 5.0, ratingCount: 3, publishedYear: "2024", rank: 2 },
    { id: "c", rating: 4.5, ratingCount: 400, publishedYear: "2021", rank: 3 },
  ];

  it("keeps popularity order for most read", () => {
    expect(chartFor(chart, "read").map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("does not let a handful of five-star ratings win best loved", () => {
    expect(lovedScore(chart[1])).toBeLessThan(lovedScore(chart[2]));
    expect(chartFor(chart, "loved").map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("shows only the last ten years for recent, ranked afresh", () => {
    const recent = chartFor(chart, "recent", new Date("2026-06-01"));
    expect(recent.map((i) => [i.id, i.rank])).toEqual([["b", 1], ["c", 2]]);
  });
});
