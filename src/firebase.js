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
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

export const analyticsReady = isSupported()
  .then((supported) => (supported ? getAnalytics(app) : null))
  .catch(() => null);
