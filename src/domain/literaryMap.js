/**
 * Literary maps: authors, works and movements, and the links between them.
 *
 * A map is made for a language ("Kannada literature"), a movement ("Romanticism")
 * or a reader's own library. It starts from Wikidata and Wikipedia, then its owner
 * (and, for public maps, the community) corrects and extends it. Every node and
 * link remembers where it came from, so a reader can tell a sourced fact from an
 * owner's opinion or a weak "mentioned together" hint.
 *
 * Everything here is pure: plain objects in, plain objects out.
 */

import { soundKey, soundsAlike } from "./soundKey";

export const LIMITS = { nodes: 600, links: 2000, note: 600, title: 120, description: 1000 };

export const NODE_KINDS = ["author", "work", "movement"];
export const SCOPE_KINDS = ["language", "movement", "library"];
export const NODE_SOURCES = ["wikidata", "user"];
export const LINK_SOURCES = ["wikidata", "wikipedia", "user", "suggestion"];

/**
 * Link types. `from → to` reads as the sentence in `reads`:
 * "Kuvempu influenced Tejasvi", "Tejasvi student of Kuvempu".
 * `weight` orders how much a link says (used for sizing and for paths);
 * `ownerOnly` types never come from generation.
 */
export const LINK_TYPES = {
  influenced: { reads: "influenced", weight: 3, influence: true },
  student_of: { reads: "was a student of", weight: 3, influence: true },
  responded_to: { reads: "responded to", weight: 2, influence: true, ownerOnly: true },
  translated: { reads: "translated", weight: 2, ownerOnly: true },
  wrote: { reads: "wrote", weight: 1 },
  member_of: { reads: "belongs to", weight: 1 },
  contemporary: { reads: "was a contemporary of", weight: 1, ownerOnly: true, undirected: true },
  mentioned: { reads: "is mentioned with", weight: 0.5, undirected: true },
};

const clip = (value, max) => String(value ?? "").trim().slice(0, max);
const year = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > -5000 && n < 3000 ? n : undefined;
};
const uniq = (list) => [...new Set(list.filter(Boolean))];

export const linkId = (from, type, to) => {
  // Undirected links get one id whichever end they are written from.
  if (LINK_TYPES[type]?.undirected && from > to) [from, to] = [to, from];
  return `${from}>${type}>${to}`;
};

let counter = 0;
/** A fresh id for a node the owner adds by hand (not on Wikidata). */
export const userNodeId = (now = Date.now()) => `u${now.toString(36)}${(counter++).toString(36)}`;

/** A node with every field in a known shape; anything unknown is dropped. */
export function normalizeNode(raw = {}) {
  const kind = NODE_KINDS.includes(raw.kind) ? raw.kind : "author";
  const qid = /^Q\d+$/.test(raw.qid || "") ? raw.qid : undefined;
  const name = {
    native: clip(raw.name?.native, 200),
    en: clip(raw.name?.en, 200),
    aliases: uniq((raw.name?.aliases || []).map((a) => clip(a, 200))).slice(0, 12),
  };
  if (!name.native && !name.en) name.en = qid || "Untitled";
  const node = {
    id: clip(raw.id || qid, 64),
    kind,
    name,
    years: {},
    source: NODE_SOURCES.includes(raw.source) ? raw.source : "user",
  };
  const from = year(raw.years?.from);
  const to = year(raw.years?.to);
  if (from !== undefined) node.years.from = from;
  // Conflicting sources can give a death before the birth; keep only the first then.
  if (to !== undefined && (from === undefined || to >= from)) node.years.to = to;
  if (qid) node.qid = qid;
  if (kind === "work" && raw.authorIds?.length) node.authorIds = uniq(raw.authorIds.map(String)).slice(0, 10);
  if (raw.note) node.note = clip(raw.note, LIMITS.note);
  if (raw.hidden) node.hidden = true;
  // The owner corrected its names or years: a refresh from Wikidata keeps them.
  if (raw.edited) node.edited = true;
  // The owner brought it in (from a search or "grow from here"): a refresh keeps it.
  if (raw.added) node.added = true;
  return node;
}

