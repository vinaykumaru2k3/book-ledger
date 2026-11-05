/**
 * Registry of the app's views. To add a page: create the feature component,
 * add it here, and add its route name to `PAGE_ROUTES` in `usePathRoute.js`.
 *
 * Routes that are *not* listed here ("all", a status, "favorites",
 * "shelf:<name>") show the library list.
 */
import { lazy } from "react";
import { shelfFromRoute } from "../domain/library";

// Heavy pages load on demand so the first screen stays small.
export const PAGES = {
  recommendations: {
    kicker: "Personalized Discovery",
    title: "Book Recommendations",
    Component: lazy(() => import("../features/discover/Recommendations")),
  },
  topbooks: {
    kicker: "Popular Charts",
    title: "Discover Top Books",
    Component: lazy(() => import("../features/discover/TopCharts")),
  },
  analytics: {
    kicker: "Reading Insights",
    title: "Library Analytics",
    Component: lazy(() => import("../features/insights/Analytics")),
  },
  shelves: {
    kicker: "Library Dashboard",
    title: "Custom Shelves",
    Component: lazy(() => import("../features/shelves/ShelvesDashboard")),
  },
  galaxy: {
    kicker: "Constellation Graph",
    title: "Knowledge Galaxy",
    Component: lazy(() => import("../features/galaxy/ConstellationGraph")),
    fullBleed: true, // draws edge to edge, without the panel padding
  },
};

/** Heading text and page component (if any) for a route. */
export function describeRoute(route) {
  const page = PAGES[route] || null;
  if (page) return { page, kicker: page.kicker, title: page.title, isLibrary: false };

  const shelf = shelfFromRoute(route);
  return {
    page: null,
    kicker: "Library Dashboard",
    title: shelf !== null ? `Shelf: ${shelf}` : "My Library",
    isLibrary: true,
  };
}
