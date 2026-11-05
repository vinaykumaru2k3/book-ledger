import { useCallback, useEffect, useRef, useState } from "react";
import { stepSimulation } from "./graphSimulation";

export const ALPHA_MIN = 0.02; // below this temperature the layout is at rest and the loop stops
const COOLING = 0.985; // ~4 seconds from a full start to rest at 60 fps
const SETTLE_STEPS = 320; // enough steps to cool completely in one go

/** Runs the layout to rest immediately (no animation), for users who prefer reduced motion. */
export function settleNow(nodes, links, clusterBy) {
  let alpha = 1;
  for (let i = 0; i < SETTLE_STEPS && alpha > ALPHA_MIN; i += 1) {
    stepSimulation(nodes, links, { alpha, clusterBy });
    alpha *= COOLING;
  }
  nodes.forEach((node) => {
    node.vx = 0;
    node.vy = 0;
  });
}

/**
 * Runs the force layout in `requestAnimationFrame` while it is still cooling,
 * then stops completely (no more frames, no more re-renders). Returns:
 *  - `heat`  a ref holding the temperature
 *  - `frame` a counter that changes each tick so the caller re-renders moved nodes
 *  - `wake()` reheat-and-run, used while dragging a node
 *
 * `draggedNode()` returns the node being dragged (pinned in place), if any.
 */
export function useForceSimulation(graphData, clusterBy, draggedNode) {
  const heat = useRef(1);
  const wakeRef = useRef(() => {});
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    heat.current = 1;
    wakeRef.current = () => {};
    if (!graphData.nodes.length) return undefined;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      settleNow(graphData.nodes, graphData.links, clusterBy);
      setFrame((f) => f + 1);
      return undefined;
    }

    let raf = null;
    const tick = () => {
      const dragged = draggedNode();
      stepSimulation(graphData.nodes, graphData.links, { alpha: heat.current, clusterBy, pinnedId: dragged?.id });
      heat.current *= COOLING;
      setFrame((f) => f + 1);
      if (heat.current > ALPHA_MIN || dragged) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null; // at rest: stop for good
        graphData.nodes.forEach((node) => {
          node.vx = 0;
          node.vy = 0;
        });
      }
    };

    wakeRef.current = () => {
      if (raf === null) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      wakeRef.current = () => {};
    };
    // `draggedNode` reads a ref, so it never needs to restart the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData, clusterBy]);

  const wake = useCallback(() => wakeRef.current(), []);
  return { heat, frame, wake };
}