/** A link with a known type and source; undirected links get a canonical id. */
export function normalizeLink(raw = {}) {
  const type = LINK_TYPES[raw.type] ? raw.type : "mentioned";
  let { from, to } = raw;
  if (LINK_TYPES[type].undirected && from > to) [from, to] = [to, from];
  const link = {
    id: linkId(from, type, to),
    from: String(from || ""),
    to: String(to || ""),
    type,
    source: LINK_SOURCES.includes(raw.source) ? raw.source : "user",
  };
  if (raw.note) link.note = clip(raw.note, LIMITS.note);
  if (/^https?:\/\//.test(raw.citation || "")) link.citation = clip(raw.citation, 500);
  if (raw.hidden) link.hidden = true;
  if (raw.added) link.added = true;
  return link;
}

/**
 * A graph with clean nodes and links: no duplicates, no links to missing nodes
 * or to themselves. The first copy of a duplicate wins.
 */
export function normalizeGraph(raw = {}) {
  const nodes = [];
  const seen = new Set();
  (raw.nodes || []).forEach((n) => {
    const node = normalizeNode(n);
    if (node.id && !seen.has(node.id)) {
      seen.add(node.id);
      nodes.push(node);
    }
  });
  const links = [];
  const seenLinks = new Set();
  (raw.links || []).forEach((l) => {
    const link = normalizeLink(l);
    if (link.from === link.to || !seen.has(link.from) || !seen.has(link.to) || seenLinks.has(link.id)) return;
    seenLinks.add(link.id);
    links.push(link);
  });
  return { nodes, links };
}

/** The map's own fields (title, scope, visibility...), cleaned. */
export function normalizeMeta(raw = {}) {
  const scope = raw.scope || {};
  return {
    title: clip(raw.title, LIMITS.title) || "Untitled map",
    description: clip(raw.description, LIMITS.description),
    scope: {
      kind: SCOPE_KINDS.includes(scope.kind) ? scope.kind : "language",
      qid: /^Q\d+$/.test(scope.qid || "") ? scope.qid : "",
      label: clip(scope.label, 120),
      langCode: /^[a-z-]{2,12}$/.test(scope.langCode || "") ? scope.langCode : "",
    },
    visibility: raw.visibility === "public" ? "public" : "private",
    ownerId: String(raw.ownerId || ""),
    ownerName: clip(raw.ownerName, 80),
    forkedFrom: raw.forkedFrom ? String(raw.forkedFrom) : null,
    featured: Boolean(raw.featured),
  };
}

/** Problems that stop a graph from being saved; empty when it is fine. */
export function validateGraph(graph) {
  const errors = [];
  if (graph.nodes.length > LIMITS.nodes) errors.push(`A map holds at most ${LIMITS.nodes} authors, works and movements.`);
  if (graph.links.length > LIMITS.links) errors.push(`A map holds at most ${LIMITS.links} links.`);
  return errors;
}

const STRUCTURAL = new Set(["wrote", "member_of"]);

/** How many of each kind a map shows (hidden ones are not counted). */
export function countsOf(graph) {
  const counts = { authors: 0, works: 0, movements: 0, links: 0 };
  graph.nodes.forEach((n) => {
    if (!n.hidden) counts[`${n.kind}s`] += 1;
  });
  const shown = new Set(graph.nodes.filter((n) => !n.hidden).map((n) => n.id));
  // "Links" are the connections between writers (influences, mentions), not authorship or membership.
  counts.links = graph.links.filter((l) => !l.hidden && !STRUCTURAL.has(l.type) && shown.has(l.from) && shown.has(l.to)).length;
  return counts;
}

/** The graph a reader sees: hidden nodes and links, and links to hidden nodes, left out. */
export function visibleGraph(graph) {
  const nodes = graph.nodes.filter((n) => !n.hidden);
  const ids = new Set(nodes.map((n) => n.id));
  return { nodes, links: graph.links.filter((l) => !l.hidden && ids.has(l.from) && ids.has(l.to)) };
}

/**
 * Refreshing a map from Wikidata without undoing its owner's work:
 * - what the owner hid stays hidden, and their notes and corrections stay;
 * - nodes and links the owner (or a suggestion) added or brought in are kept;
 * - generated items no longer on Wikidata are dropped unless the owner annotated them;
 * - new generated items come in.
 * Returns the merged graph and what changed, for a preview before applying.
 */
export function mergeGenerated(existing, fresh) {
  const old = normalizeGraph(existing);
  const next = normalizeGraph(fresh);
  const oldNodes = new Map(old.nodes.map((n) => [n.id, n]));
  const oldLinks = new Map(old.links.map((l) => [l.id, l]));
  const freshNodeIds = new Set(next.nodes.map((n) => n.id));
  const freshLinkIds = new Set(next.links.map((l) => l.id));

  const nodes = next.nodes.map((n) => {
    const before = oldNodes.get(n.id);
    if (!before) return n;
    const merged = { ...n };
    if (before.hidden) merged.hidden = true;
    if (before.note) merged.note = before.note;
    if (before.edited) Object.assign(merged, { name: before.name, years: before.years, edited: true });
    return merged;
  });
  const keptNodes = old.nodes.filter((n) => !freshNodeIds.has(n.id) && (n.source === "user" || n.note || n.hidden || n.edited || n.added));
  const allNodes = [...nodes, ...keptNodes];

  const links = next.links.map((l) => {
    const before = oldLinks.get(l.id);
    if (!before) return l;
    const merged = { ...l };
    if (before.hidden) merged.hidden = true;
    if (before.note) merged.note = before.note;
    if (before.citation) merged.citation = before.citation;
    return merged;
  });
  const keptLinks = old.links.filter(
    (l) => !freshLinkIds.has(l.id) && (l.source === "user" || l.source === "suggestion" || l.note || l.hidden || l.added)
  );
  const graph = normalizeGraph({ nodes: allNodes, links: [...links, ...keptLinks] });

  const changes = {
    addedNodes: next.nodes.filter((n) => !oldNodes.has(n.id)).map((n) => n.id),
    removedNodes: old.nodes.filter((n) => !graph.nodes.some((g) => g.id === n.id)).map((n) => n.id),
    addedLinks: next.links.filter((l) => !oldLinks.has(l.id)).map((l) => l.id),
    removedLinks: old.links.filter((l) => !graph.links.some((g) => g.id === l.id)).map((l) => l.id),
  };
  return { graph, changes };
}

/**
 * Applies an accepted community suggestion. Kinds:
 * - "add-link": payload is a link; it is credited to the suggestion.
 * - "add-node": payload { node, links? }.
 * - "fix-node": payload { id, name?, years?, note? }.
 * - "hide": payload { nodeId } or { linkId }.
 */
export function applySuggestion(graph, suggestion) {
  const { kind, payload = {} } = suggestion || {};
  const g = { nodes: [...graph.nodes], links: [...graph.links] };
  const credit = (link) => ({
    ...link,
    source: "suggestion",
    note: link.note || suggestion.note,
    citation: link.citation || suggestion.citation,
  });
  if (kind === "add-link") g.links.push(credit(payload));
  else if (kind === "add-node") {
    g.nodes.push({ ...payload.node, source: payload.node?.qid ? "wikidata" : "user" });
    (payload.links || []).forEach((l) => g.links.push(credit(l)));
  } else if (kind === "fix-node") {
    g.nodes = g.nodes.map((n) =>
      n.id === payload.id
        ? {
            ...n,
            name: payload.name ? { ...n.name, ...payload.name } : n.name,
            years: payload.years ? { ...n.years, ...payload.years } : n.years,
            note: payload.note ?? n.note,
          }
        : n
    );
  } else if (kind === "hide") {
    g.nodes = g.nodes.map((n) => (n.id === payload.nodeId ? { ...n, hidden: true } : n));
    g.links = g.links.map((l) => (l.id === payload.linkId ? { ...l, hidden: true } : l));
  } else {
    throw new Error(`Unknown suggestion: ${kind}`);
  }
  return normalizeGraph(g);
}

/** Number of visible links touching each node, weighted by what the link says. */
export function degree(graph) {
  const score = new Map(graph.nodes.map((n) => [n.id, 0]));
  graph.links.forEach((l) => {
    if (l.hidden) return;
    const w = LINK_TYPES[l.type]?.weight ?? 1;
    if (score.has(l.from)) score.set(l.from, score.get(l.from) + w);
    if (score.has(l.to)) score.set(l.to, score.get(l.to) + w);
  });
  return score;
}

/** The node's visible links, each with the node at the other end and the direction. */
export function neighbours(graph, nodeId, { types } = {}) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  return graph.links
    .filter((l) => !l.hidden && (l.from === nodeId || l.to === nodeId) && (!types || types.includes(l.type)))
    .map((l) => {
      const outgoing = l.from === nodeId;
      return { link: l, node: byId.get(outgoing ? l.to : l.from), outgoing };
    })
    .filter((x) => x.node && !x.node.hidden);
}

