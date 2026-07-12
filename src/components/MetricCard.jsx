import React from "react";

function MetricCard({ icon: Icon, label, value, tone }) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-icon">
        <Icon size={20} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default MetricCard;
