import React from "react";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { DESTINATIONS, isActiveDestination } from "../nav";
import AccountMenu from "./AccountMenu";
import NavLink from "./NavLink";

/** Desktop navigation: a slim vertical rail with every destination, language and account. */
function NavRail({ view, onNavigate }) {
  const { t } = useLanguage();

  return (
    <nav className="pk-rail" aria-label={t("nav.main")}>
      <NavLink view="all" onNavigate={onNavigate} className="pk-rail__brand" aria-label="Pustaka">
        <img src="/stack-of-books.png" alt="" width="36" height="36" />
        <span>Pustaka</span>
      </NavLink>

      <ul className="pk-rail__list">
        {DESTINATIONS.map(({ id, labelKey, shortKey, icon: Icon }) => {
          const active = isActiveDestination(id, view);
          return (
            <li key={id}>
              <NavLink view={id} active={active} onNavigate={onNavigate} className={active ? "pk-rail__link pk-rail__link--active" : "pk-rail__link"}>
                <Icon size={22} aria-hidden="true" />
                <span>{t(shortKey || labelKey)}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>

      <div className="pk-rail__foot">
        <AccountMenu />
      </div>
    </nav>
  );
}

export default NavRail;
