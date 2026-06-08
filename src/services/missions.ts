/**
 * Service para misiones
 * Gestiona operaciones CRUD de misiones
 * Conecta con Supabase para obtener datos reales
 */

import type {
  Mission,
  Region,
  MissionCategory,
  MissionDifficulty,
  MapCoords,
  UserMission,
  EvidenceType,
  CompletionState,
  EvidenceStatus,
  Evidence,
} from "@/types";
import type { MissionRow, MissionParticipantRow } from "@/types/supabase";
import type { CausalEnrichedEvent, KusqaDomainEvent } from "@/domain/events";
import { supabase } from "@/lib/supabase";
import { computeLifecycleInfo } from "@/domain/lifecycle";
import { deriveCompletionStateFromEvidenceStatuses } from "@/domain/evidence";
import { buildCausalChain } from "@/domain/eventCausality";
import { reduceEntityState } from "@/domain/eventReducer";
import { validateEntityState } from "@/domain/entityInvariants";
import { projectToUserMission } from "@/domain/entityStateProjection";
import { evidenceRepository } from "@/services/evidenceRepository";
import {
  uploadMissionEvidence,
  buildEvidenceStoragePath,
  validateEvidenceFile,
} from "@/services/storage/evidenceStorage";
import { emit } from "@/domain/eventEmitter";
import {
  createEvidenceSubmittedEvent,
  createEvidenceVerifiedEvent,
  createEvidenceRejectedEvent,
} from "@/domain/events";
import { z } from "zod";

const logDev = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

// Zod Schemas for runtime validation
const RegionSchema = z.enum(["costa", "sierra", "selva"]);
const MissionCategorySchema = z.enum([
  "Medio ambiente",
  "Educación",
  "Arte & cultura",
  "Comunidad",
  "Salud",
  "Tecnología",
]);
const MissionDifficultySchema = z.enum(["Suave", "Andina", "Cumbre"]);

const MissionRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  district: z.string(),
  region: z.string(),
  category: z.string(),
  xp: z.number(),
  difficulty: z.string(),
  date: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  organizer_id: z.string(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  participants: z.number().nullable().optional(),
  spotsLeft: z.number().nullable().optional(),
  distanceKm: z.number().nullable().optional(),
  impact: z.string().nullable().optional(),
  coords: z.any().nullable().optional(),
  emoji: z.string().nullable().optional(),
});

// Database to Domain Mapping functions
function mapRegion(val: unknown): Region {
  if (typeof val !== "string") return "costa";
  const normalized = val.toLowerCase().trim();
  if (normalized === "andes" || normalized === "sierra") return "sierra";
  if (normalized === "jungle" || normalized === "selva") return "selva";

  const parsed = RegionSchema.safeParse(normalized);
  return parsed.success ? parsed.data : "costa";
}

function mapCategory(val: unknown): MissionCategory {
  if (typeof val !== "string") return "Comunidad";
  const normalized = val.toLowerCase().trim();
  if (normalized.includes("ambient") || normalized.includes("medio")) return "Medio ambiente";
  if (normalized.includes("educa")) return "Educación";
  if (normalized.includes("art") || normalized.includes("cultur")) return "Arte & cultura";
  if (normalized.includes("comunid")) return "Comunidad";
  if (normalized.includes("salud")) return "Salud";
  if (normalized.includes("tecnolog")) return "Tecnología";

  const parsed = MissionCategorySchema.safeParse(val);
  return parsed.success ? parsed.data : "Comunidad";
}

function mapDifficulty(val: unknown): MissionDifficulty {
  if (typeof val !== "string") return "Suave";
  const normalized = val.toLowerCase().trim();
  if (normalized === "easy" || normalized === "suave") return "Suave";
  if (normalized === "medium" || normalized === "andina") return "Andina";
  if (normalized === "hard" || normalized === "cumbre") return "Cumbre";

  const parsed = MissionDifficultySchema.safeParse(val);
  return parsed.success ? parsed.data : "Suave";
}

