import type { Initiative, InitiativeLifecycle } from "./initiative";

export type InitiativeAction = "support" | "join" | "comment" | "share" | "edit" | "report";

export type UserRelationship =
  | "visitor"
  | "supporter"
  | "participant"
  | "collaborator"
  | "organizer";

export type ActionContext = {
  lifecycle: InitiativeLifecycle;
  sourceType: "proposal" | "mission";
  relationship: UserRelationship;
};

export function deriveRelationship(userId: string | null, initiative: Initiative): UserRelationship;
export function deriveRelationship(
  initiative: Pick<Initiative, "sourceType" | "sourceId">,
  context?: {
    currentUserId?: string;
    isSupported?: boolean;
    isParticipant?: boolean;
    isOwner?: boolean;
  },
): UserRelationship;
export function deriveRelationship(
  first: string | null | Pick<Initiative, "sourceType" | "sourceId">,
  second?:
    | Initiative
    | {
        currentUserId?: string;
        isSupported?: boolean;
        isParticipant?: boolean;
        isOwner?: boolean;
      },
): UserRelationship {
  if (first === null) return "visitor";
  if (typeof first === "string") {
    const initiative = second as Initiative;
    if (initiative.ownerId === first) return "organizer";
    return "visitor";
  }
  const context = second as
    | {
        currentUserId?: string;
        isSupported?: boolean;
        isParticipant?: boolean;
        isOwner?: boolean;
      }
    | undefined;
  if (context?.isOwner) return "organizer";
  if (context?.isParticipant) return "participant";
  if (context?.isSupported) return "supporter";
  return "visitor";
}

export const ACTION_PRIORITY: Record<InitiativeAction, number> = {
  support: 1,
  join: 2,
  comment: 3,
  share: 4,
  edit: 5,
  report: 6,
};

export function actionToLabel(
  action: InitiativeAction,
  lifecycle?: InitiativeLifecycle,
  sourceType?: "mission" | "proposal",
  dormant?: boolean,
): string {
  switch (action) {
    case "support":
      return "Apoyar";
    case "join":
      if (lifecycle === "completed") return "Ver resultados";
      if (sourceType === "proposal") return "Ver misión";
      if (lifecycle === "forming") return "Unirme";
      if (dormant) return "Reactivar";
      return "Participar";
    case "comment":
      return "Comentar";
    case "share":
      return "Compartir";
    case "edit":
      return "Editar";
    case "report":
      return "Reportar";
  }
}

export function actionToIcon(action: InitiativeAction): string {
  switch (action) {
    case "support":
      return "Sparkles";
    case "join":
      return "ArrowRight";
    case "comment":
      return "MessageCircle";
    case "share":
      return "Share2";
    case "edit":
      return "Pencil";
    case "report":
      return "Flag";
  }
}

export function getAvailableInitiativeActions(context: ActionContext): InitiativeAction[] {
  const { lifecycle, relationship } = context;

  if (lifecycle === "archived") return [];

  const actions: InitiativeAction[] = ["share"];

  switch (lifecycle) {
    case "forming":
      switch (relationship) {
        case "visitor":
          actions.push("support", "report");
          break;
        case "supporter":
          actions.push("support", "comment");
          break;
        case "collaborator":
          actions.push("comment");
          break;
        case "organizer":
          actions.push("edit", "comment");
          break;
        case "participant":
          actions.push("comment");
          break;
      }
      break;

    case "active":
    case "ending":
      switch (relationship) {
        case "visitor":
          actions.push("join", "report");
          break;
        case "participant":
          actions.push("comment");
          break;
        case "supporter":
          actions.push("comment");
          break;
        case "collaborator":
          actions.push("comment");
          break;
        case "organizer":
          actions.push("edit", "comment");
          break;
      }
      break;

    case "completed":
      switch (relationship) {
        case "visitor":
          actions.push("join", "report");
          break;
        case "participant":
          actions.push("join", "comment");
          break;
        case "supporter":
          actions.push("join", "comment");
          break;
        case "collaborator":
          actions.push("join", "comment");
          break;
        case "organizer":
          actions.push("join", "edit");
          break;
      }
      break;
  }

  return actions;
}
