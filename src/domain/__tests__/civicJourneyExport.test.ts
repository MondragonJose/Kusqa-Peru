import { describe, expect, it } from "vitest";
import { toInstitutionalRecord, toExport } from "../civicJourneyExport";
import type {
  CivicJourney,
  NarrativeBeat,
  TerritorialFootprint,
  JourneyArc,
} from "../civicJourney";

function footprint(overrides?: Partial<TerritorialFootprint>): TerritorialFootprint {
  return {
    regions: ["costa"],
    districts: ["barranco"],
    categories: ["Comunidad"],
    missionCount: 1,
    proposalCount: 0,
    districtCount: 1,
    reach: "local",
    ...overrides,
  };
}

function mkBeat(
  kind: NarrativeBeat["kind"],
  overrides: Partial<NarrativeBeat> = {},
): NarrativeBeat {
  return {
    kind,
    title: "test",
    description: "",
    timestamp: "2025-06-01T00:00:00Z",
    datePrecision: "exact",
    provenance: "derived",
    sourceId: "src1",
    sourceType: "mission",
    ...overrides,
  };
}

function arc(beats: NarrativeBeat[]): JourneyArc {
  return {
    phase: "explorando",
    phaseLabel: "Explorando",
    beats,
    milestones: [],
    prologue: [],
    totalBeats: beats.length,
    totalMilestones: 0,
    isDormant: false,
  };
}

function journey(
  beats: NarrativeBeat[],
  fpOverrides?: Partial<TerritorialFootprint>,
): CivicJourney {
  return {
    footprint: footprint(fpOverrides),
    arc: arc(beats),
  };
}

// ─── toInstitutionalRecord ────────────────────────────────────────────────────

describe("toInstitutionalRecord", () => {
  it("returns zeros for an empty journey", () => {
    const j = journey([]);
    const r = toInstitutionalRecord(j);
    expect(r.participationCount).toBe(0);
    expect(r.verifiedCount).toBe(0);
    expect(r.initiativesCreated).toBe(0);
    expect(r.initiativesSupported).toBe(0);
    expect(r.missionsCompleted).toBe(0);
    expect(r.firstActivityAt).toBe("");
    expect(r.lastActivityAt).toBe("");
  });

  it("counts participation from all beats", () => {
    const j = journey([
      mkBeat("joined_mission", { timestamp: "2025-01-01T00:00:00Z" }),
      mkBeat("completed_mission", { timestamp: "2025-01-10T00:00:00Z" }),
      mkBeat("supported_proposal", {
        sourceType: "proposal",
        sourceId: "sp1",
        timestamp: "2025-02-01T00:00:00Z",
      }),
    ]);
    const r = toInstitutionalRecord(j);
    expect(r.participationCount).toBe(3);
  });

  it("derives verifiedCount from completed_mission beats", () => {
    const j = journey([
      mkBeat("joined_mission"),
      mkBeat("completed_mission"),
      mkBeat("completed_mission", { sourceId: "m2" }),
    ]);
    const r = toInstitutionalRecord(j);
    expect(r.verifiedCount).toBe(2);
    expect(r.missionsCompleted).toBe(2);
  });

  it("deduplicates initiativesCreated by sourceId", () => {
    const j = journey([
      mkBeat("created_proposal", {
        sourceType: "proposal",
        sourceId: "up1",
        title: "Huerto urbano",
      }),
      mkBeat("created_proposal", {
        sourceType: "proposal",
        sourceId: "up2",
        title: "Comedor popular",
      }),
    ]);
    const r = toInstitutionalRecord(j);
    expect(r.initiativesCreated).toBe(2);
  });

  it("deduplicates initiativesCreated when proposal_converted also exists", () => {
    const j = journey([
      mkBeat("created_proposal", {
        sourceType: "proposal",
        sourceId: "up1",
        title: "Huerto urbano",
      }),
      mkBeat("proposal_converted", {
        sourceType: "proposal",
        sourceId: "up1",
        title: "Huerto urbano",
      }),
    ]);
    const r = toInstitutionalRecord(j);
    expect(r.initiativesCreated).toBe(1);
  });

  it("deduplicates initiativesSupported by sourceId", () => {
    const j = journey([
      mkBeat("supported_proposal", { sourceType: "proposal", sourceId: "sp1" }),
      mkBeat("supported_proposal", { sourceType: "proposal", sourceId: "sp2" }),
    ]);
    const r = toInstitutionalRecord(j);
    expect(r.initiativesSupported).toBe(2);
  });

  it("copies districts, regions, categories from footprint", () => {
    const j = journey([mkBeat("joined_mission")], {
      districts: ["barranco", "miraflores"],
      regions: ["costa", "sierra"],
      categories: ["Comunidad", "Educación"],
    });
    const r = toInstitutionalRecord(j);
    expect(r.districts).toEqual(["barranco", "miraflores"]);
    expect(r.regions).toEqual(["costa", "sierra"]);
    expect(r.categories).toEqual(["Comunidad", "Educación"]);
  });

  it("derives firstActivityAt and lastActivityAt from beat timestamps", () => {
    const j = journey([
      mkBeat("joined_mission", { timestamp: "2025-03-01T00:00:00Z" }),
      mkBeat("completed_mission", { timestamp: "2025-01-15T00:00:00Z" }),
      mkBeat("supported_proposal", {
        sourceType: "proposal",
        sourceId: "sp1",
        timestamp: "2025-06-01T00:00:00Z",
      }),
    ]);
    const r = toInstitutionalRecord(j);
    expect(r.firstActivityAt).toBe("2025-01-15T00:00:00Z");
    expect(r.lastActivityAt).toBe("2025-06-01T00:00:00Z");
  });

  it("sets first and last same when single beat", () => {
    const j = journey([mkBeat("joined_mission", { timestamp: "2025-05-05T00:00:00Z" })]);
    const r = toInstitutionalRecord(j);
    expect(r.firstActivityAt).toBe("2025-05-05T00:00:00Z");
    expect(r.lastActivityAt).toBe("2025-05-05T00:00:00Z");
  });
});

