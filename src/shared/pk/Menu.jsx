import React, { useEffect, useId, useRef, useState } from "react";

/**
 * Dropdown menu. `trigger` is the button content; `items` is
 * `[{ id, label, icon, onSelect, tone }]`. Closes on Escape (returning focus),
 * outside click, or choosing an item; arrow keys move between items.
 * `header` renders non-interactive content above the items.
 */
function Menu({ label, trigger, items, header, align = "end", triggerClassName = "" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => !rootRef.current?.contains(event.target) && setOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    rootRef.current?.querySelector('[role="menuitem"]')?.focus();
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    const entries = [...rootRef.current.querySelectorAll('[role="menuitem"]')];
    const index = entries.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      entries[(index + 1) % entries.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      entries[(index - 1 + entries.length) % entries.length]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="pk-menu" ref={rootRef} onKeyDown={open ? onKeyDown : undefined}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName || "pk-menu__trigger"}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label={label} className={`pk-menu__list pk-menu__list--${align}`}>
          {header && <div className="pk-menu__header">{header}</div>}
          {items.map(({ id, label: itemLabel, icon: Icon, onSelect, tone }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              className={tone === "danger" ? "pk-menu__item pk-menu__item--danger" : "pk-menu__item"}
              onClick={() => {
                setOpen(false);
                onSelect();
              }}
            >
              {Icon && <Icon size={16} aria-hidden="true" />}
              <span>{itemLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Menu;
