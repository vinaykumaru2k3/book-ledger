import { describe, expect, it } from "vitest";
import en from "../../shared/i18n/en";
import { authErrorKey } from "./authErrors";

describe("authErrorKey", () => {
  it("maps known Firebase codes to translation keys", () => {
    expect(authErrorKey({ code: "auth/email-already-in-use" })).toBe("auth.error.emailInUse");
    expect(authErrorKey({ code: "auth/weak-password" })).toBe("auth.error.weakPassword");
    expect(authErrorKey({ code: "auth/popup-closed-by-user" })).toBe("auth.error.popupClosed");
    expect(authErrorKey({ code: "auth/too-many-requests" })).toBe("auth.error.tooManyRequests");
  });

  it("treats wrong password and unknown user alike, so sign-in never reveals which accounts exist", () => {
    const wrong = authErrorKey({ code: "auth/wrong-password" });
    expect(authErrorKey({ code: "auth/user-not-found" })).toBe(wrong);
    expect(authErrorKey({ code: "auth/invalid-credential" })).toBe(wrong);
  });

  it("falls back to a generic message for anything else", () => {
    expect(authErrorKey({ code: "auth/something-new" })).toBe("auth.error.unknown");
    expect(authErrorKey(undefined)).toBe("auth.error.unknown");
    expect(authErrorKey(new Error("boom"))).toBe("auth.error.unknown");
  });

  it("only ever returns keys that exist in the English dictionary", () => {
    const codes = ["popup-closed-by-user", "popup-blocked", "invalid-credential", "email-already-in-use", "weak-password", "invalid-email", "operation-not-allowed", "unauthorized-domain", "too-many-requests", "network-request-failed", "user-disabled", "x"];
    codes.forEach((code) => expect(en[authErrorKey({ code: `auth/${code}` })]).toBeTruthy());
  });
});
