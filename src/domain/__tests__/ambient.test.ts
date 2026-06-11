import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  deriveAmbientCadence,
  deriveAmbientSignal,
  deriveAmbientPulse,
  initiativesToAmbientEvents,
} from "@/domain/ambient";
import type { TerritorialEvent } from "@/domain/territorialEvent";
import type { Initiative } from "@/domain/initiative";

// Fixed "today": Wednesday 2026-06-10 12:00 UTC
const NOW = new Date("2026-06-10T12:00:00Z");

function iso(daysAgo: number, hour = 10): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

function event(overrides: Partial<TerritorialEvent> & { daysAgo?: number }): TerritorialEvent {
  const age = overrides.daysAgo ?? 0;
  const ts = iso(age);
  return {
    id: overrides.id ?? `evt-${Math.random().toString(36).slice(2, 8)}`,
    type: overrides.type ?? "proposal.created",
    actor: overrides.actor ?? {
      id: "user-1",
      username: "user1",
      firstName: "User",
      avatarUrl: null,
    },
    entityType: overrides.entityType ?? "proposal",
    entityId: overrides.entityId ?? "entity-1",
    entityTitle: overrides.entityTitle ?? "Test event",
    districtId: overrides.districtId ?? null,
    region: overrides.region ?? "costa",
    createdAt: ts,
    metadata: overrides.metadata ?? {},
  };
}

function makeInitiative(overrides?: Partial<Initiative>): Initiative {
  return {
    id: "initiative-1",
    sourceType: "mission",
    sourceId: "mission-1",
    title: "Test mission",
    summary: "A test mission",
    category: "Medio ambiente",
    region: "costa",
    lifecycle: "forming",
    temporalAnchor: { label: "Próximamente", kind: "scheduled", referenceDate: iso(0) },
    emoji: "🌊",
    location: {
      district: "Miraflores",
      districtId: null,
      region: "costa",
      coords: null,
      locationLabel: null,
    },
    ...overrides,
  };
}

// ─── deriveAmbientCadence ───────────────────────────────────────────────────

describe("deriveAmbientCadence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns calm pulse and zeros for empty events", () => {
    const c = deriveAmbientCadence([]);
    expect(c.pulse).toBe("calm");
    expect(c.eventsLast7d).toBe(0);
    expect(c.eventsLast30d).toBe(0);
    expect(c.uniqueActors).toBe(0);
    expect(c.diversity).toBe(0);
    expect(c.lastActivityAt).toBeNull();
  });

  it("returns steady pulse for 1-2 events in last 7 days", () => {
    const events = [event({ daysAgo: 1 }), event({ daysAgo: 3 })];
    const c = deriveAmbientCadence(events);
    expect(c.pulse).toBe("steady");
    expect(c.eventsLast7d).toBe(2);
    expect(c.eventsLast30d).toBe(2);
  });

  it("returns lively pulse for 3-5 events in last 7 days", () => {
    const events = Array.from({ length: 4 }, (_, i) => event({ daysAgo: i + 1 }));
    const c = deriveAmbientCadence(events);
    expect(c.pulse).toBe("lively");
    expect(c.eventsLast7d).toBe(4);
  });

  it("returns intense pulse for 6+ events in last 7 days", () => {
    const events = Array.from({ length: 6 }, (_, i) => event({ daysAgo: i }));
    const c = deriveAmbientCadence(events);
    expect(c.pulse).toBe("intense");
    expect(c.eventsLast7d).toBeGreaterThan(5);
  });

  it("only counts events within 7 and 30 day windows", () => {
    const events = [
      event({ daysAgo: 2 }), // within 7d
      event({ daysAgo: 10 }), // within 30d
      event({ daysAgo: 50 }), // outside both
    ];
    const c = deriveAmbientCadence(events);
    expect(c.eventsLast7d).toBe(1);
    expect(c.eventsLast30d).toBe(2);
  });

  it("counts unique actors", () => {
    const events = [
      event({ daysAgo: 1, actor: { id: "a", username: "a", firstName: "A", avatarUrl: null } }),
      event({ daysAgo: 2, actor: { id: "a", username: "a", firstName: "A", avatarUrl: null } }),
      event({ daysAgo: 3, actor: { id: "b", username: "b", firstName: "B", avatarUrl: null } }),
    ];
    const c = deriveAmbientCadence(events);
    expect(c.uniqueActors).toBe(2);
  });

  it("tracks event type diversity", () => {
    const events = [
      event({ daysAgo: 1, type: "proposal.created" }),
      event({ daysAgo: 2, type: "proposal.supported" }),
      event({ daysAgo: 3, type: "mission.joined" }),
    ];
    const c = deriveAmbientCadence(events);
    expect(c.diversity).toBe(3);
  });

  it("sets lastActivityAt to the most recent event date", () => {
    const events = [event({ daysAgo: 10 }), event({ daysAgo: 1 }), event({ daysAgo: 5 })];
    const c = deriveAmbientCadence(events);
    expect(c.lastActivityAt).toBe(iso(1));
  });
});

// ─── deriveAmbientSignal ────────────────────────────────────────────────────