function parseCoords(coordsAny: any): MapCoords {
  if (!coordsAny) {
    return { lat: -12.0463, lng: -77.0312 }; // Centro de Lima por defecto
  }
  if (typeof coordsAny.lat === "number" && typeof coordsAny.lng === "number") {
    return { lat: coordsAny.lat, lng: coordsAny.lng };
  }
  if (typeof coordsAny.x === "number" && typeof coordsAny.y === "number") {
    // Proyección inversa para datos legados de prototipo {x, y}
    const minLat = -18.5;
    const maxLat = -0.0;
    const minLng = -81.5;
    const maxLng = -68.5;
    const lng = (coordsAny.x / 100) * (maxLng - minLng) + minLng;
    const lat = maxLat - (coordsAny.y / 100) * (maxLat - minLat);
    return { lat, lng };
  }
  return { lat: -12.0463, lng: -77.0312 };
}

/**
 * Transforma una fila de Supabase (MissionRow) a tipo de dominio (Mission)
 * Mapea datos crudos de BD a modelo de aplicación
 */
function transformMissionRow(row: MissionRow): Mission {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    district: row.district,
    region: mapRegion(row.region),
    category: mapCategory(row.category),
    xp: row.xp,
    difficulty: mapDifficulty(row.difficulty),
    date: row.date,
    participants: row.participants ?? 0,
    spotsLeft: row.spotsLeft ?? 5,
    distanceKm: row.distanceKm ?? 0,
    impact: row.impact ?? "",
    coords: parseCoords(row.coords),
    emoji: row.emoji ?? "🗺️",
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    lifecycleInfo: computeLifecycleInfo(row.start_date, row.end_date),
    organizer: {
      name: "Organizador",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=org",
    },
  };
}

/**
 * Obtiene todas las misiones disponibles desde Supabase
 */
export async function getMissions(): Promise<Mission[]> {
  try {
    logDev("[services/missions] Fetching all missions from Supabase...");

    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[services/missions] Supabase error:", error);
      throw new Error(`Failed to fetch missions: ${error.message}`);
    }

    if (!data || data.length === 0) {
      logDev("[services/missions] No missions found in Supabase");
      return [];
    }

    logDev(`[services/missions] Retrieved ${data.length} missions`);
    return data.map((row: unknown) => {
      const parsed = MissionRowSchema.safeParse(row);
      if (!parsed.success) {
        console.error("[services/missions] Row failed validation:", parsed.error, row);
      }
      return transformMissionRow((parsed.success ? parsed.data : row) as MissionRow);
    });
  } catch (error) {
    console.error("[services/missions] Exception in getMissions:", error);
    throw error;
  }
}

/**
 * Obtiene una misión por ID desde Supabase
 */
export async function getMissionById(missionId: string): Promise<Mission | null> {
  try {
    logDev(`[services/missions] Fetching mission ${missionId}...`);

    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .eq("id", missionId)
      .maybeSingle();

    if (error) {
      console.error("[services/missions] Supabase error:", error);
      throw new Error(`Failed to fetch mission: ${error.message}`);
    }

    if (!data) {
      logDev(`[services/missions] Mission ${missionId} not found`);
      return null;
    }

    logDev(`[services/missions] Found mission: ${data.title}`);
    const parsed = MissionRowSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[services/missions] Mission by ID failed validation:", parsed.error, data);
    }
    return transformMissionRow((parsed.success ? parsed.data : data) as MissionRow);
  } catch (error) {
    console.error("[services/missions] Exception in getMissionById:", error);
    throw error;
  }
}

/**
 * Obtiene misiones filtradas por región
 */
export async function getMissionsByRegion(region: string): Promise<Mission[]> {
  try {
    logDev(`[services/missions] Fetching missions in region: ${region}`);

    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .eq("region", region)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[services/missions] Supabase error:", error);
      throw new Error(`Failed to fetch missions by region: ${error.message}`);
    }

    logDev(`[services/missions] Found ${data?.length || 0} missions in ${region}`);
    return (data || []).map((row: unknown) => {
      const parsed = MissionRowSchema.safeParse(row);
      if (!parsed.success) {
        console.error("[services/missions] Row failed validation:", parsed.error, row);
      }
      return transformMissionRow((parsed.success ? parsed.data : row) as MissionRow);
    });
  } catch (error) {
    console.error("[services/missions] Exception in getMissionsByRegion:", error);
    throw error;
  }
}

/**
 * Obtiene misiones filtradas por categoría
 */
