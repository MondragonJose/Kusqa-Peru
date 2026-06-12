import { supabase } from "@/lib/supabase";

export type ContinueInitiativeResult =
  | { status: "success"; data: { initiativeId: string; stewardId: string; eventId: string; ownerId: string } }
  | { status: "error"; error: string };

const RPC_ERROR_COPY: Record<string, string> = {
  UNAUTHENTICATED: "Necesitas iniciar sesión para continuar esta iniciativa.",
  INITIATIVE_NOT_FOUND: "No encontramos esta iniciativa.",
  INVALID_STATE: "Solo las iniciativas inactivas pueden ser continuadas.",
  INVALID_INPUT: "Faltan datos necesarios para continuar la iniciativa.",
};

function translateRpcError(code: string | null, fallback: string): string {
  if (!code) return fallback;
  return RPC_ERROR_COPY[code] ?? fallback;
}

function extractRpcErrorCode(message: string): string | null {
  const match = message.match(/ERRCODE:\s*(\w+)/i);
  if (match) return match[1];
  if (message.includes("UNAUTHENTICATED")) return "UNAUTHENTICATED";
  if (message.includes("INITIATIVE_NOT_FOUND")) return "INITIATIVE_NOT_FOUND";
  if (message.includes("INVALID_STATE")) return "INVALID_STATE";
  if (message.includes("INVALID_INPUT")) return "INVALID_INPUT";
  return null;
}

export const initiativeContinuationRepository = {
  async continue(
    initiativeId: string,
    actorId: string,
  ): Promise<ContinueInitiativeResult> {
    try {
      const { data, error } = await supabase.rpc("continue_initiative", {
        p_initiative_id: initiativeId,
        p_actor_id: actorId,
      });

      if (error) {
        const code = extractRpcErrorCode(error.message);
        return {
          status: "error",
          error: translateRpcError(code, error.message),
        };
      }

      const result = data as {
        initiative_id: string;
        steward_id: string;
        event_id: string;
        owner_id: string;
      };

      return {
        status: "success",
        data: {
          initiativeId: result.initiative_id,
          stewardId: result.steward_id,
          eventId: result.event_id,
          ownerId: result.owner_id,
        },
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error desconocido.";
      const code = extractRpcErrorCode(message);
      return {
        status: "error",
        error: translateRpcError(code, "No se pudo continuar la iniciativa."),
      };
    }
  },
};
