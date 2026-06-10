/**
 * Participation Repository — data access for mission_participants.
 *
 * This is the ONLY layer that touches the mission_participants table.
 * No business logic, no lifecycle validation, no event emission.
 *
 * Column semantics (production schema, no status column):
 *   - Row existence = user has joined the mission
 *   - completed_at IS NOT NULL = user completed the mission
 *   - xp_earned = XP awarded on verification
 */

import { supabase } from "@/lib/supabase";
import type { MissionParticipantRow } from "@/types/supabase";

export type ParticipationRow = {
  id: string;
  missionId: string;
  userId: string;
  joinedAt: string;
  completedAt: string | null;
  xpEarned: number | null;
};

function mapRow(row: MissionParticipantRow): ParticipationRow {
  return {
    id: row.id,
    missionId: row.mission_id,
    userId: row.user_id,
    joinedAt: row.created_at,
    completedAt: row.completed_at,
    xpEarned: row.xp_earned,
  };
}

export const participationRepository = {
  /**
   * Insert a participation row — user joins a mission.
   * Throws on FK violation (mission doesn't exist) or unique violation (already joined).
   */
  async join(missionId: string, userId: string): Promise<void> {
    const { error } = await supabase.from("mission_participants").insert([
      {
        mission_id: missionId,
        user_id: userId,
      },
    ]);

    if (error) {
      throw error;
    }
  },

  /**
   * Fetch all participations for a user, newest first.
   */
  async findByUser(userId: string): Promise<ParticipationRow[]> {
    const { data, error } = await supabase
      .from("mission_participants")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  /**
   * Fetch all participants for a mission, newest first.
   */
  async findByMission(missionId: string): Promise<ParticipationRow[]> {
    const { data, error } = await supabase
      .from("mission_participants")
      .select("*")
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  /**
   * Find a specific user-mission participation, if it exists.
   */
  async findOne(missionId: string, userId: string): Promise<ParticipationRow | null> {
    const { data, error } = await supabase
      .from("mission_participants")
      .select("*")
      .eq("mission_id", missionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapRow(data as MissionParticipantRow) : null;
  },

  /**
   * Mark a mission as completed for a user (sets completed_at).
   */
  async markCompleted(missionId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("mission_participants")
      .update({ completed_at: new Date().toISOString() })
      .eq("mission_id", missionId)
      .eq("user_id", userId);

    if (error) throw error;
  },

  /**
   * Get raw completed_at value for a user-mission pair.
   * Returns null if not found or not completed.
   */
  async getCompletedAt(missionId: string, userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from("mission_participants")
      .select("completed_at")
      .eq("mission_id", missionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data?.completed_at ?? null;
  },
};
