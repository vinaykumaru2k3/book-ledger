// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../shared/i18n/LanguageContext";
import { parseLocation } from "../routes";
import PublicShell from "./PublicShell";

afterEach(cleanup);

describe("PublicShell", () => {
  const location = parseLocation("/kannada/author/bendre");

  it("shows a public page to a signed-out visitor, with a sign-in button", async () => {
    const onSignIn = vi.fn();
    render(
      <LanguageProvider>
        <PublicShell view="kannada" location={location} onSignIn={onSignIn} />
      </LanguageProvider>
    );
    expect(screen.getByRole("heading", { level: 1, name: "Kannada Explorer" })).toBeTruthy();
    expect(await screen.findByText("You opened: /kannada/author/bendre", {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Language" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(onSignIn).toHaveBeenCalled();
  });

  it("renders nothing for a view that is not a registered page", () => {
    const { container } = render(
      <LanguageProvider>
        <PublicShell view="reading" location={parseLocation("/reading")} onSignIn={() => {}} />
      </LanguageProvider>
    );
    expect(container.firstChild).toBeNull();
  });
});
