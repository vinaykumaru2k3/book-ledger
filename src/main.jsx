import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.jsx";
import ErrorBoundary from "./shared/ui/ErrorBoundary.jsx";
import { LanguageProvider } from "./shared/i18n/LanguageContext.jsx";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
