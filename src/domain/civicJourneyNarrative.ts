/**
 * Civic Journey Narrative — pure parameterized narrative generation.
 *
 * NO score language (XP, nivel, ranking). NO hardcoded per-user text.
 * All strings centralized in TEMPLATES and HEADLINES for i18n.
 * Spanish, 2nd person ("te", "tu").
 */

import type { NarrativeBeat, NarrativeBeatKind } from "./civicJourney";
import type { JourneyArc, TerritorialFootprint, JourneyPhase } from "./civicJourney";

// ─── Beat templates ──────────────────────────────────────────────────────────

type BeatTemplate = string;

const BEAT_TEMPLATES: Record<NarrativeBeatKind, BeatTemplate> = {
  first_mission: "Te uniste a tu primera misión: {title}.",
  completed_mission: "Completaste la misión {title}.",
  supported_proposal: "Apoyaste la propuesta {title}.",
  created_proposal: "Creaste la propuesta {title}.",
  proposal_converted: "Tu propuesta {title} se convirtió en misión.",
  joined_mission: "Te sumaste a la misión {title}.",
  district_activated: "Llegaste al distrito de {title}.",
  region_unlocked: "Descubriste una nueva región: {title}.",
};

// ─── Phase headlines ─────────────────────────────────────────────────────────

type PhaseHeadlineTemplate = (f: TerritorialFootprint) => string;

const PHASE_HEADLINES: Record<JourneyPhase, PhaseHeadlineTemplate> = {
  primer_paso: () => "Tus primeros pasos en el territorio",
  explorando: (f) =>
    f.districtCount === 1
      ? `Explorando ${f.districts[0]} y sus posibilidades`
      : `Explorando ${f.districtCount} distritos de tu territorio`,
  organizando: (f) =>
    `Organizando iniciativas en ${f.districts.length > 1 ? "tu territorio" : f.districts[0]}`,
  construyendo: (f) =>
    f.missionCount === 1
      ? "Construyendo tu primera misión completada"
      : `Construyendo con ${f.missionCount} misiones completadas`,
  tejiendo_territorio: (f) => {
    const regionNames: Record<string, string> = {
      costa: "la costa",
      sierra: "la sierra",
      selva: "la selva",
    };
    const labels = f.regions.map((r) => regionNames[r] ?? r);
    if (labels.length === 1) return `Tejiendo territorio en ${labels[0]}`;
    const last = labels.pop();
    return `Tejiendo territorio entre ${labels.join(", ")} y ${last}`;
  },
  en_pausa: () => "Tu territorio espera tu regreso",
};

// ─── beatToNarrative ─────────────────────────────────────────────────────────

export function beatToNarrative(beat: NarrativeBeat): string {
  const template = BEAT_TEMPLATES[beat.kind];
  return template.replace("{title}", beat.title);
}

// ─── phaseToHeadline ─────────────────────────────────────────────────────────

export function phaseToHeadline(arc: JourneyArc, footprint: TerritorialFootprint): string {
  const template = PHASE_HEADLINES[arc.phase];
  return template(footprint);
}
