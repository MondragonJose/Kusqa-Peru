/**
 * Typed RPC errors for mission transactions.
 */

import type { RpcErrorCategory } from "@/services/rpc/rpcLogger";

export class UserMissionRpcError extends Error {
  readonly category: RpcErrorCategory;
  readonly code: string;

  constructor(category: RpcErrorCategory, code: string, message: string) {
    super(message);
    this.name = "UserMissionRpcError";
    this.category = category;
    this.code = code;
  }
}

export function mapPostgrestRpcError(error: { message: string; code?: string }): UserMissionRpcError {
  const message = error.message;
  const upper = message.toUpperCase();

  if (upper.includes("NOT_AUTHENTICATED")) {
    return new UserMissionRpcError("auth", "NOT_AUTHENTICATED", message);
  }
  if (upper.includes("INVALID_MISSION_ID")) {
    return new UserMissionRpcError("validation", "INVALID_MISSION_ID", message);
  }
  if (upper.includes("INVALID_XP")) {
    return new UserMissionRpcError("validation", "INVALID_XP", message);
  }
  if (upper.includes("MISSION_NOT_FOUND")) {
    return new UserMissionRpcError("not_found", "MISSION_NOT_FOUND", message);
  }
  if (upper.includes("USER_MISSION_NOT_FOUND")) {
    return new UserMissionRpcError("domain", "USER_MISSION_NOT_FOUND", message);
  }
  if (upper.includes("MISSION_ALREADY_COMPLETED")) {
    return new UserMissionRpcError("conflict", "MISSION_ALREADY_COMPLETED", message);
  }
  if (upper.includes("INVALID_MISSION_STATE")) {
    return new UserMissionRpcError("domain", "INVALID_MISSION_STATE", message);
  }
  if (upper.includes("COMPLETED_AT_IMMUTABLE")) {
    return new UserMissionRpcError("domain", "COMPLETED_AT_IMMUTABLE", message);
  }

  return new UserMissionRpcError("unknown", error.code ?? "RPC_ERROR", message);
}
