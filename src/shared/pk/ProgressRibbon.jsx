import React from "react";

/**
 * Reading progress drawn as a bookmark ribbon: a track, a filled ribbon and a
 * swallow-tail end. `value` is 0-100.
 */
function ProgressRibbon({ value, label = "Reading progress" }) {
  const pct = Math.min(Math.max(Math.round(Number(value) || 0), 0), 100);
  return (
    <div className="pk-ribbon" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="pk-ribbon__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default ProgressRibbon;
