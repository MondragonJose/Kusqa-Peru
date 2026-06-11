import { describe, expect, it } from "vitest";
import {
  deriveTerritorialFootprint,
  deriveCivicJourney,
  type TerritorialFootprintInput,
  type CivicJourneyInput,
} from "../civicJourney";

function mkMission(overrides: Partial<TerritorialFootprintInput["missions"][number]> = {}) {
  return {
    id: "m1",
    district: "barranco",
    region: "costa" as const,
    category: "Comunidad" as const,
    ...overrides,
  };
}

function mkProposal(overrides: Partial<TerritorialFootprintInput["proposals"][number]> = {}) {
  return {
    id: "p1",
    district: "barranco",
    category: "Comunidad",
    region: "costa" as const,
    ...overrides,
  };
}

function mkUserMission(overrides: Partial<CivicJourneyInput["userMissions"][number]> = {}) {
  return {
    id: "um1",
    missionId: "m1",
    status: "in_progress" as const,
    joinedAt: "2025-06-01T00:00:00Z",
    completedAt: null,
    mission: {
      id: "m1",
      title: "Limpieza de playa",
      district: "barranco",
      region: "costa" as const,
      category: "Comunidad" as const,
      startDate: "2025-06-01T00:00:00Z",
      endDate: "2025-06-15T00:00:00Z",
    },
    ...overrides,
  };
}

function mkSupportedProposal(
  overrides: Partial<CivicJourneyInput["supportedProposals"][number]> = {},
) {
  return {
    id: "sp1",
    title: "Biblioteca vecinal",
    createdAt: "2025-06-10T00:00:00Z",
    ...overrides,
  };
}

function mkUserProposal(overrides: Partial<CivicJourneyInput["userProposals"][number]> = {}) {
  return {
    id: "up1",
    title: "Huerto urbano",
    status: "pending",
    createdAt: "2025-06-05T00:00:00Z",
    convertedAt: null,
    ...overrides,
  };
}

// ─── deriveTerritorialFootprint ──────────────────────────────────────────────

describe("deriveTerritorialFootprint", () => {
  it("returns local reach with a single district", () => {
    const result = deriveTerritorialFootprint({
      missions: [mkMission({ district: "barranco", region: "costa" })],
      proposals: [],
      userDistrict: "barranco",
    });
    expect(result.reach).toBe("local");
    expect(result.regions).toContain("costa");
    expect(result.districts).toContain("barranco");
    expect(result.missionCount).toBe(1);
    expect(result.proposalCount).toBe(0);
  });

  it("returns regional reach with two regions", () => {
    const result = deriveTerritorialFootprint({
      missions: [
        mkMission({ district: "barranco", region: "costa" }),
        mkMission({ district: "cusco", region: "sierra", id: "m2" }),
      ],
      proposals: [mkProposal({ district: "barranco", region: "costa" })],
      userDistrict: "barranco",
    });
    expect(result.reach).toBe("regional");
    expect(result.regions.sort()).toEqual(["costa", "sierra"]);
  });

  it("returns national reach with three regions", () => {
    const result = deriveTerritorialFootprint({
      missions: [
        mkMission({ district: "barranco", region: "costa" }),
        mkMission({ district: "cusco", region: "sierra", id: "m2" }),
        mkMission({ district: "iquitos", region: "selva", id: "m3" }),
      ],
      proposals: [],
      userDistrict: "barranco",
    });
    expect(result.reach).toBe("national");
    expect(result.regions.sort()).toEqual(["costa", "selva", "sierra"]);
  });

  it("collects categories from missions and proposals", () => {
    const result = deriveTerritorialFootprint({
      missions: [mkMission({ category: "Medio ambiente" })],
      proposals: [mkProposal({ category: "Educación" })],
      userDistrict: "barranco",
    });
    expect(result.categories).toContain("Medio ambiente");
    expect(result.categories).toContain("Educación");
  });

  it("counts districts uniquely", () => {
    const result = deriveTerritorialFootprint({
      missions: [
        mkMission({ district: "barranco", id: "m1" }),
        mkMission({ district: "barranco", id: "m2" }), // same district
        mkMission({ district: "cusco", id: "m3" }),
      ],
      proposals: [],
      userDistrict: "miraflores",
    });
    expect(result.districtCount).toBe(3); // barranco, cusco, miraflores
    expect(result.districts.sort()).toEqual(["barranco", "cusco", "miraflores"]);
  });
});

