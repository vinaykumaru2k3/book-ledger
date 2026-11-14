import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import SearchBox from "../../shared/pk/SearchBox";
import SelectBox from "../../shared/pk/SelectBox";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { inLibrary, neighbours, searchNodes, timelineOf } from "../../domain/literaryMap";
import { LINE_KINDS, REGION_COLOURS, tracePath } from "./mapLayout";
import { TIMELINE, connector, mainSpan, timelinePlot, yearTicks } from "./mapTimeline";
import MapInspector from "./MapInspector";
import { NodeName } from "./MapListView";
import { yearText, yearsText } from "./mapText";

const MAX_PX_PER_YEAR = 40;
const NARROW = "(max-width: 600px)";
const DRAWN_TYPES = new Set([...LINE_KINDS.influence, ...LINE_KINDS.mentions]);

function useMatches(query) {
  const subscribe = useCallback(
    (onChange) => {
      const list = window.matchMedia?.(query);
      list?.addEventListener?.("change", onChange);
      return () => list?.removeEventListener?.("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(subscribe, () => Boolean(window.matchMedia?.(query).matches), () => false);
}

const reducedMotion = () => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/**
 * The map in time: each author's life is a bar along a year axis, their works
 * are marks on it, and movements are eras shaded behind. Authors are grouped
 * by movement and packed into as few rows as fit. Choosing a life draws its
 * influences as curves. On a phone the same lives run down the page as a list
 * with a small bar each.
 */
function MapTimelineView({ graph, scope, books, canAdd, onAddBook, selectedId, onSelect, onShowInList, onEdit }) {
  const { t } = useLanguage();
  const lang = scope?.langCode;
  const narrow = useMatches(NARROW);
  const timeline = useMemo(() => timelineOf(graph), [graph]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const owned = useMemo(() => inLibrary(graph, books), [graph, books]);
  const hasNative = useMemo(() => graph.nodes.some((n) => n.name.native && n.name.en && n.name.native !== n.name.en), [graph]);
  const [script, setScript] = useState("native");
  const [showWorks, setShowWorks] = useState(true);
  const [query, setQuery] = useState("");
  const [path, setPath] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [zoom, setZoom] = useState(1); // times the scale that fits the main span
  const [viewWidth, setViewWidth] = useState(0);
  const scrollRef = useRef(null);
  const listRef = useRef(null);
  const keepCentre = useRef(null);
  const placed = useRef(false);
  const clickedId = useRef(null);
  const selected = selectedId ? byId.get(selectedId) || null : null;

  const nameOf = useCallback((node) => (script === "en" ? node.name.en || node.name.native : node.name.native || node.name.en), [script]);
  const isNative = (node) => script !== "en" && node.name.native && node.name.native !== node.name.en;

  // ----- scale: fit the main span (the whole range less far-off early lives), zoom from there -----
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const measure = () => setViewWidth(el.clientWidth);
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    return () => observer?.disconnect();
  }, [narrow, Boolean(timeline.range)]);

  const main = useMemo(() => mainSpan(timeline), [timeline]);
  const span = main ? Math.max(main.to - main.from, 10) : 10;
  const wholeSpan = timeline.range ? Math.max(timeline.range.to - timeline.range.from, 10) : 10;
  const fitScale = Math.max(((viewWidth || 800) - TIMELINE.pad - TIMELINE.tail) / span, 0.2);
  const minZoom = Math.min(span / wholeSpan, 1); // zoomed all the way out, the whole range fits
  const maxZoom = Math.max(MAX_PX_PER_YEAR / fitScale, 1);
  const pxPerYear = fitScale * Math.min(Math.max(zoom, minZoom), maxZoom);

  const labelPx = useCallback((node) => nameOf(node).length * 7 + 16, [nameOf]);
  const plot = useMemo(() => timelinePlot(timeline, { pxPerYear, labelPx }), [timeline, pxPerYear, labelPx]);
  const { ticks } = useMemo(() => yearTicks(timeline.range, pxPerYear), [timeline.range, pxPerYear]);
  const bandColour = useMemo(
    () => new Map(timeline.bands.map((b, i) => [b.movement.id, `var(${REGION_COLOURS[i % REGION_COLOURS.length]})`])),
    [timeline.bands]
  );

  const yearAt = (px) => timeline.range.from + (px - TIMELINE.pad) / pxPerYear;
  const zoomBy = (factor) => {
    const el = scrollRef.current;
    if (el && timeline.range) keepCentre.current = yearAt(el.scrollLeft + el.clientWidth / 2);
    setZoom((z) => Math.max(minZoom, Math.min(maxZoom, Math.min(z, maxZoom) * factor)));
  };
  const fitView = () => {
    if (main) keepCentre.current = (main.from + main.to) / 2;
    setZoom(1);
  };
  // Zooming keeps the year in the middle of the view where it was.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || keepCentre.current === null) return;
    el.scrollLeft = plot.x(keepCentre.current) - el.clientWidth / 2;
    keepCentre.current = null;
  }, [plot]);
  // The first view starts at the main span, not at a far-off early life.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !viewWidth || !main || placed.current) return;
    placed.current = true;
    if (!selectedId) el.scrollLeft = plot.x(main.from) - TIMELINE.pad;
  }, [plot, viewWidth, main, selectedId]);

  // ----- selection -----
  const barOf = useCallback(
    (id) => {
      const node = byId.get(id);
      if (!node) return null;
      if (node.kind === "work") return (node.authorIds || []).map((a) => plot.items.get(a)).find(Boolean) || null;
      return plot.items.get(id) || null;
    },
    [byId, plot]
  );

  // Bring a node into view when it is chosen from outside the picture (search, a link, the address).
  useEffect(() => {
    if (!selectedId || clickedId.current === selectedId) return;
    clickedId.current = selectedId;
    const behavior = reducedMotion() ? "auto" : "smooth";
    if (narrow) {
      listRef.current?.querySelector(`[data-node="${CSS.escape(selectedId)}"]`)?.scrollIntoView?.({ block: "center", behavior });
      return;
    }
    const el = scrollRef.current;
    const lane = plot.lanes.find((l) => l.movement?.id === selectedId);
    const bar = barOf(selectedId);
    const target = bar ? { left: bar.left, top: bar.top } : lane ? { left: plot.bands.find((b) => b.movement.id === selectedId)?.left ?? 0, top: lane.top } : null;
    if (el && target) el.scrollTo?.({ left: Math.max(target.left - el.clientWidth / 3, 0), top: Math.max(target.top - 90, 0), behavior });
  }, [selectedId, narrow, plot, barOf]);

  const choose = (node) => {
    if (!node) return;
    clickedId.current = null;
    onSelect(node.id);
  };
  const clickNode = (id) => {
    clickedId.current = id; // a click selects in place; the view does not jump
    onSelect(id === selectedId ? null : id);
  };

  useEffect(() => {
    if (path && selectedId && !path.ids.includes(selectedId)) setPath(null);
  }, [selectedId, path]);
  const onPath = (toId) => setPath(toId && selected ? tracePath(graph, selected.id, toId) : null);

  // What to bring forward: a chosen path, else the selection and what it links to.
  const focus = useMemo(() => {
    if (path?.ids.length) return new Set(path.ids);
    if (!selected) return null;
    const near = new Set([selected.id]);
    neighbours(graph, selected.id).forEach((n) => near.add(n.node.id));
    (selected.authorIds || []).forEach((a) => near.add(a));
    if (selected.kind === "movement") timeline.lanes.find((l) => l.movement?.id === selected.id)?.members.forEach((m) => near.add(m.author.id));
    return near;
  }, [path, selected, graph, timeline]);
  const dim = (id) => focus && !focus.has(id);

  // The curves: the path when there is one, else the links of the life under the pointer or chosen.
  const curves = useMemo(() => {
    if (narrow) return [];
    if (path?.ids.length) {
      return path.ids.slice(1).flatMap((id, i) => {
        const a = plot.items.get(path.ids[i]);
        const b = plot.items.get(id);
        return a && b ? [{ key: `p${i}`, d: connector(a, b, plot.x), kind: "path" }] : [];
      });
    }
    const activeId = hoveredId || selectedId;
    const from = activeId ? plot.items.get(activeId) : null;
    if (!from) return [];
    return neighbours(graph, activeId)
      .filter((n) => DRAWN_TYPES.has(n.link.type) && plot.items.has(n.node.id))
      .map((n) => {
        const other = plot.items.get(n.node.id);
        const [a, b] = n.outgoing ? [from, other] : [other, from];
        return { key: n.link.id, d: connector(a, b, plot.x), kind: LINE_KINDS.mentions.includes(n.link.type) ? "mentions" : "influence" };
      });
  }, [narrow, path, hoveredId, selectedId, plot, graph]);

  const matches = useMemo(() => (query.trim() ? searchNodes(graph, query, 8) : []), [graph, query]);
  const workName = (id) => {
    const w = byId.get(id);
    return w ? `${nameOf(w)}${w.years.from ? `, ${w.years.from}` : ""}` : "";
  };

  const bar = (
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
        <button type="button" className="pk-map-toggle pk-map-toggle--works" aria-pressed={showWorks} onClick={() => setShowWorks((s) => !s)}>
          <span className="pk-map-toggle__mark" aria-hidden="true" />
          {t("maps.graph.works")}
        </button>
      </div>
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
  );

  const inspector = selected && (
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
      onEdit={onEdit}
      path={path}
      onPath={onPath}
    />
  );

  const undated = timeline.undated.length > 0 && (
    <section className="pk-map-time__undated" aria-labelledby="pk-map-time-undated">
      <h4 id="pk-map-time-undated">{t("maps.timeline.undated", { count: timeline.undated.length })}</h4>
      <ul>
        {timeline.undated.map((n) => (
          <li key={n.id}>
            <button type="button" className="pk-map-links__name" onClick={() => choose(n)} aria-pressed={selectedId === n.id}>
              <NodeName node={n} lang={lang} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  if (!timeline.range) {
    return (
      <div className="pk-map-time">
        <p className="pk-map-time__empty">{t("maps.timeline.empty")}</p>
        <div className={selected ? "pk-map-graph__stage pk-map-graph__stage--inspecting" : "pk-map-graph__stage"}>
          <div>{undated}</div>
          {inspector}
        </div>
      </div>
    );
  }

  const laneName = (lane) => (lane.movement ? nameOf(lane.movement) : t("maps.timeline.noMovement"));
  const laneYears = (lane) => {
    const band = lane.movement && timeline.bands.find((b) => b.movement.id === lane.movement.id);
    return band ? `${yearText(band.from)}–${yearText(band.to)}` : "";
  };

  // ----- phone: the lives run down the page -----
  if (narrow) {
    const { from, to } = main;
    const pct = (year) => `${(Math.min(Math.max((year - from) / (to - from || 1), 0), 1) * 100).toFixed(2)}%`;
    return (
      <div className="pk-map-time pk-map-time--narrow">
        {bar}
        <div className={selected ? "pk-map-graph__stage pk-map-graph__stage--inspecting" : "pk-map-graph__stage"}>
          <div ref={listRef}>
            <p className="pk-map-time__range" aria-hidden="true">
              <span>{yearText(from)}</span>
              <span>{yearText(to)}</span>
            </p>
            {timeline.lanes.map((lane) => (
              <section key={lane.movement?.id || "none"} className="pk-map-time-list">
                <h4 className="pk-map-time-list__head" style={lane.movement ? { "--band": bandColour.get(lane.movement.id) } : undefined}>
                  {laneName(lane)}
                  {laneYears(lane) && <span> · {laneYears(lane)}</span>}
                </h4>
                <ul>
                  {lane.members.map((m) => (
                    <li key={m.author.id} className={dim(m.author.id) ? "is-dim" : undefined}>
                      <button
                        type="button"
                        data-node={m.author.id}
                        className="pk-map-time-list__life"
                        aria-pressed={selectedId === m.author.id}
                        onClick={() => clickNode(m.author.id)}
                      >
                        <span className="pk-map-time-list__name" lang={isNative(m.author) ? lang || undefined : undefined}>
                          {nameOf(m.author)}
                        </span>
                        <span className="pk-map-time-list__years">
                          {yearsText(m.author.years, "author") || `${yearText(m.from)}–${yearText(m.to)}`}
                          {m.estimated && ` (${t("maps.timeline.estimatedShort")})`}
                        </span>
                        <span className="pk-map-time-list__track" aria-hidden="true">
                          <span
                            className={m.estimated ? "pk-map-time-list__bar is-estimated" : "pk-map-time-list__bar"}
                            style={{ left: pct(m.from), width: `max(3px, calc(${pct(m.to)} - ${pct(m.from)}))` }}
                          />
                          {showWorks && m.works.map((w) => <span key={w.id} className="pk-map-time-list__work" style={{ left: pct(w.year) }} />)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {undated}
          </div>
          {inspector}
        </div>
      </div>
    );
  }

  // ----- wider screens: a year axis to scroll and zoom along -----
  return (
    <div className="pk-map-time">
      {bar}
      <div className={selected ? "pk-map-graph__stage pk-map-graph__stage--inspecting" : "pk-map-graph__stage"}>
        <div className="pk-map-time__frame">
          <div ref={scrollRef} className="pk-map-time__scroll" role="region" aria-label={t("maps.timeline.label")} tabIndex={0}>
            <div className="pk-map-time__plot" style={{ width: plot.width, height: plot.height }}>
              {plot.bands.map((b) => (
                <div
                  key={b.movement.id}
                  className={dim(b.movement.id) ? "pk-map-time__band is-dim" : "pk-map-time__band"}
                  style={{ left: b.left, width: b.width, "--band": bandColour.get(b.movement.id) }}
                  aria-hidden="true"
                />
              ))}

              <div className="pk-map-time__axis" style={{ width: plot.width }} aria-hidden="true">
                {ticks.map((year) => (
                  <span key={year} className="pk-map-time__tick" style={{ left: plot.x(year) }}>
                    {yearText(year)}
                  </span>
                ))}
              </div>

              {plot.bands.map((b) => (
                <button
                  key={b.movement.id}
                  type="button"
                  className="pk-map-time__era"
                  style={{ left: b.left, top: b.top, "--band": bandColour.get(b.movement.id) }}
                  aria-pressed={selectedId === b.movement.id}
                  onClick={() => clickNode(b.movement.id)}
                  title={`${yearText(b.from)}–${yearText(b.to)}${b.estimated ? ` (${t("maps.timeline.estimatedShort")})` : ""}`}
                >
                  <span lang={isNative(b.movement) ? lang || undefined : undefined}>{nameOf(b.movement)}</span>
                </button>
              ))}

              {plot.lanes.map((lane) => (
                <h4 key={lane.movement?.id || "none"} className="pk-map-time__lane" style={{ top: lane.top }}>
                  <span>
                    {laneName(lane)}
                    {laneYears(lane) && <small> · {laneYears(lane)}</small>}
                  </span>
                </h4>
              ))}

              <svg className="pk-map-time__curves" width={plot.width} height={plot.height} aria-hidden="true">
                <defs>
                  <marker id="pk-time-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" />
                  </marker>
                </defs>
                {curves.map((c) => (
                  <path key={c.key} d={c.d} className={`pk-map-time__curve pk-map-time__curve--${c.kind}`} markerEnd={c.kind === "mentions" ? undefined : "url(#pk-time-arrow)"} />
                ))}
              </svg>

              {[...plot.items.values()].map(({ member: m, left, width, top }) => {
                const id = m.author.id;
                const classes = ["pk-map-time__life"];
                if (m.estimated) classes.push("is-estimated");
                if (selectedId === id) classes.push("is-selected");
                else if (path?.ids.includes(id)) classes.push("is-path");
                if (dim(id)) classes.push("is-dim");
                return (
                  <div key={id} className={classes.join(" ")} style={{ left, top, width }} onMouseEnter={() => setHoveredId(id)} onMouseLeave={() => setHoveredId(null)}>
                    <button
                      type="button"
                      className="pk-map-time__bar"
                      aria-pressed={selectedId === id}
                      aria-label={`${nameOf(m.author)}, ${yearText(m.from)}–${yearText(m.to)}${m.estimated ? `, ${t("maps.timeline.estimated")}` : ""}`}
                      onClick={() => clickNode(id)}
                    >
                      <span className="pk-map-time__name" lang={isNative(m.author) ? lang || undefined : undefined}>
                        {nameOf(m.author)}
                      </span>
                    </button>
                    {showWorks &&
                      m.works.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          tabIndex={-1}
                          className={selectedId === w.id ? "pk-map-time__work is-selected" : "pk-map-time__work"}
                          style={{ left: (w.year - m.from) * pxPerYear }}
                          aria-label={workName(w.id)}
                          title={workName(w.id)}
                          onClick={() => clickNode(w.id)}
                        />
                      ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pk-map-graph__zoom" role="group" aria-label={t("maps.timeline.zoom")}>
            <button type="button" onClick={() => zoomBy(1.6)} aria-label={t("maps.graph.zoomIn")} disabled={zoom >= maxZoom}>
              <Plus size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label={t("maps.graph.zoomOut")} disabled={zoom <= minZoom}>
              <Minus size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={fitView} aria-label={t("maps.timeline.fit")}>
              <Maximize2 size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        {inspector}
      </div>
      {!selected && <p className="pk-map-time__hint">{t("maps.timeline.hint")}</p>}
      {undated}
    </div>
  );
}

export default MapTimelineView;
