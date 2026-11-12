import React, { useEffect, useId, useRef, useState } from "react";
import { Check, Monitor, Palette } from "lucide-react";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { SYSTEM_THEME, THEMES } from "./themes";
import { useTheme } from "./ThemeContext";

/** Header button + popover: hover or focus a palette to preview it on the whole app, click to keep it. */
function ThemePicker() {
  const { t } = useLanguage();
  const { choice, setChoice, setPreview } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listId = useId();

  const close = (refocus) => {
    setOpen(false);
    setPreview(null);
    if (refocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setPreview(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    rootRef.current?.querySelector('[role="radio"][aria-checked="true"]')?.focus();
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, setPreview]);

  const options = [
    ...THEMES.map((theme) => ({ ...theme, label: theme.name, detail: theme.blurb })),
    { id: SYSTEM_THEME, label: t("theme.system"), detail: t("theme.systemHint"), swatch: null },
  ];

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close(true);
      return;
    }
    const entries = [...rootRef.current.querySelectorAll('[role="radio"]')];
    const index = entries.indexOf(document.activeElement);
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (step && index >= 0) {
      event.preventDefault();
      entries[(index + step + entries.length) % entries.length].focus();
    }
  };

  return (
    <div className="pk-themepicker" ref={rootRef} onKeyDown={open ? onKeyDown : undefined}>
      <button
        ref={triggerRef}
        type="button"
        className="pk-themepicker__trigger"
        aria-label={t("theme.label")}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
      >
        <Palette size={18} aria-hidden="true" />
      </button>
      {open && (
        <div id={listId} className="pk-themepicker__panel" role="radiogroup" aria-label={t("theme.label")} onMouseLeave={() => setPreview(null)}>
          <p className="pk-themepicker__title">{t("theme.label")}</p>
          <div className="pk-themepicker__grid">
            {options.map((option) => {
              const selected = choice === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className="pk-themepicker__option"
                  onMouseEnter={() => setPreview(option.id)}
                  onFocus={() => setPreview(option.id)}
                  onClick={() => {
                    setChoice(option.id);
                    close(true);
                  }}
                >
                  <span className="pk-themepicker__swatch" aria-hidden="true">
                    {option.swatch ? option.swatch.map((color, i) => <i key={i} style={{ background: color }} />) : <Monitor size={18} />}
                  </span>
                  <span className="pk-themepicker__text">
                    <strong>{option.label}</strong>
                    <small>{option.detail}</small>
                  </span>
                  {selected && <Check size={16} aria-hidden="true" className="pk-themepicker__check" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemePicker;
