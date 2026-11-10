import React from "react";
import { ChevronsUpDown } from "lucide-react";
import Menu from "../../shared/pk/Menu";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { initialsFor, useAccountItems } from "./useAccountItems";

/**
 * The account button that opens export / import / sign out. With `showName`
 * (the expanded sidebar) it is a full row with avatar, name and email;
 * otherwise just the avatar.
 */
function AccountMenu({ showName = false }) {
  const { t } = useLanguage();
  const { items, fileInput, user, name } = useAccountItems();

  const avatar = user?.photoURL ? (
    <img src={user.photoURL} alt="" className="pk-avatar" referrerPolicy="no-referrer" />
  ) : (
    <span className="pk-avatar" aria-hidden="true">
      {initialsFor(name)}
    </span>
  );

  return (
    <>
      <Menu
        label={t("account.menu")}
        align="start"
        triggerClassName={showName ? "pk-avatar-btn pk-account" : "pk-avatar-btn"}
        trigger={
          showName ? (
            <>
              {avatar}
              <span className="pk-account__text">
                <span className="pk-account__name">{name}</span>
                {user?.email && user.email !== name && <span className="pk-account__email">{user.email}</span>}
              </span>
              <ChevronsUpDown size={16} aria-hidden="true" className="pk-account__chev" />
            </>
          ) : (
            avatar
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