describe("deriveAmbientSignal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns quiet mood for empty events", () => {
    const s = deriveAmbientSignal([]);
    expect(s.mood).toBe("quiet");
    expect(s.energy).toBe(0);
    expect(s.tone).toBe("El distrito está en calma.");
    expect(s.cadence.pulse).toBe("calm");
  });

  it("returns determined mood when conversions exist with intense cadence", () => {
    const events = Array.from({ length: 7 }, (_, i) =>
      event({
        daysAgo: i,
        type: i < 5 ? "proposal.created" : "proposal.converted_to_mission",
      }),
    );
    const s = deriveAmbientSignal(events);
    expect(s.mood).toBe("determined");
    expect(s.cadence.pulse).toBe("intense");
  });

  it("returns determined mood when conversions exist without intense cadence", () => {
    const events = [
      event({ daysAgo: 1, type: "proposal.created" }),
      event({ daysAgo: 2, type: "proposal.converted_to_mission" }),
    ];
    const s = deriveAmbientSignal(events);
    expect(s.mood).toBe("determined");
    expect(s.cadence.pulse).toBe("steady");
  });

  it("returns vibrant mood for lively cadence without conversions", () => {
    const events = Array.from({ length: 4 }, (_, i) =>
      event({ daysAgo: i + 1, type: "proposal.created" }),
    );
    const s = deriveAmbientSignal(events);
    expect(s.mood).toBe("vibrant");
    expect(s.cadence.pulse).toBe("lively");
  });

  it("returns hopeful mood when there are new proposals with low cadence", () => {
    const events = [event({ daysAgo: 1, type: "proposal.created" })];
    const s = deriveAmbientSignal(events);
    expect(s.mood).toBe("hopeful");
  });

  it("returns awakening for steady cadence without conversions or proposals", () => {
    const events = [
      event({ daysAgo: 1, type: "mission.joined" }),
      event({ daysAgo: 3, type: "proposal.supported" }),
    ];
    const s = deriveAmbientSignal(events);
    expect(s.mood).toBe("awakening");
    expect(s.cadence.pulse).toBe("steady");
  });

  it("returns awakening when no events in 30d but events exist", () => {
    const events = [event({ daysAgo: 35, type: "mission.joined" })];
    const s = deriveAmbientSignal(events);
    expect(s.mood).toBe("quiet");
  });

  it("uses vitality score for energy when provided", () => {
    const events = Array.from({ length: 4 }, (_, i) => event({ daysAgo: i + 1 }));
    const s = deriveAmbientSignal(events, { score: 8, label: "vibrant" } as never);
    expect(s.energy).toBe(8);
  });

  it("computes energy from cadence when vitality score is not provided", () => {
    const events = Array.from({ length: 4 }, (_, i) =>
      event({
        daysAgo: i + 1,
        actor: { id: `user-${i}`, username: `u${i}`, firstName: "U", avatarUrl: null },
      }),
    );
    const s = deriveAmbientSignal(events);
    // 3+ events in 7d => +3+2, 3+ unique actors => +2, 1 type => +0
    expect(s.energy).toBeGreaterThan(0);
  });
});

// ─── deriveAmbientPulse ─────────────────────────────────────────────────────

describe("deriveAmbientPulse", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for empty events", () => {
    const p = deriveAmbientPulse([], "miraflores", "Miraflores");
    expect(p).toBeNull();
  });

  it("returns full pulse with district metadata for non-empty events", () => {
    const events = [event({ daysAgo: 1 })];
    const p = deriveAmbientPulse(events, "miraflores", "Miraflores");
    expect(p).not.toBeNull();
    expect(p!.districtSlug).toBe("miraflores");
    expect(p!.districtName).toBe("Miraflores");
    expect(p!.signal.mood).toBe("hopeful");
    expect(p!.vitalityRef).toBeNull();
    expect(p!.spatialRef).toBeNull();
  });
});

// ─── initiativesToAmbientEvents ─────────────────────────────────────────────

describe("initiativesToAmbientEvents", () => {
  it("excludes initiatives without referenceDate", () => {
    const initiatives = [
      makeInitiative({
        temporalAnchor: { label: "Próximamente", kind: "scheduled", referenceDate: null },
      }),
      makeInitiative({
        temporalAnchor: { label: "Mañana", kind: "countdown", referenceDate: iso(0) },
      }),
    ];
    const events = initiativesToAmbientEvents(initiatives);
    expect(events).toHaveLength(1);
    expect(events[0].entityTitle).toBe("Test mission");
  });

  it("maps mission-type initiatives to mission.joined events", () => {
    const initiatives = [makeInitiative({ sourceType: "mission" })];
    const events = initiativesToAmbientEvents(initiatives);
    expect(events[0].type).toBe("mission.joined");
    expect(events[0].entityType).toBe("mission");
  });

  it("maps proposal-type initiatives to proposal.created events", () => {
    const initiatives = [makeInitiative({ sourceType: "proposal" })];
    const events = initiativesToAmbientEvents(initiatives);
    expect(events[0].type).toBe("proposal.created");
    expect(events[0].entityType).toBe("proposal");
  });

  it("uses temporalAnchor.referenceDate as createdAt", () => {
    const refDate = iso(0);
    const initiatives = [
      makeInitiative({
        temporalAnchor: { label: "Mañana", kind: "countdown", referenceDate: refDate },
      }),
    ];
    const events = initiativesToAmbientEvents(initiatives);
    expect(events[0].createdAt).toBe(refDate);
  });
});
