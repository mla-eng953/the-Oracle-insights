// Error + product telemetry. Both providers are optional — set env vars to
// enable. Respects a user opt-out stored in localStorage under oracle.telemetry.

import * as Sentry from "@sentry/react";
import posthog from "posthog-js";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://us.i.posthog.com";
const APP_ENV = (import.meta.env.VITE_APP_ENV as string | undefined) ?? "development";

let initialized = false;

export function initTelemetry() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  if (isOptedOut()) return;

  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: APP_ENV,
      tracesSampleRate: APP_ENV === "production" ? 0.1 : 0.5,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: APP_ENV === "production" ? 0.1 : 0,
      beforeSend(event) {
        // Strip any user-entered DOB or email — we never want those in Sentry.
        if (event.request?.data) {
          const scrub = (obj: unknown): unknown => {
            if (typeof obj !== "object" || obj === null) return obj;
            const out: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
            for (const k of Object.keys(out)) {
              if (/email|dob|birth|password|token/i.test(k)) out[k] = "[redacted]";
              else out[k] = scrub(out[k]);
            }
            return out;
          };
          event.request.data = scrub(event.request.data) as typeof event.request.data;
        }
        return event;
      },
    });
  }

  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      persistence: "localStorage",
      autocapture: false,
      disable_session_recording: true,
      respect_dnt: true,
      property_denylist: ["$ip"],
    });
  }
}

export function identify(userId: string, email: string | undefined) {
  if (isOptedOut()) return;
  if (SENTRY_DSN) Sentry.setUser({ id: userId });
  if (POSTHOG_KEY && initialized) posthog.identify(userId, email ? { email } : undefined);
}

export function track(event: string, props?: Record<string, unknown>) {
  if (isOptedOut()) return;
  if (POSTHOG_KEY && initialized) posthog.capture(event, props);
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (isOptedOut()) return;
  if (SENTRY_DSN) Sentry.captureException(err, { extra: context });
  else console.error("[telemetry]", err, context);
}

export function setOptOut(value: boolean) {
  if (typeof localStorage === "undefined") return;
  if (value) localStorage.setItem("oracle.telemetry", "off");
  else localStorage.removeItem("oracle.telemetry");
  if (value && POSTHOG_KEY) posthog.opt_out_capturing();
  if (!value && POSTHOG_KEY) posthog.opt_in_capturing();
}

export function isOptedOut(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem("oracle.telemetry") === "off";
}
