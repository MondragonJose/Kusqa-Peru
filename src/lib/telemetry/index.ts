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

let sentryInitPromise: Promise<void> | null = null;
let posthogInitPromise: Promise<void> | null = null;

async function ensureSentryReady(): Promise<void> {
  if (sentryInitPromise) return sentryInitPromise;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  sentryInitPromise = (async () => {
    const mod = await import("@/lib/telemetry/sentryShim");
    mod.initSentry(dsn, IS_DEV ? "development" : "production");
  })();

  return sentryInitPromise;
}

async function ensurePostHogReady(): Promise<void> {
  if (posthogInitPromise) return posthogInitPromise;
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;

  posthogInitPromise = (async () => {
    const mod = await import("@/lib/telemetry/posthogShim");
    mod.initPostHog(key, "https://app.posthog.com");
  })();

  return posthogInitPromise;
}

export function trackOperationalMetric(name: OperationalMetricName, payload?: MetricPayload): void {
  metricCounters.set(name, (metricCounters.get(name) ?? 0) + 1);

  if (IS_DEV) {
    console.debug("[kusqa:telemetry]", name, payload ?? {});
  }

  if (!import.meta.env.VITE_TELEMETRY_ENABLED) return;

  void ensureSentryReady().then(() => {
    void import("@/lib/telemetry/sentryShim").then((mod) => mod.captureMetric(name, payload));
  });

  void ensurePostHogReady().then(() => {
    void import("@/lib/telemetry/posthogShim").then((mod) => mod.captureMetric(name, payload));
  });
}

export function captureOperationalException(error: Error, context?: MetricPayload): void {
  if (IS_DEV) {
    console.error("[kusqa:telemetry] exception", error, context ?? {});
  }

  if (!import.meta.env.VITE_TELEMETRY_ENABLED) return;

  void ensureSentryReady().then(() => {
    void import("@/lib/telemetry/sentryShim").then((mod) => mod.captureException(error, context));
  });

  void ensurePostHogReady().then(() => {
    void import("@/lib/telemetry/posthogShim").then((mod) => mod.captureException(error, context));
  });
}

export function getOperationalMetricCounters(): ReadonlyMap<string, number> {
  return metricCounters;
}
