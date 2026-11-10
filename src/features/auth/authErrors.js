/**
 * Maps a Firebase Auth error to a translation key (see shared/i18n). Keeping
 * this pure means the controller holds no user-facing text, and every message
 * can be shown in either language.
 */
const CODES = [
  ["popup-closed-by-user", "auth.error.popupClosed"],
  ["cancelled-popup-request", "auth.error.popupClosed"],
  ["popup-blocked", "auth.error.popupBlocked"],
  ["invalid-credential", "auth.error.invalidCredential"],
  ["wrong-password", "auth.error.invalidCredential"],
  ["user-not-found", "auth.error.invalidCredential"],
  ["invalid-login-credentials", "auth.error.invalidCredential"],
  ["email-already-in-use", "auth.error.emailInUse"],
  ["weak-password", "auth.error.weakPassword"],
  ["invalid-email", "auth.error.invalidEmail"],
  ["operation-not-allowed", "auth.error.notAllowed"],
  ["unauthorized-domain", "auth.error.unauthorizedDomain"],
  ["too-many-requests", "auth.error.tooManyRequests"],
  ["network-request-failed", "auth.error.network"],
  ["user-disabled", "auth.error.disabled"],
];

export function authErrorKey(error) {
  const code = error?.code || "";
  const hit = CODES.find(([fragment]) => code.includes(fragment));
  return hit ? hit[1] : "auth.error.unknown";
}
