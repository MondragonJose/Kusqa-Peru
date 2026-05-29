/**
 * User repository — Supabase Auth session + profiles + user_progress.
 * Maps generated DB rows to domain User / UserTerritoryProgress types.
 */

import { supabase } from "@/lib/supabase";
import type { Region, User, UserTerritoryProgress } from "@/types";
import type { Database } from "@/types/supabase.generated";
import { z } from "zod";
import { inferRegionFromDistrict } from "@/domain/territorial";

type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];
type DbUserProgress = Database["public"]["Tables"]["user_progress"]["Row"];

const USER_ID_SCHEMA = z.string().uuid();

const DB_PROFILE_SCHEMA = z.object({
  id: z.string().uuid(),
  username: z.string().min(1),
  email: z.string().email(),
  district: z.string().nullable().optional(),
  experience_points: z.number().nullable().optional(),
  level: z.number().nullable().optional(),
  badges: z.array(z.string()).nullable().optional(),
});

const DB_USER_PROGRESS_SCHEMA = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  community_points: z.number(),
  total_missions_completed: z.number(),
  last_activity_at: z.string(),
});

function parseProfileRow(row: DbProfile): DbProfile {
  const result = DB_PROFILE_SCHEMA.safeParse(row);
  if (!result.success) {
    throw new Error(`Invalid profile row: ${result.error.message}`);
  }
  return row;
}

function parseUserProgressRow(row: DbUserProgress): DbUserProgress {
  const result = DB_USER_PROGRESS_SCHEMA.safeParse(row);
  if (!result.success) {
    throw new Error(`Invalid user_progress row: ${result.error.message}`);
  }
  return row;
}

// P0 FIX: inferRegionFromDistrict consolidado en src/domain/territorial.ts (fuente de verdad única)

function mapProfileToUser(profile: DbProfile, progress: DbUserProgress | null): User {
  const handle = profile.username.startsWith("@") ? profile.username : `@${profile.username}`;

  return {
    name: profile.username,
    handle,
    district: profile.district ?? "Perú",
    region: inferRegionFromDistrict(profile.district),
    avatar: "🦙",
    xp: profile.experience_points ?? 0,
    level: profile.level ?? 1,
    rank: progress?.community_points ?? 0,
    streak: 0,
    missionsDone: progress?.total_missions_completed ?? 0,
    peopleImpacted: progress?.community_points ?? undefined,
  };
}

function mapProgressRow(row: DbUserProgress): UserTerritoryProgress {
  return {
    userId: row.user_id,
    communityPoints: row.community_points,
    totalMissionsCompleted: row.total_missions_completed,
    lastActivityAt: row.last_activity_at,
  };
}

export const userRepository = {
  async getAuthenticatedUserId(): Promise<string | null> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw new Error(`Failed to resolve auth session: ${error.message}`);
    }

    return user?.id ?? null;
  },

  async findProfileByUserId(userId: string): Promise<User> {
    const idResult = USER_ID_SCHEMA.safeParse(userId);
    if (!idResult.success) {
      throw new Error(`Invalid user ID: ${userId}`);
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error(`Profile not found: ${userId}`);
      }
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Profile not found: ${userId}`);
    }

    const progress = await this.findProgressByUserId(userId).catch(() => null);
    return mapProfileToUser(parseProfileRow(data), progress);
  },

  async findProgressByUserId(userId: string): Promise<UserTerritoryProgress> {
    const idResult = USER_ID_SCHEMA.safeParse(userId);
    if (!idResult.success) {
      throw new Error(`Invalid user ID: ${userId}`);
    }

    // Try to fetch from user_progress table
    // Use maybeSingle to avoid 406/PGRST116 when no row exists
    const { data, error } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      // If table doesn't exist or other error, return default
      if (import.meta.env.DEV) {
        console.warn("[KUSQA] user_progress table unavailable, returning default progress");
      }
      return this.getDefaultProgress(userId);
    }

    if (!data) {
      return this.getDefaultProgress(userId);
    }

    return mapProgressRow(data);
  },

  getDefaultProgress(userId: string): UserTerritoryProgress {
    return {
      userId,
      communityPoints: 0,
      totalMissionsCompleted: 0,
      lastActivityAt: new Date().toISOString(),
    };
  },

  async getCurrentUser(): Promise<User> {
    const userId = await this.getAuthenticatedUserId();
    if (!userId) {
      throw new Error("No authenticated user");
    }

    try {
      return await this.findProfileByUserId(userId);
    } catch (error) {
      // Si profile no existe, crearlo automáticamente desde auth.user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error("No auth user found");
      }

      // Crear profile básico
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: authUser.id,
          username: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
          email: authUser.email || '',
          district: null,
          experience_points: 0,
          level: 1,
          badges: [],
        })
        .select()
        .single();

      if (createError) {
        if (import.meta.env.DEV) {
          console.error("[KUSQA POST AUTH TRACE] Failed to create profile:", createError);
        }
        throw new Error(`Failed to create profile: ${createError.message}`);
      }

      // user_progress table may not exist — skip creation entirely
      const progress = this.getDefaultProgress(userId);
      return mapProfileToUser(parseProfileRow(newProfile), progress);
    }
  },

  async updateProfileDistrict(userId: string, district: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ district })
      .eq("id", userId);

    if (error) {
      console.error("[KUSQA LOCATION TRACE] Error updating district:", error);
      throw new Error(`Failed to update district: ${error.message}`);
    }
  },
};