export async function getMissionsByCategory(category: string): Promise<Mission[]> {
  try {
    logDev(`[services/missions] Fetching missions in category: ${category}`);

    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .eq("category", category)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[services/missions] Supabase error:", error);
      throw new Error(`Failed to fetch missions by category: ${error.message}`);
    }

    logDev(`[services/missions] Found ${data?.length || 0} missions in ${category}`);
    return (data || []).map((row: unknown) => {
      const parsed = MissionRowSchema.safeParse(row);
      if (!parsed.success) {
        console.error("[services/missions] Row failed validation:", parsed.error, row);
      }
      return transformMissionRow((parsed.success ? parsed.data : row) as MissionRow);
    });
  } catch (error) {
    console.error("[services/missions] Exception in getMissionsByCategory:", error);
    throw error;
  }
}

/**
 * Crea una nueva misión en Supabase
 * @future Esta función requiere autenticación y permisos de RLS
 */
export async function createMission(data: Omit<Mission, "id">): Promise<Mission> {
  try {
    logDev("[services/missions] Creating new mission:", data.title);

    const missionData = {
      title: data.title,
      description: data.description,
      district: data.district,
      region: data.region,
      category: data.category,
      xp: data.xp,
      difficulty: data.difficulty,
      date: data.date,
      participants: data.participants ?? 0,
      spotsLeft: data.spotsLeft ?? 5,
      distanceKm: data.distanceKm ?? 0,
      impact: data.impact ?? "",
      emoji: data.emoji ?? "🗺️",
    };

    const { data: inserted, error } = await supabase
      .from("missions")
      .insert([missionData])
      .select()
      .single();

    if (error) {
      console.error("[services/missions] Supabase error:", error);
      throw new Error(`Failed to create mission: ${error.message}`);
    }

    logDev(`[services/missions] Created mission: ${inserted.id}`);
    const parsed = MissionRowSchema.safeParse(inserted);
    if (!parsed.success) {
      console.error(
        "[services/missions] Created mission failed validation:",
        parsed.error,
        inserted,
      );
    }
    return transformMissionRow((parsed.success ? parsed.data : inserted) as MissionRow);
  } catch (error) {
    console.error("[services/missions] Exception in createMission:", error);
    throw error;
  }
}

/**
 * Usuario se une a una misión
 * Inserta registro en tabla mission_participants
 */
export async function joinMission(missionId: string, userId: string): Promise<boolean> {
  try {
    logDev(`[services/missions] User ${userId} joining mission ${missionId}...`);

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

    // Insertar en mission_participants
    // No status column in production — existence of row IS participation
    // FK constraint on mission_id validates mission existence — no extra query needed
    const { error } = await supabase.from("mission_participants").insert([
      {
        mission_id: missionId,
        user_id: userId,
      },
    ]);

    if (error) {
      console.error("[services/missions] Supabase error:", error);
      if (error.code === "23503") {
        throw new Error("La misión no existe o ya no está disponible");
      }
      if (error.code === "23505") {
        throw new Error("Ya estás participando en esta misión");
      }
      throw new Error(error.message);
    }

    logDev(`[services/missions] User ${userId} joined mission ${missionId}`);
    return true;
  } catch (error) {
    console.error("[services/missions] Exception in joinMission:", error);
    throw error;
  }
}

/**
 * Obtiene las misiones en las que el usuario participa — con metadatos reales de participation.
 * Two-step: fetch ALL columns from mission_participants, then batch-fetch missions by ID.
 * Returns UserMission[] with real joinedAt, completedAt, xpEarned from mission_participants.
 */
