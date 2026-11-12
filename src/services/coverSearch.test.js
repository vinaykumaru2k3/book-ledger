import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CoverSearchIncomplete,
  coreTitle,
  findBestCover,
  findCoverCandidates,
  needsCover,
  resetCoverSearch,
  titleMatches,
  titleSoundsLike,
} from "./coverSearch";

const json = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
const wikiPages = (...pages) => ({ query: { pages: Object.fromEntries(pages.map((p, i) => [String(i + 1), { index: i + 1, ...p }])) } });
const thumb = (source) => ({ thumbnail: { source } });

/** Routes fetch by host; each handler gets the URL and returns a response promise. */
function route(handlers) {
  globalThis.fetch = vi.fn((url) => {
    const host = new URL(url).host;
    const handler = Object.entries(handlers).find(([key]) => host.includes(key))?.[1];
    return handler ? handler(new URL(url)) : json({});
  });
}

const accept = () => Promise.resolve(true);

beforeEach(() => resetCoverSearch());
afterEach(() => vi.restoreAllMocks());

describe("title matching", () => {
  it("ignores qualifiers, subtitles, case and articles, in any script", () => {
    expect(coreTitle("ಪರ್ವ(ಕಾದಂಬರಿ)")).toBe("ಪರ್ವ");
    expect(titleMatches("ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು (ಕಾದಂಬರಿ)", "ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು")).toBe(true);
    expect(titleMatches("Dune (novel)", "dune")).toBe(true);
    expect(titleMatches("The Hobbit, or There and Back Again", "Hobbit, or There and Back Again")).toBe(true);
    expect(titleMatches("Sapiens: A Brief History", "Sapiens")).toBe(true);
  });

  it("does not match a different title", () => {
    expect(titleMatches("Children of Dune", "Dune")).toBe(false);
    expect(titleMatches("ಎಸ್. ಎಲ್. ಭೈರಪ್ಪ", "ಪರ್ವ")).toBe(false);
    expect(titleMatches("", "Dune")).toBe(false);
  });

  it("matches catalogue titles spelled another way or printed in both scripts", () => {
    expect(titleSoundsLike("ಕಾನೂರು ಹೆಗ್ಗಡಿತಿ", "ಕಾನೂರು ಹೆಗ್ಗಡತಿ")).toBe(true);
    expect(titleSoundsLike("Kanooru Heggadathi", "ಕಾನೂರು ಹೆಗ್ಗಡತಿ")).toBe(true);
    expect(titleSoundsLike("ಕೊಳಲು Kolalu", "ಕೊಳಲು")).toBe(true);
    expect(titleSoundsLike("ಪಕ್ಷಿಕಾಶಿ Pakshikashi", "ಕೊಳಲು")).toBe(false);
    expect(titleSoundsLike("Children of Dune", "Dune")).toBe(false);
  });
});

describe("needsCover", () => {
  const now = Date.parse("2026-11-12T00:00:00Z");
  it("wants a cover only for books without one that the reader has not removed", () => {
    expect(needsCover({ title: "Parva" }, now)).toBe(true);
    expect(needsCover({ title: "Parva", coverUrl: "https://x" }, now)).toBe(false);
    expect(needsCover({ title: "Parva", coverSource: "removed" }, now)).toBe(false);
  });
  it("retries a miss after 30 days", () => {
    expect(needsCover({ title: "Parva", coverCheckedAt: "2026-11-01T00:00:00Z", coverCheckVersion: 2 }, now)).toBe(false);
    expect(needsCover({ title: "Parva", coverCheckedAt: "2026-09-01T00:00:00Z", coverCheckVersion: 2 }, now)).toBe(true);
  });
  it("retries at once a miss from an older, weaker search", () => {
    expect(needsCover({ title: "Parva", coverCheckedAt: "2026-11-11T00:00:00Z" }, now)).toBe(true);
    expect(needsCover({ title: "Parva", coverCheckedAt: "2026-11-11T00:00:00Z", coverCheckVersion: 1 }, now)).toBe(true);
  });
});

