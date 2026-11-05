import { describe, expect, it } from "vitest";
import en from "./en";
import kn from "./kn";
import { LANGUAGES, isLanguage, translate } from "./translate";

describe("translate", () => {
  it("returns the string for the language", () => {
    expect(translate("en", "action.save")).toBe("Save");
    expect(translate("kn", "action.save")).toBe(kn["action.save"]);
  });

  it("falls back to English, then to the key, instead of crashing", () => {
    expect(translate("fr", "action.save")).toBe("Save");
    expect(translate("en", "does.not.exist")).toBe("does.not.exist");
  });

  it("fills {placeholders} and leaves unknown ones visible", () => {
    expect(translate("en", "count.books", { count: 3 })).toBe("3 books");
    expect(translate("en", "language.switchTo", {})).toBe("Switch language to {language}");
  });
});

describe("dictionaries", () => {
  it("have exactly the same keys in English and Kannada", () => {
    expect(Object.keys(kn).sort()).toEqual(Object.keys(en).sort());
  });

  it("use the same placeholders in every language", () => {
    const names = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    Object.keys(en).forEach((key) => expect(names(kn[key])).toEqual(names(en[key])));
  });

  it("contain no empty strings", () => {
    Object.values(LANGUAGES).forEach(({ dictionary }) =>
      Object.values(dictionary).forEach((value) => expect(value.trim()).not.toBe(""))
    );
  });

  it("recognise only supported languages", () => {
    expect(isLanguage("kn")).toBe(true);
    expect(isLanguage("fr")).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });
});
