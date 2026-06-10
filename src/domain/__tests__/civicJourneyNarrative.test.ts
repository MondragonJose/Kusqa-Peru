import { describe, expect, it, beforeAll } from "vitest";
import { beatToNarrative, phaseToHeadline } from "../civicJourneyNarrative";
import type { NarrativeBeat, JourneyArc, TerritorialFootprint } from "../civicJourney";

function beat(overrides: Partial<NarrativeBeat> & { kind: NarrativeBeat["kind"] }): NarrativeBeat {
  return {
    timestamp: "2025-06-01T00:00:00Z",
    datePrecision: "exact",
    provenance: "derived",
    title: "",
    description: "",
    ...overrides,
  };
}

function arc(overrides: Partial<JourneyArc> = {}): JourneyArc {
  return {
    phase: "primer_paso",
    phaseLabel: "Primer paso",
    beats: [],
    milestones: [],
    prologue: [],
    totalBeats: 0,
    totalMilestones: 0,
    isDormant: false,
    ...overrides,
  };
}

function footprint(overrides: Partial<TerritorialFootprint> = {}): TerritorialFootprint {
  return {
    regions: ["costa"],
    districts: ["barranco"],
    categories: ["Comunidad"],
    reach: "local",
    missionCount: 0,
    proposalCount: 0,
    districtCount: 1,
    ...overrides,
  };
}

// ─── beatToNarrative ─────────────────────────────────────────────────────────

describe("beatToNarrative", () => {
  it("returns a non-empty string for every beat kind", () => {
    const kinds: NarrativeBeat["kind"][] = [
      "first_mission",
      "completed_mission",
      "supported_proposal",
      "created_proposal",
      "proposal_converted",
      "joined_mission",
      "district_activated",
      "region_unlocked",
    ];
    for (const kind of kinds) {
      const result = beatToNarrative(beat({ kind, title: "Test" }));
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    }
  });

  it("uses the beat title as the {title} parameter", () => {
    const result = beatToNarrative(beat({ kind: "joined_mission", title: "Limpieza de playa" }));
    expect(result).toContain("Limpieza de playa");
  });

  it("is deterministic — same beat yields same output", () => {
    const b = beat({ kind: "completed_mission", title: "Reforestación" });
    const a = beatToNarrative(b);
    const c = beatToNarrative(b);
    expect(a).toBe(c);
  });

  it("produces a 2nd-person sentence in Spanish", () => {
    const result = beatToNarrative(beat({ kind: "first_mission", title: "Limpieza de playa" }));
    expect(result).toMatch(/^(Te|Tu)/);
  });

  // ─── Per-kind templates ──────────────────────────────────────────────────

  it("joined_mission: Te sumaste a la misión {title}", () => {
    const result = beatToNarrative(beat({ kind: "joined_mission", title: "Ruta ecológica" }));
    expect(result).toBe("Te sumaste a la misión Ruta ecológica.");
  });

  it("completed_mission: Completaste la misión {title}", () => {
    const result = beatToNarrative(beat({ kind: "completed_mission", title: "Reforestación" }));
    expect(result).toBe("Completaste la misión Reforestación.");
  });

  it("supported_proposal: Apoyaste la propuesta {title}", () => {
    const result = beatToNarrative(beat({ kind: "supported_proposal", title: "Biblioteca" }));
    expect(result).toBe("Apoyaste la propuesta Biblioteca.");
  });

  it("created_proposal: Creaste la propuesta {title}", () => {
    const result = beatToNarrative(beat({ kind: "created_proposal", title: "Huerto urbano" }));
    expect(result).toBe("Creaste la propuesta Huerto urbano.");
  });

  it("proposal_converted: Tu propuesta {title} se convirtió en misión", () => {
    const result = beatToNarrative(beat({ kind: "proposal_converted", title: "Huerto urbano" }));
    expect(result).toBe("Tu propuesta Huerto urbano se convirtió en misión.");
  });

  it("first_mission: Te uniste a tu primera misión: {title}", () => {
    const result = beatToNarrative(beat({ kind: "first_mission", title: "Limpieza" }));
    expect(result).toBe("Te uniste a tu primera misión: Limpieza.");
  });

  it("district_activated: Llegaste al distrito de {title}", () => {
    const result = beatToNarrative(beat({ kind: "district_activated", title: "barranco" }));
    expect(result).toBe("Llegaste al distrito de barranco.");
  });

  it("region_unlocked: Descubriste una nueva región: {title}", () => {
    const result = beatToNarrative(beat({ kind: "region_unlocked", title: "sierra" }));
    expect(result).toBe("Descubriste una nueva región: sierra.");
  });
});

