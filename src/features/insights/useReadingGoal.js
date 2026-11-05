import { useState } from "react";

const STORAGE_KEY = "pusthaka-challenge-goal";
const DEFAULT_GOAL = 12;

function readGoal() {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(saved) && saved > 0 ? saved : DEFAULT_GOAL;
  } catch {
    return DEFAULT_GOAL; // storage blocked (private mode)
  }
}

/** The yearly "books to read" goal, remembered in this browser. */
export function useReadingGoal() {
  const [goal, setGoalState] = useState(readGoal);

  const setGoal = (value) => {
    const next = Number.parseInt(value, 10);
    if (!Number.isFinite(next) || next <= 0) return;
    setGoalState(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* the goal still applies for this session */
    }
  };

  return [goal, setGoal];
}
