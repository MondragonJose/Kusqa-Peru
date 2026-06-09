import * as Sentry from "@sentry/react";

type MetricPayload = Record<string, string | number | boolean | undefined>;

let initialized = false;

export function initSentry(dsn: string, environment: string): void {
  if (initialized) return;
  initialized = true;

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
  });
}

export function captureMetric(name: string, payload?: MetricPayload): void {
  Sentry.addBreadcrumb({
    category: "metric",
    message: name,
    data: payload as Record<string, string | number | boolean>,
  });
}

export function captureException(error: Error, context?: MetricPayload): void {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context as Record<string, string | number | boolean>);
    }
    Sentry.captureException(error);
  });
}
