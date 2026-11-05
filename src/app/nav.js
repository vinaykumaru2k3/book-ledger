/**
 * Where the navigation can take you. One list feeds the desktop rail, the phone
 * tab bar, the "More" sheet and the command palette, so a new page is added in
 * exactly one place (plus its entry in `views.js`). `shortKey` is a shorter
 * label for the narrow rail and tab bar; the palette uses the full `labelKey`.
 */
import { BarChart3, FolderOpen, Languages, Library, Sparkles, Telescope, Trophy } from "lucide-react";
import { shelfFromRoute } from "../domain/library";
import { isValidView } from "./routes";

const ALL_DESTINATIONS = [
  { id: "all", labelKey: "nav.library", icon: Library },
  { id: "shelves", labelKey: "nav.shelves", icon: FolderOpen },
  { id: "recommendations", labelKey: "nav.recommendations", shortKey: "nav.recommendationsShort", icon: Sparkles },
  { id: "topbooks", labelKey: "nav.topBooks", icon: Trophy },
  { id: "analytics", labelKey: "nav.insights", icon: BarChart3 },
  { id: "galaxy", labelKey: "nav.galaxy", shortKey: "nav.galaxyShort", icon: Telescope },
  { id: "kannada", labelKey: "nav.kannada", shortKey: "nav.kannadaShort", icon: Languages },
];

/** Destinations that exist in this build (the Kannada Explorer is flag-gated). */
export const DESTINATIONS = ALL_DESTINATIONS.filter((d) => isValidView(d.id));

/** Shown directly on the phone tab bar; everything else goes under "More". */
const TAB_BAR_IDS = ["all", "shelves", "galaxy"];
export const TAB_BAR_DESTINATIONS = DESTINATIONS.filter((d) => TAB_BAR_IDS.includes(d.id));
export const MORE_DESTINATIONS = DESTINATIONS.filter((d) => !TAB_BAR_IDS.includes(d.id));

const LIBRARY_VIEWS = new Set(["all", "want", "reading", "done", "favorites"]);

/** Is `view` shown by the destination `id`? (All library lists and shelves belong to "Library".) */
export function isActiveDestination(id, view) {
  if (id === "all") return LIBRARY_VIEWS.has(view) || shelfFromRoute(view) !== null;
  return id === view;
}
