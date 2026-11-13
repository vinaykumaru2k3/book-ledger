import { useMemo } from "react";
import { ALPHA_MIN, settleLayout, useForceLayout } from "../../shared/graph/useForceLayout";
import { galaxyLayout } from "./graphSimulation";

export { ALPHA_MIN };

/** Runs the galaxy's layout to rest immediately (no animation), for users who prefer reduced motion. */
export function settleNow(nodes, links, clusterBy) {
  settleLayout(nodes, links, galaxyLayout(clusterBy));
}

/**
 * The galaxy's force layout, animated until it cools (see `useForceLayout`).
 * `draggedNode()` returns the node being dragged (pinned in place), if any.
 */
export function useForceSimulation(graphData, clusterBy, draggedNode) {
  const options = useMemo(() => galaxyLayout(clusterBy), [clusterBy]);
  return useForceLayout(graphData, options, draggedNode, clusterBy);
}