/**
 * The shortest chain of influence between two nodes, as a list of node ids,
 * or [] when none. Influence links count both ways ("A influenced B" and
 * "B influenced A" both connect them); weak "mentioned" links count only
 * when `includeWeak` is set.
 */
export function influencePath(graph, a, b, { includeWeak = false } = {}) {
  if (a === b) return [a];
  const hidden = new Set(graph.nodes.filter((n) => n.hidden).map((n) => n.id));
  const adjacent = new Map();
  graph.links.forEach((l) => {
    const type = LINK_TYPES[l.type];
    if (l.hidden || !(type?.influence || (includeWeak && (l.type === "mentioned" || l.type === "contemporary")))) return;
    if (hidden.has(l.from) || hidden.has(l.to)) return;
    if (!adjacent.has(l.from)) adjacent.set(l.from, []);
    if (!adjacent.has(l.to)) adjacent.set(l.to, []);
    adjacent.get(l.from).push(l.to);
    adjacent.get(l.to).push(l.from);
  });
  const previous = new Map([[a, null]]);
  const queue = [a];
  while (queue.length) {
    const current = queue.shift();
    for (const next of adjacent.get(current) || []) {
      if (previous.has(next)) continue;
      previous.set(next, current);
      if (next === b) {
        const path = [b];
        for (let at = current; at !== null; at = previous.get(at)) path.unshift(at);
        return path;
      }
      queue.push(next);
    }
  }
  return [];
}

