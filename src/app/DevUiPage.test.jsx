// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../shared/i18n/LanguageContext";
import DevUiPage from "./DevUiPage";

afterEach(cleanup);

describe("DevUiPage (design system showcase)", () => {
  it("renders every section without crashing and switches language", () => {
    render(
      <LanguageProvider>
        <DevUiPage />
      </LanguageProvider>
    );
    ["Colour", "Typography", "Buttons", "Badges and tabs", "Cards, covers and progress", "Form fields", "Dialog"].forEach((title) =>
      expect(screen.getByRole("heading", { name: title })).toBeTruthy()
    );

    expect(screen.getAllByText("Want to read").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /ಕನ್ನಡ/ }));
    expect(screen.getAllByText("ಓದಬೇಕಾದವು").length).toBeGreaterThan(0);
  });

  it("opens and closes the sample dialog", () => {
    render(
      <LanguageProvider>
        <DevUiPage />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByText("Open dialog"));
    expect(screen.getByRole("dialog", { name: "Remove this book?" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
