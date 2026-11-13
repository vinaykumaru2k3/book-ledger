import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import SearchBox from "../../shared/pk/SearchBox";
import SelectBox from "../../shared/pk/SelectBox";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { convexHull, fitCamera, screenToWorld } from "../../shared/graph/forceLayout";
import { useForceLayout } from "../../shared/graph/useForceLayout";
import { inLibrary, influencePath, searchNodes } from "../../domain/literaryMap";
import { MAP_LAYOUT, drawnNeighbours, layoutModel, regionPoints } from "./mapLayout";
import MapInspector from "./MapInspector";
import { NodeName } from "./MapListView";

const VIEW = { width: 800, height: 600 };
const CLICK_SLOP_PX = 5;
const TAP_REACH_PX = 14; // how far from a small node a tap still picks it
const ZOOM = { min: 0.15, max: 4 };
const ALWAYS_LABELLED = 14; // the most connected authors keep their names at any zoom
const REGION_COLOURS = ["--pk-sapphire", "--pk-copper", "--pk-amethyst", "--pk-peacock", "--pk-emerald", "--pk-garnet", "--pk-gold"];
const clampZoom = (z) => Math.max(ZOOM.min, Math.min(ZOOM.max, z));
const shorten = (text, max = 28) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** A line from the edge of one node to the edge of the other, so arrowheads are not hidden under circles. */
function edgeLine(a, b, pad = 2) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  return { x1: a.x + ux * a.radius, y1: a.y + uy * a.radius, x2: b.x - ux * (b.radius + pad), y2: b.y - uy * (b.radius + pad) };
}

const smoothPath = (points) => (points.length ? `M${points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L")}Z` : "");

/**
 * The map as a picture: authors are circles sized by how connected they are,
 * works are small squares beside their author, movements are shaded areas
 * around their members. Influence is drawn as arrows, mentions as faint
 * dashed lines. Drag to pan, scroll or pinch to zoom, click to inspect.
 */
