// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../shared/i18n/LanguageContext";
import { normalizeGraph } from "../../domain/literaryMap";
import { buildPath, parseLocation } from "../../app/routes";
import MapListView from "./MapListView";
import { linkPhrase, yearsText } from "./mapText";
import MapInspector from "./MapInspector";
import { drawnNeighbours, layoutModel, regionPoints } from "./mapLayout";

vi.mock("../../services/wikidataBooks", async (importOriginal) => ({
  ...(await importOriginal()),
  itemIntro: vi.fn(async () => ({ text: "A poet of the Kannada renaissance.", lang: "en", title: "Kuvempu", url: "https://en.wikipedia.org/wiki/Kuvempu" })),
}));

afterEach(cleanup);

const graph = normalizeGraph({
  nodes: [
    { id: "Q1", qid: "Q1", kind: "author", name: { native: "ಕುವೆಂಪು", en: "Kuvempu" }, years: { from: 1904, to: 1994 }, source: "wikidata" },
    { id: "Q2", qid: "Q2", kind: "author", name: { native: "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ", en: "Poornachandra Tejasvi" }, years: { from: 1938, to: 2007 }, source: "wikidata" },
    { id: "Q10", qid: "Q10", kind: "work", name: { native: "ಕಾನೂರು ಹೆಗ್ಗಡತಿ", en: "Kanooru Heggadathi" }, years: { from: 1936 }, authorIds: ["Q1"], source: "wikidata" },
  ],
  links: [
    { from: "Q1", type: "influenced", to: "Q2", source: "wikidata" },
    { from: "Q1", type: "wrote", to: "Q10", source: "wikidata" },
    { from: "Q2", type: "mentioned", to: "Q1", source: "wikipedia" },
  ],
});

const renderList = (props = {}) =>
  render(
    <LanguageProvider>
      <MapListView graph={graph} scope={{ kind: "language", langCode: "kn" }} books={[]} canAdd onAddBook={() => {}} {...props} />
    </LanguageProvider>
  );

describe("map routes", () => {
  it("nests a map, its view and a node under /maps", () => {
    expect(parseLocation("/maps")).toMatchObject({ view: "maps", params: {}, valid: true });
    expect(parseLocation("/maps/new").params).toEqual({ id: "new" });
    expect(parseLocation("/maps/abc/node/Q1").params).toEqual({ id: "abc", section: "node", sub: "Q1" });
    expect(buildPath("maps", { id: "abc", section: "list" })).toBe("/maps/abc/list");
  });
});

describe("mapText", () => {
  it("reads a link from either end", () => {
    expect(linkPhrase("influenced", true)).toBe("influenced");
    expect(linkPhrase("influenced", false)).toBe("was influenced by");
    expect(linkPhrase("mentioned", false)).toBe("is mentioned with");
  });

  it("writes life spans", () => {
    expect(yearsText({ from: 1904, to: 1994 })).toBe("1904–1994");
    expect(yearsText({ from: 1974 })).toBe("b. 1974");
    expect(yearsText({ from: 1936 }, "work")).toBe("1936");
    expect(yearsText({})).toBe("");
  });
});

