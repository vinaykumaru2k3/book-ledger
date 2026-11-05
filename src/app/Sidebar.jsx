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
import LanguageToggle from "../shared/pk/LanguageToggle";
import { useLanguage } from "../shared/i18n/LanguageContext";
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
  const { t } = useLanguage();
  const fileInput = useRef(null);
  const nav = { route, onNavigate };

  const collections = [
    { id: "all", label: t("nav.allBooks"), icon: Archive, count: stats.total },
    ...Object.entries(STATUSES).map(([key, status]) => ({
      id: key,
      label: t(`status.${key}`),
      icon: status.icon,
      count: stats[key],
    })),
    { id: "favorites", label: t("nav.favorites"), icon: Heart, count: stats.favorites },
  ];

  const discover = [
    { id: "recommendations", label: t("nav.recommendations"), icon: Sparkles },
    { id: "topbooks", label: t("nav.topBooks"), icon: Trophy },
    { id: "analytics", label: t("nav.insights"), icon: BarChart3 },
    { id: "galaxy", label: t("nav.galaxy"), icon: Telescope },
  ];

  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark-img-wrap" aria-hidden="true">
          <img src="/stack-of-books.png" alt="" className="brand-logo-img" />
        </div>
        <h1>Pustaka</h1>
      </div>

      <NavSection label={t("nav.collection")} ariaLabel="Shelf navigation">
        {collections.map((item) => (
          <NavItem key={item.id} {...item} {...nav} />
        ))}
      </NavSection>

      <NavSection label={t("nav.shelves")} ariaLabel="Custom Shelves navigation">
        {uniqueShelves.length > 0 ? (
          <NavItem id="shelves" label={t("nav.allShelves")} icon={FolderOpen} size={15} {...nav} />
        ) : (
          <div className="sidebar-help-box">
            <FolderOpen size={13} />
            <span>{t("nav.shelvesHelp")}</span>
          </div>
        )}
      </NavSection>

      <NavSection label={t("nav.discover")} ariaLabel="Discover navigation">
        {discover.map((item) => (
          <NavItem key={item.id} {...item} {...nav} />
        ))}
      </NavSection>

      <div className="sidebar-actions">
        <LanguageToggle />
        <AccountCard />
        <Button variant="primary" icon={Plus} iconSize={16} className="full add-book-trigger" onClick={openNewBook}>
          {t("action.addBook")}
        </Button>
        <div className="split-actions">
          <Button icon={Download} title="Export Ledger Backup" onClick={exportLedger}>
            {t("action.export")}
          </Button>
          <Button icon={Import} title="Import Ledger Backup" onClick={() => fileInput.current?.click()}>
            {t("action.import")}
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