// ─── deriveCivicJourney — phase derivation ───────────────────────────────────

describe("deriveCivicJourney — phases", () => {
  it("returns primer_paso when user has no activity", () => {
    const result = deriveCivicJourney({
      userMissions: [],
      supportedProposals: [],
      userProposals: [],
      userDistrict: "barranco",
    });
    expect(result.arc.phase).toBe("primer_paso");
    expect(result.arc.totalBeats).toBe(0);
    expect(result.arc.totalMilestones).toBe(0);
  });

  it("returns explorando when user has joined missions but no completions or proposals", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [mkUserMission({ status: "in_progress", completedAt: null })],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-05T00:00:00Z").getTime(),
    );
    expect(result.arc.phase).toBe("explorando");
  });

  it("returns organizando when user has created a proposal (no completed missions)", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [mkUserMission({ status: "in_progress", completedAt: null })],
        supportedProposals: [],
        userProposals: [mkUserProposal()],
        userDistrict: "barranco",
      },
      new Date("2025-06-10T00:00:00Z").getTime(),
    );
    expect(result.arc.phase).toBe("organizando");
  });

  it("returns construyendo when user has completed a mission (no proposals)", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [
          mkUserMission({
            status: "completed",
            completedAt: "2025-06-10T00:00:00Z",
          }),
        ],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-15T00:00:00Z").getTime(),
    );
    expect(result.arc.phase).toBe("construyendo");
  });

  it("returns tejiendo_territorio with 2+ regions and no proposals/completions", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [
          mkUserMission({
            missionId: "m1",
            mission: {
              id: "m1",
              title: "Limpieza de playa",
              district: "barranco",
              region: "costa",
              category: "Comunidad",
              startDate: "2025-06-01T00:00:00Z",
              endDate: "2025-06-15T00:00:00Z",
            },
            status: "in_progress",
            completedAt: null,
          }),
          mkUserMission({
            id: "um2",
            missionId: "m2",
            mission: {
              id: "m2",
              title: "Reforestación",
              district: "cusco",
              region: "sierra",
              category: "Medio ambiente",
              startDate: "2025-07-01T00:00:00Z",
              endDate: "2025-07-15T00:00:00Z",
            },
            status: "in_progress",
            joinedAt: "2025-07-01T00:00:00Z",
            completedAt: null,
          }),
        ],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-07-05T00:00:00Z").getTime(),
    );
    expect(result.arc.phase).toBe("tejiendo_territorio");
  });

  it("organizando takes priority over construyendo", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [
          mkUserMission({
            status: "completed",
            completedAt: "2025-06-10T00:00:00Z",
          }),
        ],
        supportedProposals: [],
        userProposals: [mkUserProposal()],
        userDistrict: "barranco",
      },
      new Date("2025-06-15T00:00:00Z").getTime(),
    );
    expect(result.arc.phase).toBe("organizando");
  });

  it("isDormant is derived (not hardcoded)", () => {
    // With a recent timestamp, user is active → not dormant
    const active = deriveCivicJourney(
      {
        userMissions: [
          mkUserMission({
            status: "completed",
            completedAt: "2025-06-10T00:00:00Z",
          }),
        ],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-15T00:00:00Z").getTime(),
    );
    expect(active.arc.isDormant).toBe(false);

    // With a very old timestamp, user is dormant → true
    const dormant = deriveCivicJourney(
      {
        userMissions: [
          mkUserMission({
            status: "completed",
            completedAt: "2025-01-01T00:00:00Z",
            joinedAt: "2024-12-01T00:00:00Z",
          }),
        ],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-15T00:00:00Z").getTime(),
    );
    expect(dormant.arc.isDormant).toBe(true);
  });
});

