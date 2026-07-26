import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

function authMessage(error) {
  console.error("Firebase Auth Error:", error);
  const code = error?.code || "";
  const msg = error?.message || "";

  if (code.includes("popup-closed-by-user")) return "The sign-in popup was closed before completion.";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) {
    return "The credentials entered were not accepted.";
  }
  if (code.includes("email-already-in-use")) return "An account already exists for this email.";
  if (code.includes("weak-password")) return "Password must be at least 6 characters.";
  if (code.includes("invalid-email")) return "Invalid email address formatting.";
  if (code.includes("operation-not-allowed")) {
    return "Google Sign-In is not enabled. Go to Firebase Console > Authentication > Sign-in method and enable Google.";
  }
  if (code.includes("unauthorized-domain")) {
    return "This local domain is not authorized. Add it under Firebase Authentication > Settings > Authorized Domains.";
  }
  return `Authentication failed: ${msg} (${code})`;
}

export function useAuthController() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setAuthReady(true);
        setAuthError("");
      },
      () => {
        setAuthReady(true);
        setAuthError("Failed to fetch sign-in session state.");
      }
    );
  }, []);

  async function signInWithGoogle() {
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setAuthError(authMessage(error));
    }
  }

  async function signInWithEmail({ email, password, mode }) {
    setAuthError("");
    try {
      if (mode === "create") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      setAuthError(authMessage(error));
    }
  }

  async function signOutRaw() {
    await signOut(auth);
  }

  return {
    user,
    authReady,
    authError,
    signInWithGoogle,
    signInWithEmail,
    signOut: signOutRaw,
  };
}