describe("findBestCover", () => {
  it("finds a Kannada novel on Kannada Wikipedia and skips the film and the author", async () => {
    route({
      "kn.wikipedia.org": () =>
        json(
          wikiPages(
            { title: "ಎಸ್. ಎಲ್. ಭೈರಪ್ಪ", ...thumb("https://w/author.jpg") },
            { title: "ಪರ್ವ (ಚಲನಚಿತ್ರ)", ...thumb("https://w/film.jpg") },
            { title: "ಪರ್ವ(ಕಾದಂಬರಿ)", ...thumb("https://w/parva.jpg") },
          ),
        ),
    });
    await expect(findBestCover({ title: "ಪರ್ವ", author: "ಎಸ್. ಎಲ್. ಭೈರಪ್ಪ" }, { verify: accept })).resolves.toEqual({
      url: "https://w/parva.jpg",
      source: "wikipedia",
    });
    expect(fetch.mock.calls.some(([url]) => url.includes("kn.wikipedia.org"))).toBe(true);
  });

  it("finds the work on Wikidata under another spelling and skips the author's photo", async () => {
    const work = {
      id: "Q55615667",
      labels: { kn: { value: "ಕಾನೂರು ಹೆಗ್ಗಡತಿ" }, en: { value: "Kanuru Heggaditi" } },
      claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q7725634" } } } }], P50: [{ mainsnak: { datavalue: { value: { id: "Q3351108" } } } }] },
      sitelinks: { knwiki: { title: "ಕಾನೂರು ಹೆಗ್ಗಡತಿ" }, enwiki: { title: "Kanuru Heggaditi" } },
    };
    const kuvempu = { id: "Q3351108", labels: { en: { value: "Kuvempu" }, kn: { value: "ಕುವೆಂಪು" } } };
    const portrait = (source) => ({ thumbnail: { source, width: 300, height: 450 } });
    route({
      "wikidata.org": (url) => {
        const action = url.searchParams.get("action");
        if (action === "wbsearchentities") {
          return json({ search: url.searchParams.get("search") === "ಕುವೆಂಪು" ? [{ id: "Q3351108", description: "poet" }] : [] });
        }
        if (action === "query") return json({ query: { search: [{ title: "Q55615667" }] } });
        const asked = url.searchParams.get("ids").split("|");
        return json({ entities: Object.fromEntries([work, kuvempu].filter((e) => asked.includes(e.id)).map((e) => [e.id, e])) });
      },
      "kn.wikipedia.org": () => json(wikiPages({ title: "ಕಾನೂರು ಹೆಗ್ಗಡತಿ", ...portrait("https://w/commons/Kuvempu.jpg") })),
      "en.wikipedia.org": () => json(wikiPages({ title: "Kanuru Heggaditi", ...portrait("https://w/en/Kanuru-Heggaditi-Novel.jpg") })),
    });
    await expect(findBestCover({ title: "ಕಾನೂರು ಹೆಗ್ಗಡಿತಿ", author: "ಕುವೆಂಪು" }, { verify: accept })).resolves.toEqual({
      url: "https://w/en/Kanuru-Heggaditi-Novel.jpg",
      source: "wikipedia",
    });
  });

  it("uses the English page when the Kannada page has no image", async () => {
    route({
      "kn.wikipedia.org": () => json(wikiPages({ title: "ಕರ್ವಾಲೋ", langlinks: [{ lang: "en", "*": "Karvalo" }] })),
      "en.wikipedia.org": (url) => {
        expect(url.searchParams.get("titles")).toBe("Karvalo");
        return json(wikiPages({ title: "Karvalo", ...thumb("https://w/karvalo.jpg") }));
      },
    });
    await expect(findBestCover({ title: "ಕರ್ವಾಲೋ" }, { verify: accept })).resolves.toMatchObject({ url: "https://w/karvalo.jpg" });
  });

  it("falls back to Open Library, then Google Books, in that order", async () => {
    route({
      "wikipedia.org": () => json(wikiPages()),
      "openlibrary.org": () => json({ docs: [{ title: "Dune", cover_i: 42 }] }),
      "googleapis.com": () => json({ items: [{ volumeInfo: { title: "Dune", imageLinks: { thumbnail: "http://books.google.com/x?id=1&zoom=1&edge=curl" } } }] }),
    });
    const verify = vi.fn((url) => Promise.resolve(!url.includes("/42-")));
    const found = await findBestCover({ title: "Dune", author: "Frank Herbert" }, { verify });
    expect(verify).toHaveBeenCalledWith("https://covers.openlibrary.org/b/id/42-L.jpg");
    expect(fetch.mock.calls.some(([url]) => url.includes("wikidata.org"))).toBe(true);
    expect(found).toEqual({ url: "https://books.google.com/x?id=1&zoom=2", source: "google" });
  });

  it("stops at the first source with a usable cover", async () => {
    route({
      "wikipedia.org": () => json(wikiPages({ title: "Dune (novel)", ...thumb("https://w/dune.jpg") })),
    });
    await findBestCover({ title: "Dune" }, { verify: accept });
    expect(fetch.mock.calls.some(([url]) => url.includes("openlibrary") || url.includes("googleapis"))).toBe(false);
  });

  it("resolves null when no source has one, and remembers that for the tab", async () => {
    route({ "wikipedia.org": () => json(wikiPages()), "openlibrary.org": () => json({ docs: [] }), "googleapis.com": () => json({ items: [] }) });
    await expect(findBestCover({ title: "Unknown" }, { verify: accept })).resolves.toBeNull();
    const calls = fetch.mock.calls.length;
    await expect(findBestCover({ title: "Unknown" }, { verify: accept })).resolves.toBeNull();
    expect(fetch.mock.calls.length).toBe(calls);
  });

  it("looks through the author's books on Google when the title is spelled differently", async () => {
    route({
      "wikipedia.org": () => json(wikiPages()),
      "openlibrary.org": () => json({ docs: [] }),
      "googleapis.com": (url) =>
        json(
          url.searchParams.get("q").startsWith("inauthor:")
            ? { items: [{ volumeInfo: { title: "ಪಕ್ಷಿಕಾಶಿ Pakshikashi", imageLinks: { thumbnail: "https://books.google.com/p?id=1" } } }, { volumeInfo: { title: "ಕೊಳಲು Kolalu", imageLinks: { thumbnail: "https://books.google.com/k?id=2" } } }] }
            : { items: [] },
        ),
    });
    await expect(findBestCover({ title: "ಕೊಳಲು", author: "ಕುವೆಂಪು" }, { verify: accept })).resolves.toEqual({ url: "https://books.google.com/k?id=2&zoom=2", source: "google" });
  });

  it("treats Google's exhausted quota as a miss but an unreachable Wikipedia as incomplete", async () => {
    route({ "wikipedia.org": () => json(wikiPages()), "openlibrary.org": () => json({ docs: [] }), "googleapis.com": () => json({}, 429) });
    await expect(findBestCover({ title: "Quota" }, { verify: accept })).resolves.toBeNull();

    route({ "wikipedia.org": () => json({}, 429), "openlibrary.org": () => json({ docs: [] }) });
    await expect(findBestCover({ title: "Offline" }, { verify: accept })).rejects.toBeInstanceOf(CoverSearchIncomplete);
  });
});

describe("findCoverCandidates", () => {
  it("returns verified covers from every source, Wikipedia first", async () => {
    route({
      "wikipedia.org": () => json(wikiPages({ title: "Kim (novel)", ...thumb("https://w/kim.png") })),
      "openlibrary.org": () => json({ docs: [{ title: "Kim", cover_i: 1 }, { title: "Kim", cover_i: 2 }, { title: "Kimchi", cover_i: 3 }] }),
      "googleapis.com": () => json({}, 429),
    });
    const verify = (url) => Promise.resolve(!url.includes("/2-"));
    const found = await findCoverCandidates({ title: "Kim", author: "Kipling" }, { verify });
    expect(found.map((c) => [c.source, c.url])).toEqual([
      ["wikipedia", "https://w/kim.png"],
      ["openlibrary", "https://covers.openlibrary.org/b/id/1-L.jpg"],
    ]);
  });
});
