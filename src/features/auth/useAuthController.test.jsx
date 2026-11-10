// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = { listener: null, currentUser: null };
const fb = {
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth, next) => {
    authState.listener = next;
    return () => {};
  },
  signInWithEmailAndPassword: (...a) => fb.signInWithEmailAndPassword(...a),
  createUserWithEmailAndPassword: (...a) => fb.createUserWithEmailAndPassword(...a),
  sendEmailVerification: (...a) => fb.sendEmailVerification(...a),
  sendPasswordResetEmail: (...a) => fb.sendPasswordResetEmail(...a),
  signInWithPopup: (...a) => fb.signInWithPopup(...a),
  signOut: (...a) => fb.signOut(...a),
}));
vi.mock("../../services/firebase", () => ({
  auth: {
    get currentUser() {
      return authState.currentUser;
    },
  },
  googleProvider: {},
}));

const { useAuthController } = await import("./useAuthController");

const passwordUser = (extra = {}) => ({ uid: "u", email: "a@b.c", emailVerified: false, providerData: [{ providerId: "password" }], reload: vi.fn().mockResolvedValue(undefined), ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  authState.currentUser = null;
  fb.sendEmailVerification.mockResolvedValue(undefined);
  fb.sendPasswordResetEmail.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const setup = () => {
  const view = renderHook(() => useAuthController());
  return view;
};

describe("session", () => {
  it("becomes ready once Firebase reports the session", () => {
    const { result } = setup();
    expect(result.current.authReady).toBe(false);
    act(() => authState.listener(null));
    expect(result.current.authReady).toBe(true);
    expect(result.current.user).toBeNull();
  });
});

describe("errors are translation keys", () => {
  it("reports a failed sign-in as a key", async () => {
    fb.signInWithEmailAndPassword.mockRejectedValue({ code: "auth/wrong-password" });
    const { result } = setup();
    await act(() => result.current.signInWithEmail({ email: "a@b.c", password: "x", mode: "signin" }));
    expect(result.current.authError).toBe("auth.error.invalidCredential");
  });

  it("clears the error when a new attempt starts", async () => {
    fb.signInWithEmailAndPassword.mockRejectedValueOnce({ code: "auth/wrong-password" }).mockResolvedValueOnce({});
    const { result } = setup();
    await act(() => result.current.signInWithEmail({ email: "a@b.c", password: "x", mode: "signin" }));
    await act(() => result.current.signInWithEmail({ email: "a@b.c", password: "y", mode: "signin" }));
    expect(result.current.authError).toBe("");
  });

  it("reports a closed Google popup", async () => {
    fb.signInWithPopup.mockRejectedValue({ code: "auth/popup-closed-by-user" });
    const { result } = setup();
    await act(() => result.current.signInWithGoogle());
    expect(result.current.authError).toBe("auth.error.popupClosed");
  });
});

describe("registering", () => {
  it("sends a verification email after creating the account", async () => {
    const created = { user: passwordUser() };
    fb.createUserWithEmailAndPassword.mockResolvedValue(created);
    const { result } = setup();
    await act(() => result.current.signInWithEmail({ email: "a@b.c", password: "secret1", mode: "create" }));
    expect(fb.sendEmailVerification).toHaveBeenCalledWith(created.user);
    expect(result.current.authError).toBe("");
  });

  it("still succeeds when the verification email fails to send", async () => {
    fb.createUserWithEmailAndPassword.mockResolvedValue({ user: passwordUser() });
    fb.sendEmailVerification.mockRejectedValue(new Error("mail down"));
    const { result } = setup();
    await act(() => result.current.signInWithEmail({ email: "a@b.c", password: "secret1", mode: "create" }));
    expect(result.current.authError).toBe("");
  });

  it("reports an address that is already registered", async () => {
    fb.createUserWithEmailAndPassword.mockRejectedValue({ code: "auth/email-already-in-use" });
    const { result } = setup();
    await act(() => result.current.signInWithEmail({ email: "a@b.c", password: "secret1", mode: "create" }));
    expect(result.current.authError).toBe("auth.error.emailInUse");
  });
});

describe("password reset", () => {
  it("resolves true when the email is sent", async () => {
    const { result } = setup();
    let ok;
    await act(async () => {
      ok = await result.current.resetPassword("a@b.c");
    });
    expect(ok).toBe(true);
    expect(fb.sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), "a@b.c");
  });

  it("treats an unknown address as success, so it cannot reveal which accounts exist", async () => {
    fb.sendPasswordResetEmail.mockRejectedValue({ code: "auth/user-not-found" });
    const { result } = setup();
    let ok;
    await act(async () => {
      ok = await result.current.resetPassword("nobody@x.y");
    });
    expect(ok).toBe(true);
    expect(result.current.authError).toBe("");
  });

  it("reports real failures such as a malformed address", async () => {
    fb.sendPasswordResetEmail.mockRejectedValue({ code: "auth/invalid-email" });
    const { result } = setup();
    let ok;
    await act(async () => {
      ok = await result.current.resetPassword("nope");
    });
    expect(ok).toBe(false);
    expect(result.current.authError).toBe("auth.error.invalidEmail");
  });
});

describe("email verification reminder", () => {
  const signIn = (result, user) => {
    authState.currentUser = user;
    act(() => authState.listener(user));
    return result;
  };

  it("is needed only for unverified email-and-password accounts", async () => {
    const { result } = setup();
    signIn(result, passwordUser());
    expect(result.current.needsVerification).toBe(true);
    signIn(result, passwordUser({ emailVerified: true }));
    expect(result.current.needsVerification).toBe(false);
    signIn(result, passwordUser({ providerData: [{ providerId: "google.com" }] }));
    expect(result.current.needsVerification).toBe(false); // Google has verified the address already
    signIn(result, null);
    expect(result.current.needsVerification).toBe(false);
  });

  it("resends the link and reports whether it worked", async () => {
    const { result } = setup();
    signIn(result, passwordUser());
    let ok;
    await act(async () => {
      ok = await result.current.resendVerification();
    });
    expect(ok).toBe(true);
    fb.sendEmailVerification.mockRejectedValue(new Error("rate limited"));
    await act(async () => {
      ok = await result.current.resendVerification();
    });
    expect(ok).toBe(false);
  });

  it("re-reads the account and picks up a confirmed address", async () => {
    const user = passwordUser();
    user.reload = vi.fn().mockImplementation(async () => {
      user.emailVerified = true; // the user clicked the emailed link
    });
    const { result } = setup();
    signIn(result, user);
    let verified;
    await act(async () => {
      verified = await result.current.checkVerified();
    });
    expect(user.reload).toHaveBeenCalled();
    expect(verified).toBe(true);
    await waitFor(() => expect(result.current.needsVerification).toBe(false));
  });

  it("reports an address that is still unverified", async () => {
    const { result } = setup();
    signIn(result, passwordUser());
    let verified;
    await act(async () => {
      verified = await result.current.checkVerified();
    });
    expect(verified).toBe(false);
    expect(result.current.needsVerification).toBe(true);
  });
});
