import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "../../services/firebase";
import { authErrorKey } from "./authErrors";

/**
 * Sign-in state and actions.
 *
 * `authError` is a translation key (or ""), never English text; the screens
 * translate it. Email accounts must confirm their address, but this only
 * *reminds* (`needsVerification`): nobody is locked out of their own library.
 */
export function useAuthController() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [, setVerifyTick] = useState(0); // bumps a re-render after user.reload()

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setAuthReady(true);
        setAuthError("");
      },
      (error) => {
        console.error("Auth state error:", error);
        setAuthReady(true);
        setAuthError("auth.error.session");
      }
    );
  }, []);

  const fail = (error) => {
    console.error("Firebase Auth Error:", error);
    setAuthError(authErrorKey(error));
  };

  async function signInWithGoogle() {
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      fail(error);
    }
  }

  async function signInWithEmail({ email, password, mode }) {
    setAuthError("");
    try {
      if (mode === "create") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        // Best effort: a failed email must not undo a successful registration.
        sendEmailVerification(credential.user).catch((error) => console.error("Verification email failed:", error));
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      fail(error);
    }
  }

  /**
   * Sends a password-reset email. Resolves true when the request was accepted.
   * An unknown address also resolves true, so this screen can never be used to
   * discover which emails have accounts.
   */
  async function resetPassword(email) {
    setAuthError("");
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      if (String(error?.code).includes("user-not-found")) return true;
      fail(error);
      return false;
    }
  }

  /** Re-sends the verification email. Resolves true when it was sent. */
  async function resendVerification() {
    try {
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch (error) {
      console.error("Verification email failed:", error);
      return false;
    }
  }

  /** Re-reads the account (after the user clicked the emailed link). Resolves true when verified. */
  async function checkVerified() {
    try {
      await auth.currentUser?.reload();
    } catch (error) {
      console.error("Could not refresh the account:", error);
    }
    setVerifyTick((tick) => tick + 1);
    return Boolean(auth.currentUser?.emailVerified);
  }

  const needsVerification =
    Boolean(user) && !user.emailVerified && user.providerData.some((provider) => provider.providerId === "password");

  return {
    user,
    authReady,
    authError,
    needsVerification,
    signInWithGoogle,
    signInWithEmail,
    resetPassword,
    resendVerification,
    checkVerified,
    signOut: () => signOut(auth),
  };
}
