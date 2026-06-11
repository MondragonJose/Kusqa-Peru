import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCurrentUser, useJoinUserMission } from "@/features/auth";
import type { InitiativeLifecycle } from "@/domain/initiative";

export function useJoinInitiativeAction() {
  const currentUser = useCurrentUser();
  const joinMutation = useJoinUserMission();
  const navigate = useNavigate();
  const joiningRef = useRef(false);
  const didFireError = useRef(false);
  const joinSuccessLogged = useRef(false);

  useEffect(() => {
    if (joinMutation.isError && !didFireError.current) {
      didFireError.current = true;
      const msg =
        joinMutation.error instanceof Error ? joinMutation.error.message : "";
      const isDuplicate =
        msg.includes("duplicate") ||
        msg.includes("already") ||
        msg.includes("Ya estás");
      if (isDuplicate) {
        toast.info("Ya estás en esta ruta.");
      } else {
        toast.error("No se pudo abrir la ruta. Intenta de nuevo.");
      }
    }
    if (!joinMutation.isError) didFireError.current = false;
  }, [joinMutation.isError, joinMutation.error]);

  useEffect(() => {
    if (joinMutation.isSuccess && !joinSuccessLogged.current) {
      joinSuccessLogged.current = true;
      toast.success("¡Te has unido a la ruta!");
    }
    if (!joinMutation.isSuccess) joinSuccessLogged.current = false;
  }, [joinMutation.isSuccess]);

  const handleJoin = useCallback(
    (
      missionId: string,
      options?: {
        alreadyJoined?: boolean;
        lifecycle?: InitiativeLifecycle;
      },
    ): boolean => {
      if (joiningRef.current) return false;
      if (!currentUser) {
        toast.error("Debes iniciar sesión para iniciar una ruta.");
        return false;
      }
      if (options?.lifecycle === "completed") {
        navigate({
          to: "/app/mision/$missionId",
          params: { missionId },
        });
        return false;
      }
      if (options?.alreadyJoined || joinMutation.isSuccess) {
        toast.info("Ya estás en esta ruta.");
        return false;
      }
      joiningRef.current = true;
      joinMutation.mutate({ missionId });
      return true;
    },
    [currentUser, joinMutation, navigate],
  );

  const resetJoining = useCallback(() => {
    joiningRef.current = false;
  }, []);

  return {
    handleJoin,
    joinMutation,
    resetJoining,
  };
}
