import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBd1bTWwH_bpp2P0qufPvvm4U93Vrx-U74",
  authDomain: "book-ledger-2a2e4.firebaseapp.com",
  projectId: "book-ledger-2a2e4",
  storageBucket: "book-ledger-2a2e4.firebasestorage.app",
  messagingSenderId: "989657830450",
  appId: "1:989657830450:web:a227d3b282fd1ac846182b",
  measurementId: "G-WP6ZND7TGC",
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
