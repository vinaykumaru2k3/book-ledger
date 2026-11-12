import { useCallback, useState } from "react";

const KEY = "pustaka:reading-goal";
const DEFAULT_GOAL = 12;

function readGoal() {
  try {
    const saved = Number(localStorage.getItem(KEY));
    return Number.isInteger(saved) && saved > 0 ? saved : DEFAULT_GOAL;
  } catch {
    return DEFAULT_GOAL;
  }
}

/** The reader's yearly book goal (1 to 365), remembered on this device. */
export function useReadingGoal() {
  const [goal, setGoalState] = useState(readGoal);
  const setGoal = useCallback((next) => {
    const value = Math.min(Math.max(Math.round(Number(next)) || 1, 1), 365);
    setGoalState(value);
    try {
      localStorage.setItem(KEY, String(value));
    } catch {
      /* still applies for this visit */
    }
  }, []);
  return [goal, setGoal];
}
