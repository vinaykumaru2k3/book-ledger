import React, { useEffect, useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Dialog from "../../shared/pk/Dialog";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { buildCommands, groupResults, searchCommands } from "../commands";
import { DESTINATIONS } from "../nav";

const GROUP_LABEL = { go: "command.groupGo", actions: "command.groupActions", books: "command.groupBooks" };

/**
 * Search-and-jump palette (open with `/` or Ctrl/Cmd+K). Pages, actions and
 * your own books in one list; arrow keys move, Enter runs, Escape closes.
 * `onRun` receives the chosen command's plain-data `action`.
 */
function CommandPalette({ books, onRun, onClose }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();

  const commands = useMemo(
    () => buildCommands({ t, destinations: DESTINATIONS, books }),
    [t, books]
  );
  const results = useMemo(() => searchCommands(commands, query), [commands, query]);
  const groups = useMemo(() => groupResults(results), [results]);
  const flat = groups.flatMap((g) => g.items); // keyboard order == display order

  useEffect(() => setActive(0), [query]);

  const run = (item) => {
    if (!item) return;
    onClose();
    onRun(item.action);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(Math.max(flat.length - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(flat[active]);
    }
  };

  const optionId = (item) => `${listId}-${item.id}`;

  return (
    <Dialog bare top title={t("command.open")} onClose={onClose}>
      <div className="pk-palette">
        <div className="pk-palette__search">
          <Search size={18} aria-hidden="true" />
          <input
            data-autofocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={flat[active] ? optionId(flat[active]) : undefined}
            aria-autocomplete="list"
            aria-label={t("command.placeholder")}
            placeholder={t("command.placeholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>

        <div id={listId} role="listbox" aria-label={t("command.open")} className="pk-palette__list">
          {flat.length === 0 && <p className="pk-palette__empty">{t("command.empty")}</p>}
          {groups.map(({ group, items }) => (
            <div key={group} role="group" aria-label={t(GROUP_LABEL[group])}>
              <p className="pk-palette__group" aria-hidden="true">
                {t(GROUP_LABEL[group])}
              </p>
              {items.map((item) => {
                const index = flat.indexOf(item);
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    id={optionId(item)}
                    role="option"
                    aria-selected={index === active}
                    className={index === active ? "pk-palette__item pk-palette__item--active" : "pk-palette__item"}
                    onMouseMove={() => setActive(index)}
                    onClick={() => run(item)}
                  >
                    {Icon && <Icon size={16} aria-hidden="true" />}
                    <span className="pk-palette__label">{item.label}</span>
                    {item.detail && <span className="pk-palette__detail">{item.detail}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <p className="pk-palette__hint">{t("command.hint")}</p>
      </div>
    </Dialog>
  );
}

export default CommandPalette;
