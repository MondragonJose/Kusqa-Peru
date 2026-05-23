/**
 * Mission repository — Supabase read access for missions.
 * Maps generated DB rows to domain Mission types.
 */

import { supabase } from "@/lib/supabase";
import type { Mission, MissionCategory, MissionDifficulty, Region } from "@/types";
import type { Database } from "@/types/supabase.generated";
import { getClosestRegion } from "@/utils/map";

type DbMission = Database["public"]["Tables"]["missions"]["Row"];
type DbCategory = Database["public"]["Enums"]["mission_category"];

const CATEGORY_LABEL: Record<DbCategory, MissionCategory> = {
  environment: "Medio ambiente",
  infrastructure: "Tecnología",
  community: "Comunidad",
  education: "Educación",
  health: "Salud",
};

const CATEGORY_EMOJI: Record<DbCategory, string> = {
  environment: "🌱",
  infrastructure: "🏗️",
  community: "🤝",
  education: "📚",
  health: "❤️",
};

const DEFAULT_XP = 320;
const DEFAULT_DIFFICULTY: MissionDifficulty = "Suave";

function formatMissionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-PE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function mapRowToMission(row: DbMission): Mission {
  const coords = { lat: row.latitude, lng: row.longitude };
  const region = getClosestRegion(coords);
  const participants = row.current_progress ?? 0;
  const capacity = row.max_participants ?? 10;
  const spotsLeft = Math.max(0, capacity - participants);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    district: row.district,
    region,
    category: CATEGORY_LABEL[row.category],
    xp: DEFAULT_XP,
    participants,
    spotsLeft,
    date: formatMissionDate(row.created_at),
    distanceKm: 0,
    impact: row.description.slice(0, 80),
    difficulty: DEFAULT_DIFFICULTY,
    organizer: {
      name: "Comunidad KUSQA",
      avatar: "🦙",
    },
    coords,
    emoji: CATEGORY_EMOJI[row.category],
  };
}

export const missionRepository = {
  async findAll(): Promise<Mission[]> {
    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch missions: ${error.message}`);
    }

    return (data ?? []).map(mapRowToMission);
  },
};
