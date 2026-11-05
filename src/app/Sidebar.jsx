import React, { useRef } from "react";
import {
  Archive,
  BarChart3,
  Download,
  FolderOpen,
  Heart,
  Import,
  Plus,
  Sparkles,
  Telescope,
  Trophy,
} from "lucide-react";
import Button from "../shared/ui/Button";
import AccountCard from "../features/auth/AccountCard";
import { STATUSES } from "../domain/status";
import { useBooks, useShelves, useUi } from "./AppContext";

function NavItem({ id, label, icon: Icon, count, route, onNavigate, size = 17 }) {
  return (
    <button className={route === id ? "nav-item active" : "nav-item"} onClick={() => onNavigate(id)} type="button">
      <Icon size={size} />
      <span>{label}</span>
      {count !== undefined && <strong className="nav-item-badge">{count}</strong>}
    </button>
  );
}

function NavSection({ label, ariaLabel, children }) {
  return (
    <>
      <div className="sidebar-divider" />
      <div className="sidebar-section">
        <div className="sidebar-section-label">{label}</div>
        <nav className="status-nav" aria-label={ariaLabel}>
          {children}
        </nav>
      </div>
    </>
  );
}

/** Left navigation: collections, shelves, discovery pages and account actions. */
function Sidebar({ route, stats, onNavigate }) {
  const { exportLedger, importLedger } = useBooks();
  const { uniqueShelves } = useShelves();
  const { openNewBook } = useUi();
  const fileInput = useRef(null);
  const nav = { route, onNavigate };

  const collections = [
    { id: "all", label: "All Books", icon: Archive, count: stats.total },
    ...Object.entries(STATUSES).map(([key, status]) => ({
      id: key,
      label: status.longLabel,
      icon: status.icon,
      count: stats[key],
    })),
    { id: "favorites", label: "Favorites", icon: Heart, count: stats.favorites },
  ];

  const discover = [
    { id: "recommendations", label: "Recommendations", icon: Sparkles },
    { id: "topbooks", label: "Top Books", icon: Trophy },
    { id: "analytics", label: "Insights", icon: BarChart3 },
    { id: "galaxy", label: "Knowledge Galaxy", icon: Telescope },
  ];

  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark-img-wrap" aria-hidden="true">
          <img src="/stack-of-books.png" alt="" className="brand-logo-img" />
        </div>
        <h1>Pustaka</h1>
      </div>

      <NavSection label="Collection" ariaLabel="Shelf navigation">
        {collections.map((item) => (
          <NavItem key={item.id} {...item} {...nav} />
        ))}
      </NavSection>

      <NavSection label="Shelves" ariaLabel="Custom Shelves navigation">
        {uniqueShelves.length > 0 ? (
          <NavItem id="shelves" label="All Shelves" icon={FolderOpen} size={15} {...nav} />
        ) : (
          <div className="sidebar-help-box">
            <FolderOpen size={13} />
            <span>Create shelves by editing any book and checking a shelf.</span>
          </div>
        )}
      </NavSection>

      <NavSection label="Discover" ariaLabel="Discover navigation">
        {discover.map((item) => (
          <NavItem key={item.id} {...item} {...nav} />
        ))}
      </NavSection>

      <div className="sidebar-actions">
        <AccountCard />
        <Button variant="primary" icon={Plus} iconSize={16} className="full add-book-trigger" onClick={openNewBook}>
          Add Book
        </Button>
        <div className="split-actions">
          <Button icon={Download} title="Export Ledger Backup" onClick={exportLedger}>
            Export
          </Button>
          <Button icon={Import} title="Import Ledger Backup" onClick={() => fileInput.current?.click()}>
            Import
          </Button>
        </div>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          onChange={importLedger}
        />
      </div>
    </aside>
  );
}

export default Sidebar;
