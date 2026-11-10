// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../shared/i18n/LanguageContext";

const auth = { needsVerification: true, user: { email: "me@x.y" }, resendVerification: vi.fn(), checkVerified: vi.fn() };
vi.mock("../AppContext", () => ({ useAuth: () => auth }));

const { default: VerifyBanner } = await import("./VerifyBanner");

const renderBanner = () =>
  render(
    <LanguageProvider>
      <VerifyBanner />
    </LanguageProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.needsVerification = true;
  auth.resendVerification.mockResolvedValue(true);
  auth.checkVerified.mockResolvedValue(false);
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("VerifyBanner", () => {
  it("renders nothing when the address is already verified", () => {
    auth.needsVerification = false;
    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  it("names the address and announces itself politely", () => {
    renderBanner();
    const banner = screen.getByRole("status");
    expect(banner.textContent).toContain("Please verify your email");
    expect(banner.textContent).toContain("me@x.y");
  });

  it("resends the link and confirms or reports failure", async () => {
    renderBanner();
    fireEvent.click(screen.getByRole("button", { name: "Resend link" }));
    expect(await screen.findByText("Verification link sent.")).toBeTruthy();

    auth.resendVerification.mockResolvedValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Resend link" }));
    expect(await screen.findByText("Could not send the link. Please try again shortly.")).toBeTruthy();
  });

  it("says so when the address is still not verified", async () => {
    renderBanner();
    fireEvent.click(screen.getByRole("button", { name: "I have verified" }));
    await waitFor(() => expect(auth.checkVerified).toHaveBeenCalled());
    expect(await screen.findByText("Not verified yet. Open the link in your email first.")).toBeTruthy();
  });
});
