import type { TerritorialEvent } from "./territorialEvent";
import type { Initiative, InitiativeLifecycle } from "./initiative";
import type { MissionCategory } from "./categories";

// ─── District memory types ──────────────────────────────────────────────

export type DistrictMemoryMilestone = {
  type: "first_initiative" | "first_completion" | "first_conversion" | "coalition_moment" | "revival";
  label: string;
  date: string;
};

export type DistrictTheme = {
  category: MissionCategory;
  initiativeCount: number;
};

export type DistrictRhythm =
  | "quiet"
  | "first_steps"
  | "steady"
  | "bursty"
  | "building";

export type DistrictMemory = {
  milestones: DistrictMemoryMilestone[];
  themes: DistrictTheme[];
  rhythm: DistrictRhythm;
  knownFor: string | null;
  narrative: string;
};

// ─── Main derivation ────────────────────────────────────────────────────

export function deriveDistrictMemory(
  events: TerritorialEvent[],
  initiatives: Initiative[],
): DistrictMemory {
  const milestones = deriveMilestones(events);
  const themes = deriveThemes(initiatives);
  const rhythm = deriveRhythm(events);
  const knownFor = deriveKnownFor(themes);
  const narrative = buildMemoryNarrative(milestones, themes, rhythm, knownFor);

  return { milestones, themes, rhythm, knownFor, narrative };
}

// ─── Milestone derivation ───────────────────────────────────────────────

function deriveMilestones(events: TerritorialEvent[]): DistrictMemoryMilestone[] {
  const ms: DistrictMemoryMilestone[] = [];
  const sorted = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const firstCreate = sorted.find((e) => e.type === "proposal.created");
  if (firstCreate) {
    ms.push({
      type: "first_initiative",
      label: "Primera iniciativa registrada en el distrito",
      date: firstCreate.createdAt,
    });
  }

  const firstConversion = sorted.find((e) => e.type === "proposal.converted_to_mission");
  if (firstConversion) {
    ms.push({
      type: "first_conversion",
      label: "Primera iniciativa que pasó de idea a acción",
      date: firstConversion.createdAt,
    });
  }

  const firstCompletion = sorted.find((e) => e.type === "mission.completed");
  if (firstCompletion) {
    ms.push({
      type: "first_completion",
      label: "Primera misión completada en el distrito",
      date: firstCompletion.createdAt,
    });
  }

  const firstCollab = sorted.find((e) => e.type === "proposal.collaborator_joined");
  if (firstCollab) {
    ms.push({
      type: "coalition_moment",
      label: "Primera persona en co-organizar una iniciativa",
      date: firstCollab.createdAt,
    });
  }

  const revivals = detectRevivals(events);
  ms.push(...revivals);

  return ms;
}

function detectRevivals(events: TerritorialEvent[]): DistrictMemoryMilestone[] {
  const completed = [...events]
    .filter((e) => e.type === "mission.completed")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (completed.length < 2) return [];

  const latest = completed[0];
  const secondLatest = completed[1];
  const gap =
    new Date(latest.createdAt).getTime() - new Date(secondLatest.createdAt).getTime();
  const gapDays = gap / (1000 * 60 * 60 * 24);

  if (gapDays > 60) {
    return [
      {
        type: "revival",
        label: "El distrito retomó actividad después de un período en calma",
        date: latest.createdAt,
      },
    ];
  }

  return [];
}

// ─── Theme derivation ───────────────────────────────────────────────────

