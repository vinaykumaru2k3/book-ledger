import { describe, expect, it } from "vitest";
import { isActiveDestination } from "./nav";
import { buildCommands, groupResults, searchCommands } from "./commands";

const t = (key) => ({ "nav.library": "Library", "nav.galaxy": "Knowledge Galaxy", "nav.shelves": "Shelves", "action.addBook": "Add Book" })[key] || key;
const destinations = [
  { id: "all", labelKey: "nav.library" },
  { id: "shelves", labelKey: "nav.shelves" },
  { id: "galaxy", labelKey: "nav.galaxy" },
];
const books = [
  { id: "1", title: "Dune", author: "Frank Herbert" },
  { id: "2", title: "ಕರ್ವಾಲೋ", author: "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ" },
  ...Array.from({ length: 10 }, (_, i) => ({ id: `d${i}`, title: `Dune Companion ${i}`, author: "Anon" })),
];
const commands = buildCommands({ t, destinations, books });

describe("searchCommands", () => {
  it("shows pages and actions, not books, for an empty query", () => {
    const results = searchCommands(commands, "  ");
    expect(results.some((r) => r.group === "books")).toBe(false);
    expect(results.map((r) => r.label)).toContain("Add Book");
  });

  it("ranks prefix matches before word and substring matches", () => {
    const results = searchCommands(commands, "sh");
    expect(results[0].label).toBe("Shelves");
  });

  it("finds books by title or author, including Kannada script", () => {
    expect(searchCommands(commands, "herbert")[0].id).toBe("book:1");
    expect(searchCommands(commands, "ಕರ್ವಾ")[0].id).toBe("book:2");
    expect(searchCommands(commands, "ತೇಜಸ್ವಿ")[0].id).toBe("book:2");
  });

  it("limits the number of book results", () => {
    expect(searchCommands(commands, "dune").filter((r) => r.group === "books")).toHaveLength(6);
  });

  it("returns nothing for gibberish", () => {
    expect(searchCommands(commands, "zzzzqq")).toEqual([]);
  });

});

describe("groupResults", () => {
  it("orders groups as pages, actions, books and drops empty ones", () => {
    const groups = groupResults(searchCommands(commands, "d"));
    expect(groups.map((g) => g.group)).toEqual(["go", "actions", "books"].filter((g) => groups.some((x) => x.group === g)));
  });
});

describe("isActiveDestination", () => {
  it("treats every library list and shelf as the Library destination", () => {
    ["all", "want", "reading", "done", "favorites", "shelf:Classics"].forEach((view) =>
      expect(isActiveDestination("all", view)).toBe(true)
    );
    expect(isActiveDestination("all", "galaxy")).toBe(false);
    expect(isActiveDestination("galaxy", "galaxy")).toBe(true);
  });
});
