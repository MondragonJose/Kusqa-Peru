import { supabase } from "@/lib/supabase";

export async function resolveAuthenticatedUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error(`Not authenticated: ${error?.message ?? "no session"}`);
  }
  return user.id;
}
