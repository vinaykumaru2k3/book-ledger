import React from "react";

/** Shimmering placeholder shown while content loads. shape: "text" | "block" | "circle". */
function Skeleton({ shape = "text", width, height, className = "" }) {
  return (
    <span
      className={["pk-skeleton", `pk-skeleton--${shape}`, className].filter(Boolean).join(" ")}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export default Skeleton;
