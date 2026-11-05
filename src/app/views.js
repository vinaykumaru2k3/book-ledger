/**
 * Registry of the app's pages. To add a page: create the feature component,
 * add it here, and add its nav entry in `nav.js`.
 *
 * Headings come from the translation dictionary under `view.<id>.kicker` and
 * `view.<id>.title`. Routes that are *not* listed here ("all", a status,
 * "favorites", "shelf:<name>") show the library list.
 */
import { lazy } from "react";
import { KANNADA_UI_ENABLED } from "../shared/i18n/config";
import { shelfFromRoute } from "../domain/library";

// Heavy pages load on demand so the first screen stays small.
export const PAGES = {
  recommendations: { Component: lazy(() => import("../features/discover/Recommendations")) },
  topbooks: { Component: lazy(() => import("../features/discover/TopCharts")) },
  analytics: { Component: lazy(() => import("../features/insights/Analytics")) },
  shelves: { Component: lazy(() => import("../features/shelves/ShelvesDashboard")), bare: true },
  galaxy: {
    Component: lazy(() => import("../features/galaxy/ConstellationGraph")),
    fullBleed: true, // draws edge to edge, without the panel padding
  },
  // The Kannada Explorer is public (no sign-in) and hidden until the Kannada UI is reviewed.
  ...(KANNADA_UI_ENABLED
    ? { kannada: { Component: lazy(() => import("../features/kannada/KannadaExplorerPage")), public: true, bare: true } }
    : {}),
};

/** What to show for a view: the page component (if any) and its heading keys. */
export function describeRoute(view) {
  const page = PAGES[view] || null;
  if (page) return { page, kickerKey: `view.${view}.kicker`, titleKey: `view.${view}.title`, isLibrary: false };

  const shelf = shelfFromRoute(view);
  return {
    page: null,
    kickerKey: shelf !== null ? "view.shelf.kicker" : "view.all.kicker",
    titleKey: shelf !== null ? "view.shelf.title" : "view.all.title",
    titleVars: shelf !== null ? { name: shelf } : undefined,
    isLibrary: true,
  };
}
