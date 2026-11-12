import React from "react";
import { BookOpen, CircleDot, Star, X } from "lucide-react";
import { STATUSES } from "../../domain/status";

/** Details card for the selected star, with up to five connected books. */
function NodeInspector({ node, connections, onClose, onSelectBook }) {
  return (
    <div className="galaxy-modal-backdrop" onClick={onClose}>
      <div className="galaxy-modal" onClick={(event) => event.stopPropagation()}>
        <button className="galaxy-modal-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        <div className="galaxy-modal-cover">
          {node.coverUrl ? (
            <img src={node.coverUrl} alt={node.title} />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--pk-cream-3)",
                fontSize: "0.7rem",
              }}
            >
              No Cover
            </div>
          )}
        </div>

        <div className="galaxy-modal-info">
          <h3>{node.title}</h3>
          <p className="galaxy-modal-author">{node.author}</p>

          <div className="galaxy-modal-meta">
            <span className="galaxy-modal-status">
              <CircleDot size={10} />
              {STATUSES[node.status]?.label || node.status}
            </span>
            {node.rating > 0 && (
              <span className="galaxy-modal-rating">
                <Star size={10} fill="currentColor" />
                {node.rating}/5
              </span>
            )}
            {node.pages > 0 && (
              <span className="galaxy-modal-pages">
                <BookOpen size={10} />
                {node.currentPage || 0}/{node.pages}
              </span>
            )}
          </div>

          {node.favorite && (
            <div className="galaxy-modal-favorite">
              <Star size={12} fill="currentColor" /> Favorite
            </div>
          )}

          {connections.length > 0 && (
            <div className="galaxy-modal-connections">
              <h4>Connected ({connections.length})</h4>
              <div className="galaxy-modal-connections-list">
                {connections.slice(0, 5).map(({ book, reasons }) => (
                  <button key={book.id} className="galaxy-modal-connection" onClick={() => onSelectBook(book.id)}>
                    <div className="galaxy-modal-connection-cover">{book.coverUrl && <img src={book.coverUrl} alt="" />}</div>
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
  );
}

export default NodeInspector;
