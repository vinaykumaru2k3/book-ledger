import { afterEach, describe, expect, it, vi } from "vitest";
import { buildFormFromVolume, searchVolumes } from "./bookApi";
import { looksLikeAuthorPhoto, searchWikidataBooks } from "./wikidataBooks";

const json = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
const claim = (id) => [{ mainsnak: { datavalue: { value: { id } } } }];

const NOVEL = {
  id: "Q17074443",
  labels: { kn: { value: "ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು" }, en: { value: "Mookajjiya Kanasugalu" } },
  claims: {
    P31: claim("Q8261"),
    P50: claim("Q6378196"),
    P407: claim("Q33673"),
    P577: [{ mainsnak: { datavalue: { value: { time: "+1968-00-00T00:00:00Z" } } } }],
  },
  sitelinks: { knwiki: { title: "ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು (ಕಾದಂಬರಿ)" } },
};
const FILM = { id: "Q61857715", labels: { en: { value: "Mookajjiya Kanasugalu" } }, claims: { P31: claim("Q11424") } };
const AUTHOR = { id: "Q6378196", labels: { en: { value: "K. Shivaram Karanth" }, kn: { value: "ಶಿವರಾಮ ಕಾರಂತ" } } };
const ENTITIES = [NOVEL, FILM, AUTHOR];

/** Wikidata, Kannada Wikipedia and Google Books, as the search sees them. */
function route({ google = { items: [] }, googleStatus = 200 } = {}) {
  globalThis.fetch = vi.fn((raw) => {
    const url = new URL(raw);
    if (url.host.includes("wikidata.org")) {
      if (url.searchParams.get("action") === "wbsearchentities") {
        return json({
          search: [
            { id: "Q61857715", description: "film directed by P. Sheshadri" },
            { id: "Q17074443", description: "1968 novel by K. Shivaram Karanth" },
          ],
        });
      }
      const asked = url.searchParams.get("ids").split("|");
      return json({ entities: Object.fromEntries(ENTITIES.filter((e) => asked.includes(e.id)).map((e) => [e.id, e])) });
    }
    if (url.host === "kn.wikipedia.org") {
      if (url.searchParams.get("prop") === "extracts") {
        return json({ query: { pages: { 1: { extract: "ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು ಶಿವರಾಮ ಕಾರಂತರ ಕಾದಂಬರಿ." } } } });
      }
      return json({
        query: { pages: { 1: { title: "ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು (ಕಾದಂಬರಿ)", thumbnail: { source: "https://w/mookajji.jpg", width: 400, height: 600 } } } },
      });
    }
    if (url.host.includes("googleapis.com")) return json(google, googleStatus);
    return json({});
  });
}

afterEach(() => vi.restoreAllMocks());

describe("searchWikidataBooks", () => {
  it("finds a Kannada novel typed in English letters, under its Kannada title, without the film", async () => {
    route();
    const [volume, ...rest] = await searchWikidataBooks("Mookajjiya kanasugalu");
    expect(rest).toEqual([]);
    expect(volume).toMatchObject({
      id: "wd:Q17074443",
      volumeInfo: {
        title: "ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು",
        authors: ["ಶಿವರಾಮ ಕಾರಂತ"],
        publishedDate: "1968",
        imageLinks: { thumbnail: "https://w/mookajji.jpg" },
      },
    });
    expect(volume.volumeInfo.description).toContain("Mookajjiya Kanasugalu");
  });
});

describe("searchVolumes", () => {
  it("lists the Wikidata work first, then catalogue books that answer the query, dropping its copies", async () => {
    route({
      google: {
        items: [
          { id: "g1", volumeInfo: { title: "Kannada Short Stories" } },
          { id: "g2", volumeInfo: { title: "Mookajjiya Kanasugalu" } },
          { id: "g3", volumeInfo: { title: "Mookajjiya Kanasugalu: A Study" } },
        ],
      },
    });
    const results = await searchVolumes("Mookajjiya kanasugalu", "all");
    expect(results.map((v) => v.id)).toEqual(["wd:Q17074443", "g3", "g1"]);
  });

  it("still answers from Wikidata when the catalogues fail", async () => {
    route({ googleStatus: 500 });
    const results = await searchVolumes("ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು", "title");
    expect(results.map((v) => v.id)).toContain("wd:Q17074443");
  });

  it("builds the form from the work itself, with its Wikipedia introduction", async () => {
    route();
    const [volume] = await searchWikidataBooks("Mookajjiya kanasugalu");
    const form = await buildFormFromVolume(volume);
    expect(form).toMatchObject({
      title: "ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು",
      author: "ಶಿವರಾಮ ಕಾರಂತ",
      publishedYear: "1968",
      sourceKey: "wd:Q17074443",
      coverUrl: "https://w/mookajji.jpg",
      coverSource: "wikipedia",
      description: "ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು ಶಿವರಾಮ ಕಾರಂತರ ಕಾದಂಬರಿ.",
    });
    expect(fetch.mock.calls.some(([url]) => String(url).includes("googleapis"))).toBe(false);
  });
});

describe("looksLikeAuthorPhoto", () => {
  it("spots an image named after the author, in either script", () => {
    expect(looksLikeAuthorPhoto("https://upload.wikimedia.org/x/Kuvempu.jpg", ["ಕುವೆಂಪು"])).toBe(true);
    expect(looksLikeAuthorPhoto("https://upload.wikimedia.org/x/600px-Kuvempu_1990.jpg", ["Kuvempu"])).toBe(true);
    expect(looksLikeAuthorPhoto("https://upload.wikimedia.org/x/Kanuru-Heggaditi-Novel.jpg", ["Kuvempu", "ಕುವೆಂಪು"])).toBe(false);
  });
});
