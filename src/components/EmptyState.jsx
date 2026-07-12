import React from "react";
import { Plus, RotateCcw } from "lucide-react";
import { getCoverStyle } from "./Cover";

function EmptyState({ hasBooks, onAdd, onReset }) {
  return (
    <div className="empty-state">
      <div className="empty-covers" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <span key={index} style={getCoverStyle(`empty-state-${index}`)} />
        ))}
      </div>
      <h3>{hasBooks ? "No books match this view" : "Your shelf is empty"}</h3>
      <p>{hasBooks ? "Try clearing your filters or searching for another term." : "Add your first book to start tracking your reading journey."}</p>
      <div className="empty-actions">
        <button className="button primary" onClick={onAdd} type="button">
          <Plus size={18} />
          <span>Add book</span>
        </button>
        {hasBooks ? (
          <button className="button ghost on-light" onClick={onReset} type="button">
            <RotateCcw size={17} />
            <span>Reset filters</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default EmptyState;
