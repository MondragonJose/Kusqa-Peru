/**
 * Initiative Domain — unified read model for missions and proposals.
 *
 * This is the single source of truth for the Initiative contract.
 * NEVER duplicate these types elsewhere.
 *
 * Backward compat: existing Mission and Proposal types are unchanged.
 * This layer maps them into a unified shape for consumers that want
 * to treat all civic activity as a single stream.
 */

import type { Region } from "@/domain/regions";
import type { MissionCategory } from "@/domain/categories";
import type { MissionLifecycle, MissionLifecycleInfo } from "@/types/lifecycle";
import type { ProposalStatus } from "@/services/proposalContract";

// ─── Unified lifecycle ──────────────────────────────────────────────────────

export type InitiativeLifecycle = "forming" | "active" | "ending" | "completed" | "archived";

/**
 * Derive InitiativeLifecycle from a mission's lifecycle.
 */
export function deriveLifecycleFromMission(ml: MissionLifecycle): InitiativeLifecycle {
  switch (ml) {
    case "upcoming":
      return "forming";
    case "active":
      return "active";
    case "ending_soon":
      return "ending";
    case "completed":
      return "completed";
    case "archived":
      return "archived";
  }
}

/**
 * Derive InitiativeLifecycle from a proposal's status + optional timestamps.
 */
export function deriveLifecycleFromProposal(
  status: ProposalStatus,
  convertedAt: string | null,
  completedAt: string | null,
): InitiativeLifecycle {
  switch (status) {
    case "pending":
      return "forming";
    case "active":
      if (completedAt) return "completed";
      if (convertedAt) return "active";
      return "active";
    case "resolved":
      if (completedAt) return "completed";
      return "active";
    case "rejected":
      return "archived";
  }
}

// ─── Temporal anchor ────────────────────────────────────────────────────────

export type TemporalKind =
  | "scheduled"
  | "countdown"
  | "active"
  | "ending"
  | "recent"
  | "completed"
  | "indefinite";

export type TemporalAnchor = {
  label: string;
  kind: TemporalKind;
  referenceDate: string | null;
};

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) return null;
  return Math.ceil((ms - Date.now()) / 86_400_000);
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) return null;
  return Math.floor((Date.now() - ms) / 86_400_000);
}

function sameWeek(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return d >= startOfWeek && d < endOfWeek;
}

function dayName(iso: string): string {
  const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return days[new Date(iso).getDay()];
}

/**
 * Compute TemporalAnchor for a mission.
 */
export function computeMissionAnchor(
  lifecycle: MissionLifecycleInfo,
  startDate: string | null,
  endDate: string | null,
): TemporalAnchor {
  switch (lifecycle.lifecycle) {
    case "upcoming": {
      const days = daysUntil(startDate);
      if (startDate && days !== null) {
        if (days <= 1) return { label: "Mañana", kind: "countdown", referenceDate: startDate };
        if (days <= 7)
          return {
            label: `Este ${dayName(startDate)}`,
            kind: "scheduled",
            referenceDate: startDate,
          };
        if (days <= 14)
          return { label: "Esta semana", kind: "scheduled", referenceDate: startDate };
        if (days <= 30)
          return { label: `Comienza en ${days} días`, kind: "countdown", referenceDate: startDate };
        return { label: "Próximamente", kind: "scheduled", referenceDate: startDate };
      }
      return { label: "Próximamente", kind: "indefinite", referenceDate: null };
    }
    case "active": {
      if (endDate) {
        const remaining = daysUntil(endDate);
        if (remaining !== null && remaining <= 7) {
          return { label: "Termina pronto", kind: "active", referenceDate: endDate };
        }
      }
      return { label: "En curso", kind: "active", referenceDate: null };
    }
    case "ending_soon": {
      const remaining = daysUntil(endDate);
      if (endDate && remaining !== null) {
        if (remaining <= 0) return { label: "Hoy", kind: "active", referenceDate: endDate };
        if (remaining === 1)
          return { label: "Termina mañana", kind: "ending", referenceDate: endDate };
        return { label: `Termina en ${remaining} días`, kind: "ending", referenceDate: endDate };
      }
      return { label: "Finalizando", kind: "ending", referenceDate: null };
    }
    case "completed": {
      const days = daysSince(endDate);
      if (endDate && days !== null) {
        if (days <= 1) return { label: "Finalizó ayer", kind: "recent", referenceDate: endDate };
        if (days <= 7)
          return { label: "Finalizó esta semana", kind: "recent", referenceDate: endDate };
        if (days <= 14)
          return { label: "Finalizó hace 2 semanas", kind: "recent", referenceDate: endDate };
        return { label: "Completada", kind: "completed", referenceDate: endDate };
      }
      return { label: "Completada", kind: "completed", referenceDate: null };
    }
    case "archived":
      return { label: "Archivada", kind: "completed", referenceDate: null };
  }
}