// ─── deriveCivicJourney — beat kinds ─────────────────────────────────────────

describe("deriveCivicJourney — beat kinds", () => {
  it("generates joined_mission beat", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [mkUserMission()],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-05T00:00:00Z").getTime(),
    );
    expect(result.arc.beats.some((b) => b.kind === "joined_mission")).toBe(true);
  });

  it("generates completed_mission beat", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [
          mkUserMission({
            status: "completed",
            completedAt: "2025-06-10T00:00:00Z",
          }),
        ],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-15T00:00:00Z").getTime(),
    );
    expect(result.arc.beats.some((b) => b.kind === "completed_mission")).toBe(true);
  });

  it("generates supported_proposal beat", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [],
        supportedProposals: [mkSupportedProposal()],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-15T00:00:00Z").getTime(),
    );
    expect(result.arc.beats.some((b) => b.kind === "supported_proposal")).toBe(true);
  });

  it("generates created_proposal beat", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [],
        supportedProposals: [],
        userProposals: [mkUserProposal()],
        userDistrict: "barranco",
      },
      new Date("2025-06-10T00:00:00Z").getTime(),
    );
    expect(result.arc.beats.some((b) => b.kind === "created_proposal")).toBe(true);
  });

  it("generates proposal_converted beat when proposal has convertedAt", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [],
        supportedProposals: [],
        userProposals: [
          mkUserProposal({
            status: "active",
            convertedAt: "2025-07-01T00:00:00Z",
          }),
        ],
        userDistrict: "barranco",
      },
      new Date("2025-07-05T00:00:00Z").getTime(),
    );
    expect(result.arc.beats.some((b) => b.kind === "proposal_converted")).toBe(true);
  });

  it("generates district_activated beat for new districts", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [
          mkUserMission({
            mission: {
              id: "m1",
              title: "Limpieza de playa",
              district: "barranco",
              region: "costa",
              category: "Comunidad",
              startDate: "2025-06-01T00:00:00Z",
              endDate: "2025-06-15T00:00:00Z",
            },
          }),
        ],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "miraflores",
      },
      new Date("2025-06-05T00:00:00Z").getTime(),
    );
    expect(result.arc.beats.some((b) => b.kind === "district_activated")).toBe(true);
  });

  it("generates region_unlocked beat in prologue for new regions", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [
          mkUserMission({
            mission: {
              id: "m1",
              title: "Reforestación",
              district: "cusco",
              region: "sierra",
              category: "Medio ambiente",
              startDate: "2025-07-01T00:00:00Z",
              endDate: "2025-07-15T00:00:00Z",
            },
          }),
        ],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-07-05T00:00:00Z").getTime(),
    );
    expect(result.arc.prologue.some((b) => b.kind === "region_unlocked")).toBe(true);
  });

  it("generates first_mission milestone", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [mkUserMission()],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-05T00:00:00Z").getTime(),
    );
    expect(result.arc.milestones.some((m) => m.kind === "first_mission")).toBe(true);
  });

  it("all beat kinds are present in a full journey", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [
          mkUserMission({
            status: "completed",
            completedAt: "2025-06-10T00:00:00Z",
          }),
        ],
        supportedProposals: [mkSupportedProposal()],
        userProposals: [
          mkUserProposal({
            status: "active",
            convertedAt: "2025-07-01T00:00:00Z",
          }),
        ],
        userDistrict: "miraflores",
      },
      new Date("2025-07-05T00:00:00Z").getTime(),
    );
    const kinds = new Set(result.arc.beats.map((b) => b.kind));
    expect(kinds.has("joined_mission")).toBe(true);
    expect(kinds.has("completed_mission")).toBe(true);
    expect(kinds.has("supported_proposal")).toBe(true);
    expect(kinds.has("created_proposal")).toBe(true);
    expect(kinds.has("proposal_converted")).toBe(true);
  });
});

