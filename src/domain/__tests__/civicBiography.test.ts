import { describe, expect, it, beforeAll } from "vitest";
import { deriveCivicBiography } from "../civicBiography";
import type { CivicJourney, JourneyPhase } from "../civicJourney";

function journey(overrides: Partial<CivicJourney> = {}): CivicJourney {
  return {
    footprint: {
      regions: ["costa"],
      districts: ["barranco"],
      categories: ["Comunidad"],
      reach: "local",
      missionCount: 0,
      proposalCount: 0,
      districtCount: 1,
    },
    arc: {
      phase: "primer_paso",
      phaseLabel: "Primer paso",
      beats: [],
      milestones: [],
      prologue: [],
      totalBeats: 0,
      totalMilestones: 0,
      isDormant: false,
    },
    ...overrides,
  };
}

describe("deriveCivicBiography", () => {
  it("returns a CivicBiography with all fields as strings", () => {
    const result = deriveCivicBiography({
      journey: journey(),
      completedMissionCount: 0,
      supportedCount: 0,
      proposalCount: 0,
    });
    expect(typeof result.headline).toBe("string");
    expect(typeof result.territorialIdentity).toBe("string");
    expect(typeof result.participationIdentity).toBe("string");
    expect(typeof result.biography).toBe("string");
  });

  it("produces a headline based on phase and single region", () => {
    const result = deriveCivicBiography({
      journey: journey({
        arc: { phase: "explorando", phaseLabel: "Explorando" },
        footprint: { regions: ["costa"], districts: ["barranco"], categories: [], reach: "local", missionCount: 0, proposalCount: 0, districtCount: 1 },
      }),
      completedMissionCount: 0,
      supportedCount: 0,
      proposalCount: 0,
    });
    expect(result.headline).toContain("exploradora territorial");
    expect(result.headline).toContain("costa");
  });

  it("produces headline for tejiendo_territorio with two regions", () => {
    const result = deriveCivicBiography({
      journey: journey({
        arc: { phase: "tejiendo_territorio", phaseLabel: "Tejiendo territorio" },
        footprint: { regions: ["costa", "sierra"], districts: ["barranco", "cusco"], categories: [], reach: "regional", missionCount: 0, proposalCount: 0, districtCount: 2 },
      }),
      completedMissionCount: 0,
      supportedCount: 0,
      proposalCount: 0,
    });
    expect(result.headline).toContain("tejedora de territorio");
  });

  it("territorialIdentity describes district count and categories", () => {
    const result = deriveCivicBiography({
      journey: journey({
        footprint: {
          regions: ["costa"],
          districts: ["barranco"],
          categories: ["Medio ambiente", "Educación"],
          reach: "local",
          missionCount: 3,
          proposalCount: 1,
          districtCount: 1,
        },
      }),
      completedMissionCount: 3,
      supportedCount: 2,
      proposalCount: 1,
    });
    expect(result.territorialIdentity).toContain("barranco");
    expect(result.territorialIdentity).toContain("Medio ambiente");
    expect(result.territorialIdentity).toContain("Educación");
  });

  it("territorialIdentity pluralizes district count correctly", () => {
    const result = deriveCivicBiography({
      journey: journey({
        footprint: {
          regions: ["costa", "sierra"],
          districts: ["barranco", "cusco", "lima"],
          categories: [],
          reach: "regional",
          missionCount: 0,
          proposalCount: 0,
          districtCount: 3,
        },
      }),
      completedMissionCount: 0,
      supportedCount: 0,
      proposalCount: 0,
    });
    expect(result.territorialIdentity).toMatch(/3 distritos/);
  });

  it("participationIdentity describes completed missions", () => {
    const result = deriveCivicBiography({
      journey: journey(),
      completedMissionCount: 5,
      supportedCount: 0,
      proposalCount: 0,
    });
    expect(result.participationIdentity).toContain("5 misiones");
  });

  it("participationIdentity describes proposals created", () => {
    const result = deriveCivicBiography({
      journey: journey(),
      completedMissionCount: 0,
      supportedCount: 0,
      proposalCount: 2,
    });
    expect(result.participationIdentity).toContain("2 propuestas");
  });

  it("participationIdentity describes initiatives supported", () => {
    const result = deriveCivicBiography({
      journey: journey(),
      completedMissionCount: 0,
      supportedCount: 3,
      proposalCount: 0,
    });
    expect(result.participationIdentity).toContain("3 iniciativas");
  });

  it("participationIdentity combines all three dimensions", () => {
    const result = deriveCivicBiography({
      journey: journey(),
      completedMissionCount: 5,
      supportedCount: 3,
      proposalCount: 2,
    });
    expect(result.participationIdentity).toContain("5 misiones");
    expect(result.participationIdentity).toContain("2 propuestas");
    expect(result.participationIdentity).toContain("3 iniciativas");
  });

  it("participationIdentity shows empty message when no activity", () => {
    const result = deriveCivicBiography({
      journey: journey(),
      completedMissionCount: 0,
      supportedCount: 0,
      proposalCount: 0,
    });
    expect(result.participationIdentity).toContain("Aún no has participado");
  });

  it("biography is a coherent multi-sentence paragraph", () => {
    const result = deriveCivicBiography({
      journey: journey({
        arc: { phase: "explorando", phaseLabel: "Explorando" },
        footprint: {
          regions: ["costa"],
          districts: ["barranco"],
          categories: ["Comunidad"],
          reach: "local",
          missionCount: 2,
          proposalCount: 0,
          districtCount: 1,
        },
      }),
      completedMissionCount: 2,
      supportedCount: 1,
      proposalCount: 0,
    });
    expect(result.biography.split(".").length).toBeGreaterThanOrEqual(3);
    expect(result.biography).toContain("exploradora territorial");
    expect(result.biography).toContain("Comunidad");
  });
});

describe("no score language in civic biography", () => {
  const results: string[] = [];

  beforeAll(() => {
    const phases: JourneyPhase[] = [
      "primer_paso",
      "explorando",
      "organizando",
      "construyendo",
      "tejiendo_territorio",
      "en_pausa",
    ];
    for (const phase of phases) {
      const r = deriveCivicBiography({
        journey: journey({
          arc: { phase, phaseLabel: phase },
          footprint: {
            regions: ["costa", "sierra"],
            districts: ["a", "b", "c"],
            categories: ["Comunidad", "Educación"],
            reach: "regional",
            missionCount: 3,
            proposalCount: 2,
            districtCount: 3,
          },
        }),
        completedMissionCount: 3,
        supportedCount: 5,
        proposalCount: 2,
      });
      results.push(r.headline);
      results.push(r.territorialIdentity);
      results.push(r.participationIdentity);
      results.push(r.biography);
    }
  });

  const FORBIDDEN = [
    /\bXP\b/i,
    /\bNivel\b/i,
    /\branking\b/i,
    /Top\s*%/i,
    /\bpuntaje\b/i,
    /\bnivel\s*\d+\b/i,
  ];

  for (const re of FORBIDDEN) {
    it(`does not contain ${re.source}`, () => {
      for (const text of results) {
        expect(text).not.toMatch(re);
      }
    });
  }
});
