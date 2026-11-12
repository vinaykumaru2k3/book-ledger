// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saveThemePref = vi.fn(() => Promise.resolve());
vi.mock("../../services/preferences", () => ({
  loadThemePref: vi.fn(() => Promise.resolve("oxblood")),
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
    await vi.waitFor(() => expect(document.documentElement.dataset.theme).toBe("oxblood"));
    expect(window.localStorage.getItem("pustaka:theme")).toBe("oxblood");
  });

  it("previews on hover, reverts on leave and saves on click", async () => {
    setup();
    await vi.waitFor(() => expect(document.documentElement.dataset.theme).toBe("oxblood"));
    fireEvent.click(screen.getByRole("button", { name: "Theme" }));

    fireEvent.mouseEnter(screen.getByRole("radio", { name: /Midnight Sapphire/ }));
    expect(document.documentElement.dataset.theme).toBe("midnight-sapphire");
    fireEvent.mouseLeave(screen.getByRole("radiogroup"));
    expect(document.documentElement.dataset.theme).toBe("oxblood");
    fireEvent.click(screen.getByRole("radio", { name: /Royal Amethyst/ }));

    expect(document.documentElement.dataset.theme).toBe("royal-amethyst");
    expect(saveThemePref).toHaveBeenCalledWith("u1", "royal-amethyst");
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("closes with Escape and drops the preview", async () => {
    setup();
    await vi.waitFor(() => expect(document.documentElement.dataset.theme).toBe("oxblood"));
    fireEvent.click(screen.getByRole("button", { name: "Theme" }));
    fireEvent.mouseEnter(screen.getByRole("radio", { name: /Midnight Sapphire/ }));
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "Escape" });
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(document.documentElement.dataset.theme).toBe("oxblood");
  });
});
