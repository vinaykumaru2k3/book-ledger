import React from "react";
import { Loader2 } from "lucide-react";
import Button from "../../shared/ui/Button";

/** Spinner panel shown while a Discover page loads. */
export function DiscoverLoading({ children }) {
  return (
    <div className="rec-loading-panel">
      <Loader2 className="spin" size={32} />
      <span>{children}</span>
    </div>
  );
}

/** Error panel with a retry button. */
export function DiscoverError({ message, onRetry }) {
  return (
    <div className="rec-error-panel">
      <p>{message}</p>
      <Button compact variant="primary" onClick={onRetry}>
        Try Again
      </Button>
    </div>
  );
}
