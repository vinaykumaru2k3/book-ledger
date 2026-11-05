import React from "react";
import { Plus } from "lucide-react";
import Button from "../shared/ui/Button";
import StatsStrip from "../features/library/StatsStrip";
import { useUi } from "./AppContext";

/** Title block, "Add Book" shortcut and (on library views) the stats strip. */
function PageHeader({ kicker, title, stats, showStats }) {
  const { openNewBook } = useUi();

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-top">
        <div className="dashboard-title-group">
          <p className="section-kicker">{kicker}</p>
          <h2 className="dashboard-title">{title}</h2>
        </div>
        <div className="topbar-actions">
          <Button variant="primary" icon={Plus} className="add-book-header-btn" title="Add New Book" onClick={openNewBook}>
            Add Book
          </Button>
        </div>
      </div>

      {showStats && <StatsStrip stats={stats} />}
    </header>
  );
}

export default PageHeader;
