import { describe, expect, it } from "vitest";
import {
  LIMITS,
  addLink,
  addToMap,
  applySuggestion,
  countsOf,
  degree,
  hiddenItems,
  inLibrary,
  influencePath,
  linkId,
  linkProblem,
  mergeGenerated,
  neighbours,
  normalizeGraph,
  normalizeMeta,
  removeLink,
  removeNode,
  searchNodes,
  setHidden,
  timelineOf,
  updateLink,
  updateNode,
  validateGraph,
} from "./literaryMap";

const author = (id, native, en, from, to, extra = {}) => ({ id, qid: id, kind: "author", name: { native, en }, years: { from, to }, source: "wikidata", ...extra });
const work = (id, native, en, year, authorIds) => ({ id, qid: id, kind: "work", name: { native, en }, years: { from: year }, authorIds, source: "wikidata" });
const movement = (id, en, from, to) => ({ id, qid: id, kind: "movement", name: { en }, years: { from, to }, source: "wikidata" });
const link = (from, type, to, source = "wikidata") => ({ from, type, to, source });

const KUVEMPU = author("Q1", "ಕುವೆಂಪು", "Kuvempu", 1904, 1994);
const TEJASVI = author("Q2", "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ", "Poornachandra Tejasvi", 1938, 2007);
const KARANTH = author("Q3", "ಶಿವರಾಮ ಕಾರಂತ", "Shivaram Karanth", 1902, 1997);
const ADIGA = author("Q4", "", "Aravind Adiga", 1974);
const KANURU = work("Q10", "ಕಾನೂರು ಹೆಗ್ಗಡತಿ", "Kanooru Heggadathi", 1936, ["Q1"]);
const NAVODAYA = movement("Q20", "Navodaya", 1900, 1950);

const graph = () =>
  normalizeGraph({
    nodes: [KUVEMPU, TEJASVI, KARANTH, ADIGA, KANURU, NAVODAYA],
    links: [
      link("Q1", "influenced", "Q2"),
      link("Q2", "student_of", "Q1"),
      link("Q1", "wrote", "Q10"),
      link("Q1", "member_of", "Q20"),
      link("Q3", "member_of", "Q20"),
      link("Q3", "mentioned", "Q1", "wikipedia"),
    ],
  });

describe("normalizeGraph", () => {
  it("drops duplicates, self links and links to nodes that are not there", () => {
    const g = normalizeGraph({
      nodes: [KUVEMPU, { ...KUVEMPU, name: { en: "Copy" } }, TEJASVI],
      links: [link("Q1", "influenced", "Q2"), link("Q1", "influenced", "Q2"), link("Q1", "influenced", "Q1"), link("Q1", "influenced", "Q99")],
    });
    expect(g.nodes.map((n) => n.name.en)).toEqual(["Kuvempu", "Poornachandra Tejasvi"]);
    expect(g.links).toHaveLength(1);
  });

  it("gives an undirected link the same id whichever way round it is written", () => {
    expect(linkId("Q3", "mentioned", "Q1")).toBe(linkId("Q1", "mentioned", "Q3"));
    expect(linkId("Q3", "influenced", "Q1")).not.toBe(linkId("Q1", "influenced", "Q3"));
    const g = normalizeGraph({ nodes: [KUVEMPU, KARANTH], links: [link("Q3", "mentioned", "Q1"), link("Q1", "mentioned", "Q3")] });
    expect(g.links).toHaveLength(1);
  });

  it("cleans unknown kinds, sources, years and citations", () => {
    const g = normalizeGraph({
      nodes: [{ id: "x", kind: "planet", name: { en: "X" }, years: { from: "abc", to: 1950 }, source: "rumour" }, KUVEMPU],
      links: [{ from: "x", to: "Q1", type: "loved", citation: "javascript:alert(1)" }],
    });
    expect(g.nodes[0]).toMatchObject({ kind: "author", years: { to: 1950 }, source: "user" });
    expect(g.nodes[0].years.from).toBeUndefined();
    expect(g.links[0].type).toBe("mentioned");
    expect(g.links[0].citation).toBeUndefined();
  });
});

