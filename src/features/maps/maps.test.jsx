// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../shared/i18n/LanguageContext";
import { normalizeGraph } from "../../domain/literaryMap";
import { buildPath, parseLocation } from "../../app/routes";
import MapListView from "./MapListView";
import { linkPhrase, yearsText } from "./mapText";

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
