/**
 * Initiative Domain — canonical aggregate root.
 *
 * After Phase 6, this is the ONE type for all civic activity.
 * Lifecycle: forming → gathering → active → completed → dormant
 * Roles:     steward (owner), co_steward, ally, supporter, participant
 */

import type { Region } from "@/domain/regions";
import type { MissionCategory } from "@/domain/categories";

// ─── Canonical lifecycle ──────────────────────────────────────────────────

export type InitiativeLifecycle =
  | "forming"    // idea phase — gathering support, shaping the initiative
  | "gathering"  // recruiting — threshold met, building coalition
  | "active"     // execution — mission in progress
  | "completed"  // done — finished successfully
  | "dormant";   // archived / rejected / inactive

// ─── Temporal anchor ──────────────────────────────────────────────────────

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

function dayName(iso: string): string {
  const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return days[new Date(iso).getDay()];
}

export function computeTemporalAnchor(
  lifecycle: InitiativeLifecycle,
  dateAnchor: string | null,
  supportCount?: number,
  threshold?: number,
): TemporalAnchor {
  switch (lifecycle) {
    case "forming": {
      if (supportCount !== undefined && threshold !== undefined && supportCount >= threshold) {
        return { label: "Lista para movilizar", kind: "active", referenceDate: null };
      }
      if (dateAnchor) {
        const days = daysUntil(dateAnchor);
        if (days !== null && days <= 30)
          return {
            label: days <= 1 ? "Mañana" : days <= 7 ? `Este ${dayName(dateAnchor)}` : `Comienza en ${days} días`,
            kind: days <= 1 ? "countdown" : "scheduled",
            referenceDate: dateAnchor,
          };
      }
      if (dateAnchor) {
        const days = daysSince(dateAnchor);
        if (days !== null) {
          if (days <= 1) return { label: "Recién propuesta", kind: "recent", referenceDate: dateAnchor };
          if (days <= 7) return { label: "Propuesta esta semana", kind: "recent", referenceDate: dateAnchor };
        }
      }
      return { label: "Buscando personas para empezar", kind: "indefinite", referenceDate: dateAnchor };
    }
    case "gathering":
      return { label: "Reuniendo equipo", kind: "active", referenceDate: null };
    case "active": {
      if (dateAnchor) {
        const remaining = daysUntil(dateAnchor);
        if (remaining !== null) {
          if (remaining <= 0) return { label: "Hoy", kind: "active", referenceDate: dateAnchor };
          if (remaining === 1) return { label: "Termina mañana", kind: "ending", referenceDate: dateAnchor };
          if (remaining <= 7) return { label: "Termina pronto", kind: "active", referenceDate: dateAnchor };
          return { label: `Termina en ${remaining} días`, kind: "ending", referenceDate: dateAnchor };
        }
      }
      return { label: "En curso", kind: "active", referenceDate: null };
    }
    case "completed": {
      if (dateAnchor) {
        const days = daysSince(dateAnchor);
        if (days !== null) {
          if (days <= 1) return { label: "Finalizó ayer", kind: "recent", referenceDate: dateAnchor };
          if (days <= 7) return { label: "Finalizó esta semana", kind: "recent", referenceDate: dateAnchor };
          if (days <= 14) return { label: "Finalizó hace 2 semanas", kind: "recent", referenceDate: dateAnchor };
        }
      }
      return { label: "Completada", kind: "completed", referenceDate: dateAnchor };
    }
    case "dormant":
      return { label: "Archivada", kind: "completed", referenceDate: null };
  }
}

// ─── Location ─────────────────────────────────────────────────────────────

export type InitiativeLocation = {
  district: string;
  districtId: string | null;
  region: Region;
  coords: { lat: number; lng: number } | null;
  locationLabel: string | null;
};

// ─── Endorsement — institution link (Phase 3) ─────────────────────────────

export type InitiativeEndorsement = {
  id: string;
  initiativeId: string;
  institutionId: string;
  relation: "supporter" | "collaborator" | "origin";
  createdAt: string;
};

// ─── Initiative — the ONE type ────────────────────────────────────────────

export type Initiative = {
  id: string;
  sourceType: "proposal" | "mission";
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

  endorsements?: InitiativeEndorsement[];
};

// ─── Dormancy detection ───────────────────────────────────────────────────

export function isDormant(input: {
  lifecycle: InitiativeLifecycle;
  temporalAnchor?: TemporalAnchor;
}): boolean {
  const { lifecycle, temporalAnchor } = input;
  if (lifecycle === "completed" || lifecycle === "dormant") return false;
  const ref = temporalAnchor?.referenceDate;
  if (!ref) return false;
  const days = daysSince(ref);
  if (days === null) return false;
  return days > 60;
}
