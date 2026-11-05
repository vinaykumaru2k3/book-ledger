import React from "react";

function LoadingPanel({ label }) {
  return (
    <div className="loading-panel">
      <div className="book-loader" aria-hidden="true">
        <div className="book-loader-page page-1" />
        <div className="book-loader-page page-2" />
        <div className="book-loader-page page-3" />
      </div>
      <span>{label}</span>
    </div>
  );
}

export default LoadingPanel;
