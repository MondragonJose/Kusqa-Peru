/**
 * DEV-only RPC observability (no external logging libs).
 */

import { trackOperationalMetric } from "@/lib/telemetry";

const IS_DEV = import.meta.env.DEV;

export type RpcErrorCategory =
  | "auth"
  | "validation"
  | "not_found"
  | "conflict"
  | "domain"
  | "schema"
  | "network"
  | "unknown";

export function categorizeRpcError(message: string): RpcErrorCategory {
  const upper = message.toUpperCase();
  if (upper.includes("NOT_AUTHENTICATED") || upper.includes("JWT")) return "auth";
  if (
    upper.includes("INVALID_MISSION") ||
    upper.includes("INVALID_XP") ||
    upper.includes("INVALID_MISSION_STATE")
  ) {
    return "validation";
  }
  if (upper.includes("NOT_FOUND")) return "not_found";
  if (
    upper.includes("ALREADY_COMPLETED") ||
    upper.includes("DUPLICATE") ||
    upper.includes("UNIQUE")
  ) {
    return "conflict";
  }
  if (
    upper.includes("USER_MISSION_NOT_FOUND") ||
    upper.includes("COMPLETED_AT_IMMUTABLE")
  ) {
    return "domain";
  }
  if (upper.includes("SCHEMA") || upper.includes("ZOD")) return "schema";
  if (upper.includes("FETCH") || upper.includes("NETWORK")) return "network";
  return "unknown";
}

export function logRpc(
  rpcName: string,
  phase: "start" | "success" | "error",
  meta: {
    durationMs?: number;
    idempotent?: boolean;
    errorCategory?: RpcErrorCategory;
    message?: string;
    userId?: string;
    missionId?: string;
  }
): void {
  if (!IS_DEV) return;
  console.debug("[kusqa:rpc]", phase, {
    rpc: rpcName,
    durationMs: meta.durationMs,
    idempotent: meta.idempotent,
    errorCategory: meta.errorCategory,
    message: meta.message,
  });

  if (phase === "success") {
    trackOperationalMetric("rpc.success", { rpc: rpcName, durationMs: meta.durationMs });
  }
  if (phase === "error") {
    trackOperationalMetric("rpc.error", {
      rpc: rpcName,
      errorCategory: meta.errorCategory,
      message: meta.message,
    });
  }
}
