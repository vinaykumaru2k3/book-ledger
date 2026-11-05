/**
 * Minimal client-side router hook. The current view lives in the URL path so
 * views can be bookmarked and the back button works; unknown paths fall back
 * to the library. All the parsing rules are in `routes.js`.
 *
 *   const [view, navigate, location] = usePathRoute();
 *   navigate("reading")                        // a view key
 *   navigate("/kannada/author/bendre")         // or a full path
 */
import { useCallback, useEffect, useState } from "react";
import { HOME_VIEW, buildPath, isValidView, parseLocation } from "./routes";

export { isValidView as isValidRoute } from "./routes";

const readLocation = () => parseLocation(window.location.pathname);

export function usePathRoute() {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    // Rewrite an unknown URL to the home view so the address bar matches the page.
    if (!readLocation().valid) window.history.replaceState(null, "", "/");
    const onPopState = () => setLocation(readLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((target, params) => {
    const next = target.startsWith("/")
      ? parseLocation(target)
      : { view: isValidView(target) ? target : HOME_VIEW, params: params || {}, valid: true };
    const path = buildPath(next.view, next.params);
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
    setLocation(next);
    window.scrollTo?.(0, 0);
  }, []);

  return [location.view, navigate, location];
}
