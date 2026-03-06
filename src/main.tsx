import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.tsx";
import "./styles/globals.css";
import { getInitialThemeMode } from "./hooks/useThemeMode";
import { ensureDefaultExamplesAvailable } from "./utils/defaultExamples";
import "./lib/posthog";

const initialThemeMode = getInitialThemeMode();
document.documentElement.dataset.theme = initialThemeMode;

if (import.meta.env.PROD) {
  console.log("Build commit SHA:", import.meta.env.VITE_COMMIT_SHA);
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const scope = import.meta.env.BASE_URL;
    const serviceWorkerUrl = `${scope}sw.js`;

    void navigator.serviceWorker
      .register(serviceWorkerUrl, { scope })
      .catch((error) => {
        // Keep runtime quiet in production while still exposing diagnostics in devtools.
        console.error("Service worker registration failed:", error);
      });
  });
}

void ensureDefaultExamplesAvailable().catch((error) => {
  if (import.meta.env.DEV) {
    console.warn("Failed to initialize default example files.", error);
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
