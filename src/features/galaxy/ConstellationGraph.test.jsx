// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeBook } from "../../domain/book";
import { LanguageProvider } from "../../shared/i18n/LanguageContext";

const books = [
  normalizeBook({ id: "1", title: "Dune", author: "Herbert", shelves: ["Sci-Fi"], tags: ["Space"] }),
  normalizeBook({ id: "2", title: "Hyperion", author: "Simmons", shelves: ["Sci-Fi"], tags: ["Space"] }),
  normalizeBook({ id: "3", title: "Emma", author: "Austen" }),
];
const state = { books };

vi.mock("../../app/AppContext", () => ({
  useBooks: () => ({ books: state.books }),
}));

const { default: ConstellationGraph } = await import("./ConstellationGraph");

// With reduced motion the layout is computed at once and never animates, which keeps positions fixed.
beforeEach(() => {
  window.matchMedia = () => ({ matches: true });
  state.books = books;
});
afterEach(() => {
  cleanup();
  delete window.matchMedia;
});

const renderGraph = () =>
  render(
    <LanguageProvider>
      <ConstellationGraph />
    </LanguageProvider>
  );

const stars = (container) => [...container.querySelectorAll("svg.galaxy-canvas circle")].filter((c) => c.getAttribute("fill") !== "none");
// In jsdom the svg has no size, so graph coordinates equal client coordinates.
const centre = (star) => ({ clientX: Number(star.getAttribute("cx")), clientY: Number(star.getAttribute("cy")) });

describe("ConstellationGraph", () => {
  it("draws one star per book", () => {
    const { container } = renderGraph();
    expect(stars(container)).toHaveLength(3);
  });

  it("opens a star's inspector on a click that arrives with no preceding hover render (a tap)", () => {
    const { container } = renderGraph();
    const svg = container.querySelector("svg.galaxy-canvas");
    const point = centre(stars(container)[0]);
    // Everything in one batch, as a touch tap delivers it: no chance for hover state to render first.
    act(() => {
      fireEvent.mouseDown(svg, point);
      fireEvent.mouseUp(svg, point);
      fireEvent.click(svg, point);
    });
    expect(container.querySelector(".galaxy-modal h3")).toBeTruthy();
  });

  it("selects the star that was clicked, not a neighbour", () => {
    const { container } = renderGraph();
    const svg = container.querySelector("svg.galaxy-canvas");
    const target = stars(container)[2];
    const point = centre(target);
    act(() => {
      fireEvent.mouseDown(svg, point);
      fireEvent.mouseUp(svg, point);
      fireEvent.click(svg, point);
    });
    expect(container.querySelector(".galaxy-modal h3").textContent).toBe("Emma");
  });

  it("does not select anything when empty space is clicked, and closes the inspector", () => {
    const { container } = renderGraph();
    const svg = container.querySelector("svg.galaxy-canvas");
    const point = centre(stars(container)[0]);
    act(() => {
      fireEvent.mouseDown(svg, point);
      fireEvent.mouseUp(svg, point);
      fireEvent.click(svg, point);
    });
    fireEvent.click(screen.getByLabelText("Close")); // the inspector's close button
    expect(container.querySelector(".galaxy-modal")).toBeNull();

    const empty = { clientX: 5000, clientY: 5000 };
    act(() => {
      fireEvent.mouseDown(svg, empty);
      fireEvent.mouseUp(svg, empty);
      fireEvent.click(svg, empty);
    });
    expect(container.querySelector(".galaxy-modal")).toBeNull();
  });

  it("does not open the inspector after dragging a star", () => {
    const { container } = renderGraph();
    const svg = container.querySelector("svg.galaxy-canvas");
    const point = centre(stars(container)[0]);
    act(() => {
      fireEvent.mouseDown(svg, point);
      fireEvent.mouseMove(svg, { clientX: point.clientX + 40, clientY: point.clientY + 40 });
      fireEvent.mouseUp(svg, { clientX: point.clientX + 40, clientY: point.clientY + 40 });
      fireEvent.click(svg, { clientX: point.clientX + 40, clientY: point.clientY + 40 });
    });
    expect(container.querySelector(".galaxy-modal")).toBeNull();
  });

  it("zooms to a star on double-click", () => {
    const { container } = renderGraph();
    const svg = container.querySelector("svg.galaxy-canvas");
    const group = svg.querySelector("g");
    const before = group.getAttribute("transform");
    act(() => {
      fireEvent.doubleClick(svg, centre(stars(container)[0]));
    });
    expect(group.getAttribute("transform")).not.toBe(before);
    expect(group.getAttribute("transform")).toContain("scale(1.5)");
  });

  it("keeps the layout when the books array changes identity but nothing drawn changed", () => {
    const { container, rerender } = renderGraph();
    const before = stars(container).map((s) => [s.getAttribute("cx"), s.getAttribute("cy")]);
    state.books = books.map((b) => ({ ...b, notes: "touched", updatedAt: 99 }));
    rerender(
      <LanguageProvider>
        <ConstellationGraph />
      </LanguageProvider>
    );
    expect(stars(container).map((s) => [s.getAttribute("cx"), s.getAttribute("cy")])).toEqual(before);
  });

  it("filters stars by status and search", () => {
    const { container } = renderGraph();
    fireEvent.change(screen.getByPlaceholderText("Search books..."), { target: { value: "emma" } });
    expect(stars(container)).toHaveLength(1);
  });
});
