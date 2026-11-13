import { useCallback, useEffect, useRef, useState } from "react";
import { stepLayout } from "./forceLayout";

export const ALPHA_MIN = 0.02; // below this temperature the layout is at rest and the loop stops
const COOLING = 0.985; // ~4 seconds from a full start to rest at 60 fps
const SETTLE_STEPS = 320; // enough steps to cool completely in one go

/** Runs the layout to rest immediately (no animation). */
export function settleLayout(nodes, links, options = {}) {
  let alpha = 1;
  for (let i = 0; i < SETTLE_STEPS && alpha > ALPHA_MIN; i += 1) {
    stepLayout(nodes, links, { ...options, alpha });
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
 *  - `resting` whether the layout has come to rest at least once since it started
 *
 * `options` are `stepLayout` options, read fresh on every tick; the loop
 * starts over when `graph` or `restartKey` changes. `draggedNode()` returns the
 * node being dragged (pinned in place), if any. The layout is computed at once,
 * without animation, for people who prefer reduced motion and for graphs with
 * more than `options.settleAbove` nodes (too many to animate smoothly).
 */
export function useForceLayout(graph, options, draggedNode, restartKey) {
  const heat = useRef(1);
  const wakeRef = useRef(() => {});
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [frame, setFrame] = useState(0);
  const [resting, setResting] = useState(false);

  useEffect(() => {
    heat.current = 1;
    wakeRef.current = () => {};
    setResting(false);
    if (!graph.nodes.length) return undefined;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const tooBig = graph.nodes.length > (optionsRef.current?.settleAbove ?? Infinity);
    let raf = null;
    const tick = () => {
      const dragged = draggedNode();
      stepLayout(graph.nodes, graph.links, { ...optionsRef.current, alpha: heat.current, pinnedId: dragged?.id });
      heat.current *= COOLING;
      setFrame((f) => f + 1);
      if (heat.current > ALPHA_MIN || dragged) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null; // at rest: stop for good
        graph.nodes.forEach((node) => {
          node.vx = 0;
          node.vy = 0;
        });
        setResting(true);
      }
    };
    wakeRef.current = () => {
      if (raf === null) raf = requestAnimationFrame(tick);
    };

    if (reduced || tooBig) {
      settleLayout(graph.nodes, graph.links, optionsRef.current);
      heat.current = 0;
      setFrame((f) => f + 1);
      setResting(true);
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      wakeRef.current = () => {};
    };
    // `draggedNode` reads a ref and `options` are read through one, so neither restarts the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, restartKey]);

  const wake = useCallback(() => wakeRef.current(), []);
  return { heat, frame, wake, resting };
}
