/**
 * Lazy Sentry shim — loads only when VITE_SENTRY_DSN is set.
 * Add @sentry/react to dependencies when enabling production tracing.
 */

type MetricPayload = Record<string, string | number | boolean | undefined>;

export function captureMetric(name: string, payload?: MetricPayload): void {
  if (import.meta.env.DEV) {
    console.debug("[kusqa:sentry:metric]", name, payload);
  }
}

export function captureException(error: Error, context?: MetricPayload): void {
  if (import.meta.env.DEV) {
    console.error("[kusqa:sentry:exception]", error.message, context);
  }
}
