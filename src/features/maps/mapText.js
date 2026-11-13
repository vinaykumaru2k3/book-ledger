/** Small text helpers shared by the maps screens. */
import { LINK_TYPES } from "../../domain/literaryMap";

/** "Kannada literature", "Movement: Romanticism", "From my library". */
export function scopeLabel(scope = {}, t) {
  if (scope.kind === "library") return t("maps.scope.libraryLabel");
  if (scope.kind === "movement") return t("maps.scope.movementLabel", { name: scope.label || scope.qid });
  return t("maps.scope.languageLabel", { name: scope.label || scope.langCode || scope.qid });
}

/** "1904–1994", "born 1974", "1936", or "" when nothing is known. */
export function yearsText(years = {}, kind = "author") {
  const { from, to } = years;
  const y = (n) => (n < 0 ? `${-n} BCE` : String(n));
  if (from !== undefined && to !== undefined && to !== from) return `${y(from)}–${y(to)}`;
  if (from !== undefined) return kind === "author" && to === undefined ? `b. ${y(from)}` : y(from);
  if (to !== undefined) return kind === "author" ? `d. ${y(to)}` : y(to);
  return "";
}

/**
 * How a link reads from one end: for "A influenced B", A reads "influenced B"
 * and B reads "influenced by A".
 */
export function linkPhrase(type, outgoing) {
  const spec = LINK_TYPES[type];
  if (!spec) return type;
  if (outgoing || spec.undirected) return spec.reads;
  return INCOMING[type] || spec.reads;
}

const INCOMING = {
  influenced: "was influenced by",
  student_of: "taught",
  responded_to: "drew a response from",
  translated: "was translated by",
  wrote: "was written by",
  member_of: "includes",
};

/** The source of a node or link, as a reader should see it. */
export const SOURCE_KEYS = {
  wikidata: "maps.source.wikidata",
  wikipedia: "maps.source.wikipedia",
  user: "maps.source.user",
  suggestion: "maps.source.suggestion",
};
