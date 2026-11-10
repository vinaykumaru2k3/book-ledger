import { describe, expect, it } from "vitest";
import en from "./en";
import { translate } from "./translate";

describe("translate", () => {
  it("returns the English text for a key", () => {
    expect(translate("action.save")).toBe("Save");
  });

  it("falls back to the key instead of crashing", () => {
    expect(translate("does.not.exist")).toBe("does.not.exist");
  });

  it("fills {placeholders} and leaves unknown ones visible", () => {
    expect(translate("count.books", { count: 3 })).toBe("3 books");
    expect(translate("landing.demo.streak", {})).toBe("{days}-day streak");
  });
});

describe("dictionary", () => {
  it("contains no empty strings", () => {
    Object.values(en).forEach((value) => expect(value.trim()).not.toBe(""));
  });
});
