/**
 * Service para misiones — legacy module, functions being extracted to
 * participationService.ts and evidenceService.ts.
 *
 * Re-exports maintained for backward compatibility until all consumers
 * are migrated.
 */

import type { Mission, Region, MissionCategory, MissionDifficulty, MapCoords } from "@/types";
import type { MissionRow } from "@/types/supabase";
import { supabase } from "@/lib/supabase";
import { computeLifecycleInfo } from "@/domain/lifecycle";
import { z } from "zod";

export { joinMission, getUserMissions } from "@/services/participationService";
export {
  submitEvidence,
  verifyEvidence,
  getCompletionState,
  completeMission,
} from "@/services/evidenceService";

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

export const MissionRowSchema = z.object({
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
export function transformMissionRow(row: MissionRow): Mission {
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
 * @deprecated Use missionRepository.getAllMissions() instead. This function
 * uses a MissionRow type that does not match the actual DB schema.
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
