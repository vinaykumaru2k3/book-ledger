/**
 * Physics and geometry for the Knowledge Galaxy. Pure functions, no React,
 * so the layout maths can be unit-tested and the component stays thin.
 */

/**
 * One tick of the force simulation (mutates node x/y/vx/vy in place).
 *
 *  - every pair of nodes repels
 *  - a weak gravity pulls everything toward the origin
 *  - optional clustering pulls nodes toward the centroid of their group
 *  - links act as springs (heavier links want to be closer)
 *
 * `alpha` is the "temperature": 1 moves nodes freely, values near 0 settle
 * them. *Every* force is scaled by it, so as it falls to zero the layout comes
 * to rest instead of drifting forever. `pinnedId` is a node being dragged, which the simulation must not move.
 * Returns the total speed of all nodes, so callers can stop once it is ~0.
 */
export function stepSimulation(nodes, links, { alpha = 1, clusterBy = "none", pinnedId = null } = {}) {
  const damping = 0.9;
  const centerGravity = 0.005;
  const clusterGravity = clusterBy !== "none" ? 0.015 : 0;
  const clusterKey = (node) => (clusterBy === "status" ? node.status : node.author);

  const centroids = new Map();
  if (clusterGravity) {
    nodes.forEach((node) => {
      const key = clusterKey(node);
      const c = centroids.get(key) || { x: 0, y: 0, count: 0 };
      c.x += node.x;
      c.y += node.y;
      c.count += 1;
      centroids.set(key, c);
    });
  }

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    for (let j = 0; j < nodes.length; j += 1) {
      if (i === j) continue;
      const other = nodes[j];
      const dx = node.x - other.x;
      const dy = node.y - other.y;
      const distSq = Math.max(dx * dx + dy * dy, 100);
      const dist = Math.sqrt(distSq);
      const force = (800 / distSq) * alpha;
      node.vx += (dx / dist) * force;
      node.vy += (dy / dist) * force;
    }

    node.vx -= node.x * centerGravity * alpha;
    node.vy -= node.y * centerGravity * alpha;

    if (clusterGravity) {
      const c = centroids.get(clusterKey(node));
      if (c.count > 1) {
        node.vx += (c.x / c.count - node.x) * clusterGravity * alpha;
        node.vy += (c.y / c.count - node.y) * clusterGravity * alpha;
      }
    }
  }

  links.forEach(({ source, target, weight }) => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    const desired = Math.max(120 - weight * 10, 60);
    const force = (dist - desired) * 0.05 * alpha;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    source.vx += fx;
    source.vy += fy;
    target.vx -= fx;
    target.vy -= fy;
  });

  let energy = 0;
  nodes.forEach((node) => {
    if (node.id === pinnedId) return;
    node.vx *= damping;
    node.vy *= damping;
    node.x += node.vx;
    node.y += node.vy;
    energy += Math.abs(node.vx) + Math.abs(node.vy);
  });
  return energy;
}

/**
 * Converts a pointer position (px relative to the svg element) into graph
 * coordinates. The svg uses `preserveAspectRatio="meet"`, so the viewBox is
 * scaled uniformly and centred; that scaling has to be undone here.
 */
export function screenToWorld(sx, sy, rect, camera, view = { width: 800, height: 600 }) {
  const scale = Math.min(rect.width / view.width, rect.height / view.height) || 1;
  const offsetX = (rect.width - view.width * scale) / 2;
  const offsetY = (rect.height - view.height * scale) / 2;
  const vx = (sx - offsetX) / scale;
  const vy = (sy - offsetY) / scale;
  return {
    x: (vx - view.width / 2) / camera.zoom + camera.x,
    y: (vy - view.height / 2) / camera.zoom + camera.y,
    scale,
  };
}
