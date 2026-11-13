/**
 * Turns a literary map into what the graph view draws: positioned nodes,
 * springs between them and the movement regions behind them. Pure, so it can
 * be tested without a browser.
 */
import { LINK_TYPES, degree } from "../../domain/literaryMap";

/** The kinds of line a reader can switch on and off, and the link types in each. */
export const LINE_KINDS = {
  influence: ["influenced", "student_of", "responded_to", "translated", "contemporary"],
  mentions: ["mentioned"],
  works: ["wrote"],
};
const KIND_OF_TYPE = Object.fromEntries(Object.entries(LINE_KINDS).flatMap(([kind, types]) => types.map((t) => [t, kind])));

const DISTANCE = { influence: 110, mentions: 150, works: 26 };
const STRENGTH = { influence: 0.05, mentions: 0.008, works: 0.14 };

/** Force-layout settings for maps (see `shared/graph/forceLayout.js`). */
export const MAP_LAYOUT = {
  charge: 1100,
  groupOf: (node) => node.group,
  groupStrength: 0.022,
  linkDistance: (link) => DISTANCE[link.kind],
  linkStrength: (link) => STRENGTH[link.kind],
  settleAbove: 160, // bigger maps are laid out at once rather than animated
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Author circles grow with how connected the author is. */
export const authorRadius = (score = 0) => Math.min(5 + 2.2 * Math.sqrt(score), 22);

/**
 * What to draw for `graph` (already without hidden items). `show` switches
 * the kinds of line (and, with `works`, the works themselves) on and off.
 *
 * - `nodes`: authors, works and the movements nobody on the map belongs to, each
 *   with a starting position (most connected in the middle, works beside their
 *   author), a radius and a `group` (its first movement) that pulls it to its peers;
 * - `links`: springs between drawn nodes, with `kind` and `directed`;
 * - `regions`: each movement with members on the map, drawn as a shaded area around them.
 */
export function layoutModel(graph, show = { influence: true, mentions: true, works: true }) {
  const scores = degree(graph);
  const byId = new Map();
  const memberships = new Map();
  graph.links.forEach((l) => {
    if (l.type !== "member_of") return;
    if (!memberships.has(l.from)) memberships.set(l.from, []);
    memberships.get(l.from).push(l.to);
  });
  const source = new Map(graph.nodes.map((n) => [n.id, n]));

  const authors = graph.nodes
    .filter((n) => n.kind === "author")
    .sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0) || a.id.localeCompare(b.id));
  const works = show.works ? graph.nodes.filter((n) => n.kind === "work") : [];

  const nodes = [];
  const add = (data, extra) => {
    const node = { id: data.id, kind: data.kind, data, vx: 0, vy: 0, mass: 1, ...extra };
    nodes.push(node);
    byId.set(node.id, node);
    return node;
  };
  const spiral = (i) => ({ x: 16 * Math.sqrt(i + 0.5) * Math.cos(i * GOLDEN_ANGLE), y: 16 * Math.sqrt(i + 0.5) * Math.sin(i * GOLDEN_ANGLE) });
  const movementOf = (id) => (memberships.get(id) || []).find((m) => source.get(m)?.kind === "movement") ?? null;

  authors.forEach((a, i) => add(a, { ...spiral(i), radius: authorRadius(scores.get(a.id)), group: movementOf(a.id) }));

  let loose = authors.length;
  const besideAuthor = new Map();
  works.forEach((w) => {
    const author = (w.authorIds || []).map((id) => byId.get(id)).find(Boolean);
    let pos;
    if (author) {
      const k = besideAuthor.get(author.id) || 0;
      besideAuthor.set(author.id, k + 1);
      const angle = k * 2.1 + 0.6;
      pos = { x: author.x + Math.cos(angle) * (author.radius + 14), y: author.y + Math.sin(angle) * (author.radius + 14) };
    } else {
      pos = spiral(loose);
      loose += 1;
    }
    add(w, { ...pos, radius: 3.5, mass: 0.45, group: author ? author.group : movementOf(w.id) });
  });

  const regions = [];
  graph.nodes
    .filter((n) => n.kind === "movement")
    .forEach((m) => {
      const memberIds = nodes.filter((n) => n.kind === "author" && (memberships.get(n.id) || []).includes(m.id)).map((n) => n.id);
      if (memberIds.length) regions.push({ id: m.id, movement: m, memberIds });
      else add(m, { ...spiral(loose++), radius: 6, group: null });
    });

  const links = [];
  graph.links.forEach((l) => {
    const kind = KIND_OF_TYPE[l.type];
    if (!kind || !show[kind]) return;
    const from = byId.get(l.from);
    const to = byId.get(l.to);
    if (!from || !to) return;
    links.push({ id: l.id, type: l.type, kind, source: from, target: to, weight: LINK_TYPES[l.type].weight, directed: !LINK_TYPES[l.type].undirected });
  });

  return { nodes, links, byId, regions, scores };
}

/** Ids of the nodes linked to `id` in the drawing, including fellow members of a movement region. */
export function drawnNeighbours(model, id) {
  const near = new Set([id]);
  model.links.forEach((l) => {
    if (l.source.id === id) near.add(l.target.id);
    if (l.target.id === id) near.add(l.source.id);
  });
  model.regions.forEach((r) => {
    if (r.id === id) r.memberIds.forEach((m) => near.add(m));
    else if (r.memberIds.includes(id)) near.add(r.id);
  });
  return near;
}

/**
 * The outline of a movement region: points around each member, padded by
 * `pad`, for a convex hull. A lone member still gets a small round area.
 */
export function regionPoints(model, region, pad = 16) {
  const points = [];
  region.memberIds.forEach((id) => {
    const n = model.byId.get(id);
    if (!n) return;
    const r = n.radius + pad;
    for (let k = 0; k < 8; k += 1) points.push([n.x + Math.cos((k * Math.PI) / 4) * r, n.y + Math.sin((k * Math.PI) / 4) * r]);
  });
  return points;
}
