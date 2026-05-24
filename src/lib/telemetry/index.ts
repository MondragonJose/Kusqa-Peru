/**
 * Operational telemetry — Sentry / PostHog ready, DEV structured logs always available.
 */

const IS_DEV = import.meta.env.DEV;

export type OperationalMetricName =
  | "rpc.success"
  | "rpc.error"
  | "realtime.reconcile.applied"
  | "realtime.reconcile.skipped"
  | "realtime.channel.subscribed"
  | "realtime.channel.error"
  | "upload.start"
  | "upload.success"
  | "upload.failure"
  | "rollback.applied"
  | "cache.desync_detected";

type MetricPayload = Record<string, string | number | boolean | undefined>;

const metricCounters = new Map<string, number>();

export function trackOperationalMetric(name: OperationalMetricName, payload?: MetricPayload): void {
  metricCounters.set(name, (metricCounters.get(name) ?? 0) + 1);

  if (IS_DEV) {
    console.debug("[kusqa:telemetry]", name, payload ?? {});
  }

  if (!import.meta.env.VITE_TELEMETRY_ENABLED) return;

  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (sentryDsn && typeof window !== "undefined") {
    void import("@/lib/telemetry/sentryShim").then((mod) => mod.captureMetric(name, payload));
  }

  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  if (posthogKey && typeof window !== "undefined") {
    void import("@/lib/telemetry/posthogShim").then((mod) => mod.captureMetric(name, payload));
  }
}

export function captureOperationalException(
  error: Error,
  context?: MetricPayload
): void {
  if (IS_DEV) {
    console.error("[kusqa:telemetry] exception", error, context ?? {});
  }

  if (!import.meta.env.VITE_TELEMETRY_ENABLED) return;

  void import("@/lib/telemetry/sentryShim").then((mod) => mod.captureException(error, context));
}

export function getOperationalMetricCounters(): ReadonlyMap<string, number> {
  return metricCounters;
}
