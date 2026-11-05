// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { COVER_TRANSITION_NAME, withCoverTransition } from "./viewTransition";

const fakeTransition = () => ({ finished: Promise.resolve() });

afterEach(() => {
  delete document.startViewTransition;
  delete window.matchMedia;
  vi.restoreAllMocks();
});

describe("withCoverTransition", () => {
  it("just runs the update when the browser has no View Transitions API", () => {
    const update = vi.fn();
    withCoverTransition(update, { from: document.createElement("div") });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("skips the animation when the user prefers reduced motion", () => {
    document.startViewTransition = vi.fn();
    window.matchMedia = () => ({ matches: true });
    const update = vi.fn();
    withCoverTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
    expect(document.startViewTransition).not.toHaveBeenCalled();
  });

  it("names the source before the change and only the destination after it", async () => {
    const from = document.createElement("div");
    const to = document.createElement("div");
    const seen = {};
    document.startViewTransition = vi.fn((callback) => {
      seen.nameBefore = from.style.viewTransitionName;
      callback();
      seen.fromAfter = from.style.viewTransitionName;
      seen.toAfter = to.style.viewTransitionName;
      return fakeTransition();
    });
    window.matchMedia = () => ({ matches: false });

    withCoverTransition(() => {}, { from, to: () => to });
    await Promise.resolve();

    expect(seen.nameBefore).toBe(COVER_TRANSITION_NAME);
    expect(seen.fromAfter).toBe("");
    expect(seen.toAfter).toBe(COVER_TRANSITION_NAME);
    await Promise.resolve();
    expect(to.style.viewTransitionName).toBe(""); // cleaned up when the transition ends
  });

  it("works without a source or destination (e.g. opened from a spine)", () => {
    document.startViewTransition = vi.fn((callback) => {
      callback();
      return fakeTransition();
    });
    window.matchMedia = () => ({ matches: false });
    const update = vi.fn();
    withCoverTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
