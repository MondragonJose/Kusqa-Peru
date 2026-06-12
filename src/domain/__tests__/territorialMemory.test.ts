import { describe, expect, it } from "vitest";
import type { TerritorialEvent, TerritorialEventType } from "../territorialEvent";
import type { Initiative } from "../initiative";
import {
  deriveDistrictMemory,
  type DistrictMemory,
  type DistrictRhythm,
} from "../territorialMemory";

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

describe("deriveDistrictMemory", () => {
  describe("empty input — resting narrative", () => {
    it("returns a quiet narrative, not a crash", () => {
      const memory = deriveDistrictMemory([], []);
      expect(memory.narrative).toBeTruthy();
      expect(memory.narrative.length).toBeGreaterThan(10);
      expect(memory.milestones).toEqual([]);
      expect(memory.themes).toEqual([]);
      expect(memory.knownFor).toBeNull();
      expect(memory.rhythm).toBe("quiet");
    });

    it("returns a quiet narrative for events-only input with no initiatives", () => {
      const memory = deriveDistrictMemory(
        [makeEvent("proposal.supported", "prop-1", daysAgo(5))],
        [],
      );
      expect(memory.narrative).toBeTruthy();
      expect(memory.themes).toEqual([]);
    });

    it("returns a quiet narrative for initiatives-only input with no events", () => {
      const memory = deriveDistrictMemory([], [makeInitiative()]);
      expect(memory.narrative).toBeTruthy();
    });
  });

  describe("milestones from a complete lifecycle", () => {
    it("derives all milestones from a full proposal→mission lifecycle", () => {
      const propId = "prop-complete-1";
      const missId = "miss-complete-1";
      const events: TerritorialEvent[] = [
        makeEvent("proposal.created", propId, daysAgo(90)),
        makeEvent("proposal.supported", propId, daysAgo(85)),
        makeEvent("proposal.collaborator_joined", propId, daysAgo(80)),
        makeEvent("proposal.converted_to_mission", propId, daysAgo(70), {
          metadata: { missionId: missId },
        }),
        makeEvent("mission.joined", missId, daysAgo(65)),
        makeEvent("mission.completed", missId, daysAgo(60)),
      ];

      const initiatives: Initiative[] = [
        makeInitiative({
          id: propId,
          sourceType: "proposal",
          lifecycle: "completed",
          category: "Educación",
        }),
        makeInitiative({
          id: missId,
          sourceType: "mission",
          lifecycle: "completed",
          category: "Educación",
        }),
      ];

      const memory = deriveDistrictMemory(events, initiatives);

      expect(memory.milestones.length).toBeGreaterThanOrEqual(3);

      const types = memory.milestones.map((m) => m.type);
      expect(types).toContain("first_initiative");
      expect(types).toContain("first_conversion");
      expect(types).toContain("first_completion");
    });

    it("includes coalition_moment when a collaborator joined", () => {
      const events: TerritorialEvent[] = [
        makeEvent("proposal.created", "prop-2", daysAgo(30)),
        makeEvent("proposal.collaborator_joined", "prop-2", daysAgo(25)),
        makeEvent("proposal.converted_to_mission", "prop-2", daysAgo(20)),
        makeEvent("mission.completed", "miss-2", daysAgo(10)),
      ];

      const memory = deriveDistrictMemory(events, [makeInitiative()]);
      const types = memory.milestones.map((m) => m.type);
      expect(types).toContain("coalition_moment");
    });
  });

  describe("revival detection", () => {
    it("detects revival when a completion wave follows a long gap", () => {
      const missId = "miss-revival";
      const events: TerritorialEvent[] = [
        makeEvent("proposal.created", "prop-old", daysAgo(365)),
        makeEvent("proposal.converted_to_mission", "prop-old", daysAgo(360)),
        makeEvent("mission.completed", "miss-old", daysAgo(350)),
        makeEvent("proposal.created", "prop-new", daysAgo(30)),
        makeEvent("proposal.converted_to_mission", "prop-new", daysAgo(25)),
        makeEvent("mission.completed", missId, daysAgo(5)),
      ];

      const memory = deriveDistrictMemory(events, [makeInitiative()]);
      const revivals = memory.milestones.filter((m) => m.type === "revival");
      expect(revivals.length).toBe(1);
    });

    it("does not detect revival when completions are evenly spaced", () => {
      const events: TerritorialEvent[] = [
        makeEvent("proposal.created", "prop-a", daysAgo(60)),
        makeEvent("proposal.converted_to_mission", "prop-a", daysAgo(55)),
        makeEvent("mission.completed", "miss-a", daysAgo(50)),
        makeEvent("proposal.created", "prop-b", daysAgo(40)),
        makeEvent("proposal.converted_to_mission", "prop-b", daysAgo(35)),
        makeEvent("mission.completed", "miss-b", daysAgo(30)),
      ];

      const memory = deriveDistrictMemory(events, [makeInitiative()]);
      const revivals = memory.milestones.filter((m) => m.type === "revival");
      expect(revivals.length).toBe(0);
    });
  });

  describe("themes", () => {
    it("groups initiatives by category, sorted by count descending", () => {
      const initiatives: Initiative[] = [
        makeInitiative({ category: "Medio ambiente" }),
        makeInitiative({ category: "Medio ambiente" }),
        makeInitiative({ category: "Educación" }),
        makeInitiative({ category: "Salud" }),
      ];

      const events: TerritorialEvent[] = [
        makeEvent("proposal.created", "p1", daysAgo(10)),
        makeEvent("proposal.created", "p2", daysAgo(9)),
        makeEvent("proposal.created", "p3", daysAgo(8)),
        makeEvent("proposal.created", "p4", daysAgo(7)),
      ];

      const memory = deriveDistrictMemory(events, initiatives);

      expect(memory.themes.length).toBe(3);
      expect(memory.themes[0].category).toBe("Medio ambiente");
      expect(memory.themes[0].initiativeCount).toBe(2);
    });

    it("returns empty themes when no initiatives", () => {
      const memory = deriveDistrictMemory([], []);
      expect(memory.themes).toEqual([]);
    });
  });

  describe("rhythm", () => {
    it("returns 'first_steps' for a small number of recent events", () => {
      const events: TerritorialEvent[] = [
        makeEvent("proposal.created", "p1", daysAgo(3)),
        makeEvent("proposal.supported", "p1", daysAgo(2)),
      ];

      const memory = deriveDistrictMemory(events, [makeInitiative()]);
      expect(memory.rhythm).toBe("first_steps");
    });

    it("returns 'steady' for regular activity over time", () => {
      const events: TerritorialEvent[] = Array.from({ length: 8 }, (_, i) =>
        makeEvent("proposal.supported", `p-${i}`, daysAgo(i * 10)),
      );

      const memory = deriveDistrictMemory(events, [makeInitiative()]);
      expect(memory.rhythm).toBe("steady");
    });

    it("returns 'bursty' for high event density", () => {
      const events: TerritorialEvent[] = Array.from({ length: 10 }, (_, i) =>
        makeEvent("proposal.created", `p-${i}`, daysAgo(i * 2)),
      );

      const memory = deriveDistrictMemory(events, [makeInitiative()]);
      expect(memory.rhythm).toBe("bursty");
    });
  });

  describe("knownFor", () => {
    it("is null when there are no initiatives", () => {
      const memory = deriveDistrictMemory([], []);
      expect(memory.knownFor).toBeNull();
    });

    it("reflects the dominant category", () => {
      const initiatives: Initiative[] = [
        makeInitiative({ category: "Medio ambiente" }),
        makeInitiative({ category: "Medio ambiente" }),
        makeInitiative({ category: "Medio ambiente" }),
        makeInitiative({ category: "Salud" }),
      ];

      const events: TerritorialEvent[] = [
        makeEvent("proposal.created", "p1", daysAgo(10)),
        makeEvent("proposal.created", "p2", daysAgo(9)),
        makeEvent("proposal.created", "p3", daysAgo(8)),
        makeEvent("proposal.created", "p4", daysAgo(7)),
      ];

      const memory = deriveDistrictMemory(events, initiatives);
      expect(memory.knownFor).toContain("Medio ambiente");
    });
  });

  describe("narrative — calm, living present", () => {
    it("mentions completions in narrative when present", () => {
      const events: TerritorialEvent[] = [
        makeEvent("proposal.created", "p1", daysAgo(60)),
        makeEvent("proposal.converted_to_mission", "p1", daysAgo(55)),
        makeEvent("mission.completed", "m1", daysAgo(50)),
      ];

      const memory = deriveDistrictMemory(events, [makeInitiative({ lifecycle: "completed" })]);
      expect(memory.narrative).toContain("completado");
    });

    it("produces a narrative that feels like present-tense storytelling", () => {
      const events: TerritorialEvent[] = [
        makeEvent("proposal.created", "p1", daysAgo(90)),
        makeEvent("proposal.converted_to_mission", "p1", daysAgo(85)),
        makeEvent("mission.completed", "m1", daysAgo(80)),
        makeEvent("proposal.created", "p2", daysAgo(60)),
        makeEvent("proposal.collaborator_joined", "p2", daysAgo(55)),
        makeEvent("proposal.converted_to_mission", "p2", daysAgo(50)),
        makeEvent("mission.completed", "m2", daysAgo(40)),
      ];

      const initiatives: Initiative[] = [
        makeInitiative({ category: "Medio ambiente", lifecycle: "completed" }),
        makeInitiative({
          id: "p2",
          sourceId: "p2",
          category: "Educación",
          lifecycle: "completed",
        }),
      ];

      const memory = deriveDistrictMemory(events, initiatives);

      expect(memory.narrative.length).toBeGreaterThan(30);
      expect(memory.milestones.length).toBeGreaterThan(0);
      expect(memory.themes.length).toBeGreaterThan(0);
      expect(memory.knownFor).toBeTruthy();
    });
  });
});