function deriveThemes(initiatives: Initiative[]): DistrictTheme[] {
  const counts = new Map<MissionCategory, number>();
  for (const init of initiatives) {
    counts.set(init.category, (counts.get(init.category) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([category, initiativeCount]) => ({ category, initiativeCount }))
    .sort((a, b) => b.initiativeCount - a.initiativeCount);
}

// ─── Rhythm derivation ──────────────────────────────────────────────────

function deriveRhythm(events: TerritorialEvent[]): DistrictRhythm {
  if (events.length === 0) return "quiet";

  const sorted = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const firstDate = new Date(sorted[0].createdAt).getTime();
  const lastDate = new Date(sorted[sorted.length - 1].createdAt).getTime();
  const spanDays = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));

  if (spanDays <= 7 && events.length <= 3) return "first_steps";

  const eventsPerMonth = events.length / Math.max(1, spanDays / 30);

  let hasGap = false;
  for (let i = 1; i < sorted.length; i++) {
    const gap =
      new Date(sorted[i].createdAt).getTime() - new Date(sorted[i - 1].createdAt).getTime();
    if (gap > 60 * 24 * 60 * 60 * 1000) {
      hasGap = true;
      break;
    }
  }

  if (eventsPerMonth < 1 && hasGap) return "quiet";
  if (eventsPerMonth < 1) return "first_steps";
  if (eventsPerMonth >= 5) return "bursty";
  if (hasGap) return "bursty";

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentCount = sorted.filter((e) => new Date(e.createdAt).getTime() > thirtyDaysAgo).length;
  const priorCount = sorted.filter(
    (e) =>
      new Date(e.createdAt).getTime() <= thirtyDaysAgo &&
      new Date(e.createdAt).getTime() > thirtyDaysAgo - 60 * 24 * 60 * 60 * 1000,
  ).length;

  if (recentCount > priorCount && recentCount >= 2) return "building";
  if (eventsPerMonth >= 1 && eventsPerMonth < 5) return "steady";

  return "steady";
}

// ─── Known-for derivation ──────────────────────────────────────────────

function deriveKnownFor(themes: DistrictTheme[]): string | null {
  const top = themes[0];
  if (!top || top.initiativeCount === 0) return null;

  if (themes.length === 1) {
    return top.category;
  }

  const total = themes.reduce((sum, t) => sum + t.initiativeCount, 0);
  const dominance = top.initiativeCount / total;

  if (dominance >= 0.5) {
    return top.category;
  }

  if (themes.length === 2) {
    return `${top.category} y ${themes[1].category}`;
  }

  return `${top.category} y más`;
}

// ─── Narrative builder ──────────────────────────────────────────────────

function buildMemoryNarrative(
  milestones: DistrictMemoryMilestone[],
  themes: DistrictTheme[],
  rhythm: DistrictRhythm,
  knownFor: string | null,
): string {
  if (milestones.length === 0 && themes.length === 0) {
    return "Este distrito está en calma, esperando las primeras iniciativas que escriban su historia.";
  }

  const parts: string[] = [];

  if (knownFor) {
    parts.push(`Este distrito se distingue por su enfoque en ${knownFor}.`);
  }

  const hasCompletion = milestones.some((m) => m.type === "first_completion");
  const hasConversion = milestones.some((m) => m.type === "first_conversion");
  const hasRevival = milestones.some((m) => m.type === "revival");

  if (hasCompletion && hasConversion) {
    parts.push("Las ideas aquí se convierten en acción: iniciativas que han completado su ciclo completo.");
  } else if (hasCompletion) {
    parts.push("La comunidad ha demostrado que sabe completar ciclos.");
  } else if (hasConversion) {
    parts.push("Las primeras conversiones de idea a acción ya se han dado en el distrito.");
  }

  if (hasRevival) {
    parts.push("Después de pausas, el distrito ha retomado su actividad, mostrando capacidad de recomenzar.");
  }

  if (themes.length > 1) {
    const topThemes = themes.slice(0, 3);
    const themeList = topThemes.map((t) => t.category).join(", ");
    parts.push(`Las iniciativas han abordado temas como ${themeList}.`);
  }

  switch (rhythm) {
    case "quiet":
      parts.push("El territorio está en un momento de pausa, pero su historia cívica permanece.");
      break;
    case "first_steps":
      parts.push("Todo movimiento comienza con los primeros pasos. Este distrito está escribiendo sus primeras páginas.");
      break;
    case "steady":
      parts.push("Hay un ritmo constante de participación. La comunidad camina a su propio paso.");
      break;
    case "bursty":
      parts.push("La actividad llega en oleadas, con momentos de mucha energía seguidos de pausas.");
      break;
    case "building":
      parts.push("El ritmo se está acelerando. Cada semana hay más movimiento que la anterior.");
      break;
  }

  return parts.join(" ");
}