// ─── toExport (JSON) ──────────────────────────────────────────────────────────

describe("toExport — json", () => {
  it("produces valid JSON with correct keys", () => {
    const j = journey([mkBeat("joined_mission")]);
    const r = toInstitutionalRecord(j);
    const out = toExport(r, "json");
    const parsed = JSON.parse(out);
    expect(parsed.participationCount).toBe(1);
    expect(typeof parsed.firstActivityAt).toBe("string");
  });

  it("terminates with a newline", () => {
    const j = journey([]);
    const out = toExport(toInstitutionalRecord(j), "json");
    expect(out.endsWith("\n")).toBe(true);
  });
});

// ─── toExport (CSV) ───────────────────────────────────────────────────────────

describe("toExport — csv", () => {
  it("produces a header row and data rows", () => {
    const j = journey([mkBeat("joined_mission")]);
    const out = toExport(toInstitutionalRecord(j), "csv");
    const lines = out.trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[0]).toContain("campo");
    expect(lines[0]).toContain("valor");
  });

  it("contains expected fields with correct values", () => {
    const j = journey([
      mkBeat("joined_mission"),
      mkBeat("completed_mission"),
      mkBeat("created_proposal", { sourceType: "proposal", sourceId: "up1" }),
    ]);
    const r = toInstitutionalRecord(j);
    const out = toExport(r, "csv");
    expect(out).toContain("participacion,3");
    expect(out).toContain("verificadas,1");
    expect(out).toContain("iniciativas_creadas,1");
  });

  it("joins arrays with semicolons in CSV", () => {
    const j = journey([mkBeat("joined_mission")], {
      districts: ["barranco", "miraflores"],
      regions: ["costa", "sierra"],
      categories: ["Comunidad", "Educación"],
    });
    const out = toExport(toInstitutionalRecord(j), "csv");
    expect(out).toContain("barranco; miraflores");
    expect(out).toContain("costa; sierra");
    expect(out).toContain("Comunidad; Educación");
  });

  it("escapes commas in values", () => {
    const j = journey([mkBeat("joined_mission")], {
      districts: ["barranco, lima"],
    });
    const out = toExport(toInstitutionalRecord(j), "csv");
    expect(out).toContain('"barranco, lima"');
  });

  it("terminates with a newline", () => {
    const j = journey([]);
    const out = toExport(toInstitutionalRecord(j), "csv");
    expect(out.endsWith("\n")).toBe(true);
  });
});
