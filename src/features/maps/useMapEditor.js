import { useCallback, useRef, useState } from "react";
import { validateGraph } from "../../domain/literaryMap";
import { saveGraph } from "./useMapsController";

const UNDO_DEPTH = 20;

/**
 * The owner's edits to one map: `apply(next, message)` saves a changed graph
 * (the live listener then shows it) and remembers the one before, so `undo`
 * can put it back. `busy` is true while a save is on its way.
 */
export function useMapEditor(mapId, graph, notify, t) {
  const [busy, setBusy] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const history = useRef([]);
  const current = useRef(graph);
  current.current = graph;

  const save = useCallback(
    async (next, options) => {
      const problems = validateGraph(next);
      if (problems.length) {
        notify(problems[0], "error");
        return false;
      }
      setBusy(true);
      try {
        await saveGraph(mapId, next, options);
        return true;
      } catch {
        notify(t("maps.saveFailed"), "error");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [mapId, notify, t]
  );

  const apply = useCallback(
    async (next, message, options = {}) => {
      const before = current.current;
      const ok = await save(next, options);
      if (!ok) return false;
      history.current = [...history.current, before].slice(-UNDO_DEPTH);
      setUndoCount(history.current.length);
      if (message) notify(message);
      return true;
    },
    [save, notify]
  );

  const undo = useCallback(async () => {
    const before = history.current.at(-1);
    if (!before) return;
    if (await save(before)) {
      history.current = history.current.slice(0, -1);
      setUndoCount(history.current.length);
      notify(t("maps.edit.undone"));
    }
  }, [save, notify, t]);

  return { busy, apply, undo, canUndo: undoCount > 0, notify };
}
