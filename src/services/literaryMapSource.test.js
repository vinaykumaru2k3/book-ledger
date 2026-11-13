import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateMap, growFrom, rankAuthors, resetMapSourceCache, sparql, withoutCelebrities } from "./literaryMapSource";

const E = "http://www.wikidata.org/entity/";
const uri = (v) => ({ type: "uri", value: v.startsWith("Q") || v.startsWith("P") ? E + v : v });
const lit = (v) => ({ type: "literal", value: String(v) });
const row = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "string" && /^[QP]\d+$/.test(v) ? uri(v) : lit(v)]));
const ok = (body) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body), headers: { get: () => null } });
const fail = (status) => Promise.resolve({ ok: false, status, json: () => Promise.resolve({}), headers: { get: () => null } });
const rows = (list) => ok({ results: { bindings: list.map(row) } });

// Kuvempu (Q1), Tejasvi (Q2), Karanth (Q3), and a statesman who only speaks Kannada (Q9).
// Q1 and Q2 both name Tagore (Q50) as an influence; Q1 and Q3 are in Navodaya (Q70).
const WIKIDATA = {
  writers: [
    { a: "Q9", links: 150, writes: "" },
    { a: "Q1", links: 28, writes: 1 },
    { a: "Q2", links: 11, writes: 1 },
    { a: "Q3", links: 18, writes: 1 },
  ],
  relations: [
    { a: "Q2", p: "http://www.wikidata.org/prop/direct/P737", b: "Q1" },
    { a: "Q2", p: "http://www.wikidata.org/prop/direct/P1066", b: "Q1" },
    { a: "Q1", p: "http://www.wikidata.org/prop/direct/P737", b: "Q50" },
    { a: "Q2", p: "http://www.wikidata.org/prop/direct/P737", b: "Q50" },
    { a: "Q3", p: "http://www.wikidata.org/prop/direct/P737", b: "Q51" },
    { a: "Q1", p: "http://www.wikidata.org/prop/direct/P135", b: "Q70" },
    { a: "Q3", p: "http://www.wikidata.org/prop/direct/P135", b: "Q70" },
    { a: "Q2", p: "http://www.wikidata.org/prop/direct/P135", b: "Q71" },
  ],
  people: {
    Q1: { native: "ಕುವೆಂಪು", en: "Kuvempu", born: 1904, died: 1994 },
    Q2: { native: "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ", en: "Poornachandra Tejasvi", born: 1938, died: 2007 },
    Q3: { native: "ಶಿವರಾಮ ಕಾರಂತ", en: "Shivaram Karanth", born: 1902, died: 1997 },
    Q9: { native: "ರಾಜಕಾರಣಿ", en: "A Statesman", born: 1921, died: 2004 },
    Q50: { native: "ರವೀಂದ್ರನಾಥ ಟ್ಯಾಗೋರ್", en: "Rabindranath Tagore", born: 1861, died: 1941 },
  },
  works: [
    { w: "Q101", a: "Q1", native: "ಕಾನೂರು ಹೆಗ್ಗಡತಿ", en: "Kanuru Heggaditi", published: 1936, links: 3, inLanguage: 1 },
    { w: "Q102", a: "Q1", native: "ಶ್ರೀ ರಾಮಾಯಣ ದರ್ಶನಂ", en: "Sri Ramayana Darshanam", links: 5, inLanguage: 1 },
    { w: "Q103", a: "Q1", native: "", en: "An English essay", links: 9, inLanguage: 0 },
    { w: "Q104", a: "Q1", native: "ಮಲೆಗಳಲ್ಲಿ ಮದುಮಗಳು", en: "Malegalalli Madumagalu", published: 1967, links: 2, inLanguage: 1 },
    { w: "Q201", a: "Q2", native: "ಚಿದಂಬರ ರಹಸ್ಯ", en: "Chidambara Rahasya", published: 1985, links: 1, inLanguage: 1 },
  ],
  movements: [{ m: "Q70", en: "Navodaya", from: 1900, to: 1950 }],
  articles: [
    { a: "Q1", title: "ಕುವೆಂಪು", site: "https://kn.wikipedia.org/" },
    { a: "Q3", title: "ಶಿವರಾಮ ಕಾರಂತ", site: "https://kn.wikipedia.org/" },
    { a: "Q2", title: "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ", site: "https://kn.wikipedia.org/" },
  ],
  // Kuvempu's page links to Karanth's and to Tejasvi's (already linked by influence).
  wikiLinks: { "ಕುವೆಂಪು": ["ಶಿವರಾಮ ಕಾರಂತ", "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ"] },
};

