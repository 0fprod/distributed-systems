import * as Sentry from "@sentry/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "#app";

import "./index.css";
import "./instrument";

// Bridge the React 19 / @sentry/react ErrorInfo type mismatch under exactOptionalPropertyTypes.
// React 19 types componentStack as `string | undefined`; @sentry/react expects `string | null`.
const sentryErrorHandler = (error: unknown, errorInfo: { componentStack?: string | undefined }) => {
  Sentry.captureException(error, {
    contexts: { react: { componentStack: errorInfo.componentStack ?? null } },
  });
};

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
createRoot(root, {
  onUncaughtError: sentryErrorHandler,
  onCaughtError: sentryErrorHandler,
  onRecoverableError: sentryErrorHandler,
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
