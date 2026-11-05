import React, { useEffect, useMemo, useRef, useState } from "react";
import { useBooks } from "../../app/AppContext";
import { buildGraphData, graphSignature } from "./graph";
import { screenToWorld } from "./graphSimulation";
import { useForceSimulation } from "./useForceSimulation";
import GalaxyControls from "./GalaxyControls";
import NodeInspector from "./NodeInspector";

const VIEW = { width: 800, height: 600 };
const CLICK_SLOP_PX = 4; // pointer travel that turns a click into a drag
const IDLE = { mode: "idle", node: null, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: false };

/**
 * Interactive "star map" of the library. Books are stars; shared authors,
 * shelves and tags pull them together. Drag a star, drag the background to
 * pan, scroll to zoom, double-click to focus, click to inspect.
 */
export default function ConstellationGraph() {
  const { books } = useBooks();
  const svgRef = useRef(null);

  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clusterBy, setClusterBy] = useState("none");

  // Pointer state lives in a ref: it changes on every mouse move and must not
  // re-render (or restart effects) by itself.
  const pointer = useRef(IDLE);

  const visibleBooks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return books.filter(
      (b) =>
        (statusFilter === "all" || b.status === statusFilter) &&
        (!needle || b.title?.toLowerCase().includes(needle) || b.author?.toLowerCase().includes(needle))
    );
  }, [books, statusFilter, query]);

  // Rebuild the graph only when something it draws changes. Any library change gives
  // `books` a new identity (background enrichment, a favourite toggled elsewhere), and
  // rebuilding would throw every star to a fresh random position.
  const signature = useMemo(() => graphSignature(visibleBooks), [visibleBooks]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const graphData = useMemo(() => buildGraphData(visibleBooks), [signature]);

  const { heat, wake } = useForceSimulation(graphData, clusterBy, () =>
    pointer.current.mode === "node" ? pointer.current.node : null
  );

  const nodeById = graphData.nodeMap || new Map();
  const hoveredNode = hoveredId ? nodeById.get(hoveredId) : null;
  const selectedNode = selectedId ? nodeById.get(selectedId) : null;

  // React attaches wheel listeners as passive, so preventDefault (which stops
  // the page scrolling while zooming) only works on a native listener.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setCamera((prev) => ({ ...prev, zoom: Math.max(0.3, Math.min(3, prev.zoom * factor)) }));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const worldFromEvent = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top, rect, camera, VIEW);
  };

  const nodeAt = (world) =>
    graphData.nodes.find((n) => Math.hypot(n.x - world.x, n.y - world.y) < n.radius + 5) || null;

  const handleMouseDown = (e) => {
    if (!svgRef.current) return;
    const hit = nodeAt(worldFromEvent(e));
    pointer.current = {
      mode: hit ? "node" : "pan",
      node: hit,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
  };

  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const p = pointer.current;
    const world = worldFromEvent(e);

    if (p.mode === "idle") {
      setHoveredId(nodeAt(world)?.id ?? null);
      return;
    }
    if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > CLICK_SLOP_PX) p.moved = true;

    if (p.mode === "node") {
      p.node.x = world.x;
      p.node.y = world.y;
      p.node.vx = 0;
      p.node.vy = 0;
      heat.current = 0.5;
      wake();
    } else {
      const dx = (e.clientX - p.lastX) / (world.scale * camera.zoom);
      const dy = (e.clientY - p.lastY) / (world.scale * camera.zoom);
      setCamera((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
      p.lastX = e.clientX;
      p.lastY = e.clientY;
    }
  };

  const handleMouseUp = () => {
    pointer.current = { ...pointer.current, mode: "idle", node: null };
  };

  // Click and double-click find the star under the pointer from the event itself. They must
  // not rely on the hovered-star state: a tap on a touch screen (and a fast mouse click) sends
  // its mouse-move and click back to back, before React has re-rendered with the new hover.
  const handleClick = (event) => {
    if (pointer.current.moved) {
      pointer.current.moved = false;
      return;
    }
    setSelectedId(nodeAt(worldFromEvent(event))?.id ?? null);
  };

  const handleDoubleClick = (event) => {
    const node = nodeAt(worldFromEvent(event));
    if (node) setCamera({ x: node.x, y: node.y, zoom: 1.5 });
  };

  const connectionsOf = (node) =>
    graphData.links
      .filter((l) => l.source.id === node.id || l.target.id === node.id)
      .map((l) => ({
        book: (l.source.id === node.id ? l.target : l.source).originalBook,
        reasons: l.reasons,
      }));

  const selectConnection = (id) => {
    const node = nodeById.get(id);
    if (!node) return;
    setSelectedId(id);
    setCamera({ x: node.x, y: node.y, zoom: 1.2 });
  };

  const isNeighbour = (node) =>
    selectedNode &&
    graphData.links.some(
      (l) =>
        (l.source.id === selectedNode.id && l.target.id === node.id) ||
        (l.target.id === selectedNode.id && l.source.id === node.id)
    );

  return (
    <div className="galaxy-workspace">
      <GalaxyControls
        books={books}
        query={query}
        onQuery={setQuery}
        clusterBy={clusterBy}
        onClusterBy={setClusterBy}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        onResetCamera={() => setCamera({ x: 0, y: 0, zoom: 1 })}
      />

      <svg
        ref={svgRef}
        className="galaxy-canvas"
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <rect width={VIEW.width} height={VIEW.height} fill="#0d0d0f" />

        <g
          transform={`translate(${VIEW.width / 2}, ${VIEW.height / 2}) scale(${camera.zoom}) translate(${-camera.x}, ${-camera.y})`}
        >
          {graphData.links.map((link, idx) => {
            const lit = selectedNode && (selectedNode.id === link.source.id || selectedNode.id === link.target.id);
            return (
              <line
                key={idx}
                x1={link.source.x}
                y1={link.source.y}
                x2={link.target.x}
                y2={link.target.y}
                stroke={lit ? link.source.color : "#3f3f46"}
                strokeWidth={lit ? 1.5 : 0.5}
                strokeOpacity={lit ? 1 : 0.4}
              />
            );
          })}

          {graphData.nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredNode?.id === node.id;
            const neighbour = isNeighbour(node);

            return (
              <g key={node.id}>
                {(isSelected || neighbour) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius + 2}
                    fill="none"
                    stroke={isSelected ? "#fff" : node.color}
                    strokeWidth={1.5}
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius}
                  fill={node.color}
                  stroke={isHovered || isSelected ? "#fff" : "none"}
                  strokeWidth={1.5}
                />
                {(isHovered || isSelected) && (
                  <text
                    x={node.x}
                    y={node.y + node.radius + 12}
                    textAnchor="middle"
                    fill="#fafafa"
                    fontSize={11}
                    fontFamily="system-ui"
                  >
                    {node.title.slice(0, 25)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {!selectedNode && graphData.nodes.length > 0 && (
        <div className="galaxy-hint">Click a node to view details - Double-click to focus - Drag to pan</div>
      )}

      {selectedNode && (
        <NodeInspector
          node={selectedNode}
          connections={connectionsOf(selectedNode)}
          onClose={() => setSelectedId(null)}
          onSelectBook={selectConnection}
        />
      )}
    </div>
  );
}