const valuesOf = (query, variable) => {
  const m = new RegExp(`VALUES \\?${variable} \\{([^}]*)\\}`).exec(query);
  return m ? m[1].trim().split(/\s+/).map((v) => v.replace("wd:", "")) : [];
};

/** A fake Wikidata query service and Wikipedia, answering by the shape of each query. */
function route({ writers, wikipedia, onQuery } = {}) {
  const queries = [];
  globalThis.fetch = vi.fn((url, init = {}) => {
    const body = init.body instanceof URLSearchParams ? init.body : new URLSearchParams();
    if (String(url).includes("wikipedia.org")) {
      if (wikipedia) return wikipedia();
      const titles = body.get("titles").split("|");
      const targets = new Set(body.get("pltitles").split("|"));
      const pages = titles.map((title, i) => ({ pageid: i, title, links: (WIKIDATA.wikiLinks[title] || []).filter((t) => targets.has(t)).map((t) => ({ title: t })) }));
      return ok({ query: { pages: Object.fromEntries(pages.map((p) => [p.pageid, p])) } });
    }
    if (String(url).includes("www.wikidata.org/w/api.php")) {
      // A book added from Wikidata: its work, by Kuvempu.
      return ok({
        entities: {
          Q101: {
            id: "Q101",
            labels: { kn: { value: "ಕಾನೂರು ಹೆಗ್ಗಡತಿ" }, en: { value: "Kanuru Heggaditi" } },
            claims: {
              P31: [{ mainsnak: { datavalue: { value: { id: "Q8261" } } } }],
              P50: [{ mainsnak: { datavalue: { value: { id: "Q1" } } } }],
              P577: [{ mainsnak: { datavalue: { value: { time: "+1936-00-00T00:00:00Z" } } } }],
            },
          },
        },
      });
    }
    const q = body.get("query");
    queries.push(q);
    const custom = onQuery?.(q);
    if (custom) return custom;
    if (q.includes("wdt:P6886|wdt:P1412")) return writers ? writers(q) : rows(WIKIDATA.writers);
    if (q.includes("VALUES ?p")) {
      const asked = new Set(valuesOf(q, "a"));
      return rows(WIKIDATA.relations.filter((r) => asked.has(r.a)));
    }
    if (q.includes("wdt:P569")) return rows(valuesOf(q, "a").filter((a) => WIKIDATA.people[a]).map((a) => ({ a, ...WIKIDATA.people[a] })));
    if (q.includes("wdt:P50 ?a")) {
      const asked = new Set(valuesOf(q, "a"));
      return rows(WIKIDATA.works.filter((w) => asked.has(w.a)).map(({ w, a, links, inLanguage }) => ({ w, a, links, inLanguage })));
    }
    if (q.includes("VALUES ?w")) {
      const asked = new Set(valuesOf(q, "w"));
      return rows(WIKIDATA.works.filter((w) => asked.has(w.w)).map(({ w, native, en, published }) => ({ w, native, en, ...(published ? { published } : {}) })));
    }
    if (q.includes("wdt:P571")) return rows(WIKIDATA.movements.filter((m) => valuesOf(q, "m").includes(m.m)));
    if (q.includes("schema:about")) {
      return rows(WIKIDATA.articles.filter((r) => valuesOf(q, "a").includes(r.a) && q.includes(r.site)).map(({ a, title }) => ({ a, title })));
    }
    return rows([]);
  });
  return queries;
}

const KANNADA = { kind: "language", qid: "Q33673", langCode: "kn" };
const node = (g, id) => g.nodes.find((n) => n.id === id);
const linkOf = (g, from, type, to) => g.links.find((l) => l.from === from && l.type === type && l.to === to);

beforeEach(() => resetMapSourceCache());
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("rankAuthors", () => {
  it("puts writers in the language before those who only speak it, then by Wikipedia pages", () => {
    expect(rankAuthors(WIKIDATA.writers, 10)).toEqual(["Q1", "Q3", "Q2", "Q9"]);
    expect(rankAuthors([...WIKIDATA.writers, { a: "Q1", links: 2, writes: "" }, { a: "not an id" }], 2)).toEqual(["Q1", "Q3"]);
  });
});

