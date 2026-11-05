import { useEffect, useRef, useState } from "react";
import { stepSimulation } from "./graphSimulation";

const REST_ENERGY = 0.05; // below this total speed the layout counts as settled
const MIN_HEAT = 0.05;
const COOLING = 0.985;

/**
 * Runs the force layout in `requestAnimationFrame` while nodes are still
 * moving, then sleeps. Returns `{ heat, frame }`:
 *  - `heat` (a ref) is the temperature; set it above MIN_HEAT to wake the layout
 *    (done while dragging a node).
 *  - `frame` increments each tick so the caller re-renders the moved nodes.
 *
 * `draggedNode()` returns the node being dragged (pinned in place), if any.
 */
export function useForceSimulation(graphData, clusterBy, draggedNode) {
  const heat = useRef(1);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    heat.current = 1;
    if (!graphData.nodes.length) return undefined;
    let raf = null;

    const tick = () => {
      const dragged = draggedNode();
      const energy = stepSimulation(graphData.nodes, graphData.links, {
        alpha: heat.current,
        clusterBy,
        pinnedId: dragged?.id,
      });
      heat.current = Math.max(heat.current * COOLING, MIN_HEAT);
      setFrame((f) => f + 1);
      raf = energy > REST_ENERGY || dragged ? requestAnimationFrame(tick) : null;
    };

    raf = requestAnimationFrame(tick);
    // A slow poll wakes a sleeping layout after a drag has reheated it.
    const wake = window.setInterval(() => {
      if (raf === null && heat.current > MIN_HEAT) raf = requestAnimationFrame(tick);
    }, 250);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      window.clearInterval(wake);
    };
    // `draggedNode` reads a ref, so it never needs to restart the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData, clusterBy]);

  return { heat, frame };
}
