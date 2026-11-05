import { useEffect } from "react";

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Calls `onOpen` for `/` (when you are not typing in a field) and for
 * Ctrl/Cmd+K (always), the two shortcuts that open the command palette.
 */
export function useCommandHotkey(onOpen, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (event) => {
      const target = event.target;
      const typing = TYPING.has(target?.tagName) || target?.isContentEditable;
      const isK = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      const isSlash = event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (isK || isSlash) {
        event.preventDefault();
        onOpen();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpen, enabled]);
}
