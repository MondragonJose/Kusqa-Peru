/**
 * Lightweight Analytics Event Definitions
 * Centralized event naming for future analytics integration
 * 
 * IMPORTANT: Do not integrate heavy analytics SDKs yet.
 * This file provides a consistent event naming convention and
 * TODO placeholders for where analytics should be tracked.
 * 
 * Events to track:
 * - login
 * - signup
 * - mission_view
 * - mission_join
 * - proposal_create
 * - profile_view
 */

export type AnalyticsEventName =
  | "login"
  | "signup"
  | "mission_view"
  | "mission_join"
  | "proposal_create"
  | "profile_view";

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  properties?: Record<string, string | number | boolean>;
}

/**
 * TODO: Integrate lightweight analytics SDK (e.g., Plausible, Simple Analytics)
 * when ready. For now, this provides a consistent interface.
 */
export function trackEvent(event: AnalyticsEvent): void {
  // TODO: Send to analytics service when integrated
  if (import.meta.env.DEV) {
    console.log("[KUSQA ANALYTICS]", event.name, event.properties);
  }
}

/**
 * Event tracking helpers with consistent property naming
 */

export function trackLogin(userId: string, method: "google" | "email"): void {
  trackEvent({
    name: "login",
    properties: { userId, method },
  });
}

export function trackSignup(userId: string, method: "google" | "email"): void {
  trackEvent({
    name: "signup",
    properties: { userId, method },
  });
}

export function trackMissionView(missionId: string, category: string, region: string): void {
  trackEvent({
    name: "mission_view",
    properties: { missionId, category, region },
  });
}

export function trackMissionJoin(missionId: string, category: string, xp: number): void {
  trackEvent({
    name: "mission_join",
    properties: { missionId, category, xp },
  });
}

export function trackProposalCreate(proposalId: string, category: string, district: string): void {
  trackEvent({
    name: "proposal_create",
    properties: { proposalId, category, district },
  });
}

export function trackProfileView(userId: string, missionsCompleted: number): void {
  trackEvent({
    name: "profile_view",
    properties: { userId, missionsCompleted },
  });
}
