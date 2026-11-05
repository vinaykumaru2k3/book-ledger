import React, { useState } from "react";
import { Ellipsis, Plus } from "lucide-react";
import Dialog from "../../shared/pk/Dialog";
import LanguageToggle from "../../shared/pk/LanguageToggle";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { MORE_DESTINATIONS, TAB_BAR_DESTINATIONS, isActiveDestination } from "../nav";
import NavLink from "./NavLink";
import { useAccountItems } from "./useAccountItems";

function MoreSheet({ view, onNavigate, onClose }) {
  const { t } = useLanguage();
  const { items, fileInput, name } = useAccountItems();

  return (
    <Dialog title={t("nav.more")} closeLabel={t("action.close")} onClose={onClose}>
      <ul className="pk-sheet__list">
        {MORE_DESTINATIONS.map(({ id, labelKey, icon: Icon }) => (
          <li key={id}>
            <NavLink
              view={id}
              active={isActiveDestination(id, view)}
              onNavigate={(next) => {
                onClose();
                onNavigate(next);
              }}
              className="pk-sheet__link"
            >
              <Icon size={20} aria-hidden="true" />
              <span>{t(labelKey)}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="pk-sheet__account">
        <span className="pk-menu__muted">{t("account.signedInAs")}</span>
        <strong>{name}</strong>
        <div className="pk-sheet__actions">
          {items.map(({ id, label, icon: Icon, onSelect, tone }) => (
            <button
              key={id}
              type="button"
              className={tone === "danger" ? "pk-menu__item pk-menu__item--danger" : "pk-menu__item"}
              onClick={() => {
                onClose();
                onSelect();
              }}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <LanguageToggle />
      </div>
      {fileInput}
    </Dialog>
  );
}

/** Phone navigation: three destinations, a centre "add" button, and a "More" sheet. */
function TabBar({ view, onNavigate, onAdd }) {
  const { t } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);
  const [first, second, ...rest] = TAB_BAR_DESTINATIONS;

  const tab = ({ id, labelKey, shortKey, icon: Icon }) => {
    const active = isActiveDestination(id, view);
    return (
      <li key={id}>
        <NavLink view={id} active={active} onNavigate={onNavigate} className={active ? "pk-tab-link pk-tab-link--active" : "pk-tab-link"}>
          <Icon size={22} aria-hidden="true" />
          <span>{t(shortKey || labelKey)}</span>
        </NavLink>
      </li>
    );
  };

  const moreActive = MORE_DESTINATIONS.some((d) => isActiveDestination(d.id, view));

  return (
    <>
      <nav className="pk-tabbar" aria-label={t("nav.main")}>
        <ul>
          {[first, second].filter(Boolean).map(tab)}
          <li>
            <button type="button" className="pk-tabbar__add" onClick={onAdd} aria-label={t("action.addBook")}>
              <Plus size={26} aria-hidden="true" />
            </button>
          </li>
          {rest.map(tab)}
          <li>
            <button type="button" className={moreActive ? "pk-tab-link pk-tab-link--active" : "pk-tab-link"} onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
              <Ellipsis size={22} aria-hidden="true" />
              <span>{t("nav.more")}</span>
            </button>
          </li>
        </ul>
      </nav>
      {moreOpen && <MoreSheet view={view} onNavigate={onNavigate} onClose={() => setMoreOpen(false)} />}
    </>
  );
}

export default TabBar;
