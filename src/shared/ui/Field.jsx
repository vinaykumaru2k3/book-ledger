import React from "react";

/** Labelled form row. `wide` makes it span both columns of the form grid. */
function Field({ label, wide = false, children }) {
  return (
    <label className={`field ${wide ? "span-2" : ""}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default Field;
