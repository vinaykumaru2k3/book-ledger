import React from "react";

/**
 * Last line of defence: a render error anywhere below shows a recovery screen
 * instead of a blank page (which is how earlier crashes looked to users).
 */
export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{ padding: "3rem 1.5rem", maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif" }}>Something went wrong</h1>
        <p>Your books are safe. Reloading the page usually fixes this.</p>
        <button className="button primary" type="button" onClick={() => window.location.assign("/")}>
          Reload Pusthaka
        </button>
      </div>
    );
  }
}
