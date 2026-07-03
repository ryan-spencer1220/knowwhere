import * as Sentry from "@sentry/react-native";

// Crash/error reporting is opt-in via a build-time env var. With no DSN the
// SDK is never initialized, so the app makes no Sentry network calls and
// behaves exactly as before — flip it on by setting EXPO_PUBLIC_SENTRY_DSN
// (and, for readable stack traces, wiring source-map upload in a native build).
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const sentryEnabled = !!dsn;

export function initSentry() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    // The app collects no tracking/advertising data; keep PII out of events.
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
  });
}

// Reports a caught error. No-op until a DSN is configured.
export function captureError(error: unknown) {
  if (!dsn) return;
  Sentry.captureException(error);
}

export { Sentry };
