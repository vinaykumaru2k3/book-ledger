/**
 * Minimal client-side router: the library "view" lives in the URL path
 * (`/reading`, `/shelf%3AFavourites`, `/galaxy`, ...) so views can be
 * bookmarked and the back button works. Unknown paths fall back to the default.
 */
import { useState, useEffect } from "react";
import { STATUSES } from "../components/constants";

const PAGE_ROUTES = ["favorites", "recommendations", "topbooks", "analytics", "shelves", "galaxy"];

export function isValidRoute(route) {
  return (
    route === "all" ||
    PAGE_ROUTES.includes(route) ||
    Object.keys(STATUSES).includes(route) ||
    (route.startsWith("shelf:") && route.length > "shelf:".length)
  );
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function routeFromLocation(defaultRoute) {
  const route = safeDecode(window.location.pathname.slice(1));
  return route && isValidRoute(route) ? route : defaultRoute;
}

export function usePathRoute(defaultRoute = "all") {
  const [route, setRoute] = useState(() => routeFromLocation(defaultRoute));

  useEffect(() => {
    // Rewrite an unknown URL to the default so the address bar matches the view.
    const requested = safeDecode(window.location.pathname.slice(1));
    if (requested && !isValidRoute(requested)) {
      window.history.replaceState(null, "", "/");
    }
    const handlePopState = () => setRoute(routeFromLocation(defaultRoute));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [defaultRoute]);

  const navigate = (newRoute) => {
    const next = isValidRoute(newRoute) ? newRoute : defaultRoute;
    const path = next === defaultRoute ? "/" : `/${encodeURIComponent(next)}`;
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    setRoute(next);
  };

  return [route, navigate];
}
