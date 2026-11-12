// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saveThemePref = vi.fn(() => Promise.resolve());
vi.mock("../../services/preferences", () => ({
  loadThemePref: vi.fn(() => Promise.resolve("nord")),
  saveThemePref: (...args) => saveThemePref(...args),
}));
vi.mock("../../app/AppContext", () => ({ useAuth: () => ({ user: { uid: "u1" } }) }));

import { LanguageProvider } from "../../shared/i18n/LanguageContext";
import ThemePicker from "./ThemePicker";
import { ThemeProvider } from "./ThemeContext";

function setup() {
  return render(
    <LanguageProvider>
      <ThemeProvider>
        <ThemePicker />
      </ThemeProvider>
    </LanguageProvider>,
  );
}

describe("ThemePicker", () => {
  afterEach(cleanup);
  beforeEach(() => {
    saveThemePref.mockClear();
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("adopts the theme saved on the account", async () => {
    setup();
    await vi.waitFor(() => expect(document.documentElement.dataset.theme).toBe("nord"));
    expect(window.localStorage.getItem("pustaka:theme")).toBe("nord");
  });

  it("previews on hover, reverts on leave and saves on click", async () => {
    setup();
    await vi.waitFor(() => expect(document.documentElement.dataset.theme).toBe("nord"));
    fireEvent.click(screen.getByRole("button", { name: "Theme" }));

    fireEvent.mouseEnter(screen.getByRole("radio", { name: /Dracula/ }));
    expect(document.documentElement.dataset.theme).toBe("dracula");
    fireEvent.mouseLeave(screen.getByRole("radiogroup"));
    expect(document.documentElement.dataset.theme).toBe("nord");
    fireEvent.click(screen.getByRole("radio", { name: /Gruvbox/ }));

    expect(document.documentElement.dataset.theme).toBe("gruvbox");
    expect(saveThemePref).toHaveBeenCalledWith("u1", "gruvbox");
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("closes with Escape and drops the preview", async () => {
    setup();
    await vi.waitFor(() => expect(document.documentElement.dataset.theme).toBe("nord"));
    fireEvent.click(screen.getByRole("button", { name: "Theme" }));
    fireEvent.mouseEnter(screen.getByRole("radio", { name: /Dracula/ }));
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "Escape" });
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(document.documentElement.dataset.theme).toBe("nord");
  });
});
