/**
 * Beta Logger — Instrumentación mínima para closed beta
 * Console instrumentation limpia sin dependencias externas
 */

type BetaEvent =
  | { type: "page_view"; page: string }
  | { type: "auth_start"; provider: "google" }
  | { type: "auth_success"; provider: "google" }
  | { type: "auth_error"; provider: "google"; error: string }
  | { type: "proposal_create_start" }
  | { type: "proposal_create_success"; proposalId: string }
  | { type: "proposal_create_error"; error: string }
  | { type: "mission_join_start"; missionId: string }
  | { type: "mission_join_success"; missionId: string }
  | { type: "mission_join_error"; missionId: string; error: string }
  | { type: "profile_update_start"; field: string }
  | { type: "profile_update_success"; field: string }
  | { type: "profile_update_error"; field: string; error: string };

const BETA_LOG_PREFIX = "[KUSQA BETA]";

export function logBetaEvent(event: BetaEvent) {
  if (import.meta.env.DEV) {
    console.log(BETA_LOG_PREFIX, JSON.stringify(event));
  }
}

// Helper functions para eventos comunes
export const betaEvents = {
  pageView: (page: string) => logBetaEvent({ type: "page_view", page }),
  authStart: (provider: "google") => logBetaEvent({ type: "auth_start", provider }),
  authSuccess: (provider: "google") => logBetaEvent({ type: "auth_success", provider }),
  authError: (provider: "google", error: string) =>
    logBetaEvent({ type: "auth_error", provider, error }),
  proposalCreateStart: () => logBetaEvent({ type: "proposal_create_start" }),
  proposalCreateSuccess: (proposalId: string) =>
    logBetaEvent({ type: "proposal_create_success", proposalId }),
  proposalCreateError: (error: string) => logBetaEvent({ type: "proposal_create_error", error }),
  missionJoinStart: (missionId: string) => logBetaEvent({ type: "mission_join_start", missionId }),
  missionJoinSuccess: (missionId: string) =>
    logBetaEvent({ type: "mission_join_success", missionId }),
  missionJoinError: (missionId: string, error: string) =>
    logBetaEvent({ type: "mission_join_error", missionId, error }),
  profileUpdateStart: (field: string) => logBetaEvent({ type: "profile_update_start", field }),
  profileUpdateSuccess: (field: string) => logBetaEvent({ type: "profile_update_success", field }),
  profileUpdateError: (field: string, error: string) =>
    logBetaEvent({ type: "profile_update_error", field, error }),
};