describe("withoutCelebrities", () => {
  it("leaves out people famous for something else, but not writers with other trades", async () => {
    route({
      onQuery: (q) =>
        q.includes("wdt:P106 ?o")
          ? rows([
              { a: "Q1", all: 4, literary: 3, core: 2, other: 0 }, // a novelist and poet
              { a: "Q9", all: 15, literary: 2, core: 1, other: 1 }, // a statesman who wrote poems
              { a: "Q60", all: 20, literary: 3, core: 2, other: 1 }, // an actor, poet and playwright
              { a: "Q61", all: 19, literary: 2, core: 1, other: 0 }, // a painter and poet
              { a: "Q62", all: 10, literary: 2, core: 1, other: 1 }, // a poet who sat in parliament
            ])
          : null,
    });
    expect(await withoutCelebrities(["Q1", "Q9", "Q60", "Q61", "Q62"])).toEqual(["Q1", "Q60", "Q61", "Q62"]);
  });

  it("keeps everyone when the check itself fails", async () => {
    globalThis.fetch = vi.fn(() => fail(400));
    expect(await withoutCelebrities(["Q1", "Q9"])).toEqual(["Q1", "Q9"]);
  });
});

describe("generateMap for a language", () => {
  it("builds authors, works, movements and links, with names in both scripts", async () => {
    route();
    const stages = [];
    const g = await generateMap({ scope: KANNADA, size: "focused", onProgress: (p) => stages.push(p.stage) });

    expect(node(g, "Q1")).toMatchObject({ kind: "author", name: { native: "ಕುವೆಂಪು", en: "Kuvempu" }, years: { from: 1904, to: 1994 }, source: "wikidata" });
    // "Tejasvi was influenced by Kuvempu" is drawn from Kuvempu to Tejasvi.
    expect(linkOf(g, "Q1", "influenced", "Q2")).toBeTruthy();
    expect(linkOf(g, "Q2", "student_of", "Q1")).toBeTruthy();
    expect(stages).toEqual(["authors", "relations", "details", "mentions", "done"]);
  });

  it("adds an outside influencer named by two authors, and a movement shared by two", async () => {
    route();
    const g = await generateMap({ scope: KANNADA });
    expect(node(g, "Q50")?.name.en).toBe("Rabindranath Tagore");
    expect(linkOf(g, "Q50", "influenced", "Q1")).toBeTruthy();
    expect(node(g, "Q51")).toBeUndefined(); // named by one author only
    expect(node(g, "Q70")).toMatchObject({ kind: "movement", years: { from: 1900, to: 1950 } });
    expect(linkOf(g, "Q3", "member_of", "Q70")).toBeTruthy();
    expect(node(g, "Q71")).toBeUndefined();
  });

  it("keeps three works an author wrote in the language before others", async () => {
    route();
    const g = await generateMap({ scope: KANNADA });
    const kuvempus = g.nodes.filter((n) => n.kind === "work" && n.authorIds.includes("Q1")).map((n) => n.id);
    expect(kuvempus).toEqual(["Q102", "Q101", "Q104"]);
    expect(linkOf(g, "Q1", "wrote", "Q101")).toBeTruthy();
  });

  it("links authors whose Wikipedia pages link to each other, unless a stronger link exists", async () => {
    route();
    const g = await generateMap({ scope: KANNADA });
    const mentions = g.links.filter((l) => l.type === "mentioned");
    expect(mentions).toHaveLength(1);
    expect(mentions[0]).toMatchObject({ from: "Q1", to: "Q3", source: "wikipedia" });
  });

  it("still makes the map when Wikipedia cannot be reached", async () => {
    route({ wikipedia: () => Promise.reject(new TypeError("Failed to fetch")) });
    const g = await generateMap({ scope: KANNADA });
    expect(g.links.some((l) => l.type === "mentioned")).toBe(false);
    expect(linkOf(g, "Q1", "influenced", "Q2")).toBeTruthy();
  });

  it("reads a large language one occupation at a time, notable writers only, and survives one failing", async () => {
    let calls = 0;
    const queries = route({
      writers: () => {
        calls += 1;
        return calls === 2 ? fail(500) : rows(WIKIDATA.writers.slice(1));
      },
    });
    const g = await generateMap({ scope: { kind: "language", qid: "Q1860", langCode: "en" } });
    const writerQueries = queries.filter((q) => q.includes("wdt:P6886|wdt:P1412"));
    expect(writerQueries.length).toBeGreaterThan(5);
    expect(writerQueries.every((q) => q.includes("FILTER(?sl >= 15)"))).toBe(true);
    expect(node(g, "Q1")).toBeTruthy();
  });

  it("falls back to one occupation at a time when the whole language takes too long", async () => {
    let first = true;
    route({
      writers: (q) => {
        if (first && !q.includes("FILTER(?sl")) {
          first = false;
          return fail(500);
        }
        return rows(WIKIDATA.writers);
      },
    });
    const g = await generateMap({ scope: KANNADA });
    expect(node(g, "Q1")).toBeTruthy();
  });
});

