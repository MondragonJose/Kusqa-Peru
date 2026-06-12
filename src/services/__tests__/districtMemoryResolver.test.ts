import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TerritorialEvent, TerritorialEventType } from "@/domain/territorialEvent";
import type { Initiative } from "@/domain/initiative";
import { buildDistrictMemory } from "@/services/districtMemoryResolver";
import { isLivingTerritoryEnabled } from "@/lib/operationalFeature";

// ─── Helpers ────────────────────────────────────────────────────────────

function makeEvent(
  type: TerritorialEventType,
  entityId: string,
  createdAt: string,
  overrides: Partial<TerritorialEvent> = {},
): TerritorialEvent {
  return {
    id: crypto.randomUUID(),
    type,
    actor: { id: crypto.randomUUID(), username: "test", firstName: "Test", avatarUrl: null },
    entityType: entityId.startsWith("miss") ? "mission" : "proposal",
    entityId,
    entityTitle: null,
    districtId: "dist-001",
    region: "costa",
    createdAt,
    metadata: {},
    ...overrides,
  };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function makeInitiative(overrides: Partial<Initiative> = {}): Initiative {
  return {
    id: crypto.randomUUID(),
    sourceType: "proposal",
    sourceId: crypto.randomUUID(),
    title: "Iniciativa de prueba",
    summary: "Una iniciativa para pruebas",
    category: "Medio ambiente",
    region: "costa",
    lifecycle: "active",
    temporalAnchor: { label: "En curso", kind: "active", referenceDate: null },
    emoji: "🌱",
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe("buildDistrictMemory", () => {
  it("returns null for empty events and empty initiatives", () => {
    const result = buildDistrictMemory([], []);
    expect(result).toBeNull();
  });

  it("returns a DistrictMemory when events exist even without initiatives", () => {
    const events = [makeEvent("proposal.supported", "prop-1", daysAgo(5))];
    const result = buildDistrictMemory(events, []);
    expect(result).not.toBeNull();
    expect(result!.milestones.length).toBe(0);
    expect(result!.themes.length).toBe(0);
  });

  it("returns a DistrictMemory with only initiatives (no events)", () => {
    const initiatives = [makeInitiative()];
    const result = buildDistrictMemory([], initiatives);
    expect(result).not.toBeNull();
    expect(result!.themes.length).toBe(1);
    expect(result!.rhythm).toBe("quiet");
    expect(result!.narrative.length).toBeGreaterThan(10);
  });

  it("returns DistrictMemory with milestones from a complete lifecycle", () => {
    const propId = "prop-lifecycle";
    const missId = "miss-lifecycle";
    const events: TerritorialEvent[] = [
      makeEvent("proposal.created", propId, daysAgo(90)),
      makeEvent("proposal.collaborator_joined", propId, daysAgo(80)),
      makeEvent("proposal.converted_to_mission", propId, daysAgo(70)),
      makeEvent("mission.joined", missId, daysAgo(65)),
      makeEvent("mission.completed", missId, daysAgo(60)),
    ];
    const initiatives: Initiative[] = [
      makeInitiative({ category: "Educación", lifecycle: "completed" }),
    ];

    const result = buildDistrictMemory(events, initiatives);
    expect(result).not.toBeNull();

    const types = result!.milestones.map((m) => m.type);
    expect(types).toContain("first_initiative");
    expect(types).toContain("first_conversion");
    expect(types).toContain("first_completion");
    expect(types).toContain("coalition_moment");
    expect(result!.themes.length).toBeGreaterThanOrEqual(1);
    expect(result!.narrative.length).toBeGreaterThan(20);
  });

  it("returns a quiet narrative for minimal activity", () => {
    const events = [makeEvent("proposal.created", "p1", daysAgo(3))];
    const initiatives = [makeInitiative()];
    const result = buildDistrictMemory(events, initiatives);
    expect(result).not.toBeNull();
    expect(result!.rhythm).toBe("first_steps");
  });

  it("is a pure function — same input always produces same output", () => {
    const events: TerritorialEvent[] = [
      makeEvent("proposal.created", "p1", daysAgo(30)),
      makeEvent("mission.completed", "m1", daysAgo(20)),
    ];
    const initiatives: Initiative[] = [makeInitiative({ lifecycle: "completed" })];

    const a = buildDistrictMemory(events, initiatives);
    const b = buildDistrictMemory(events, initiatives);
    expect(a).toEqual(b);
  });
});

describe("flag gating — isLivingTerritoryEnabled", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("computes districtMemory when VITE_LIVING_TERRITORY=true", () => {
    vi.stubEnv("VITE_LIVING_TERRITORY", "true");

    const events: TerritorialEvent[] = [
      makeEvent("proposal.created", "p1", daysAgo(10)),
      makeEvent("mission.completed", "m1", daysAgo(5)),
    ];
    const initiatives: Initiative[] = [makeInitiative({ lifecycle: "completed" })];

    const flagOn = isLivingTerritoryEnabled();
    const memory = flagOn ? buildDistrictMemory(events, initiatives) : null;

    expect(flagOn).toBe(true);
    expect(memory).not.toBeNull();
    expect(memory!.milestones.length).toBeGreaterThan(0);
  });

  it("returns original shape unchanged when VITE_LIVING_TERRITORY=false", () => {
    vi.stubEnv("VITE_LIVING_TERRITORY", "false");

    const events: TerritorialEvent[] = [
      makeEvent("proposal.created", "p1", daysAgo(10)),
      makeEvent("mission.completed", "m1", daysAgo(5)),
    ];
    const initiatives: Initiative[] = [makeInitiative({ lifecycle: "completed" })];

    const flagOn = isLivingTerritoryEnabled();
    const memory = flagOn ? buildDistrictMemory(events, initiatives) : null;

    expect(flagOn).toBe(false);
    expect(memory).toBeNull();
  });
});