// ─── deriveCivicJourney — territorial footprint integration ─────────────────

describe("deriveCivicJourney — footprint integration", () => {
  it("includes footprint in result", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [mkUserMission()],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-05T00:00:00Z").getTime(),
    );
    expect(result.footprint).toBeDefined();
    expect(result.footprint.regions.length).toBeGreaterThanOrEqual(1);
    expect(result.footprint.missionCount).toBe(1);
  });
});

// ─── Provenance & precision ─────────────────────────────────────────────────

describe("deriveCivicJourney — provenance & precision", () => {
  it("marks joined_mission as event/exact when joinedAt exists", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [mkUserMission()],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-05T00:00:00Z").getTime(),
    );
    const jb = result.arc.beats.find((b) => b.kind === "joined_mission");
    expect(jb?.provenance).toBe("event");
    expect(jb?.datePrecision).toBe("exact");
  });

  it("marks joined_mission as derived/approximate when only startDate exists", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [
          mkUserMission({
            joinedAt: null,
            mission: {
              id: "m1",
              title: "Limpieza de playa",
              district: "barranco",
              region: "costa",
              category: "Comunidad",
              startDate: "2025-06-01T00:00:00Z",
              endDate: "2025-06-15T00:00:00Z",
            },
          }),
        ],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-05T00:00:00Z").getTime(),
    );
    const jb = result.arc.beats.find((b) => b.kind === "joined_mission");
    expect(jb?.provenance).toBe("derived");
    expect(jb?.datePrecision).toBe("approximate");
  });

  it("marks joined_mission as derived/unknown when no date exists (goes to prologue)", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [
          mkUserMission({
            joinedAt: null,
            mission: {
              id: "m1",
              title: "Limpieza de playa",
              district: "barranco",
              region: "costa",
              category: "Comunidad",
              startDate: null,
              endDate: null,
            },
          }),
        ],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-05T00:00:00Z").getTime(),
    );
    const jb = result.arc.prologue.find((b) => b.kind === "joined_mission");
    expect(jb?.provenance).toBe("derived");
    expect(jb?.datePrecision).toBe("unknown");
    expect(result.arc.beats.some((b) => b.kind === "joined_mission")).toBe(false);
  });

  it("marks completed_mission as event/exact", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [mkUserMission({ status: "completed", completedAt: "2025-06-10T00:00:00Z" })],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-15T00:00:00Z").getTime(),
    );
    const cb = result.arc.beats.find((b) => b.kind === "completed_mission");
    expect(cb?.provenance).toBe("event");
    expect(cb?.datePrecision).toBe("exact");
  });

  it("marks supported_proposal as event/exact", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [],
        supportedProposals: [mkSupportedProposal()],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-15T00:00:00Z").getTime(),
    );
    const sb = result.arc.beats.find((b) => b.kind === "supported_proposal");
    expect(sb?.provenance).toBe("event");
    expect(sb?.datePrecision).toBe("exact");
  });

  it("marks created_proposal as event/exact", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [],
        supportedProposals: [],
        userProposals: [mkUserProposal()],
        userDistrict: "barranco",
      },
      new Date("2025-06-10T00:00:00Z").getTime(),
    );
    const pb = result.arc.beats.find((b) => b.kind === "created_proposal");
    expect(pb?.provenance).toBe("event");
    expect(pb?.datePrecision).toBe("exact");
  });

  it("marks proposal_converted as event/exact", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [],
        supportedProposals: [],
        userProposals: [mkUserProposal({ status: "active", convertedAt: "2025-07-01T00:00:00Z" })],
        userDistrict: "barranco",
      },
      new Date("2025-07-05T00:00:00Z").getTime(),
    );
    const cvb = result.arc.beats.find((b) => b.kind === "proposal_converted");
    expect(cvb?.provenance).toBe("event");
    expect(cvb?.datePrecision).toBe("exact");
  });
});

// ─── Prologue (beats without reliable dates) ────────────────────────────────