describe("generateMap for a movement", () => {
  it("puts the movement itself on the map, with its members linked to it", async () => {
    route({
      onQuery: (q) => {
        if (q.includes("wdt:P279")) return rows([]);
        if (q.includes("wdt:P135|wdt:P136")) return rows([{ a: "Q1", links: 28 }, { a: "Q3", links: 18 }]);
        return null;
      },
    });
    WIKIDATA.movements.push({ m: "Q80", en: "Romanticism", from: 1790, to: 1850 });
    try {
      const g = await generateMap({ scope: { kind: "movement", qid: "Q80", langCode: "en" } });
      expect(node(g, "Q80")?.name.en).toBe("Romanticism");
      expect(linkOf(g, "Q1", "member_of", "Q80")).toBeTruthy();
      expect(linkOf(g, "Q3", "member_of", "Q80")).toBeTruthy();
    } finally {
      WIKIDATA.movements.pop();
    }
  });
});

describe("generateMap for a library", () => {
  it("starts from the reader's books, their authors, and the authors' other works", async () => {
    route();
    const stages = [];
    const g = await generateMap({
      scope: { kind: "library", langCode: "kn" },
      books: [{ id: "b1", sourceKey: "wd:Q101", title: "ಕಾನೂರು ಹೆಗ್ಗಡತಿ" }],
      onProgress: (p) => stages.push(p.stage),
    });
    expect(node(g, "Q101")).toMatchObject({ kind: "work", years: { from: 1936 }, authorIds: ["Q1"] });
    expect(node(g, "Q1")?.name.en).toBe("Kuvempu");
    expect(node(g, "Q102")).toBeTruthy(); // another of Kuvempu's works
    expect(linkOf(g, "Q1", "wrote", "Q101")).toBeTruthy();
    expect(stages).toContain("library");
  });
});

describe("growFrom", () => {
  it("brings an author's influences, students and movement peers", async () => {
    route({
      onQuery: (q) =>
        q.includes("UNION")
          ? rows([
              { x: "Q50", rel: "influencedBy", links: 200 },
              { x: "Q2", rel: "student", links: 11 },
              { x: "Q3", rel: "peer", movement: "Q70", links: 18 },
            ])
          : null,
    });
    const { nodes, links } = await growFrom("Q1", { langCode: "kn" });
    expect(nodes.map((n) => n.id).sort()).toEqual(["Q2", "Q3", "Q50", "Q70"]);
    expect(links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "Q50", to: "Q1", type: "influenced" }),
        expect.objectContaining({ from: "Q2", to: "Q1", type: "student_of" }),
        expect.objectContaining({ from: "Q3", to: "Q70", type: "member_of" }),
        expect.objectContaining({ from: "Q1", to: "Q70", type: "member_of" }),
      ])
    );
  });
});

describe("sparql", () => {
  it("tries once more when the service is busy, then remembers the answer", async () => {
    vi.useFakeTimers();
    let calls = 0;
    globalThis.fetch = vi.fn(() => (++calls === 1 ? fail(429) : rows([{ a: "Q1" }])));
    const pending = sparql("SELECT 1");
    await vi.advanceTimersByTimeAsync(2000);
    await expect(pending).resolves.toEqual([{ a: "Q1" }]);
    await expect(sparql("SELECT 1")).resolves.toEqual([{ a: "Q1" }]);
    expect(calls).toBe(2);
  });

  it("gives up after a second busy answer, and on a bad query at once", async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(() => fail(503));
    const busy = sparql("SELECT 2").catch((e) => e);
    await vi.advanceTimersByTimeAsync(2000);
    expect((await busy).status).toBe(503);
    expect(fetch).toHaveBeenCalledTimes(2);

    globalThis.fetch = vi.fn(() => fail(400));
    await expect(sparql("SELECT 3")).rejects.toMatchObject({ status: 400 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("stops waiting after the time limit", async () => {
    globalThis.fetch = vi.fn((_, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))));
    await expect(sparql("SELECT 4", { timeout: 10 })).rejects.toMatchObject({ code: "timeout" });
  });
});