export async function getUserMissions(userId: string): Promise<UserMission[]> {
  try {
    logDev(`[services/missions] Fetching missions for user ${userId}...`);

    // Step 1: Get ALL columns from mission_participants (not just mission_id)
    const { data: participation, error: partError } = await supabase
      .from("mission_participants")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (partError) {
      console.error("[services/missions] Error fetching participation:", partError);
      return [];
    }

    if (!participation || participation.length === 0) {
      logDev(`[services/missions] User ${userId} has no missions`);
      return [];
    }

    const missionIds = participation.map((row: { mission_id: string }) => row.mission_id);
    logDev(`[services/missions] Found ${missionIds.length} missions for user`);

    // Step 2: Batch-fetch missions by IDs
    const { data: missionsData, error: missionsError } = await supabase
      .from("missions")
      .select("*")
      .in("id", missionIds);

    if (missionsError) {
      console.error("[services/missions] Error fetching mission details:", missionsError);
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
    for (const participant of participation as MissionParticipantRow[]) {
      const mission = missionMap.get(participant.mission_id);
      if (!mission) {
        logDev(`[services/missions] Mission ${participant.mission_id} not found, skipping`);
        continue;
      }

      // Try causal-enriched path first, fall back to existing logic
      const causalChain = causalByMission?.get(participant.mission_id);
      if (causalChain && causalChain.length > 0) {
        try {
          const entityState = reduceEntityState(causalChain);

          // Optional validation — log violations in dev, never blocks
          const validation = import.meta.env.DEV ? validateEntityState(entityState) : null;

          const userMission: UserMission & { __invariantViolations?: string[] } =
            projectToUserMission(participant.mission_id, participant.user_id, entityState, {
              mission,
              joinedAt: participant.created_at,
              xpEarned: participant.xp_earned,
            });

          if (validation && !validation.valid) {
            console.warn("[missions/getUserMissions] Invariant violation", {
              missionId: participant.mission_id,
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
      const isCompleted = participant.completed_at != null;
      const hasPending = pendingMap.get(participant.mission_id) ?? false;
      const evidenceStatuses: EvidenceStatus[] = [];
      if (hasPending) evidenceStatuses.push("pending");
      if (isCompleted) evidenceStatuses.push("verified");

      const completionState: CompletionState = deriveCompletionStateFromEvidenceStatuses(
        participant.completed_at,
        evidenceStatuses,
      );

      result.push({
        id: `${participant.mission_id}-${participant.user_id}`,
        userId: participant.user_id,
        missionId: participant.mission_id,
        status: isCompleted ? "completed" : "in_progress",
        completionState,
        joinedAt: participant.created_at,
        completedAt: participant.completed_at,
        xpEarned: participant.xp_earned,
        mission,
      });
    }

    return result;
  } catch (error) {
    console.error("[services/missions] Exception in getUserMissions:", error);
    return [];
  }
}

/**
 * Usuario completa una misión
 * Actualiza registro en mission_participants — sets completed_at (no status column in production)
 *
 * @deprecated Use submitEvidence() instead. Direct completion bypasses evidence verification.
 * Kept for backward compatibility until evidence system is fully deployed.
 */
export async function completeMission(missionId: string, userId: string): Promise<boolean> {
  try {
    logDev(`[services/missions] User ${userId} completing mission ${missionId}...`);

    // Lifecycle validation: only active missions can be completed
    const mission = await getMissionById(missionId);
    if (!mission) {
      throw new Error("Mission not found");
    }
    if (!mission.lifecycleInfo.isCompletable) {
      const state = mission.lifecycleInfo.lifecycle;
      if (state === "upcoming") {
        throw new Error("Esta ruta aún no ha comenzado");
      }
      if (state === "completed" || state === "archived") {
        throw new Error("Esta ruta ya fue completada");
      }
      throw new Error("Esta ruta no puede completarse en este momento");
    }

    // Actualizar mission_participants — completed_at non-null means completed
    const { error } = await supabase
      .from("mission_participants")
      .update({ completed_at: new Date().toISOString() })
      .eq("mission_id", missionId)
      .eq("user_id", userId);

    if (error) {
      console.error("[services/missions] Supabase error:", error);
      throw new Error(`Failed to complete mission: ${error.message}`);
    }

    logDev(`[services/missions] User ${userId} completed mission ${missionId}`);
    return true;
  } catch (error) {
    console.error("[services/missions] Exception in completeMission:", error);
    throw error;
  }
}

/**
 * Submit mission evidence — the canonical completion flow.
 *
 * For photo/mixed types: uploads file to storage, creates evidence row (pending).
 * For text/checkpoint types: creates evidence row with description (pending).
 *
 * Evidence MUST be verified (by a non-self verifier) for the mission to be completed.
 * Self-verification is forbidden at the domain layer.
 */
export async function submitEvidence(input: {
  missionId: string;
  userId: string;
  type: EvidenceType;
  description?: string;
  caption?: string;
  file?: File;
}): Promise<Evidence> {
  const { missionId, userId, type, description, caption, file } = input;

  logDev(
    `[services/missions] User ${userId} submitting ${type} evidence for mission ${missionId}...`,
  );

  // Lifecycle validation: only active/ending_soon missions can be completed
  const mission = await getMissionById(missionId);
  if (!mission) {
    throw new Error("Mission not found");
  }
  if (!mission.lifecycleInfo.isCompletable) {
    const state = mission.lifecycleInfo.lifecycle;
    if (state === "upcoming") throw new Error("Esta ruta aún no ha comenzado");
    if (state === "completed" || state === "archived")
      throw new Error("Esta ruta ya fue completada");
    throw new Error("Esta ruta no puede completarse en este momento");
  }

  // Check for existing pending evidence (prevent duplicate submissions)
  const hasPending = await evidenceRepository.hasPendingEvidence(userId, missionId);
  if (hasPending) {
    throw new Error("Ya tienes evidencia pendiente de verificación para esta ruta");
  }

  let evidence: Evidence;

  if (type === "photo" || type === "mixed") {
    if (!file) throw new Error("Se requiere un archivo para evidencia fotográfica");
    validateEvidenceFile(file);

    const evidenceId = crypto.randomUUID();
    const storagePath = buildEvidenceStoragePath(userId, missionId, evidenceId, file.type);

    const uploaded = await uploadMissionEvidence({
      userId,
      missionId,
      evidenceId,
      file,
    });

    evidence = await evidenceRepository.createPhotoEvidence(
      missionId,
      userId,
      type,
      evidenceId,
      uploaded.storagePath,
      uploaded.mimeType,
      uploaded.byteSize,
      { caption, description, mediaUrls: [] },
    );
  } else {
    // text or checkpoint
    evidence = await evidenceRepository.createTextEvidence(
      missionId,
      userId,
      type,
      description ?? "",
      { caption },
    );
  }

  emit(createEvidenceSubmittedEvent(evidence.id, userId, missionId, userId));
  return evidence;
}

/**
 * Verify or reject evidence.
 * Sets completion if evidence is verified (sets completed_at on mission_participants).
 * Self-verification is forbidden — verified_by must differ from evidence user_id.
 */
export async function verifyEvidence(
  evidenceId: string,
  verifierId: string,
  status: "verified" | "rejected",
  rejectionReason?: string,
): Promise<Evidence> {
  logDev(`[services/missions] Verifier ${verifierId} → evidence ${evidenceId} → ${status}`);

  // Self-verification check (domain rule enforced at service boundary)
  const { data: evidenceRow, error: fetchError } = await supabase
    .from("mission_evidence")
    .select("id, user_id, mission_id")
    .eq("id", evidenceId)
    .single();

  if (fetchError || !evidenceRow) {
    throw new Error("Evidencia no encontrada");
  }

  if (evidenceRow.user_id === verifierId) {
    throw new Error("No puedes verificar tu propia evidencia");
  }

  // Atomicity: update mission_participants BEFORE evidence row.
  // If participants update fails, evidence stays pending and the caller
  // can retry. If evidence update fails after participants succeeded,
  // the mission shows "completed" without verified evidence — this is
  // equivalent to the legacy completeMission path and is defensive.
  if (status === "verified") {
    const { error: updateError } = await supabase
      .from("mission_participants")
      .update({ completed_at: new Date().toISOString() })
      .eq("mission_id", evidenceRow.mission_id)
      .eq("user_id", evidenceRow.user_id);

    if (updateError) {
      console.error("[services/missions] Failed to set completed_at:", updateError);
      throw new Error(`Error al completar la misión: ${updateError.message}`);
    }
  }

  const evidence = await evidenceRepository.verifyEvidence(
    evidenceId,
    verifierId,
    status,
    rejectionReason,
  );

  if (status === "verified") {
    emit(
      createEvidenceVerifiedEvent(
        evidenceId,
        evidenceRow.user_id,
        evidenceRow.mission_id,
        verifierId,
      ),
    );
  } else {
    emit(
      createEvidenceRejectedEvent(
        evidenceId,
        evidenceRow.user_id,
        evidenceRow.mission_id,
        verifierId,
        rejectionReason ?? null,
      ),
    );
  }

  logDev(`[services/missions] Evidence ${evidenceId} → ${status}`);
  return evidence;
}

/**
 * Get completion state for a specific user-mission pair.
 */
export async function getCompletionState(
  userId: string,
  missionId: string,
): Promise<CompletionState> {
  const { data: participation, error: partError } = await supabase
    .from("mission_participants")
    .select("completed_at")
    .eq("mission_id", missionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (partError || !participation) {
    return "not_completed";
  }

  if (participation.completed_at) {
    return "completed";
  }

  const hasPending = await evidenceRepository.hasPendingEvidence(userId, missionId);
  return hasPending ? "awaiting_verification" : "not_completed";
}