/**
 * Everything a timeline needs:
 * - `range`: the first and last year shown;
 * - `bands`: movements with their span (their own years, otherwise their members' lives);
 * - `lanes`: authors grouped by movement (an author in several goes under the first),
 *   ordered by birth, each with their works' years;
 * - `undated`: authors and works with no year at all, for the list next to it.
 */
export function timelineOf(graph) {
  const { nodes, links } = visibleGraph(graph);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const memberOf = new Map();
  links
    .filter((l) => l.type === "member_of")
    .forEach((l) => {
      if (!memberOf.has(l.from)) memberOf.set(l.from, []);
      memberOf.get(l.from).push(l.to);
    });
  const worksOf = new Map();
  const addWork = (authorId, work) => {
    if (!worksOf.has(authorId)) worksOf.set(authorId, []);
    if (!worksOf.get(authorId).includes(work)) worksOf.get(authorId).push(work);
  };
  links.filter((l) => l.type === "wrote").forEach((l) => byId.get(l.to) && addWork(l.from, byId.get(l.to)));
  nodes.filter((n) => n.kind === "work").forEach((w) => (w.authorIds || []).forEach((a) => addWork(a, w)));

  // An author's span: birth to death, or the years of their works when those are missing.
  const span = (author) => {
    const workYears = (worksOf.get(author.id) || []).map((w) => w.years.from).filter((y) => y !== undefined);
    const from = author.years.from ?? (workYears.length ? Math.min(...workYears) - 25 : undefined);
    const to = author.years.to ?? (workYears.length ? Math.max(...workYears) : from !== undefined ? from + 70 : undefined);
    return from === undefined ? null : { from, to: Math.max(to, from) };
  };

  const authors = nodes.filter((n) => n.kind === "author");
  const undated = [];
  const lanesByMovement = new Map();
  authors.forEach((author) => {
    const s = span(author);
    if (!s) {
      undated.push(author);
      return;
    }
    const movement = (memberOf.get(author.id) || []).find((id) => byId.get(id)?.kind === "movement") || "";
    if (!lanesByMovement.has(movement)) lanesByMovement.set(movement, []);
    lanesByMovement.get(movement).push({
      author,
      from: s.from,
      to: s.to,
      estimated: author.years.from === undefined,
      works: (worksOf.get(author.id) || []).filter((w) => w.years.from !== undefined).map((w) => ({ id: w.id, year: w.years.from })),
    });
  });
  nodes.filter((n) => n.kind === "work" && n.years.from === undefined).forEach((w) => undated.push(w));

  const bands = nodes
    .filter((n) => n.kind === "movement")
    .map((movement) => {
      const lane = lanesByMovement.get(movement.id) || [];
      // A movement's own years; otherwise from its members' working lives (age 25 to death).
      const from = movement.years.from ?? (lane.length ? Math.min(...lane.map((m) => m.from + 25)) : undefined);
      const to = movement.years.to ?? (lane.length ? Math.max(...lane.map((m) => m.to)) : undefined);
      return from === undefined ? null : { movement, from, to: Math.max(to ?? from, from), estimated: movement.years.from === undefined };
    })
    .filter(Boolean)
    .sort((x, y) => x.from - y.from);

  const order = [...bands.map((b) => b.movement.id), ""];
  const lanes = order
    .filter((id) => lanesByMovement.has(id))
    .map((id) => ({
      movement: byId.get(id) || null,
      members: lanesByMovement.get(id).sort((x, y) => x.from - y.from),
    }));

  const years = [...bands.flatMap((b) => [b.from, b.to]), ...lanes.flatMap((l) => l.members.flatMap((m) => [m.from, m.to]))];
  const range = years.length ? { from: Math.min(...years), to: Math.max(...years) } : null;
  return { range, bands, lanes, undated };
}

