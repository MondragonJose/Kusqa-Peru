import type { CivicJourney, JourneyPhase } from "./civicJourney";

export type CivicBiography = {
  headline: string;
  territorialIdentity: string;
  participationIdentity: string;
  biography: string;
};

const PHASE_ROLE: Record<JourneyPhase, string> = {
  primer_paso: "recién llegada al territorio",
  explorando: "exploradora territorial",
  organizando: "organizadora comunitaria",
  construyendo: "constructora de comunidad",
  tejiendo_territorio: "tejedora de territorio",
  en_pausa: "ciudadana en pausa",
};

const REGION_ADJ: Record<string, string> = {
  costa: "costera",
  sierra: "andina",
  selva: "amazónica",
};

function regionList(regions: string[]): string {
  const labels: string[] = [];
  for (const r of regions) {
    if (r === "costa") labels.push("la costa");
    else if (r === "sierra") labels.push("la sierra");
    else if (r === "selva") labels.push("la selva");
    else labels.push(r);
  }
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  const last = labels.pop()!;
  return `${labels.join(", ")} y ${last}`;
}

function buildHeadline(phase: JourneyPhase, regions: string[]): string {
  const role = PHASE_ROLE[phase];
  if (regions.length === 0) return `Eres una ${role}.`;
  const place = regionList(regions);
  return `Eres una ${role} de ${place}.`;
}

function buildTerritorialIdentity(footprint: CivicJourney["footprint"]): string {
  const parts: string[] = [];
  const { districtCount, regions, categories } = footprint;

  if (districtCount === 0) {
    return "Aún no has definido tu presencia en el territorio.";
  }

  const where = regionList(regions);
  if (districtCount === 1) {
    parts.push(`Has puesto un pie en ${footprint.districts[0]}, ${where}.`);
  } else {
    parts.push(`Has recorrido ${districtCount} distritos en ${where}.`);
  }

  if (categories.length > 0) {
    const active = categories.slice(0, 3);
    parts.push(`Tus causas: ${active.join(", ")}.`);
  }

  return parts.join(" ");
}

function buildParticipationIdentity(params: {
  completedMissionCount: number;
  supportedCount: number;
  proposalCount: number;
}): string {
  const { completedMissionCount, supportedCount, proposalCount } = params;
  const parts: string[] = [];

  if (completedMissionCount > 0) {
    const word = completedMissionCount === 1 ? "misión" : "misiones";
    parts.push(`Completaste ${completedMissionCount} ${word}.`);
  }
  if (proposalCount > 0) {
    parts.push(`Creaste ${proposalCount} propuesta${proposalCount !== 1 ? "s" : ""}.`);
  }
  if (supportedCount > 0) {
    parts.push(`Apoyaste ${supportedCount} iniciativa${supportedCount !== 1 ? "s" : ""}.`);
  }

  if (parts.length === 0) {
    return "Aún no has participado en misiones o propuestas.";
  }

  return parts.join(" ");
}

function buildBiography(params: {
  phase: JourneyPhase;
  regions: string[];
  districtCount: number;
  categories: string[];
  completedMissionCount: number;
  supportedCount: number;
  proposalCount: number;
}): string {
  const { phase, regions, districtCount, categories, completedMissionCount, supportedCount, proposalCount } = params;
  const sentences: string[] = [];

  const role = PHASE_ROLE[phase];
  const where = regionList(regions);
  if (where) {
    sentences.push(`Eres una ${role} de ${where}.`);
  } else {
    sentences.push(`Eres una ${role}.`);
  }

  if (districtCount > 0) {
    sentences.push(`Has recorrido ${districtCount} distrito${districtCount !== 1 ? "s" : ""}.`);
  }

  if (categories.length > 0) {
    sentences.push(`Te mueven causas como ${categories.slice(0, 3).join(", ")}.`);
  }

  const participations: string[] = [];
  if (completedMissionCount > 0) participations.push(`${completedMissionCount} misión${completedMissionCount !== 1 ? "es" : ""}`);
  if (proposalCount > 0) participations.push(`${proposalCount} propuesta${proposalCount !== 1 ? "s" : ""}`);
  if (supportedCount > 0) participations.push(`${supportedCount} iniciativa${supportedCount !== 1 ? "s" : ""} apoyadas`);

  if (participations.length > 0) {
    const joined = participations.join(", ");
    sentences.push(`Tu huella: ${joined}.`);
  }

  return sentences.join(" ");
}

export function deriveCivicBiography(params: {
  journey: CivicJourney;
  completedMissionCount: number;
  supportedCount: number;
  proposalCount: number;
}): CivicBiography {
  const { journey, completedMissionCount, supportedCount, proposalCount } = params;
  const { footprint, arc } = journey;

  const headline = buildHeadline(arc.phase, footprint.regions);
  const territorialIdentity = buildTerritorialIdentity(footprint);
  const participationIdentity = buildParticipationIdentity({
    completedMissionCount,
    supportedCount,
    proposalCount,
  });

  // Build the role-like adjectives (e.g., "costero-andina")
  const roleAdjectives = footprint.regions
    .map((r) => REGION_ADJ[r])
    .filter(Boolean);

  const biography = buildBiography({
    phase: arc.phase,
    regions: footprint.regions,
    districtCount: footprint.districtCount,
    categories: footprint.categories,
    completedMissionCount,
    supportedCount,
    proposalCount,
  });

  return {
    headline,
    territorialIdentity,
    participationIdentity,
    biography,
  };
}
