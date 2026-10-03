import React, { useRef, useEffect, useState, useCallback } from "react";
import { Search, X, Star, BookOpen, CircleDot } from "lucide-react";
import { useBooks } from "../context/AppContext";
import { buildGraphData } from "../utils/graph";
import { STATUSES } from "./constants";

export default function ConstellationGraph() {
  const { books } = useBooks();
  const svgRef = useRef(null);
  
  // State
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clusterBy, setClusterBy] = useState("none");
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Build graph from books
  useEffect(() => {
    let filteredBooks = books;
    if (statusFilter !== "all") {
      filteredBooks = books.filter((b) => b.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredBooks = filteredBooks.filter(
        (b) =>
          b.title?.toLowerCase().includes(q) ||
          b.author?.toLowerCase().includes(q)
      );
    }
    const data = buildGraphData(filteredBooks);
    setGraphData(data);
  }, [books, statusFilter, searchQuery]);

  // Physics simulation
  useEffect(() => {
    if (!graphData.nodes.length) return;

    const simulate = () => {
      const { nodes, links } = graphData;
      const alpha = 0.5;
      const damping = 0.9;
      const centerGravity = 0.005;
      const clusterGravity = clusterBy !== "none" ? 0.015 : 0;

      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const other = nodes[j];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distSq = Math.max(dx * dx + dy * dy, 100);
          const force = (800 / distSq) * alpha;
          node.vx += (dx / Math.sqrt(distSq)) * force;
          node.vy += (dy / Math.sqrt(distSq)) * force;
        }

        // Center gravity
        node.vx -= node.x * centerGravity;
        node.vy -= node.y * centerGravity;

        // Cluster gravity
        if (clusterBy !== "none") {
          const clusterKey = clusterBy === "status" ? node.status : node.author;
          const clusterNodes = nodes.filter((n) =>
            clusterBy === "status" ? n.status === clusterKey : n.author === clusterKey
          );
          if (clusterNodes.length > 1) {
            let cx = 0, cy = 0;
            clusterNodes.forEach((n) => {
              cx += n.x;
              cy += n.y;
            });
            cx /= clusterNodes.length;
            cy /= clusterNodes.length;
            node.vx += (cx - node.x) * clusterGravity;
            node.vy += (cy - node.y) * clusterGravity;
          }
        }
      }

      // Spring forces along links
      links.forEach((link) => {
        const { source, target, weight } = link;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return;
        const desiredDist = Math.max(120 - weight * 10, 60);
        const force = (dist - desiredDist) * 0.05;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      });

      // Update positions
      nodes.forEach((node) => {
        if (node === dragNode) return;
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
      });
    };

    const interval = setInterval(simulate, 20);
    return () => clearInterval(interval);
  }, [graphData, clusterBy, dragNode]);

  // Coordinate transforms
  const toWorld = useCallback((sx, sy, width, height) => {
    return {
      x: (sx - width / 2) / camera.zoom + camera.x,
      y: (sy - height / 2) / camera.zoom + camera.y,
    };
  }, [camera]);

  // Mouse handlers
  const handleMouseDown = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = toWorld(sx, sy, rect.width, rect.height);

    const clickedNode = graphData.nodes.find((node) => {
      const dx = node.x - world.x;
      const dy = node.y - world.y;
      return Math.sqrt(dx * dx + dy * dy) < node.radius + 5;
    });

    if (clickedNode) {
      setDragNode(clickedNode);
    } else {
      setIsDragging(true);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (dragNode) {
      const world = toWorld(sx, sy, rect.width, rect.height);
      dragNode.x = world.x;
      dragNode.y = world.y;
      dragNode.vx = 0;
      dragNode.vy = 0;
    } else if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setCamera((prev) => ({
        ...prev,
        x: prev.x - dx / prev.zoom,
        y: prev.y - dy / prev.zoom,
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else {
      const world = toWorld(sx, sy, rect.width, rect.height);
      const hovered = graphData.nodes.find((node) => {
        const dx = node.x - world.x;
        const dy = node.y - world.y;
        return Math.sqrt(dx * dx + dy * dy) < node.radius + 5;
      });
      setHoveredNode(hovered || null);
    }
  };

  const handleMouseUp = () => {
    setDragNode(null);
    setIsDragging(false);
  };

  const handleClick = (e) => {
    setSelectedNode(hoveredNode || dragNode);
  };

  const handleDoubleClick = (e) => {
    if (!hoveredNode) return;
    setCamera({ x: hoveredNode.x, y: hoveredNode.y, zoom: 1.5 });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setCamera((prev) => ({
      ...prev,
      zoom: Math.max(0.3, Math.min(3, prev.zoom * delta)),
    }));
  };

  // Get connected books
  const getConnectedBooks = (node) => {
    if (!node) return [];
    return graphData.links
      .filter((l) => l.source.id === node.id || l.target.id === node.id)
      .map((l) => {
        const other = l.source.id === node.id ? l.target : l.source;
        return { book: other.originalBook, reasons: l.reasons };
      });
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
        onWheel={handleWheel}
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
        <div className="galaxy-modal-backdrop" onClick={() => setSelectedNode(null)}>
          <div className="galaxy-modal" onClick={(e) => e.stopPropagation()}>
            <button className="galaxy-modal-close" onClick={() => setSelectedNode(null)}>
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
                            setSelectedNode(node);
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
