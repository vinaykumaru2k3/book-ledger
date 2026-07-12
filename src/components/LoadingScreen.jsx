import React from "react";

function LoadingScreen({ label }) {
  return (
    <div className="minimal-loading-screen">
      <div className="book-loader" aria-hidden="true">
        <div className="book-loader-page page-1" />
        <div className="book-loader-page page-2" />
        <div className="book-loader-page page-3" />
      </div>
      <h1 className="loading-status-text">{label}</h1>
    </div>
  );
}

export default LoadingScreen;
