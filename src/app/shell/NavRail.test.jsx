// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../shared/i18n/LanguageContext";

vi.mock("../AppContext", () => ({
  useBooks: () => ({ books: [] }),
  useUi: () => ({ openDetails: vi.fn() }),
}));
vi.mock("./AccountMenu", () => ({ default: () => null }));

const { default: NavRail } = await import("./NavRail");

// jsdom has no layout: give each link a position we control, and capture the
// ResizeObserver callback so a test can say "the rail changed size".
let observers = [];
class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback;
    observers.push(this);
  }
  observe() {}
  disconnect() {}
}
let linkTop = 40;
beforeEach(() => {
  observers = [];
  linkTop = 40;
  globalThis.ResizeObserver = FakeResizeObserver;
  Object.defineProperty(HTMLElement.prototype, "offsetTop", { configurable: true, get: () => linkTop });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 42 });
  localStorage.setItem("pustaka:rail-collapsed", "0");
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  delete globalThis.ResizeObserver;
});

const renderRail = () =>
  render(
    <LanguageProvider>
      <NavRail view="topbooks" onNavigate={() => {}} />
    </LanguageProvider>
  );
const markerTop = (container) => container.querySelector(".pk-rail__marker").style.transform;

describe("NavRail marker", () => {
  it("sits on the current page", () => {
    const { container } = renderRail();
    expect(markerTop(container)).toBe("translateY(40px)");
  });

  it("follows the link when the rail finishes resizing (collapse, expand, late fonts)", () => {
    const { container } = renderRail();
    linkTop = 96; // the rail grew and the links moved
    act(() => observers.forEach((o) => o.callback([])));
    expect(markerTop(container)).toBe("translateY(96px)");
  });

  it("is measured again after collapsing and expanding", () => {
    const { container } = renderRail();
    const toggle = screen.getByRole("button", { expanded: true });
    linkTop = 0;
    fireEvent.click(toggle);
    expect(markerTop(container)).toBe("translateY(0px)");
    linkTop = 58;
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    act(() => observers.at(-1).callback([]));
    expect(markerTop(container)).toBe("translateY(58px)");
  });
});
