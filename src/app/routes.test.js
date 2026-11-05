import { describe, expect, it } from "vitest";
import { buildPath, isPublicView, isValidView, parseLocation } from "./routes";

describe("parseLocation", () => {
  it("maps legacy single-segment URLs to the same views as before", () => {
    expect(parseLocation("/")).toMatchObject({ view: "all", valid: true });
    expect(parseLocation("/reading")).toMatchObject({ view: "reading", valid: true });
    expect(parseLocation("/galaxy")).toMatchObject({ view: "galaxy", valid: true });
    expect(parseLocation("/shelf%3AClassics")).toMatchObject({ view: "shelf:Classics", valid: true });
  });

  it("falls back to the library for unknown or malformed paths", () => {
    expect(parseLocation("/nope")).toMatchObject({ view: "all", valid: false });
    expect(parseLocation("/reading/extra")).toMatchObject({ view: "all", valid: false });
    expect(parseLocation("/%E0%A4%A")).toMatchObject({ view: "all", valid: false });
    expect(parseLocation("/shelf%3A")).toMatchObject({ view: "all", valid: false });
  });

  it("ignores trailing and duplicate slashes", () => {
    expect(parseLocation("/reading/").view).toBe("reading");
    expect(parseLocation("//reading").view).toBe("reading");
  });
});

describe("buildPath", () => {
  it("is the inverse of parseLocation for library views and shelves", () => {
    ["all", "want", "reading", "done", "favorites", "galaxy", "shelf:Sci-Fi", "shelf:ಕನ್ನಡ"].forEach((view) => {
      expect(parseLocation(buildPath(view)).view).toBe(view);
    });
    expect(buildPath("all")).toBe("/");
  });
});

describe("views", () => {
  it("recognises the pages in the registry and rejects others", () => {
    expect(isValidView("analytics")).toBe(true);
    expect(isValidView("dev")).toBe(false);
    expect(isValidView("shelf:")).toBe(false);
  });

  it("marks only registered public pages as public", () => {
    expect(isPublicView("galaxy")).toBe(false);
    expect(isPublicView("all")).toBe(false);
  });
});