/**
 * Compute TemporalAnchor for a proposal.
 */
export function computeProposalAnchor(
  status: ProposalStatus,
  proposedDate: string | null,
  createdAt: string,
  convertedAt: string | null,
  completedAt: string | null,
  supportCount: number,
  threshold: number,
): TemporalAnchor {
  if (status === "rejected") {
    return { label: "No procede", kind: "completed", referenceDate: null };
  }

  if (completedAt) {
    const days = daysSince(completedAt);
    if (completedAt && days !== null) {
      if (days <= 1)
        return { label: "Se completó ayer", kind: "recent", referenceDate: completedAt };
      if (days <= 7)
        return { label: "Completada esta semana", kind: "recent", referenceDate: completedAt };
      return { label: "Completada", kind: "completed", referenceDate: completedAt };
    }
    return { label: "Completada", kind: "completed", referenceDate: completedAt };
  }

  if (convertedAt) {
    const days = daysSince(convertedAt);
    if (convertedAt && days !== null && days <= 7) {
      return { label: "Recién convertida en misión", kind: "recent", referenceDate: convertedAt };
    }
    return { label: "Convertida en misión", kind: "completed", referenceDate: convertedAt };
  }

  if (status === "pending") {
    if (supportCount >= threshold) {
      return { label: "Lista para movilizar", kind: "active", referenceDate: null };
    }
    if (proposedDate) {
      const days = daysSince(proposedDate);
      if (proposedDate && days !== null) {
        if (days <= 1)
          return { label: "Recién propuesta", kind: "recent", referenceDate: proposedDate };
        if (days <= 7)
          return { label: "Propuesta esta semana", kind: "recent", referenceDate: proposedDate };
      }
      return {
        label: "Buscando personas para empezar",
        kind: "indefinite",
        referenceDate: proposedDate,
      };
    }
    const days = daysSince(createdAt);
    if (createdAt && days !== null) {
      if (days <= 1) return { label: "Recién propuesta", kind: "recent", referenceDate: createdAt };
      if (days <= 7) return { label: "Nueva propuesta", kind: "recent", referenceDate: createdAt };
    }
    return {
      label: "Buscando personas para empezar",
      kind: "indefinite",
      referenceDate: createdAt,
    };
  }

  if (status === "active") {
    return { label: "En marcha", kind: "active", referenceDate: null };
  }

  return { label: "Completada", kind: "completed", referenceDate: null };
}

// ─── Location ───────────────────────────────────────────────────────────────

export type InitiativeLocation = {
  district: string;
  districtId: string | null;
  region: Region;
  coords: { lat: number; lng: number } | null;
  locationLabel: string | null;
};

// ─── Initiative — the unified read model ────────────────────────────────────

export type InitiativeSourceType = "mission" | "proposal";

/**
 * Returns true when the initiative is in a non-terminal lifecycle
 * (forming/active/ending) but has had no activity for >60 days.
 * Reuses the 60-day threshold from detectDormancy in territorialIntelligence.
 */
export function isDormant(
  initiative: Pick<Initiative, "lifecycle" | "temporalAnchor">,
): boolean {
  if (initiative.lifecycle === "archived" || initiative.lifecycle === "completed") return false;
  if (!initiative.temporalAnchor.referenceDate) return false;
  const days = daysSince(initiative.temporalAnchor.referenceDate);
  if (days === null) return false;
  return days > 60;
}

export type Initiative = {
  id: string;
  sourceType: InitiativeSourceType;
  sourceId: string;

  title: string;
  summary: string;

  category: MissionCategory;
  region: Region;

  lifecycle: InitiativeLifecycle;

  participantsCount?: number;
  supportersCount?: number;

  temporalAnchor: TemporalAnchor;

  emoji: string;

  location?: InitiativeLocation;

  vitalityScore?: number;

  ownerId?: string;
};
