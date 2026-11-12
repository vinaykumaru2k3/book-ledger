// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../shared/i18n/LanguageContext";
import CoverPicker from "./CoverPicker";

const book = { title: "ಪರ್ವ", author: "ಎಸ್. ಎಲ್. ಭೈರಪ್ಪ", isbn: "" };

function setup(search, props = {}) {
  const onPick = vi.fn();
  render(
    <LanguageProvider>
      <CoverPicker book={book} value="" onPick={onPick} search={search} {...props} />
    </LanguageProvider>,
  );
  return { onPick };
}

describe("CoverPicker", () => {
  afterEach(cleanup);

  it("shows the covers found and picks one", async () => {
    const search = vi.fn(() =>
      Promise.resolve([
        { url: "https://w/parva.jpg", source: "wikipedia", label: "Wikipedia · ಪರ್ವ" },
        { url: "https://o/1-L.jpg", source: "openlibrary", label: "Open Library · Parva" },
      ]),
    );
    const { onPick } = setup(search);
    fireEvent.click(screen.getByRole("button", { name: /Find cover online/ }));
    expect(search).toHaveBeenCalledWith(book);
    fireEvent.click(await screen.findByRole("button", { name: "Cover from Open Library" }));
    expect(onPick).toHaveBeenCalledWith("https://o/1-L.jpg", "openlibrary");
  });

  it("says so when nothing is found", async () => {
    setup(() => Promise.resolve([]));
    fireEvent.click(screen.getByRole("button", { name: /Find cover online/ }));
    expect(await screen.findByText(/No covers found online/)).toBeTruthy();
  });

  it("marks the cover in use", async () => {
    setup(() => Promise.resolve([{ url: "https://w/parva.jpg", source: "wikipedia", label: "x" }]), { value: "https://w/parva.jpg" });
    fireEvent.click(screen.getByRole("button", { name: /Find cover online/ }));
    expect((await screen.findByRole("button", { name: "Cover from Wikipedia" })).getAttribute("aria-pressed")).toBe("true");
  });
});