/** Every name a node goes by, for search: both scripts and the aliases. */
export const namesOfNode = (node) => uniq([node.name.native, node.name.en, ...(node.name.aliases || [])]);

/**
 * Nodes matching a search, best first: an exact name, then a name that starts with
 * the query, then one containing it, then one that sounds the same in another
 * spelling or script ("kuvempu" finds ಕುವೆಂಪು).
 */
export function searchNodes(graph, query, limit = 20) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const key = soundKey(q);
  const scored = [];
  graph.nodes.forEach((node) => {
    if (node.hidden) return;
    let best = 0;
    namesOfNode(node).forEach((name) => {
      const n = name.toLowerCase();
      if (n === q) best = Math.max(best, 4);
      else if (n.startsWith(q) || n.split(/\s+/).some((w) => w.startsWith(q))) best = Math.max(best, 3);
      else if (n.includes(q)) best = Math.max(best, 2);
      else if (key.length >= 3 && soundsFrom(name, key)) best = Math.max(best, 1);
    });
    if (best) scored.push({ node, best });
  });
  return scored.sort((a, b) => b.best - a.best).slice(0, limit).map((s) => s.node);
}

// True when the name, from any of its words on, starts with the sound key: "tejaswi" finds "Poornachandra Tejasvi".
function soundsFrom(name, key) {
  const words = name.split(/\s+/);
  return words.some((_, i) => soundKey(words.slice(i).join(" ")).startsWith(key));
}