describe("deriveCivicJourney — prologue", () => {
  it("region_unlocked always goes to prologue", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [
          mkUserMission({
            mission: {
              id: "m1",
              title: "Reforestación",
              district: "cusco",
              region: "sierra",
              category: "Medio ambiente",
              startDate: "2025-07-01T00:00:00Z",
              endDate: "2025-07-15T00:00:00Z",
            },
          }),
        ],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-07-05T00:00:00Z").getTime(),
    );
    expect(result.arc.prologue.some((b) => b.kind === "region_unlocked")).toBe(true);
    expect(result.arc.beats.some((b) => b.kind === "region_unlocked")).toBe(false);
  });
});

// ─── Partial data (no dates at all) ─────────────────────────────────────────

describe("deriveCivicJourney — partial data", () => {
  it("handles user_missions with no dates at all (prologue + no dormancy crash)", () => {
    const result = deriveCivicJourney({
      userMissions: [
        mkUserMission({
          joinedAt: null,
          completedAt: null,
          mission: {
            id: "m1",
            title: "Misión sin fecha",
            district: "barranco",
            region: "costa",
            category: "Comunidad",
            startDate: null,
            endDate: null,
          },
        }),
      ],
      supportedProposals: [],
      userProposals: [],
      userDistrict: "barranco",
    });
    expect(result.arc.prologue.length).toBeGreaterThan(0);
    expect(result.arc.beats.length).toBe(0);
    expect(result.arc.phase).toBe("explorando");
    expect(result.arc.isDormant).toBe(false);
  });

  it("handles empty arrays gracefully", () => {
    const result = deriveCivicJourney({
      userMissions: [],
      supportedProposals: [],
      userProposals: [],
      userDistrict: "barranco",
    });
    expect(result.arc.beats).toEqual([]);
    expect(result.arc.prologue).toEqual([]);
    expect(result.arc.milestones).toEqual([]);
    expect(result.footprint.missionCount).toBe(0);
  });
});

// ─── Dormancy edge cases ────────────────────────────────────────────────────

describe("deriveCivicJourney — dormancy", () => {
  it("is not dormant with recent activity (<30 days)", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [
          mkUserMission({
            status: "completed",
            completedAt: "2025-06-10T00:00:00Z",
          }),
        ],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-25T00:00:00Z").getTime(),
    );
    expect(result.arc.isDormant).toBe(false);
    expect(result.arc.phase).toBe("construyendo");
  });

  it("is not dormant when activity in 31-60 day window with active proposals", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [
          mkUserMission({
            status: "completed",
            completedAt: "2025-04-01T00:00:00Z",
            joinedAt: "2025-03-01T00:00:00Z",
          }),
        ],
        supportedProposals: [],
        userProposals: [mkUserProposal({ status: "pending", createdAt: "2025-04-15T00:00:00Z" })],
        userDistrict: "barranco",
      },
      new Date("2025-06-01T00:00:00Z").getTime(),
    );
    expect(result.arc.isDormant).toBe(false);
  });

  it("is dormant when >60 days without any activity and no active proposals", () => {
    const result = deriveCivicJourney(
      {
        userMissions: [
          mkUserMission({
            status: "completed",
            completedAt: "2025-01-01T00:00:00Z",
            joinedAt: "2024-12-01T00:00:00Z",
          }),
        ],
        supportedProposals: [],
        userProposals: [],
        userDistrict: "barranco",
      },
      new Date("2025-06-15T00:00:00Z").getTime(),
    );
    expect(result.arc.isDormant).toBe(true);
    expect(result.arc.phase).toBe("en_pausa");
  });

  it("is not dormant when user has no activity at all (primer_paso)", () => {
    const result = deriveCivicJourney({
      userMissions: [],
      supportedProposals: [],
      userProposals: [],
      userDistrict: "barranco",
    });
    expect(result.arc.isDormant).toBe(false);
    expect(result.arc.phase).toBe("primer_paso");
  });
});
