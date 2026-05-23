import { useQuery } from "@tanstack/react-query";
import { missionRepository } from "@/services/missionRepository";

export const missionKeys = {
  all: ["missions"] as const,
};

export function useMissions() {
  return useQuery({
    queryKey: missionKeys.all,
    queryFn: () => missionRepository.findAll(),
  });
}
