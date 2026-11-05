import React from "react";
import Menu from "../../shared/pk/Menu";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { initialsFor, useAccountItems } from "./useAccountItems";

/** Avatar button that opens export / import / sign out. */
function AccountMenu() {
  const { t } = useLanguage();
  const { items, fileInput, user, name } = useAccountItems();

  return (
    <>
      <Menu
        label={t("account.menu")}
        align="start"
        triggerClassName="pk-avatar-btn"
        trigger={
          user?.photoURL ? (
            <img src={user.photoURL} alt="" className="pk-avatar" referrerPolicy="no-referrer" />
          ) : (
            <span className="pk-avatar" aria-hidden="true">
              {initialsFor(name)}
            </span>
          )
        }
        header={
          <>
            <span className="pk-menu__muted">{t("account.signedInAs")}</span>
            <strong className="pk-menu__name">{name}</strong>
          </>
        }
        items={items}
      />
      {fileInput}
    </>
  );
}

export default AccountMenu;