const WIKIDATA_KEY = /^wd:(Q\d+)$/;

/**
 * Which works on the map the reader already has: by the Wikidata id the book
 * was added with, otherwise by a title that sounds the same (in either script)
 * from an author whose name sounds the same too. Returns Map(workId → bookId).
 */
export function inLibrary(graph, books = []) {
  const found = new Map();
  const byQid = new Map();
  books.forEach((b) => {
    const m = WIKIDATA_KEY.exec(b.sourceKey || "");
    if (m) byQid.set(m[1], b);
  });
  const authorNames = new Map(graph.nodes.filter((n) => n.kind === "author").map((n) => [n.id, namesOfNode(n)]));
  graph.nodes
    .filter((n) => n.kind === "work")
    .forEach((work) => {
      const direct = work.qid && byQid.get(work.qid);
      if (direct) {
        found.set(work.id, direct.id);
        return;
      }
      const titles = namesOfNode(work);
      const authors = (work.authorIds || []).flatMap((id) => authorNames.get(id) || []);
      const match = books.find(
        (b) =>
          titles.some((t) => soundsAlike(t, b.title)) &&
          (!authors.length || !b.author || authors.some((a) => soundsAlike(a, b.author) || sameSurname(a, b.author)))
      );
      if (match) found.set(work.id, match.id);
    });
  return found;
}

// "U. R. Ananthamurthy" and "Ananthamurthy, U.R." share their longest word.
function sameSurname(a, b) {
  const longest = (s) => String(s).split(/[\s,.]+/).sort((x, y) => y.length - x.length)[0] || "";
  const x = soundKey(longest(a));
  return x.length >= 3 && x === soundKey(longest(b));
}

/* ------------------------------ Owner edits ------------------------------ */
// Each returns a new graph and leaves the one given unchanged. What came from
// Wikidata or Wikipedia is hidden rather than deleted, so a refresh does not
// bring it back; what the owner added is deleted outright.

const generated = (item) => item.source === "wikidata" || item.source === "wikipedia";

/**
 * Adds nodes and links (from a search, "grow from here" or a form), skipping
 * what the map has already, and marks them as the owner's so a refresh keeps them. A node already there but hidden is shown again
 * only when `unhide` is set (the owner asked for that node by name). Links need
 * both ends on the map. Returns the graph and how many nodes and links came in.
 */
export function addToMap(graph, { nodes = [], links = [] }, { unhide = false } = {}) {
  const have = new Map(graph.nodes.map((n) => [n.id, n]));
  const addedNodes = [];
  let shown = 0;
  let next = graph.nodes;
  nodes.map((n) => normalizeNode({ ...n, added: true })).forEach((node) => {
    const old = have.get(node.id);
    if (!old) {
      addedNodes.push(node);
      have.set(node.id, node);
    } else if (old.hidden && unhide) {
      next = next.map((n) => (n.id === node.id ? withoutKey(n, "hidden") : n));
      shown += 1;
    }
  });
  const haveLinks = new Set(graph.links.map((l) => l.id));
  const addedLinks = [];
  links.map((l) => normalizeLink({ ...l, added: true })).forEach((link) => {
    if (haveLinks.has(link.id) || link.from === link.to || !have.has(link.from) || !have.has(link.to)) return;
    haveLinks.add(link.id);
    addedLinks.push(link);
  });
  return {
    graph: { nodes: [...next, ...addedNodes], links: [...graph.links, ...addedLinks] },
    added: { nodes: addedNodes.length + shown, links: addedLinks.length },
  };
}

/**
 * Why a link the owner draws cannot be saved, as a code, or "" when it can:
 * "ends" (both ends must be chosen and differ), "type", or "note" (every
 * hand-drawn link says why, so readers can weigh it).
 */
