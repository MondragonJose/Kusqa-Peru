import { supabase } from "@/lib/supabase";
import { deriveAuthState, type AuthState } from "./authStateMachine";
import type { AuthUser } from "@supabase/supabase-js";

export async function getAuthSnapshot(): Promise<{ state: AuthState; user: AuthUser | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const authUser = session?.user ?? null;
  const snapshot = deriveAuthState(session, false, authUser);
  return { state: snapshot.state, user: snapshot.user };
}
