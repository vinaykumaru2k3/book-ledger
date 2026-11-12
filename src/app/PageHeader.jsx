import React from "react";
import { ArrowLeft, Plus, Search } from "lucide-react";
import Button from "../shared/pk/Button";
import { useLanguage } from "../shared/i18n/LanguageContext";
import StatsStrip from "../features/library/StatsStrip";
import ThemePicker from "../features/theme/ThemePicker";
import NavLink from "./shell/NavLink";

/**
 * Page title, "search or jump" button, "Add Book" (desktop) and, on library views, the stats strip.
 * `back` ({ view, label }) adds a "← label" link above the title; `extra` renders page-specific controls.
 */
function PageHeader({ kicker, title, stats, showStats, onOpenCommand, onAdd, extra, back, onNavigate }) {
  const { t } = useLanguage();

  return (
    <header className="pk-header">
      <div className="pk-header__top">
        <div className="pk-header__titles">
          {back && (
            <NavLink view={back.view} onNavigate={onNavigate} className="pk-backlink">
              <ArrowLeft size={14} aria-hidden="true" />
              <span>{back.label}</span>
            </NavLink>
          )}
          <p className="pk-kicker">{kicker}</p>
          <h1 className="pk-title">{title}</h1>
        </div>

        <div className="pk-header__actions">
          {extra}
          <button type="button" className="pk-search-trigger" onClick={onOpenCommand}>
            <Search size={16} aria-hidden="true" />
            <span>{t("command.open")}</span>
            <kbd aria-hidden="true">/</kbd>
          </button>
          <ThemePicker />
          <Button variant="primary" icon={Plus} className="pk-header__add" onClick={onAdd}>
            {t("action.addBook")}
          </Button>
        </div>
      </div>

      {showStats && <StatsStrip stats={stats} />}
    </header>
  );
}

export default PageHeader;
