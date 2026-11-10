// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../shared/i18n/LanguageContext";
import { computeLibraryStats } from "../../../domain/library";

const ui = { openDetails: vi.fn() };
vi.mock("../../../app/AppContext", () => ({
  useAuth: () => ({ user: { displayName: "Asha Rao", email: "asha@example.com" } }),
  useUi: () => ui,
}));

const { default: LibraryDashboard } = await import("./LibraryDashboard");

const now = Date.now();
const books = [
  { id: "1", title: "ಕರ್ವಾಲೋ", author: "Tejasvi", status: "reading", pages: 200, currentPage: 150 },
  { id: "2", title: "Emma", author: "Austen", status: "reading", pages: 400, currentPage: 40 },
  { id: "3", title: "Dune", author: "Herbert", status: "done", pages: 400, currentPage: 400, rating: 5, finishedAt: now },
  { id: "4", title: "Kim", author: "Kipling", status: "want", pages: 300, currentPage: 0 },
];

const renderDash = (list = books) =>
  render(
    <LanguageProvider>
      <LibraryDashboard books={list} stats={computeLibraryStats(list)} />
    </LanguageProvider>
  );

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("LibraryDashboard", () => {
  it("greets the reader by first name and spotlights the furthest-along book", () => {
    renderDash();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toMatch(/, Asha\.$/);
    expect(screen.getByText("Continue reading")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "ಕರ್ವಾಲೋ" })).toBeTruthy();
    expect(screen.getByText("Page 150 of 200")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Update progress" }));
    expect(ui.openDetails).toHaveBeenCalledWith(books[0]);
  });

  it("switches the spotlight between books in progress", () => {
    renderDash();
    const emma = screen.getByRole("button", { name: "Emma" });
    expect(emma.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(emma);
    expect(screen.getByRole("heading", { level: 3, name: "Emma" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Emma" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("lets the reader change and keep their yearly goal", () => {
    renderDash();
    expect(screen.getByText("Goal: 12 books")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Raise the goal" }));
    fireEvent.click(screen.getByRole("button", { name: "Raise the goal" }));
    expect(screen.getByText("Goal: 14 books")).toBeTruthy();
    expect(localStorage.getItem("pustaka:reading-goal")).toBe("14");
  });

  it("suggests the next book when nothing is being read", () => {
    renderDash(books.filter((b) => b.status !== "reading"));
    expect(screen.getByText("Nothing on the go right now.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Start Kim/ }));
    expect(ui.openDetails).toHaveBeenCalledWith(expect.objectContaining({ id: "4" }));
  });

  it("shows the scripts on the shelves", () => {
    renderDash();
    expect(screen.getByText("2 writing systems")).toBeTruthy();
    expect(screen.getByText(/Kannada/)).toBeTruthy();
  });
});
