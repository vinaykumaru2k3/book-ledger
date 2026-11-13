/**
 * The Knowledge Galaxy's settings for the shared force layout
 * (`shared/graph/forceLayout.js`), which holds the physics itself.
 */
import { stepLayout } from "../../shared/graph/forceLayout";

export { screenToWorld } from "../../shared/graph/forceLayout";

/** Layout options for a clustering choice: none, by reading status, or by author. */
export function galaxyLayout(clusterBy = "none") {
  if (clusterBy === "none") return {};
  return { groupOf: clusterBy === "status" ? (node) => node.status : (node) => node.author };
}

/** One tick of the galaxy's simulation (see `stepLayout`). Returns the total speed of all nodes. */
export function stepSimulation(nodes, links, { alpha = 1, clusterBy = "none", pinnedId = null } = {}) {
  return stepLayout(nodes, links, { ...galaxyLayout(clusterBy), alpha, pinnedId });
}