export function linkProblem(raw = {}) {
  if (!raw.from || !raw.to || raw.from === raw.to) return "ends";
  if (!LINK_TYPES[raw.type]) return "type";
  if (!String(raw.note || "").trim()) return "note";
  return "";
}

/**
 * Draws a link as the owner. Drawing one the map has already (say, a hidden
 * generated one) shows it again with the owner's note and citation; the source
 * stays what it was.
 */
export function addLink(graph, raw) {
  const problem = linkProblem(raw);
  if (problem) throw new Error(`Link cannot be saved: ${problem}`);
  const link = normalizeLink({ ...raw, source: "user" });
  const old = graph.links.find((l) => l.id === link.id);
  if (!old) return { ...graph, links: [...graph.links, link] };
  const updated = normalizeLink({ ...old, note: link.note, citation: link.citation ?? old.citation, hidden: false });
  return { ...graph, links: graph.links.map((l) => (l.id === link.id ? updated : l)) };
}

/**
 * Corrects a node: `name` ({ native, en }), `years` ({ from, to }, a blank
 * clears one) and `note`. Corrected names and years survive a refresh.
 */
export function updateNode(graph, id, patch = {}) {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      if (n.id !== id) return n;
      const next = { ...n };
      if (patch.name) next.name = { ...n.name, ...patch.name };
      if (patch.years) next.years = { ...patch.years };
      if (patch.name || patch.years) next.edited = true;
      if ("note" in patch) next.note = patch.note;
      return normalizeNode(next);
    }),
  };
}

/** Changes a link's note or citation. */
export function updateLink(graph, id, patch = {}) {
  return {
    ...graph,
    links: graph.links.map((l) => (l.id === id ? normalizeLink({ ...l, ...pick(patch, ["note", "citation"]) }) : l)),
  };
}

/** Hides (or shows again) a node or a link: `{ nodeId }` or `{ linkId }`. */
export function setHidden(graph, { nodeId, linkId }, hidden = true) {
  const flip = (item) => (hidden ? { ...item, hidden: true } : withoutKey(item, "hidden"));
  return {
    nodes: graph.nodes.map((n) => (n.id === nodeId ? flip(n) : n)),
    links: graph.links.map((l) => (l.id === linkId ? flip(l) : l)),
  };
}

/**
 * Takes a node off the map: deleted with its links when the owner added it,
 * hidden when it was generated (its links stay, unseen, for if it comes back).
 */
export function removeNode(graph, id) {
  const node = graph.nodes.find((n) => n.id === id);
  if (!node) return graph;
  if (generated(node)) return setHidden(graph, { nodeId: id });
  return {
    nodes: graph.nodes.filter((n) => n.id !== id).map((n) => (n.authorIds?.includes(id) ? normalizeNode({ ...n, authorIds: n.authorIds.filter((a) => a !== id) }) : n)),
    links: graph.links.filter((l) => l.from !== id && l.to !== id),
  };
}

/** Takes a link off the map: deleted when the owner or a suggestion added it, hidden when generated. */
export function removeLink(graph, id) {
  const link = graph.links.find((l) => l.id === id);
  if (!link) return graph;
  if (generated(link)) return setHidden(graph, { linkId: id });
  return { ...graph, links: graph.links.filter((l) => l.id !== id) };
}

/** What the owner has hidden: nodes, and links between nodes still shown. */
export function hiddenItems(graph) {
  const shown = new Set(graph.nodes.filter((n) => !n.hidden).map((n) => n.id));
  return {
    nodes: graph.nodes.filter((n) => n.hidden),
    links: graph.links.filter((l) => l.hidden && shown.has(l.from) && shown.has(l.to)),
  };
}

function withoutKey(item, key) {
  const { [key]: _drop, ...rest } = item;
  return rest;
}

function pick(object, keys) {
  return Object.fromEntries(keys.filter((k) => k in object).map((k) => [k, object[k]]));
}
