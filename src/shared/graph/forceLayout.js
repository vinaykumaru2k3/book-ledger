/**
 * Force layout for node-and-link pictures (the Knowledge Galaxy, literary
 * maps). Pure functions, no React, so the maths can be unit-tested.
 *
 * Nodes are plain objects with `x, y, vx, vy` (mutated in place) and an
 * optional `mass` (default 1: how strongly the node pushes others away).
 * Links are `{ source, target, weight }` with node objects at both ends.
 */

const DEFAULTS = {
  charge: 800, // how hard every pair of nodes pushes apart
  centerGravity: 0.005, // weak pull toward the origin
  groupStrength: 0.015, // pull toward the centre of the node's group
  damping: 0.9,
  linkDistance: (link) => Math.max(120 - (link.weight ?? 0) * 10, 60),
  linkStrength: 0.05,
  approximateAbove: 200, // above this many nodes, distant crowds push as one (Barnes–Hut)
  theta: 0.9,
};

const MIN_DIST_SQ = 100;
const MAX_DEPTH = 24;

const cell = (x0, y0, size) => ({ x0, y0, size, mass: 0, cx: 0, cy: 0, node: null, extra: null, kids: null });

function put(c, n, depth) {
  const half = c.size / 2;
  const right = n.x >= c.x0 + half ? 1 : 0;
  const lower = n.y >= c.y0 + half ? 2 : 0;
  const i = right + lower;
  if (!c.kids[i]) c.kids[i] = cell(c.x0 + right * half, c.y0 + (lower ? half : 0), half);
  insert(c.kids[i], n, depth + 1);
}

function insert(c, n, depth) {
  const m = n.mass ?? 1;
  if (c.mass === 0 && !c.kids) {
    c.node = n;
    c.mass = m;
    c.cx = n.x;
    c.cy = n.y;
    return;
  }
  c.cx = (c.cx * c.mass + n.x * m) / (c.mass + m);
  c.cy = (c.cy * c.mass + n.y * m) / (c.mass + m);
  c.mass += m;
  if (depth >= MAX_DEPTH) {
    // Nodes on (almost) the same spot: keep them together in this leaf.
    (c.extra ||= []).push(n);
    return;
  }
  if (!c.kids) {
    c.kids = [null, null, null, null];
    const old = c.node;
    c.node = null;
    if (old) put(c, old, depth);
    if (c.extra) {
      c.extra.forEach((e) => put(c, e, depth));
      c.extra = null;
    }
  }
  put(c, n, depth);
}

/** A quadtree over the nodes, each cell knowing its total mass and centre of mass. */
export function buildQuadtree(nodes) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  nodes.forEach((n) => {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x);
    maxY = Math.max(maxY, n.y);
  });
  const root = cell(minX, minY, Math.max(maxX - minX, maxY - minY) + 1);
  nodes.forEach((n) => insert(root, n, 0));
  return root;
}

function push(node, fromX, fromY, mass, charge, alpha) {
  const dx = node.x - fromX;
  const dy = node.y - fromY;
  const distSq = Math.max(dx * dx + dy * dy, MIN_DIST_SQ);
  const dist = Math.sqrt(distSq);
  const force = ((charge * mass) / distSq) * alpha;
  node.vx += (dx / dist) * force;
  node.vy += (dy / dist) * force;
}

function repelFromTree(c, node, charge, alpha, theta2) {
  if (!c || c.mass === 0) return;
  if (!c.kids) {
    if (c.node && c.node !== node) push(node, c.node.x, c.node.y, c.node.mass ?? 1, charge, alpha);
    c.extra?.forEach((e) => e !== node && push(node, e.x, e.y, e.mass ?? 1, charge, alpha));
    return;
  }
  const dx = node.x - c.cx;
  const dy = node.y - c.cy;
  const d2 = dx * dx + dy * dy;
  if (d2 > 0 && (c.size * c.size) / d2 < theta2) {
    push(node, c.cx, c.cy, c.mass, charge, alpha);
    return;
  }
  c.kids.forEach((k) => repelFromTree(k, node, charge, alpha, theta2));
}

/**
 * One tick of the simulation (mutates node x/y/vx/vy in place):
 *  - every pair of nodes repels (approximated for big pictures);
 *  - a weak gravity pulls everything toward the origin;
 *  - `groupOf(node)` (optional) pulls nodes toward the centre of their group;
 *    a `null` group means "no group";
 *  - links act as springs.
 *
 * `alpha` is the temperature: every force is scaled by it, so as it falls to
 * zero the layout comes to rest. `pinnedId` is a node being dragged, which
 * does not move. Returns the total speed of all nodes.
 */
export function stepLayout(nodes, links, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const { alpha = 1, pinnedId = null, groupOf = null } = options;

  const centroids = new Map();
  if (groupOf) {
    nodes.forEach((node) => {
      const key = groupOf(node);
      if (key === null) return;
      const c = centroids.get(key) || { x: 0, y: 0, count: 0 };
      c.x += node.x;
      c.y += node.y;
      c.count += 1;
      centroids.set(key, c);
    });
  }

  const tree = nodes.length > o.approximateAbove ? buildQuadtree(nodes) : null;
  const theta2 = o.theta * o.theta;

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (tree) {
      repelFromTree(tree, node, o.charge, alpha, theta2);
    } else {
      for (let j = 0; j < nodes.length; j += 1) {
        if (i !== j) push(node, nodes[j].x, nodes[j].y, nodes[j].mass ?? 1, o.charge, alpha);
      }
    }

    node.vx -= node.x * o.centerGravity * alpha;
    node.vy -= node.y * o.centerGravity * alpha;

    if (groupOf) {
      const key = groupOf(node);
      const c = key === null ? null : centroids.get(key);
      if (c && c.count > 1) {
        node.vx += (c.x / c.count - node.x) * o.groupStrength * alpha;
        node.vy += (c.y / c.count - node.y) * o.groupStrength * alpha;
      }
    }
  }

  const distanceOf = typeof o.linkDistance === "function" ? o.linkDistance : () => o.linkDistance;
  const strengthOf = typeof o.linkStrength === "function" ? o.linkStrength : () => o.linkStrength;
  links.forEach((link) => {
    const { source, target } = link;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    const force = (dist - distanceOf(link)) * strengthOf(link) * alpha;
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
    node.vx *= o.damping;
    node.vy *= o.damping;
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

/**
 * The camera that shows every node inside the view with a margin, never
 * zooming in past `maxZoom`.
 */
export function fitCamera(nodes, view = { width: 800, height: 600 }, { margin = 40, minZoom = 0.2, maxZoom = 1.5 } = {}) {
  if (!nodes.length) return { x: 0, y: 0, zoom: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  nodes.forEach((n) => {
    const r = n.radius || 0;
    minX = Math.min(minX, n.x - r);
    minY = Math.min(minY, n.y - r);
    maxX = Math.max(maxX, n.x + r);
    maxY = Math.max(maxY, n.y + r);
  });
  const zoom = Math.min((view.width - margin * 2) / Math.max(maxX - minX, 1), (view.height - margin * 2) / Math.max(maxY - minY, 1));
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom: Math.max(minZoom, Math.min(maxZoom, zoom)) };
}

/** The smallest convex polygon around the points (monotone chain), as [[x, y], ...]. */
export function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  pts.forEach((p) => {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  });
  const upper = [];
  [...pts].reverse().forEach((p) => {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  });
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
