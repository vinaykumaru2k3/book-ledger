import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PALETTES } from "./palettes";
import { buildThemesCss, contrastChecks } from "./themeCss";
import { THEMES, isThemeChoice, resolveTheme } from "./themes";

describe("palettes", () => {
  it.each(PALETTES.map((p) => [p.id, p]))("%s passes every contrast check", (_id, palette) => {
    const failing = contrastChecks(palette).filter((c) => c.ratio < c.min);
    expect(failing.map((c) => `${c.label} ${c.ratio.toFixed(2)}`)).toEqual([]);
  });

  it("has unique ids, both light and dark themes", () => {
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(PALETTES.length);
    expect(PALETTES.some((p) => p.mode === "light")).toBe(true);
    expect(PALETTES.some((p) => p.mode === "dark")).toBe(true);
  });

  it("keeps src/styles/themes.css in sync (run `npm run themes`)", () => {
    const written = readFileSync(new URL("../../styles/themes.css", import.meta.url), "utf8");
    expect(written).toBe(buildThemesCss());
  });
});

describe("resolveTheme", () => {
  it("returns a known theme as is", () => {
    expect(resolveTheme("nord", false)).toBe("nord");
  });
  it("follows the device for system", () => {
    expect(resolveTheme("system", false)).toBe("pustaka");
    expect(resolveTheme("system", true)).toBe("catppuccin-mocha");
  });
  it("falls back to the default for unknown values", () => {
    expect(resolveTheme("nope", true)).toBe("pustaka");
  });
  it("validates choices", () => {
    expect(isThemeChoice("system")).toBe(true);
    expect(isThemeChoice(THEMES[0].id)).toBe(true);
    expect(isThemeChoice("nope")).toBe(false);
    expect(isThemeChoice(null)).toBe(false);
  });
});
