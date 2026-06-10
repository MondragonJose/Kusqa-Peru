/**
 * Participation Service — business logic for mission participation.
 *
 * Orchestrates: lifecycle validation → participationRepository → optional causal enrichment.
 * Replaces the participation logic previously in services/missions.ts.
 */

import { supabase } from "@/lib/supabase";
import { resolveAuthenticatedUserId } from "@/services/_resolveAuth";
import { getMissionById } from "@/services/missions";
import { participationRepository } from "@/services/participationRepository";
import { evidenceRepository } from "@/services/evidenceRepository";
import { computeLifecycleInfo } from "@/domain/lifecycle";
import { deriveCompletionStateFromEvidenceStatuses } from "@/domain/evidence";
import { buildCausalChain } from "@/domain/eventCausality";
import { reduceEntityState } from "@/domain/eventReducer";
import { validateEntityState } from "@/domain/entityInvariants";
import { projectToUserMission } from "@/domain/entityStateProjection";
import type {
  Mission,
  UserMission,
  CompletionState,
  EvidenceStatus,
} from "@/types";
import type { MissionRow, MissionParticipantRow } from "@/types/supabase";
import type { CausalEnrichedEvent, KusqaDomainEvent } from "@/domain/events";
import { MissionRowSchema, transformMissionRow } from "@/services/missions";

const logDev = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

/**
 * User joins a mission.
 * Validates lifecycle, then inserts participation row.
 */
export async function joinMission(missionId: string): Promise<boolean> {
  const userId = await resolveAuthenticatedUserId();
  try {
    logDev(`[participationService] User ${userId} joining mission ${missionId}...`);

    // Lifecycle validation: only upcoming or active missions can be joined
    const mission = await getMissionById(missionId);
    if (!mission) {
      throw new Error("La misión no existe o ya no está disponible");
    }
    if (!mission.lifecycleInfo.isJoinable) {
      const state = mission.lifecycleInfo.lifecycle;
      if (state === "completed" || state === "archived") {
        throw new Error("Esta ruta ya finalizó");
      }
      throw new Error("Esta ruta no está disponible para unirse");
    }

    // Insert via participationRepository
    try {
      await participationRepository.join(missionId, userId);
    } catch (error: any) {
      if (error.code === "23503") {
        throw new Error("La misión no existe o ya no está disponible");
      }
      if (error.code === "23505") {
        throw new Error("Ya estás participando en esta misión");
      }
      throw new Error(error.message);
    }

    logDev(`[participationService] User ${userId} joined mission ${missionId}`);
    return true;
  } catch (error) {
    console.error("[participationService] Exception in joinMission:", error);
    throw error;
  }
}

/**
 * Get all missions a user participates in, enriched with mission details
 * and completion state. Preserves the original two-step + causal enrichment pipeline.
 */
export async function getUserMissions(userId: string): Promise<UserMission[]> {
  try {
    logDev(`[participationService] Fetching missions for user ${userId}...`);

    // Step 1: Get all participations for user via participationRepository
    const participations = await participationRepository.findByUser(userId);

    if (participations.length === 0) {
      logDev(`[participationService] User ${userId} has no missions`);
      return [];
    }

    const missionIds = participations.map((p) => p.missionId);
    logDev(`[participationService] Found ${missionIds.length} missions for user`);

    // Step 2: Batch-fetch missions by IDs
    const { data: missionsData, error: missionsError } = await supabase
      .from("missions")
      .select("*")
      .in("id", missionIds);

    if (missionsError) {
      console.error("[participationService] Error fetching mission details:", missionsError);
      return [];
    }

    if (!missionsData || missionsData.length === 0) {
      return [];
    }

    // Build mission lookup
    const missionMap = new Map<string, Mission>();
    for (const missionRow of missionsData) {
      const parsed = MissionRowSchema.safeParse(missionRow);
      if (parsed.success) {
        const mission = transformMissionRow(parsed.data as MissionRow);
        missionMap.set(mission.id, mission);
      }
    }

    // Step 3: Derive completion state from evidence (existing fallback path)
    const pendingMap = await evidenceRepository.getPendingEvidenceMap(userId, missionIds);

    // Step 3b: Optional causal enrichment via event_log (non-blocking, fallback)
    let causalByMission: Map<string, CausalEnrichedEvent[]> | undefined;
    try {
      const { data: eventRows } = await supabase
        .from("event_log")
        .select("payload, mission_id")
        .in("mission_id", missionIds)
        .order("created_at", { ascending: true });

      if (eventRows && eventRows.length > 0) {
        const grouped = new Map<string, KusqaDomainEvent[]>();
        for (const row of eventRows) {
          const event = row.payload as unknown as KusqaDomainEvent;
          const list = grouped.get(row.mission_id) ?? [];
          list.push(event);
          grouped.set(row.mission_id, list);
        }
        causalByMission = new Map();
        for (const [mid, events] of grouped) {
          causalByMission.set(mid, buildCausalChain(events));
        }
      }
    } catch {
      // Non-critical — fallback to existing evidence-based logic
    }

    // Step 4: Combine participation metadata + mission details + completion state into UserMission[]
    const result: UserMission[] = [];
    for (const participant of participations) {
      const mission = missionMap.get(participant.missionId);
      if (!mission) {
        logDev(`[participationService] Mission ${participant.missionId} not found, skipping`);
        continue;
      }

      // Try causal-enriched path first, fall back to existing logic
      const causalChain = causalByMission?.get(participant.missionId);
      if (causalChain && causalChain.length > 0) {
        try {
          const entityState = reduceEntityState(causalChain);

          // Optional validation — log violations in dev, never blocks
          const validation = import.meta.env.DEV ? validateEntityState(entityState) : null;

          const userMission: UserMission & { __invariantViolations?: string[] } =
            projectToUserMission(participant.missionId, participant.userId, entityState, {
              mission,
              joinedAt: participant.joinedAt,
              xpEarned: participant.xpEarned,
            });

          if (validation && !validation.valid) {
            if (import.meta.env.DEV) console.warn("[participationService/getUserMissions] Invariant violation", {
              missionId: participant.missionId,
              violations: validation.violations,
              severity: validation.severity,
            });
            userMission.__invariantViolations = [...validation.violations];
          }

          result.push(userMission);
          continue;
        } catch {
          // Fall through to existing fallback
        }
      }

      // Fallback: existing evidence-based completion derivation
      const isCompleted = participant.completedAt != null;
      const hasPending = pendingMap.get(participant.missionId) ?? false;
      const evidenceStatuses: EvidenceStatus[] = [];
      if (hasPending) evidenceStatuses.push("pending");
      if (isCompleted) evidenceStatuses.push("verified");

      const completionState: CompletionState = deriveCompletionStateFromEvidenceStatuses(
        participant.completedAt,
        evidenceStatuses,
      );

      result.push({
        id: `${participant.missionId}-${participant.userId}`,
        userId: participant.userId,
        missionId: participant.missionId,
        status: isCompleted ? "completed" : "in_progress",
        completionState,
        joinedAt: participant.joinedAt,
        completedAt: participant.completedAt,
        xpEarned: participant.xpEarned,
        mission,
      });
    }

    return result;
  } catch (error) {
    console.error("[participationService] Exception in getUserMissions:", error);
    return [];
  }
}
