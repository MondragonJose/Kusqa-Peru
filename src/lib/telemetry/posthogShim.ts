/**
 * Lazy PostHog shim — loads only when VITE_POSTHOG_KEY is set.
 */

type MetricPayload = Record<string, string | number | boolean | undefined>;

export function captureMetric(name: string, payload?: MetricPayload): void {
  if (import.meta.env.DEV) {
    console.debug("[kusqa:posthog:metric]", name, payload);
  }
}
