import React from "react";
import { HelpCircle } from "lucide-react";
import { STATUSES } from "../../domain/status";

/** Coloured pill showing a book's reading status. */
function StatusChip({ status }) {
  const info = STATUSES[status] || { label: "Want to read", color: "#6b7280" };
  const Icon = info.icon || HelpCircle;
  return (
    <span className="status-chip" style={{ "--status-color": info.color || "#6b7280" }}>
      <Icon size={12} />
      <span>{info.longLabel || info.label}</span>
    </span>
  );
}

export default StatusChip;
