import React, { useRef } from "react";
import { Download, Import, LogOut } from "lucide-react";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useAuth, useBooks } from "../AppContext";

export function displayNameFor(user) {
  return user?.displayName || user?.email || "Reader";
}

export function initialsFor(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.length ? parts.map((part) => part[0]).join("").toUpperCase() : "R";
}

/**
 * Export / import / sign-out, shared by the desktop account menu and the phone
 * "More" sheet. Returns the menu `items` plus the hidden file input that the
 * Import item opens: render `fileInput` once next to wherever the items are used.
 */
export function useAccountItems() {
  const { t } = useLanguage();
  const auth = useAuth();
  const { exportLedger, importLedger } = useBooks();
  const picker = useRef(null);

  const items = [
    { id: "export", label: t("action.export"), icon: Download, onSelect: exportLedger },
    { id: "import", label: t("action.import"), icon: Import, onSelect: () => picker.current?.click() },
    { id: "signout", label: t("account.signOut"), icon: LogOut, onSelect: auth.signOut, tone: "danger" },
  ];

  const fileInput = (
    <input ref={picker} className="pk-visually-hidden" type="file" accept="application/json,.json" onChange={importLedger} tabIndex={-1} aria-hidden="true" />
  );

  return { items, fileInput, user: auth.user, name: displayNameFor(auth.user) };
}
