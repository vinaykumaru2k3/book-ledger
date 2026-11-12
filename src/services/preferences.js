/** Per-user preferences stored on the profile document `users/{uid}` (owner-only in firestore.rules). */
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function loadThemePref(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  const theme = snap.exists() ? snap.data().theme : null;
  return typeof theme === "string" ? theme : null;
}

export function saveThemePref(uid, theme) {
  return setDoc(doc(db, "users", uid), { theme }, { merge: true });
}