describe("normalizeMeta and validateGraph", () => {
  it("keeps maps private unless asked, and only takes known scopes", () => {
    const meta = normalizeMeta({ title: "  Kannada  ", scope: { kind: "galaxy", qid: "Q33673", langCode: "kn" } });
    expect(meta).toMatchObject({ title: "Kannada", visibility: "private", scope: { kind: "language", qid: "Q33673", langCode: "kn" } });
  });

  it("refuses graphs over the size limits", () => {
    const nodes = Array.from({ length: LIMITS.nodes + 1 }, (_, i) => author(`Q${i + 1}`, "", `A${i}`));
    expect(validateGraph(normalizeGraph({ nodes }))).toHaveLength(1);
    expect(validateGraph(graph())).toEqual([]);
  });
});

describe("countsOf", () => {
  it("counts what a reader sees", () => {
    const g = graph();
    // Links between writers only: authorship and movement membership are not counted.
    expect(countsOf(g)).toEqual({ authors: 4, works: 1, movements: 1, links: 3 });
    g.nodes[0].hidden = true;
    expect(countsOf(g)).toEqual({ authors: 3, works: 1, movements: 1, links: 0 });
  });
});

describe("mergeGenerated", () => {
  it("keeps what the owner hid, wrote and added when Wikidata is read again", () => {
    const owned = graph();
    owned.nodes.find((n) => n.id === "Q4").hidden = true;
    owned.links.find((l) => l.type === "influenced").note = "Tejasvi wrote about his father's influence.";
    owned.nodes.push({ id: "u1", kind: "author", name: { en: "Local poet" }, years: {}, source: "user" });
    owned.links.push({ id: linkId("u1", "influenced", "Q3"), from: "u1", to: "Q3", type: "influenced", source: "user" });

    const fresh = normalizeGraph({
      nodes: [KUVEMPU, TEJASVI, KARANTH, ADIGA, author("Q5", "ಬೇಂದ್ರೆ", "D. R. Bendre", 1896, 1981)],
      links: [link("Q1", "influenced", "Q2"), link("Q5", "mentioned", "Q1", "wikipedia")],
    });
    const { graph: merged, changes } = mergeGenerated(owned, fresh);

    expect(merged.nodes.find((n) => n.id === "Q4").hidden).toBe(true);
    expect(merged.links.find((l) => l.type === "influenced" && l.from === "Q1").note).toMatch(/father/);
    expect(merged.nodes.some((n) => n.id === "u1")).toBe(true);
    expect(merged.links.some((l) => l.from === "u1")).toBe(true);
    expect(changes.addedNodes).toEqual(["Q5"]);
    // The work and movement are gone from Wikidata and nobody annotated them.
    expect(changes.removedNodes.sort()).toEqual(["Q10", "Q20"]);
  });
});

describe("applySuggestion", () => {
  it("adds a suggested link, credited to the suggestion with its source", () => {
    const g = applySuggestion(graph(), {
      kind: "add-link",
      payload: { from: "Q3", to: "Q4", type: "influenced" },
      note: "Adiga names Karanth in interviews.",
      citation: "https://example.org/interview",
    });
    expect(g.links.find((l) => l.from === "Q3" && l.to === "Q4")).toMatchObject({ source: "suggestion", note: /interviews/, citation: "https://example.org/interview" });
  });

  it("fixes names and years, and hides", () => {
    let g = applySuggestion(graph(), { kind: "fix-node", payload: { id: "Q4", years: { from: 1974 }, name: { native: "ಅರವಿಂದ ಅಡಿಗ" } } });
    expect(g.nodes.find((n) => n.id === "Q4").name).toMatchObject({ native: "ಅರವಿಂದ ಅಡಿಗ", en: "Aravind Adiga" });
    g = applySuggestion(g, { kind: "hide", payload: { nodeId: "Q4" } });
    expect(g.nodes.find((n) => n.id === "Q4").hidden).toBe(true);
    expect(() => applySuggestion(g, { kind: "delete-everything" })).toThrow();
  });
});