function MapGraphView({ graph, scope, books, canAdd, onAddBook, selectedId, onSelect, onShowInList }) {
  const { t } = useLanguage();
  const lang = scope?.langCode;
  const svgRef = useRef(null);
  const workCount = useMemo(() => graph.nodes.filter((n) => n.kind === "work").length, [graph]);
  const [show, setShow] = useState(() => ({ influence: true, mentions: true, works: workCount <= 160 }));
  const [movementId, setMovementId] = useState("");
  const [script, setScript] = useState("native");
  const [query, setQuery] = useState("");
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [hoveredId, setHoveredId] = useState(null);
  const [path, setPath] = useState(null);
  const cameraTouched = useRef(false);
  const pointer = useRef({ mode: "idle" });
  const touches = useRef(new Map());

  const showKey = `${show.influence}${show.mentions}${show.works}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const model = useMemo(() => layoutModel(graph, show), [graph, showKey]);
  const { wake, heat, resting } = useForceLayout(model, MAP_LAYOUT, () => (pointer.current.mode === "node" ? pointer.current.node : null));

  const owned = useMemo(() => inLibrary(graph, books), [graph, books]);
  const graphNode = useCallback((id) => graph.nodes.find((n) => n.id === id) || null, [graph]);
  const selected = selectedId ? graphNode(selectedId) : null;
  const hasNative = useMemo(() => graph.nodes.some((n) => n.name.native && n.name.en && n.name.native !== n.name.en), [graph]);
  const labelled = useMemo(
    () => new Set(model.nodes.filter((n) => n.kind === "author").slice(0, ALWAYS_LABELLED).map((n) => n.id)),
    [model]
  );
  const movements = useMemo(
    () => graph.nodes.filter((n) => n.kind === "movement").sort((a, b) => (a.name.en || a.name.native).localeCompare(b.name.en || b.name.native)),
    [graph]
  );
  const regionColour = useMemo(() => new Map(model.regions.map((r, i) => [r.id, `var(${REGION_COLOURS[i % REGION_COLOURS.length]})`])), [model]);

  // Frame the whole map once its layout has come to rest, unless the reader has already moved it.
  useEffect(() => {
    if (resting && !cameraTouched.current) setCamera(fitCamera(model.nodes, VIEW));
  }, [resting, model]);

  // Keep a selected node in view when it is chosen from outside the picture (search, a link, the URL).
  const flyTo = useCallback(
    (id) => {
      const target = model.byId.get(id);
      const region = model.regions.find((r) => r.id === id);
      const members = region ? region.memberIds.map((m) => model.byId.get(m)).filter(Boolean) : [];
      cameraTouched.current = true;
      if (target) setCamera((c) => ({ x: target.x, y: target.y, zoom: Math.max(c.zoom, 1.3) }));
      else if (members.length) setCamera(fitCamera(members, VIEW, { maxZoom: 2 }));
    },
    [model]
  );
  const flownTo = useRef(null);
  useEffect(() => {
    if (!resting || !selectedId || flownTo.current === selectedId) return;
    flownTo.current = selectedId;
    flyTo(selectedId);
  }, [resting, selectedId, flyTo]);

  const choose = (node) => {
    if (!node) return;
    if (node.kind === "work" && !show.works) setShow((s) => ({ ...s, works: true }));
    flownTo.current = null;
    onSelect(node.id);
  };

  // The chain of influence stays drawn while the reader moves along it.
  useEffect(() => {
    if (path && selectedId && !path.ids.includes(selectedId)) setPath(null);
  }, [selectedId, path]);
  const tracePath = (toId) => {
    if (!toId || !selected) return setPath(null);
    let ids = influencePath(graph, selected.id, toId);
    let weak = false;
    if (!ids.length) {
      ids = influencePath(graph, selected.id, toId, { includeWeak: true });
      weak = ids.length > 0;
    }
    setPath({ ids, weak });
    const nodes = ids.map((id) => model.byId.get(id)).filter(Boolean);
    if (nodes.length) {
      cameraTouched.current = true;
      setCamera(fitCamera(nodes, VIEW, { maxZoom: 1.8, margin: 80 }));
    }
  };

  // What to bring forward: a chosen path, else the selection and its neighbours, else a movement.
  const focus = useMemo(() => {
    if (path?.ids.length) return new Set(path.ids);
    if (selectedId) return drawnNeighbours(model, selectedId);
    if (movementId) {
      const region = model.regions.find((r) => r.id === movementId);
      return new Set([movementId, ...(region?.memberIds || [])]);
    }
    return null;
  }, [path, selectedId, movementId, model]);
  const dim = (id) => focus && !focus.has(id);

  const nameOf = (data) => (script === "en" ? data.name.en || data.name.native : data.name.native || data.name.en);
  const isNativeLabel = (data) => script !== "en" && data.name.native && data.name.native !== data.name.en;

  // ----- pointer: drag a node, pan the background, pinch or scroll to zoom -----

  const worldAt = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    return screenToWorld(clientX - rect.left, clientY - rect.top, rect, camera, VIEW);
  };

  const nodeNear = (world) => {
    const reach = TAP_REACH_PX / (world.scale * camera.zoom);
    let best = null;
    let bestDist = Infinity;
    model.nodes.forEach((n) => {
      const d = Math.hypot(n.x - world.x, n.y - world.y) - n.radius;
      if (d < reach && d < bestDist) {
        best = n;
        bestDist = d;
      }
    });
    return best;
  };

  const hitAt = (event) => {
    const tagged = event.target.closest?.("[data-node]");
    if (tagged) return { id: tagged.getAttribute("data-node"), node: model.byId.get(tagged.getAttribute("data-node")) || null };
    const near = nodeNear(worldAt(event.clientX, event.clientY));
    return near ? { id: near.id, node: near } : null;
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      cameraTouched.current = true;
      setCamera((c) => {
        const at = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, rect, c, VIEW);
        const zoom = clampZoom(c.zoom * (e.deltaY > 0 ? 0.88 : 1.14));
        // Zoom around the pointer: the point under it stays under it.
        return { zoom, x: at.x - ((at.x - c.x) * c.zoom) / zoom, y: at.y - ((at.y - c.y) * c.zoom) / zoom };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    svgRef.current.setPointerCapture?.(e.pointerId);
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.current.size === 2) {
      const [a, b] = [...touches.current.values()];
      pointer.current = { mode: "pinch", startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1, startZoom: camera.zoom, moved: true };
      return;
    }
    const hit = hitAt(e);
    pointer.current = {
      mode: hit?.node ? "node" : "pan",
      node: hit?.node || null,
      hitId: hit?.id || null,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
  };

  const onPointerMove = (e) => {
    const p = pointer.current;
    if (p.mode === "idle") {
      if (e.pointerType === "mouse") setHoveredId(hitAt(e)?.id ?? null);
      return;
    }
    if (!touches.current.has(e.pointerId)) return;
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (p.mode === "pinch") {
      const [a, b] = [...touches.current.values()];
      if (!b) return;
      cameraTouched.current = true;
      setCamera((c) => ({ ...c, zoom: clampZoom((p.startZoom * Math.hypot(a.x - b.x, a.y - b.y)) / p.startDist) }));
      return;
    }
    if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > CLICK_SLOP_PX) p.moved = true;
    if (!p.moved) return;
    if (p.mode === "node") {
      const world = worldAt(e.clientX, e.clientY);
      p.node.x = world.x;
      p.node.y = world.y;
      p.node.vx = 0;
      p.node.vy = 0;
      heat.current = Math.max(heat.current, 0.3);
      wake();
    } else {
      const rect = svgRef.current.getBoundingClientRect();
      const scale = Math.min(rect.width / VIEW.width, rect.height / VIEW.height) || 1;
      const dx = (e.clientX - p.lastX) / (scale * camera.zoom);
      const dy = (e.clientY - p.lastY) / (scale * camera.zoom);
      cameraTouched.current = true;
      setCamera((c) => ({ ...c, x: c.x - dx, y: c.y - dy }));
      p.lastX = e.clientX;
      p.lastY = e.clientY;
    }
  };

  const onPointerUp = (e) => {
    touches.current.delete(e.pointerId);
    const p = pointer.current;
    if (touches.current.size > 0) return; // the other finger of a pinch is still down
    pointer.current = { mode: "idle" };
    if (p.mode === "idle" || p.mode === "pinch" || p.moved) return;
    if (p.hitId) {
      flownTo.current = p.hitId; // a click selects in place; the picture does not jump
      onSelect(p.hitId === selectedId ? null : p.hitId);
    } else {
      onSelect(null);
    }
  };

  const onDoubleClick = (e) => {
    const hit = hitAt(e);
    if (!hit) return;
    flownTo.current = null;
    const n = model.byId.get(hit.id);
    if (n) {
      cameraTouched.current = true;
      setCamera((c) => ({ x: n.x, y: n.y, zoom: clampZoom(Math.max(c.zoom * 1.6, 1.6)) }));
    }
  };

  const zoomBy = (factor) => {
    cameraTouched.current = true;
    setCamera((c) => ({ ...c, zoom: clampZoom(c.zoom * factor) }));
  };
  const fitAll = () => {
    cameraTouched.current = false;
    setCamera(fitCamera(model.nodes, VIEW));
  };

  // ----- search -----
  const matches = useMemo(() => (query.trim() ? searchNodes(graph, query, 8) : []), [graph, query]);

  // ----- drawing -----
  const pathPairs = useMemo(() => {
    if (!path?.ids.length) return [];
    return path.ids.slice(1).map((id, i) => [model.byId.get(path.ids[i]), model.byId.get(id)]).filter(([a, b]) => a && b);
  }, [path, model]);
  const zoom = camera.zoom;
  const fontSize = 11 / Math.max(zoom, 0.6);
  const showLabel = (n) =>
    n.id === selectedId ||
    n.id === hoveredId ||
    (focus && focus.has(n.id) && (n.kind !== "work" || zoom > 1.2)) ||
    (n.kind === "author" && (labelled.has(n.id) ? zoom > 0.35 : zoom > 1.5)) ||
    (n.kind === "movement" && zoom > 0.8) ||
    (n.kind === "work" && zoom > 2.4);

  const authorCount = graph.nodes.filter((n) => n.kind === "author").length;

  return (
    <div className="pk-map-graph">
      <div className="pk-map-graph__bar">
        <div className="pk-map-graph__search">
          <SearchBox value={query} onChange={setQuery} label={t("maps.graph.search")} placeholder={t("maps.graph.searchPlaceholder")} />
          {matches.length > 0 && (
            <ul className="pk-map-picks pk-map-picks--float" aria-label={t("maps.graph.results")}>
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      choose(m);
                    }}
                  >
                    <NodeName node={m} lang={lang} />
                    <span className="pk-map-picks__kind">{t(`maps.inspector.kind.${m.kind}`)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="pk-map-graph__toggles" role="group" aria-label={t("maps.graph.lines")}>
          {["influence", "mentions", "works"].map((kind) => (
            <button
              key={kind}
              type="button"
              className={`pk-map-toggle pk-map-toggle--${kind}`}
              aria-pressed={show[kind]}
              onClick={() => setShow((s) => ({ ...s, [kind]: !s[kind] }))}
            >
              <span className="pk-map-toggle__mark" aria-hidden="true" />
              {t(`maps.graph.${kind}`)}
            </button>
          ))}
        </div>
        {movements.length > 0 && (
          <SelectBox
            label={t("maps.graph.movement")}
            prefix={t("maps.graph.movementPrefix")}
            value={movementId}
            onChange={(id) => {
              setMovementId(id);
              if (id) {
                onSelect(null);
                flyTo(id);
              }
            }}
            options={[{ value: "", label: t("maps.graph.allMovements") }, ...movements.map((m) => ({ value: m.id, label: m.name.en || m.name.native }))]}
          />
        )}
        {hasNative && (
          <SelectBox
            label={t("maps.graph.names")}
            prefix={t("maps.graph.names")}
            value={script}
            onChange={setScript}
            options={[
              { value: "native", label: t("maps.graph.namesNative") },
              { value: "en", label: t("maps.graph.namesEnglish") },
            ]}
          />
        )}
      </div>

      <div className={selected ? "pk-map-graph__stage pk-map-graph__stage--inspecting" : "pk-map-graph__stage"}>
        <div className="pk-map-graph__canvas">
          <svg
            ref={svgRef}
            role="img"
            aria-label={t("maps.graph.label", { authors: authorCount })}
            viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
            preserveAspectRatio="xMidYMid meet"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={() => pointer.current.mode === "idle" && setHoveredId(null)}
            onDoubleClick={onDoubleClick}
          >
            <defs>
              <marker id="pk-map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,1 L9,5 L0,9 Z" className="pk-map-arrow" />
              </marker>
              <marker id="pk-map-arrow-lit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,1 L9,5 L0,9 Z" className="pk-map-arrow pk-map-arrow--lit" />
              </marker>
            </defs>
            <g transform={`translate(${VIEW.width / 2}, ${VIEW.height / 2}) scale(${zoom}) translate(${-camera.x}, ${-camera.y})`}>
              {model.regions.map((r) => {
                const hull = convexHull(regionPoints(model, r));
                const top = hull.reduce((best, p) => (p[1] < best[1] ? p : best), hull[0] || [0, 0]);
                const colour = regionColour.get(r.id);
                const faded = dim(r.id) && !(focus && r.memberIds.some((m) => focus.has(m)));
                return (
                  <g key={r.id} className={faded ? "pk-map-region pk-map-region--dim" : "pk-map-region"} style={{ "--region": colour }}>
                    <path d={smoothPath(hull)} className={r.id === selectedId ? "pk-map-region__area pk-map-region__area--on" : "pk-map-region__area"} />
                    {(zoom > 0.3 || r.id === selectedId) && (
                      <text data-node={r.id} x={top[0]} y={top[1] - 4} className="pk-map-region__label" fontSize={fontSize * 1.05} textAnchor="middle">
                        {shorten(r.movement.name.en || r.movement.name.native, 36)}
                      </text>
                    )}
                  </g>
                );
              })}

              {model.links.map((l) => {
                const line = edgeLine(l.source, l.target);
                const lit = selectedId && (l.source.id === selectedId || l.target.id === selectedId);
                const faded = focus && !(focus.has(l.source.id) && focus.has(l.target.id));
                const marker = l.directed && l.kind === "influence" ? `url(#${lit ? "pk-map-arrow-lit" : "pk-map-arrow"})` : undefined;
                return (
                  <line
                    key={l.id}
                    {...line}
                    className={`pk-map-line pk-map-line--${l.kind}${lit ? " pk-map-line--lit" : ""}${faded ? " pk-map-line--dim" : ""}`}
                    markerEnd={marker}
                  />
                );
              })}

              {pathPairs.map(([a, b]) => (
                <line key={`${a.id}>${b.id}`} {...edgeLine(a, b)} className="pk-map-line pk-map-line--path" />
              ))}

              {model.nodes.map((n) => {
                const on = n.id === selectedId;
                const hot = n.id === hoveredId;
                const cls = `pk-map-node pk-map-node--${n.kind}${on ? " pk-map-node--on" : ""}${hot ? " pk-map-node--hot" : ""}${dim(n.id) ? " pk-map-node--dim" : ""}${owned.has(n.id) ? " pk-map-node--owned" : ""}`;
                const colour = n.group ? regionColour.get(n.group) : undefined;
                return (
                  <g key={n.id} className={cls} style={colour ? { "--node": colour } : undefined} data-node={n.id}>
                    {n.kind === "author" && <circle cx={n.x} cy={n.y} r={n.radius} />}
                    {n.kind === "work" && <rect x={n.x - n.radius} y={n.y - n.radius * 1.25} width={n.radius * 2} height={n.radius * 2.5} rx={0.8} />}
                    {n.kind === "movement" && (
                      <rect x={n.x - n.radius} y={n.y - n.radius} width={n.radius * 2} height={n.radius * 2} transform={`rotate(45 ${n.x} ${n.y})`} />
                    )}
                    {showLabel(n) && (
                      <text
                        x={n.x}
                        y={n.y + n.radius + fontSize * 1.05}
                        fontSize={n.kind === "work" ? fontSize * 0.9 : fontSize}
                        textAnchor="middle"
                        lang={isNativeLabel(n.data) ? lang : undefined}
                        className="pk-map-node__label"
                      >
                        {shorten(nameOf(n.data))}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {model.nodes.length === 0 && <p className="pk-map-graph__empty">{t("maps.graph.empty")}</p>}

          <div className="pk-map-graph__zoom">
            <button type="button" onClick={() => zoomBy(1.25)} aria-label={t("maps.graph.zoomIn")} title={t("maps.graph.zoomIn")}>
              <Plus size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => zoomBy(0.8)} aria-label={t("maps.graph.zoomOut")} title={t("maps.graph.zoomOut")}>
              <Minus size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={fitAll} aria-label={t("maps.graph.fit")} title={t("maps.graph.fit")}>
              <Maximize2 size={14} aria-hidden="true" />
            </button>
          </div>

          <ul className="pk-map-legend" aria-hidden="true">
            <li>
              <svg width="22" height="8">
                <line x1="1" y1="4" x2="16" y2="4" className="pk-map-line pk-map-line--influence" markerEnd="url(#pk-map-arrow)" />
              </svg>
              {t("maps.graph.legendInfluence")}
            </li>
            <li>
              <svg width="22" height="8">
                <line x1="1" y1="4" x2="21" y2="4" className="pk-map-line pk-map-line--mentions" />
              </svg>
              {t("maps.graph.legendMention")}
            </li>
            <li>
              <svg width="10" height="12">
                <rect x="2" y="1" width="6" height="10" rx="1" className="pk-map-legend__work" />
              </svg>
              {t("maps.graph.legendWork")}
            </li>
            {model.regions.length > 0 && (
              <li>
                <span className="pk-map-legend__region" />
                {t("maps.graph.legendMovement")}
              </li>
            )}
          </ul>
          {!selected && model.nodes.length > 0 && <p className="pk-map-graph__hint">{t("maps.graph.hint")}</p>}
        </div>

        {selected && (
          <MapInspector
            graph={graph}
            node={selected}
            lang={lang}
            bookId={owned.get(selected.id)}
            canAdd={canAdd}
            onAddBook={onAddBook}
            onJump={choose}
            onClose={() => onSelect(null)}
            onShowInList={onShowInList}
            path={path}
            onPath={tracePath}
          />
        )}
      </div>
    </div>
  );
}

export default MapGraphView;
