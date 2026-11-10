// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../shared/i18n/LanguageContext";
import AuthScreen from "./AuthScreen";
import LandingPage from "../landing/LandingPage";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const wrap = (node) => render(<LanguageProvider>{node}</LanguageProvider>);

describe("AuthScreen", () => {
  let handlers;
  beforeEach(() => {
    handlers = {
      onEmailSubmit: vi.fn().mockResolvedValue(undefined),
      onGoogleSignIn: vi.fn().mockResolvedValue(undefined),
      onResetPassword: vi.fn().mockResolvedValue(true),
      onBackToLanding: vi.fn(),
    };
  });

  const fill = (email, password) => {
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
    if (password !== undefined) fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  };

  it("signs in with email and password, trimming the address", async () => {
    wrap(<AuthScreen {...handlers} />);
    expect(screen.getByRole("heading", { level: 1, name: "Welcome back" })).toBeTruthy();
    fill("  me@x.y  ", "secret1");
    fireEvent.click(screen.getByRole("button", { name: "Access my shelf" }));
    await waitFor(() => expect(handlers.onEmailSubmit).toHaveBeenCalledWith({ email: "me@x.y", password: "secret1", mode: "signin" }));
  });

  it("registers from the Register tab, with a new-password autofill hint", async () => {
    wrap(<AuthScreen {...handlers} />);
    fireEvent.click(screen.getByRole("tab", { name: "Register" }));
    expect(screen.getByRole("heading", { level: 1, name: "Start your shelf" })).toBeTruthy();
    expect(screen.getByLabelText("Password").getAttribute("autocomplete")).toBe("new-password");
    expect(screen.queryByText("Forgot your password?")).toBeNull();
    fill("me@x.y", "secret1");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(handlers.onEmailSubmit).toHaveBeenCalledWith(expect.objectContaining({ mode: "create" })));
  });

  it("signs in with Google", async () => {
    wrap(<AuthScreen {...handlers} />);
    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/ }));
    await waitFor(() => expect(handlers.onGoogleSignIn).toHaveBeenCalled());
  });

  it("shows a translated error in an alert, and not before there is one", () => {
    const { unmount } = wrap(<AuthScreen {...handlers} />);
    expect(screen.queryByRole("alert")).toBeNull();
    unmount();
    wrap(<AuthScreen {...handlers} error="auth.error.invalidCredential" />);
    expect(screen.getByRole("alert").textContent).toBe("The email or password was not accepted.");
  });

  it("shows and hides the password", () => {
    wrap(<AuthScreen {...handlers} />);
    const field = screen.getByLabelText("Password");
    expect(field.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(field.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("walks through a password reset and confirms without revealing whether the account exists", async () => {
    wrap(<AuthScreen {...handlers} />);
    fireEvent.click(screen.getByRole("button", { name: "Forgot your password?" }));
    expect(screen.getByRole("heading", { level: 1, name: "Reset your password" })).toBeTruthy();
    expect(screen.queryByLabelText("Password")).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();

    fill("someone@x.y");
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText(/If an account exists for someone@x.y/)).toBeTruthy();
    expect(handlers.onResetPassword).toHaveBeenCalledWith("someone@x.y");

    fireEvent.click(screen.getByRole("button", { name: "Back to sign in" }));
    expect(screen.getByRole("heading", { level: 1, name: "Welcome back" })).toBeTruthy();
  });

  it("keeps the form open when the reset request itself fails (e.g. the network is down)", async () => {
    handlers.onResetPassword.mockResolvedValue(false);
    wrap(<AuthScreen {...handlers} error="auth.error.network" />);
    fireEvent.click(screen.getByRole("button", { name: "Forgot your password?" }));
    fill("me@x.y");
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    await waitFor(() => expect(handlers.onResetPassword).toHaveBeenCalled());
    expect(screen.queryByText(/reset link is on its way/)).toBeNull();
    expect(screen.getByRole("alert").textContent).toBe("Network problem. Check your connection and try again.");
  });

  it("offers a way back to the overview", () => {
    wrap(<AuthScreen {...handlers} />);
    fireEvent.click(screen.getByRole("button", { name: "Back to overview" }));
    expect(handlers.onBackToLanding).toHaveBeenCalled();
  });
});

describe("LandingPage", () => {
  it("has one main heading, a hero call to action, four features and a closing call to action", () => {
    const onEnter = vi.fn();
    wrap(<LandingPage onEnter={onEnter} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Every book you read becomes a star.");
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);

    fireEvent.click(screen.getByRole("button", { name: /Enter the Reading Room/ }));
    fireEvent.click(screen.getByRole("button", { name: /Get started/ }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(onEnter).toHaveBeenCalledTimes(3);
  });

  it("describes the 3D book as one image and hides the decorative scenery", () => {
    const { container } = wrap(<LandingPage onEnter={() => {}} />);
    expect(screen.getByRole("img", { name: "An open leather-bound book with a page turning" })).toBeTruthy();
    expect(container.querySelector(".pk-marquee").getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector(".pk-glyphfield").getAttribute("aria-hidden")).toBe("true");
    container.querySelectorAll(".pk-demo").forEach((demo) => expect(demo.getAttribute("aria-hidden")).toBe("true"));
  });

  it("gives screen readers the scroll-lit statement as one sentence", () => {
    wrap(<LandingPage onEnter={() => {}} />);
    expect(screen.getByText(/Every book you finish becomes a star\. Over the years/)).toBeTruthy();
  });

  it("links to the features from the hero", () => {
    wrap(<LandingPage onEnter={() => {}} />);
    expect(screen.getByRole("link", { name: /See what's inside/ }).getAttribute("href")).toBe("#features");
    expect(document.getElementById("features")).toBeTruthy();
  });

  it("has a skip link and a current-year footer", () => {
    wrap(<LandingPage onEnter={() => {}} />);
    expect(screen.getByText("Skip to content").getAttribute("href")).toBe("#main");
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} Pustaka`))).toBeTruthy();
  });
});
