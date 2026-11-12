import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchVolumes } from "./bookApi";
import { resetTransliteration, toKannada } from "./transliterate";
import { authorFromIntro } from "./wikidataBooks";

const json = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

// ಪದ್ಮಪಾಣಿ on Wikidata: only a Kannada name and a Kannada Wikipedia page.
const BARE = { id: "Q25627444", labels: { kn: { value: "ಪದ್ಮಪಾಣಿ" } }, claims: {}, sitelinks: { knwiki: { title: "ಪದ್ಮಪಾಣಿ" } } };
const INTRO = "ಡಾ. ಕೆ.ಎನ್.ಗಣೇಶಯ್ಯರವರು ಬರೆದ ರೋಚಕ ಸಣ್ಣಕತೆಗಳ ಸಂಗ್ರಹ.";

/** English letters find nothing; Kannada script finds the book. */
function route({ categories = [{ title: "ವರ್ಗ:ಪುಸ್ತಕಗಳು" }], google = {} } = {}) {
  globalThis.fetch = vi.fn((raw) => {
    const url = new URL(raw);
    const q = url.searchParams.get("q") || url.searchParams.get("search") || "";
    if (url.host === "inputtools.google.com") {
      return json(["SUCCESS", [[url.searchParams.get("text"), [url.searchParams.get("text") === "padmapaani" ? "ಪದ್ಮಪಾಣಿ" : "ಗಣೇಶಯ್ಯ"]]]]);
    }
    if (url.host.includes("wikidata.org")) {
      if (url.searchParams.get("action") === "wbsearchentities") return json({ search: q === "ಪದ್ಮಪಾಣಿ" ? [{ id: "Q25627444" }] : [] });
      return json({ entities: { Q25627444: BARE } });
    }
    if (url.host === "kn.wikipedia.org") {
      const prop = url.searchParams.get("prop");
      if (prop === "categories") return json({ query: { pages: { 1: { title: "ಪದ್ಮಪಾಣಿ", categories } } } });
      if (prop === "extracts") return json({ query: { pages: { 1: { title: "ಪದ್ಮಪಾಣಿ", extract: INTRO } } } });
      return json({ query: { pages: {} } });
    }
    if (url.host.includes("googleapis.com")) return json(google[q] || { items: [] });
    return json({});
  });
}

beforeEach(() => resetTransliteration());
afterEach(() => vi.restoreAllMocks());

describe("toKannada", () => {
  it("writes English letters in Kannada script, and leaves other text alone", async () => {
    route();
    await expect(toKannada("padmapaani")).resolves.toBe("ಪದ್ಮಪಾಣಿ");
    await expect(toKannada("ಪರ್ವ")).resolves.toBe("");
    await expect(toKannada("1984")).resolves.toBe("");
  });

  it("gives up quietly when the service is unreachable", async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error("offline")));
    await expect(toKannada("padmapaani")).resolves.toBe("");
  });
});

describe("searching in English letters for a book catalogued in Kannada", () => {
  it("searches again in Kannada and finds the book, with its author from Wikipedia", async () => {
    route();
    const [first] = await searchVolumes("padmapaani", "all");
    expect(first).toMatchObject({ id: "wd:Q25627444", volumeInfo: { title: "ಪದ್ಮಪಾಣಿ", authors: ["ಕೆ.ಎನ್.ಗಣೇಶಯ್ಯ"] } });
  });

  it("does not take a bare Wikidata item for a book unless Wikipedia files it as one", async () => {
    route({ categories: [{ title: "ವರ್ಗ:ಬೌದ್ಧ ಧರ್ಮ" }] });
    expect(await searchVolumes("padmapaani", "all")).toEqual([]);
  });

  it("lets the catalogue's copy fill in the cover", async () => {
    route({
      google: {
        "ಪದ್ಮಪಾಣಿ": { items: [{ id: "g1", volumeInfo: { title: "ಪದ್ಮಪಾಣಿ", authors: ["ಕೆ. ಎನ್. ಗಣೇಶಯ್ಯ"], imageLinks: { thumbnail: "https://books.google.com/p" } } }] },
      },
    });
    const results = await searchVolumes("padmapaani", "all");
    expect(results).toHaveLength(1);
    expect(results[0].volumeInfo.imageLinks.thumbnail).toBe("https://books.google.com/p");
    expect(results[0].wikidata.coverSource).toBe("google");
  });

  it("finds an author's Kannada books when the name is typed in English", async () => {
    route({
      google: {
        "inauthor:ganeshaiah": { items: [{ id: "e1", volumeInfo: { title: "Plant resources of Karnataka", authors: ["K. N. Ganeshaiah"] } }] },
        "inauthor:ಗಣೇಶಯ್ಯ": { items: [{ id: "k1", volumeInfo: { title: "ಕನಕ ಮುಸುಕು", authors: ["ಕೆ. ಎನ್. ಗಣೇಶಯ್ಯ"] } }] },
      },
    });
    const results = await searchVolumes("ganeshaiah", "author");
    expect(results.map((v) => v.id)).toEqual(["k1", "e1"]);
  });
});

describe("authorFromIntro", () => {
  it("reads who wrote the book from the first sentence", () => {
    expect(authorFromIntro(INTRO, "ಪದ್ಮಪಾಣಿ")).toBe("ಕೆ.ಎನ್.ಗಣೇಶಯ್ಯ");
    expect(authorFromIntro("ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು ಡಾ. ಶಿವರಾಮ ಕಾರಂತರು ರಚಿಸಿರುವ ಒಂದು ಕಾದಂಬರಿ.", "ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು")).toBe("ಶಿವರಾಮ ಕಾರಂತ");
    expect(authorFromIntro("ಕಾನೂರು ಹೆಗ್ಗಡತಿ ಕುವೆಂಪು ಅವರು ಬರೆದ ಕಾದಂಬರಿ.", "ಕಾನೂರು ಹೆಗ್ಗಡತಿ")).toBe("ಕುವೆಂಪು");
  });

  it("says nothing when the sentence does not name a writer", () => {
    expect(authorFromIntro("ಪದ್ಮಪಾಣಿ ಒಂದು ಬೌದ್ಧ ಶಿಲ್ಪ.", "ಪದ್ಮಪಾಣಿ")).toBe("");
    expect(authorFromIntro("", "x")).toBe("");
  });
});
