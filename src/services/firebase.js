/**
 * Firebase setup.
 *
 * The web config is read from Vite env vars (see `.env.example`) so you can
 * point the app at your own Firebase project. These values are identifiers,
 * not secrets: access is enforced by `firestore.rules` and by restricting the
 * API key to your domains in Google Cloud. The fallbacks below are the
 * original hosted project, so the app still runs with no `.env` file.
 */
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyBd1bTWwH_bpp2P0qufPvvm4U93Vrx-U74",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "book-ledger-2a2e4.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "book-ledger-2a2e4",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "book-ledger-2a2e4.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "989657830450",
  appId: env.VITE_FIREBASE_APP_ID || "1:989657830450:web:a227d3b282fd1ac846182b",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-WP6ZND7TGC",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Local development only: `npm run dev:emulated` talks to the Firebase emulators
// on this machine, never to the real project. `import.meta.env.DEV` is false in
// production builds, so this whole branch is removed from the shipped bundle.
const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true";
if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  console.info("[Pustaka] Using local Firebase emulators (no real data is touched).");
}

export const analyticsReady = useEmulators
  ? Promise.resolve(null)
  : isSupported()
      .then((supported) => (supported ? getAnalytics(app) : null))
      .catch(() => null);
