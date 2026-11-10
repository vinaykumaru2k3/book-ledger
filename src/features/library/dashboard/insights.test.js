import { describe, expect, it } from "vitest";
import { firstNameOf, goalPace, partOfDay, pileHeightCm, scriptMix } from "./insights";

describe("dashboard insights", () => {
  it("picks the part of the day for the greeting", () => {
    expect(partOfDay(new Date(2026, 0, 1, 3))).toBe("night");
    expect(partOfDay(new Date(2026, 0, 1, 9))).toBe("morning");
    expect(partOfDay(new Date(2026, 0, 1, 14))).toBe("afternoon");
    expect(partOfDay(new Date(2026, 0, 1, 19))).toBe("evening");
    expect(partOfDay(new Date(2026, 0, 1, 23))).toBe("night");
  });

  it("finds a friendly first name", () => {
    expect(firstNameOf({ displayName: "Dev Reader" })).toBe("Dev");
    expect(firstNameOf({ email: "asha.k@example.com" })).toBe("Asha.k");
    expect(firstNameOf(null)).toBe("");
  });

  it("tracks a yearly goal against an even pace", () => {
    const midYear = new Date(2026, 6, 2); // about half way through the year
    expect(goalPace(6, 12, midYear)).toMatchObject({ remaining: 6, percent: 50, status: "onTrack" });
    expect(goalPace(2, 12, midYear)).toMatchObject({ remaining: 10, status: "behind", behindBy: 4 });
    expect(goalPace(13, 12, midYear)).toMatchObject({ remaining: 0, percent: 100, status: "done" });
  });

  it("counts the writing systems of titles, most common first", () => {
    const mix = scriptMix([{ title: "Dune" }, { title: "ಕರ್ವಾಲೋ" }, { title: "ಪರ್ವ" }, { title: "गोदान" }, { title: "Emma" }, { title: "Kim" }]);
    expect(mix).toEqual([
      { key: "latin", name: "Latin", count: 3 },
      { key: "kn", name: "Kannada", count: 2 },
      { key: "hi", name: "Devanagari", count: 1 },
    ]);
  });

  it("estimates the height of a pile of pages", () => {
    expect(pileHeightCm(2000)).toBe(10);
    expect(pileHeightCm(0)).toBe(0);
  });
});
