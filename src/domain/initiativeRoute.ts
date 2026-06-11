export type InitiativeRouteEntity = {
  sourceType: "mission" | "proposal";
  sourceId: string;
};

export function getInitiativeDetailRoute(entity: InitiativeRouteEntity) {
  if (entity.sourceType === "mission") {
    return { to: "/app/mision/$missionId" as const, params: { missionId: entity.sourceId } };
  }
  return { to: "/app/propuesta/$proposalId" as const, params: { proposalId: entity.sourceId } };
}
