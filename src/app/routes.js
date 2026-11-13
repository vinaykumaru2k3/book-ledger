/**
 * URL <-> view mapping. Pure functions, so routing can be tested without a browser.
 *
 * A *view* is a short key the rest of the app switches on:
 *   "all" | "want" | "reading" | "done" | "favorites"   library lists
 *   "shelf:<name>"                                       one shelf
 *   "recommendations" | "topbooks" | "analytics" | "shelves" | "galaxy"   pages
 *   "kannada"                                            the Kannada Explorer (nested)
 *
 * Existing URLs keep working: legacy views are one segment ("/reading",
 * "/shelf%3AName"). Nested views carry their own path ("/kannada/author/bendre")
 * and expose the pieces as `params`.
 */
import { STATUSES } from "../domain/status";
import { PAGES } from "./views";

export const HOME_VIEW = "all";
const LIBRARY_VIEWS = ["all", "favorites", ...Object.keys(STATUSES)];

/** Views whose URL may have more than one segment, and the param names of the extra segments. */
const NESTED = { kannada: ["section", "id"], maps: ["id", "section", "sub"] };

function decode(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return "";
  }
}

export function isValidView(view) {
  return (
    LIBRARY_VIEWS.includes(view) ||
    Object.hasOwn(PAGES, view) ||
    (view.startsWith("shelf:") && view.length > "shelf:".length)
  );
}

/** `"/kannada/author/bendre"` -> `{ view: "kannada", params: { section: "author", id: "bendre" }, valid: true }` */
export function parseLocation(pathname) {
  const segments = pathname.split("/").filter(Boolean).map(decode);
  if (segments.length === 0) return { view: HOME_VIEW, params: {}, valid: true };
  if (segments.some((s) => s === "")) return { view: HOME_VIEW, params: {}, valid: false };

  const [first, ...rest] = segments;
  const names = NESTED[first];
  if (names && isValidView(first)) {
    if (rest.length > names.length) return { view: HOME_VIEW, params: {}, valid: false };
    return { view: first, params: Object.fromEntries(rest.map((value, i) => [names[i], value])), valid: true };
  }
  if (rest.length === 0 && isValidView(first)) return { view: first, params: {}, valid: true };
  return { view: HOME_VIEW, params: {}, valid: false };
}

/** Inverse of parseLocation: the URL path for a view (and nested params). */
export function buildPath(view, params = {}) {
  if (view === HOME_VIEW) return "/";
  const names = NESTED[view] || [];
  const tail = names.map((name) => params[name]).filter(Boolean);
  return `/${[view, ...tail].map(encodeURIComponent).join("/")}`;
}

/** Views that may be opened without signing in. */
export function isPublicView(view) {
  return Boolean(PAGES[view]?.public);
}
