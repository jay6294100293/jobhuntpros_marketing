import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import posthog from "posthog-js";
import "@/index.css";
import App from "@/App";

// ── Sentry (error tracking) ────────────────────────────────────────────────────
const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.REACT_APP_ENVIRONMENT || "development",
    release: process.env.REACT_APP_SENTRY_RELEASE || "swiftpack-web@1.0.0",
    integrations: [Sentry.browserTracingIntegration()],
    // Never capture passwords / payment tokens
    beforeSend(event) {
      if (event.request?.data) {
        delete event.request.data.password;
        delete event.request.data.card;
      }
      return event;
    },
  });
}

// ── PostHog (user analytics) ───────────────────────────────────────────────────
const POSTHOG_KEY = process.env.REACT_APP_POSTHOG_KEY;
if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: process.env.REACT_APP_POSTHOG_HOST || "https://app.posthog.com",
    capture_pageview: true,
    session_recording: {
      // Mask inputs that may contain sensitive data
      maskAllInputs: false,
      maskInputOptions: { password: true, email: false },
    },
    loaded: (ph) => {
      if (process.env.REACT_APP_ENVIRONMENT !== "production") {
        ph.opt_out_capturing();
      }
    },
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