describe("MapListView", () => {
  it("lists authors with both scripts, the native name marked as Kannada", () => {
    renderList();
    const kuvempu = screen.getByText("ಕುವೆಂಪು");
    expect(kuvempu.getAttribute("lang")).toBe("kn");
    expect(screen.getByRole("tab", { name: "Authors (2)" }).getAttribute("aria-selected")).toBe("true");
  });

  it("finds an author by another spelling", () => {
    renderList();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search this map" }), { target: { value: "tejaswi" } });
    const rows = screen.getAllByRole("button", { expanded: false });
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Poornachandra Tejasvi");
  });

  it("opens a row to its links in sentences, with where each came from", () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /Kuvempu/ }));
    const row = screen.getByRole("button", { name: /Kuvempu/, expanded: true }).closest("li");
    expect(within(row).getByText("influenced")).toBeTruthy();
    expect(within(row).getByText("is mentioned with")).toBeTruthy();
    expect(within(row).getByText("Wikipedia mention")).toBeTruthy();
  });

  it("marks works already in the library, and offers to add the others", () => {
    const onAddBook = vi.fn();
    renderList({ books: [], onAddBook });
    fireEvent.click(screen.getByRole("tab", { name: "Works (1)" }));
    fireEvent.click(screen.getByRole("button", { name: /Kanooru/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add to library" }));
    expect(onAddBook).toHaveBeenCalledWith(expect.objectContaining({ id: "Q10" }));

    cleanup();
    renderList({ books: [{ id: "b1", sourceKey: "wd:Q10", title: "Kanooru" }] });
    fireEvent.click(screen.getByRole("tab", { name: "Works (1)" }));
    expect(screen.getByText("In your library")).toBeTruthy();
  });
});

describe("layoutModel", () => {
  const withMovement = normalizeGraph({
    nodes: [
      ...graph.nodes,
      { id: "Q20", qid: "Q20", kind: "movement", name: { en: "Navodaya" }, source: "wikidata" },
      { id: "Q21", qid: "Q21", kind: "movement", name: { en: "Navya" }, source: "wikidata" },
    ],
    links: [...graph.links, { from: "Q1", type: "member_of", to: "Q20", source: "wikidata" }],
  });

  it("sorts lines into kinds and keeps works beside their author", () => {
    const model = layoutModel(graph);
    expect(model.links.map((l) => [l.type, l.kind, l.directed])).toEqual([
      ["influenced", "influence", true],
      ["wrote", "works", true],
      ["mentioned", "mentions", false],
    ]);
    const work = model.byId.get("Q10");
    const author = model.byId.get("Q1");
    expect(Math.hypot(work.x - author.x, work.y - author.y)).toBeLessThan(40);
    expect(work.radius).toBeLessThan(author.radius);
  });

  it("leaves out works and switched-off lines", () => {
    const model = layoutModel(graph, { influence: true, mentions: false, works: false });
    expect(model.byId.has("Q10")).toBe(false);
    expect(model.links.map((l) => l.type)).toEqual(["influenced"]);
  });

  it("draws movements with members as regions and the rest as nodes", () => {
    const model = layoutModel(withMovement);
    expect(model.regions.map((r) => [r.id, r.memberIds])).toEqual([["Q20", ["Q1"]]]);
    expect(model.byId.has("Q20")).toBe(false);
    expect(model.byId.get("Q21").kind).toBe("movement");
    expect(model.byId.get("Q1").group).toBe("Q20");
    expect(regionPoints(model, model.regions[0])).toHaveLength(8);
  });

  it("finds drawn neighbours, including fellow movement members", () => {
    const model = layoutModel(withMovement);
    expect([...drawnNeighbours(model, "Q1")].sort()).toEqual(["Q1", "Q10", "Q2", "Q20"]);
    expect([...drawnNeighbours(model, "Q20")].sort()).toEqual(["Q1", "Q20"]);
  });
});

describe("MapInspector", () => {
  const renderInspector = (node, props = {}) =>
    render(
      <LanguageProvider>
        <MapInspector
          graph={graph}
          node={node}
          lang="kn"
          canAdd
          onAddBook={() => {}}
          onJump={() => {}}
          onClose={() => {}}
          onShowInList={() => {}}
          path={null}
          onPath={() => {}}
          {...props}
        />
      </LanguageProvider>
    );
  const byId = (id) => graph.nodes.find((n) => n.id === id);

  it("shows an author with years, a credited Wikipedia intro and a path finder", async () => {
    renderInspector(byId("Q1"));
    expect(screen.getByText(/Author · 1904–1994/)).toBeTruthy();
    expect(await screen.findByText("A poet of the Kannada renaissance.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Read more on Wikipedia/ }).getAttribute("href")).toBe("https://en.wikipedia.org/wiki/Kuvempu");
    expect(screen.getByRole("heading", { name: /Trace a chain of influence/ })).toBeTruthy();
  });

  it("traces to another author, and shows the chain", () => {
    const onPath = vi.fn();
    const { rerender } = renderInspector(byId("Q1"), { onPath });
    fireEvent.change(screen.getByRole("searchbox", { name: "Trace to another author" }), { target: { value: "tejasvi" } });
    const picks = document.querySelector(".pk-map-path .pk-map-picks");
    fireEvent.click(within(picks).getByRole("button", { name: /Poornachandra Tejasvi/ }));
    expect(onPath).toHaveBeenCalledWith("Q2");
    rerender(
      <LanguageProvider>
        <MapInspector graph={graph} node={byId("Q1")} lang="kn" onJump={() => {}} onClose={() => {}} onShowInList={() => {}} path={{ ids: ["Q1", "Q2"], weak: false }} onPath={onPath} />
      </LanguageProvider>
    );
    expect(screen.getByText("1 steps of influence")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onPath).toHaveBeenLastCalledWith(null);
  });

  it("offers to add a work to the library, and closes", () => {
    const onAddBook = vi.fn();
    const onClose = vi.fn();
    renderInspector(byId("Q10"), { onAddBook, onClose });
    expect(screen.queryByRole("heading", { name: /Trace a chain/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Add to library/ }));
    expect(onAddBook).toHaveBeenCalledWith(expect.objectContaining({ id: "Q10" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
