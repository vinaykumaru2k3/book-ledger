import React, { useRef, useEffect, useMemo, useState } from "react";
import { Search, X, Star, BookOpen, CircleDot } from "lucide-react";
import { useBooks } from "../context/AppContext";
import { buildGraphData } from "../utils/graph";
import { stepSimulation, screenToWorld } from "../utils/graphSimulation";
import { STATUSES } from "./constants";

const REST_ENERGY = 0.05; // below this total speed the layout is considered settled
const MIN_HEAT = 0.05;
const CLICK_SLOP_PX = 4; // pointer travel that turns a click into a drag

export default function ConstellationGraph() {
  const { books } = useBooks();
  const svgRef = useRef(null);

  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clusterBy, setClusterBy] = useState("none");
  const [, setFrame] = useState(0); // bumped every animation frame to re-render moved nodes

  // Pointer interaction lives in a ref: it changes on every mouse move and
  // must not re-run effects or re-render by itself.
  const pointer = useRef({ mode: "idle", node: null, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: false });
  const heat = useRef(1); // simulation temperature; reheated whenever something changes

  const graphData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const visible = books.filter(
      (b) =>
        (statusFilter === "all" || b.status === statusFilter) &&
        (!query || b.title?.toLowerCase().includes(query) || b.author?.toLowerCase().includes(query))
    );
    return buildGraphData(visible);
  }, [books, statusFilter, searchQuery]);

  const nodeById = graphData.nodeMap || new Map();
  const hoveredNode = hoveredId ? nodeById.get(hoveredId) : null;
  const selectedNode = selectedId ? nodeById.get(selectedId) : null;

  // Animation loop: runs while the layout is still moving, then sleeps.
  // A slow poll wakes it again after a drag has reheated the simulation.
  useEffect(() => {
    heat.current = 1;
    if (!graphData.nodes.length) return undefined;
    let raf = null;

    const tick = () => {
      const dragged = pointer.current.mode === "node" ? pointer.current.node : null;
      const energy = stepSimulation(graphData.nodes, graphData.links, {
        alpha: heat.current,
        clusterBy,
        pinnedId: dragged?.id,
      });
      heat.current = Math.max(heat.current * 0.985, MIN_HEAT);
      setFrame((f) => f + 1);
      raf = energy > REST_ENERGY || dragged ? requestAnimationFrame(tick) : null;
    };

    raf = requestAnimationFrame(tick);
    const wake = window.setInterval(() => {
      if (raf === null && heat.current > MIN_HEAT) raf = requestAnimationFrame(tick);
    }, 250);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      window.clearInterval(wake);
    };
  }, [graphData, clusterBy]);

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
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top, rect, camera);
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

  const handleClick = () => {
    if (pointer.current.moved) {
      pointer.current.moved = false;
      return;
    }
    setSelectedId(hoveredId);
  };

  const handleDoubleClick = () => {
    if (hoveredNode) setCamera({ x: hoveredNode.x, y: hoveredNode.y, zoom: 1.5 });
  };

  const getConnectedBooks = (node) => {
    if (!node) return [];
    return graphData.links
      .filter((l) => l.source.id === node.id || l.target.id === node.id)
      .map((l) => ({
        book: (l.source.id === node.id ? l.target : l.source).originalBook,
        reasons: l.reasons,
      }));
  };

  const svgWidth = 800;
  const svgHeight = 600;

  return (
    <div className="galaxy-workspace">
      {/* Toolbar */}
      <div className="galaxy-toolbar">
        <div className="galaxy-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="galaxy-controls">
          <select
            value={clusterBy}
            onChange={(e) => setClusterBy(e.target.value)}
            className="galaxy-select"
          >
            <option value="none">No Cluster</option>
            <option value="status">By Status</option>
            <option value="author">By Author</option>
          </select>

          <button
            onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
            className="galaxy-btn"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Status Filters */}
      <div className="galaxy-filters">
        <button
          className={statusFilter === "all" ? "galaxy-filter active" : "galaxy-filter"}
          onClick={() => setStatusFilter("all")}
        >
          All ({books.length})
        </button>
        {Object.entries(STATUSES).map(([key, status]) => {
          const count = books.filter((b) => b.status === key).length;
          return (
            <button
              key={key}
              className={statusFilter === key ? "galaxy-filter active" : "galaxy-filter"}
              onClick={() => setStatusFilter(key)}
            >
              {status.label} ({count})
            </button>
          );
        })}
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="galaxy-canvas"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <rect width={svgWidth} height={svgHeight} fill="#0d0d0f" />

        <g transform={`translate(${svgWidth/2}, ${svgHeight/2}) scale(${camera.zoom}) translate(${-camera.x}, ${-camera.y})`}>
          {/* Links */}
          {graphData.links.map((link, idx) => {
            const isConnected = selectedNode && 
              (selectedNode.id === link.source.id || selectedNode.id === link.target.id);
            return (
              <line
                key={idx}
                x1={link.source.x}
                y1={link.source.y}
                x2={link.target.x}
                y2={link.target.y}
                stroke={isConnected ? link.source.color : "#3f3f46"}
                strokeWidth={isConnected ? 1.5 : 0.5}
                strokeOpacity={isConnected ? 1 : 0.4}
              />
            );
          })}

          {/* Nodes */}
          {graphData.nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredNode?.id === node.id;
            const isConnected = selectedNode && graphData.links.some(
              (l) => (l.source.id === selectedNode.id && l.target.id === node.id) ||
                     (l.target.id === selectedNode.id && l.source.id === node.id)
            );

            return (
              <g key={node.id}>
                {(isSelected || isConnected) && (
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

      {/* Hint */}
      {!selectedNode && graphData.nodes.length > 0 && (
        <div className="galaxy-hint">
          Click a node to view details - Double-click to focus - Drag to pan
        </div>
      )}

      {/* Modal */}
      {selectedNode && (
        <div className="galaxy-modal-backdrop" onClick={() => setSelectedId(null)}>
          <div className="galaxy-modal" onClick={(e) => e.stopPropagation()}>
            <button className="galaxy-modal-close" onClick={() => setSelectedId(null)}>
              <X size={16} />
            </button>

            <div className="galaxy-modal-cover">
              {selectedNode.coverUrl ? (
                <img src={selectedNode.coverUrl} alt={selectedNode.title} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a', fontSize: '0.7rem' }}>
                  No Cover
                </div>
              )}
            </div>

            <div className="galaxy-modal-info">
              <h3>{selectedNode.title}</h3>
              <p className="galaxy-modal-author">{selectedNode.author}</p>

              <div className="galaxy-modal-meta">
                <span className="galaxy-modal-status">
                  <CircleDot size={10} />
                  {STATUSES[selectedNode.status]?.label || selectedNode.status}
                </span>
                {selectedNode.rating > 0 && (
                  <span className="galaxy-modal-rating">
                    <Star size={10} fill="currentColor" />
                    {selectedNode.rating}/5
                  </span>
                )}
                {selectedNode.pages > 0 && (
                  <span className="galaxy-modal-pages">
                    <BookOpen size={10} />
                    {selectedNode.currentPage || 0}/{selectedNode.pages}
                  </span>
                )}
              </div>

              {selectedNode.favorite && (
                <div className="galaxy-modal-favorite">
                  <Star size={12} fill="currentColor" /> Favorite
                </div>
              )}

              {getConnectedBooks(selectedNode).length > 0 && (
                <div className="galaxy-modal-connections">
                  <h4>Connected ({getConnectedBooks(selectedNode).length})</h4>
                  <div className="galaxy-modal-connections-list">
                    {getConnectedBooks(selectedNode).slice(0, 5).map(({ book, reasons }) => (
                      <button
                        key={book.id}
                        className="galaxy-modal-connection"
                        onClick={() => {
                          const node = graphData.nodes.find((n) => n.id === book.id);
                          if (node) {
                            setSelectedId(node.id);
                            setCamera({ x: node.x, y: node.y, zoom: 1.2 });
                          }
                        }}
                      >
                        <div className="galaxy-modal-connection-cover">
                          {book.coverUrl && <img src={book.coverUrl} alt="" />}
                        </div>
                        <div className="galaxy-modal-connection-info">
                          <div className="galaxy-modal-connection-title">{book.title}</div>
                          <div className="galaxy-modal-connection-reasons">{reasons[0]}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
