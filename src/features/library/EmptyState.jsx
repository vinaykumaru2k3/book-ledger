import React from "react";
import { Plus, RotateCcw } from "lucide-react";
import { getCoverStyle } from "../../shared/ui/Cover";
import Button from "../../shared/ui/Button";

/** Shown when a library view has no books, or when filters hide them all. */
function EmptyState({ hasBooks, onAdd, onReset }) {
  return (
    <div className="empty-state">
      <div className="empty-covers" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <span key={index} style={getCoverStyle(`empty-state-${index}`)} />
        ))}
      </div>
      <h3>{hasBooks ? "No books match this view" : "Your shelf is empty"}</h3>
      <p>
        {hasBooks
          ? "Try clearing your filters or searching for another term."
          : "Add your first book to start tracking your reading journey."}
      </p>
      <div className="empty-actions">
        <Button variant="primary" icon={Plus} iconSize={18} onClick={onAdd}>
          Add book
        </Button>
        {hasBooks && (
          <Button className="on-light" icon={RotateCcw} iconSize={17} onClick={onReset}>
            Reset filters
          </Button>
        )}
      </div>
    </div>
  );
}

export default EmptyState;