describe("neighbours, degree and influencePath", () => {
  it("lists a node's links with direction", () => {
    const n = neighbours(graph(), "Q1", { types: ["influenced", "student_of"] });
    expect(n.map((x) => [x.node.id, x.link.type, x.outgoing])).toEqual([
      ["Q2", "influenced", true],
      ["Q2", "student_of", false],
    ]);
  });

  it("weighs influence above a mention", () => {
    const d = degree(graph());
    expect(d.get("Q1")).toBeGreaterThan(d.get("Q3"));
    expect(d.get("Q4")).toBe(0);
  });

  it("finds the shortest chain, and uses mentions only when asked", () => {
    const g = graph();
    expect(influencePath(g, "Q2", "Q1")).toEqual(["Q2", "Q1"]);
    expect(influencePath(g, "Q2", "Q3")).toEqual([]);
    expect(influencePath(g, "Q2", "Q3", { includeWeak: true })).toEqual(["Q2", "Q1", "Q3"]);
  });
});

describe("timelineOf", () => {
  it("bands movements, groups authors under them in birth order, and keeps the undated apart", () => {
    const t = timelineOf(graph());
    expect(t.bands.map((b) => [b.movement.id, b.from, b.to])).toEqual([["Q20", 1900, 1950]]);
    expect(t.lanes[0].movement.id).toBe("Q20");
    expect(t.lanes[0].members.map((m) => m.author.id)).toEqual(["Q3", "Q1"]);
    expect(t.lanes[0].members[1].works).toEqual([{ id: "Q10", year: 1936 }]);
    expect(t.lanes[1].movement).toBeNull();
    expect(t.lanes[1].members.map((m) => m.author.id)).toEqual(["Q2", "Q4"]);
    expect(t.range).toEqual({ from: 1900, to: 2044 });
    expect(t.undated).toEqual([]);
  });

  it("estimates a movement's span from its members when Wikidata has none", () => {
    const g = graph();
    g.nodes.find((n) => n.id === "Q20").years = {};
    const band = timelineOf(g).bands[0];
    expect(band).toMatchObject({ from: 1927, to: 1997, estimated: true });
  });
});

describe("searchNodes", () => {
  it("finds a name in either script and in other spellings", () => {
    const g = graph();
    expect(searchNodes(g, "kuvempu")[0].id).toBe("Q1");
    expect(searchNodes(g, "ಕುವೆಂ")[0].id).toBe("Q1");
    expect(searchNodes(g, "tejaswi")[0].id).toBe("Q2");
    expect(searchNodes(g, "kanuru heggaditi")[0].id).toBe("Q10");
    expect(searchNodes(g, "")).toEqual([]);
  });
});

describe("inLibrary", () => {
  it("matches a book by its Wikidata id, or by title and author in another spelling", () => {
    const g = graph();
    expect(inLibrary(g, [{ id: "b1", sourceKey: "wd:Q10", title: "Anything" }]).get("Q10")).toBe("b1");
    expect(inLibrary(g, [{ id: "b2", title: "Kanuru Heggaditi", author: "Kuvempu" }]).get("Q10")).toBe("b2");
    expect(inLibrary(g, [{ id: "b3", title: "Kanuru Heggaditi", author: "Someone Else" }]).size).toBe(0);
  });
});