// ─── phaseToHeadline ─────────────────────────────────────────────────────────

describe("phaseToHeadline", () => {
  it("primer_paso", () => {
    const result = phaseToHeadline(arc({ phase: "primer_paso" }), footprint());
    expect(result).toBe("Tus primeros pasos en el territorio");
  });

  it("explorando with single district", () => {
    const result = phaseToHeadline(
      arc({ phase: "explorando" }),
      footprint({ districts: ["barranco"], districtCount: 1 }),
    );
    expect(result).toBe("Explorando barranco y sus posibilidades");
  });

  it("explorando with multiple districts", () => {
    const result = phaseToHeadline(
      arc({ phase: "explorando" }),
      footprint({ districts: ["barranco", "miraflores"], districtCount: 2 }),
    );
    expect(result).toBe("Explorando 2 distritos de tu territorio");
  });

  it("organizando with single district", () => {
    const result = phaseToHeadline(
      arc({ phase: "organizando" }),
      footprint({ districts: ["barranco"], districtCount: 1 }),
    );
    expect(result).toBe("Organizando iniciativas en barranco");
  });

  it("organizando with multiple districts", () => {
    const result = phaseToHeadline(
      arc({ phase: "organizando" }),
      footprint({ districts: ["barranco", "cusco"], districtCount: 2 }),
    );
    expect(result).toBe("Organizando iniciativas en tu territorio");
  });

  it("construyendo with single mission", () => {
    const result = phaseToHeadline(arc({ phase: "construyendo" }), footprint({ missionCount: 1 }));
    expect(result).toBe("Construyendo tu primera misión completada");
  });

  it("construyendo with multiple missions", () => {
    const result = phaseToHeadline(arc({ phase: "construyendo" }), footprint({ missionCount: 3 }));
    expect(result).toBe("Construyendo con 3 misiones completadas");
  });

  it("tejiendo_territorio with single region", () => {
    const result = phaseToHeadline(
      arc({ phase: "tejiendo_territorio" }),
      footprint({ regions: ["costa"] }),
    );
    expect(result).toBe("Tejiendo territorio en la costa");
  });

  it("tejiendo_territorio with two regions", () => {
    const result = phaseToHeadline(
      arc({ phase: "tejiendo_territorio" }),
      footprint({ regions: ["costa", "sierra"] }),
    );
    expect(result).toBe("Tejiendo territorio entre la costa y la sierra");
  });

  it("tejiendo_territorio with three regions", () => {
    const result = phaseToHeadline(
      arc({ phase: "tejiendo_territorio" }),
      footprint({ regions: ["costa", "sierra", "selva"] }),
    );
    expect(result).toBe("Tejiendo territorio entre la costa, la sierra y la selva");
  });

  it("en_pausa", () => {
    const result = phaseToHeadline(arc({ phase: "en_pausa" }), footprint());
    expect(result).toBe("Tu territorio espera tu regreso");
  });
});

// ─── Prohibited language ─────────────────────────────────────────────────────

describe("no score language", () => {
  const narrativeTexts: string[] = [];

  beforeAll(() => {
    const kinds: NarrativeBeat["kind"][] = [
      "first_mission",
      "completed_mission",
      "supported_proposal",
      "created_proposal",
      "proposal_converted",
      "joined_mission",
      "district_activated",
      "region_unlocked",
    ];
    for (const kind of kinds) {
      narrativeTexts.push(beatToNarrative(beat({ kind, title: "Test" })));
    }
    const phases: JourneyArc["phase"][] = [
      "primer_paso",
      "explorando",
      "organizando",
      "construyendo",
      "tejiendo_territorio",
      "en_pausa",
    ];
    for (const p of phases) {
      narrativeTexts.push(
        phaseToHeadline(
          arc({ phase: p }),
          footprint({
            districts: ["a", "b"],
            districtCount: 2,
            regions: ["costa", "sierra"],
            missionCount: 3,
          }),
        ),
      );
    }
  });

  const FORBIDDEN = [/\bXP\b/i, /\bNivel\b/i, /\branking\b/i, /Top\s*%/i, /\bpuntaje\b/i, /\bnivel\s*\d+\b/i];

  for (const re of FORBIDDEN) {
    it(`does not contain ${re.source}`, () => {
      for (const text of narrativeTexts) {
        expect(text).not.toMatch(re);
      }
    });
  }
});
