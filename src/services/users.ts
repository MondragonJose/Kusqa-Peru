/**
 * Service para usuarios
 * Gestiona operaciones de perfil y autenticación
 * 
 * NOTA: Actualmente usa mock data. Al integrar Supabase Auth:
 * - getCurrentUser(): llamará a supabase.auth.getSession()
 * - getUserProfile(): consultará tabla 'profiles' en Supabase
 */

import type { User, UserProfile, Badge } from "@/types";
import { CURRENT_USER } from "@/data/mockData";
import { CIVIC_BADGES } from "@/features/badges";

/**
 * Obtiene el usuario actual (sessión activa)
 * @future Será: `const { data } = await supabase.auth.getSession()`
 */
export async function getCurrentUser(): Promise<User | null> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  
  // En producción: obtener de Supabase Auth
  return CURRENT_USER;
}

/**
 * Obtiene el perfil completo de un usuario
 * @future Será: `await client.from('profiles').select('*, badges(...)')...`
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  // En producción: buscar en tabla 'profiles'
  const user = CURRENT_USER; // Por ahora solo el usuario actual
  
  if (!user) return null;
  
  return {
    user,
    badges: CIVIC_BADGES
      .filter((b) => b.earned)
      .map((b) => ({
        id: b.id,
        name: b.name,
        emoji: b.emoji,
        region: b.region === "nacional" ? "todas" : b.region,
        earned: b.earned,
        description: b.narrative,
      })),
    totalMissionsCompleted: 12,
    totalImpact: "2.5 hectáreas restauradas",
  };
}

/**
 * Actualiza el perfil del usuario
 * @future Será: `await client.from('profiles').update(...).eq('id', userId)`
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<User> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  
  // En producción: actualizar en Supabase
  return { ...CURRENT_USER, ...updates };
}

/**
 * Obtiene los badges del usuario
 * @future Será: `await client.from('user_badges').select('badge_id')...`
 */
export async function getUserBadges(userId: string): Promise<Badge[]> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  
  // En producción: buscar badges ganados del usuario
  return CIVIC_BADGES
    .filter((b) => b.earned)
    .map((b) => ({
      id: b.id,
      name: b.name,
      emoji: b.emoji,
      region: b.region === "nacional" ? "todas" : b.region,
      earned: b.earned,
      description: b.narrative,
    }));
}

/**
 * Verifica si el usuario es autenticado
 * @future Será: `const session = await supabase.auth.getSession()`
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}
