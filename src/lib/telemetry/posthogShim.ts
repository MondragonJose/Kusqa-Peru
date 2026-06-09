import posthog from "posthog-js";

type MetricPayload = Record<string, string | number | boolean | undefined>;

let initialized = false;

export function initPostHog(apiKey: string, apiHost: string): void {
  if (initialized) return;
  initialized = true;

  posthog.init(apiKey, {
    api_host: apiHost,
    capture_pageview: false,
    loaded: (ph) => {
      ph.identify(undefined);
    },
  });
}

export function captureMetric(name: string, payload?: MetricPayload): void {
  posthog.capture(name, payload);
}

export function captureException(error: Error, context?: MetricPayload): void {
  posthog.capture("$exception", {
    ...context,
    $exception_message: error.message,
    $exception_type: error.name,
    $exception_stack: error.stack,
  });
}