describe("owner edits", () => {
  const MOVEMENT_NODE = { id: "Q30", qid: "Q30", kind: "movement", name: { en: "Navya" }, years: {}, source: "wikidata" };

  it("adds what is new, skips what is there, and shows a hidden node again only when asked", () => {
    const g = setHidden(graph(), { nodeId: "Q4" });
    const grown = { nodes: [ADIGA, MOVEMENT_NODE], links: [link("Q2", "member_of", "Q30"), link("Q2", "member_of", "Q99")] };
    const { graph: next, added } = addToMap(g, grown);
    expect(added).toEqual({ nodes: 1, links: 1 });
    expect(next.nodes.find((n) => n.id === "Q4").hidden).toBe(true);
    expect(addToMap(g, grown, { unhide: true }).graph.nodes.find((n) => n.id === "Q4").hidden).toBeUndefined();
    expect(g.nodes).toHaveLength(6); // the input is unchanged
  });

  it("asks every hand-drawn link for its two ends and a note", () => {
    expect(linkProblem({ from: "Q1", to: "Q1", type: "influenced", note: "x" })).toBe("ends");
    expect(linkProblem({ from: "Q1", to: "Q3", type: "nope", note: "x" })).toBe("type");
    expect(linkProblem({ from: "Q1", to: "Q3", type: "influenced", note: "  " })).toBe("note");
    expect(linkProblem({ from: "Q1", to: "Q3", type: "influenced", note: "Letters" })).toBe("");
    expect(() => addLink(graph(), { from: "Q1", to: "Q3", type: "influenced" })).toThrow();
  });

  it("draws a link as the owner, or brings back a hidden one with the owner's note", () => {
    const drawn = addLink(graph(), { from: "Q3", to: "Q4", type: "contemporary", note: "Both wrote of the coast", citation: "https://example.org/a" });
    expect(drawn.links.at(-1)).toMatchObject({ from: "Q3", to: "Q4", source: "user", note: "Both wrote of the coast", citation: "https://example.org/a" });

    const id = linkId("Q1", "influenced", "Q2");
    const hidden = setHidden(graph(), { linkId: id });
    const back = addLink(hidden, { from: "Q1", to: "Q2", type: "influenced", note: "His teacher" });
    const restored = back.links.find((l) => l.id === id);
    expect(restored).toMatchObject({ source: "wikidata", note: "His teacher" });
    expect(restored.hidden).toBeUndefined();
    expect(back.links).toHaveLength(graph().links.length);
  });

  it("keeps the owner's corrections through a refresh from Wikidata", () => {
    const fixed = updateNode(graph(), "Q2", { name: { en: "K. P. Poornachandra Tejasvi" }, years: { from: 1938, to: 2007 }, note: "Son of Kuvempu" });
    const node = fixed.nodes.find((n) => n.id === "Q2");
    expect(node).toMatchObject({ edited: true, note: "Son of Kuvempu", name: { native: "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ", en: "K. P. Poornachandra Tejasvi" } });
    const { graph: merged } = mergeGenerated(fixed, graph());
    expect(merged.nodes.find((n) => n.id === "Q2").name.en).toBe("K. P. Poornachandra Tejasvi");
    // A note alone is not a correction.
    expect(updateNode(graph(), "Q1", { note: "Rashtrakavi" }).nodes[0].edited).toBeUndefined();
  });

  it("changes a link's note and citation", () => {
    const id = linkId("Q1", "influenced", "Q2");
    const next = updateLink(graph(), id, { note: "Father and son", citation: "https://example.org/b", type: "wrote" });
    expect(next.links.find((l) => l.id === id)).toMatchObject({ type: "influenced", note: "Father and son", citation: "https://example.org/b" });
  });

  it("hides what was generated and deletes what the owner added", () => {
    const withMine = addToMap(graph(), {
      nodes: [{ id: "u1", kind: "work", name: { en: "Notes" }, authorIds: ["Q1", "u2"], source: "user" }, { id: "u2", kind: "author", name: { en: "A friend" }, source: "user" }],
      links: [{ from: "u2", to: "u1", type: "wrote", source: "user" }],
    }).graph;
    const noFriend = removeNode(withMine, "u2");
    expect(noFriend.nodes.some((n) => n.id === "u2")).toBe(false);
    expect(noFriend.links.some((l) => l.from === "u2")).toBe(false);
    expect(noFriend.nodes.find((n) => n.id === "u1").authorIds).toEqual(["Q1"]);

    const noKuvempu = removeNode(graph(), "Q1");
    expect(noKuvempu.nodes.find((n) => n.id === "Q1").hidden).toBe(true);
    expect(noKuvempu.links).toHaveLength(graph().links.length);

    const mention = linkId("Q3", "mentioned", "Q1");
    expect(removeLink(graph(), mention).links.find((l) => l.id === mention).hidden).toBe(true);
    const drawn = addLink(graph(), { from: "Q3", to: "Q4", type: "influenced", note: "x" });
    expect(removeLink(drawn, linkId("Q3", "influenced", "Q4")).links).toHaveLength(graph().links.length);
  });

  it("lists what is hidden, and shows it again", () => {
    const g = setHidden(setHidden(graph(), { nodeId: "Q4" }), { linkId: linkId("Q1", "influenced", "Q2") });
    const hidden = hiddenItems(g);
    expect(hidden.nodes.map((n) => n.id)).toEqual(["Q4"]);
    expect(hidden.links.map((l) => l.id)).toEqual([linkId("Q1", "influenced", "Q2")]);
    expect(hiddenItems(setHidden(g, { nodeId: "Q4" }, false)).nodes).toEqual([]);
  });
});
