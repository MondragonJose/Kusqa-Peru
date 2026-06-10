import { describe, expect, it } from "vitest";
import {
  deriveTraceStrength,
  deriveTraceVitality,
  deriveCivicTrace,
  type CivicTraceInput,
} from "../civicTrace";

function makeInput(overrides: Partial<CivicTraceInput> = {}): CivicTraceInput {
  return {
    initiativeId: "init-001",
    title: "Limpieza del río",
    districtSlug: "barranco",
    district: "Barranco",
    region: "costa",
    category: "Medio ambiente",
    coords: { lat: -12.14, lng: -77.02 },
    boundary: null,
    completedAt: null,
    verifiedCount: 0,
    ...overrides,
  };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

describe("deriveTraceStrength", () => {
  it("returns 'faint' for 1 verification", () => {
    expect(deriveTraceStrength(1)).toBe("faint");
  });

  it("returns 'settled' for 2 verifications", () => {
    expect(deriveTraceStrength(2)).toBe("settled");
  });

  it("returns 'settled' for 4 verifications", () => {
    expect(deriveTraceStrength(4)).toBe("settled");
  });

  it("returns 'landmark' for 5 verifications", () => {
    expect(deriveTraceStrength(5)).toBe("landmark");
  });

  it("returns 'landmark' for many verifications", () => {
    expect(deriveTraceStrength(20)).toBe("landmark");
  });
});

describe("deriveTraceVitality", () => {
  it("returns 'fresh' for activity within 30 days", () => {
    expect(deriveTraceVitality(daysAgo(5), new Date())).toBe("fresh");
  });

  it("returns 'fresh' for activity today", () => {
    expect(deriveTraceVitality(new Date().toISOString(), new Date())).toBe("fresh");
  });

  it("returns 'settling' for activity between 31 and 90 days", () => {
    expect(deriveTraceVitality(daysAgo(45), new Date())).toBe("settling");
  });

  it("returns 'settling' at exactly 90 days", () => {
    expect(deriveTraceVitality(daysAgo(90), new Date())).toBe("settling");
  });

  it("returns 'dormant' for activity older than 90 days", () => {
    expect(deriveTraceVitality(daysAgo(91), new Date())).toBe("dormant");
  });

  it("returns 'dormant' for very old activity", () => {
    expect(deriveTraceVitality(daysAgo(365), new Date())).toBe("dormant");
  });
});

describe("deriveCivicTrace", () => {
  it("returns null when completedAt is null", () => {
    expect(deriveCivicTrace(makeInput())).toBeNull();
  });

  it("returns null when verifiedCount < 1", () => {
    expect(deriveCivicTrace(makeInput({ completedAt: daysAgo(5), verifiedCount: 0 }))).toBeNull();
  });

  it("returns null when both conditions fail", () => {
    expect(deriveCivicTrace(makeInput())).toBeNull();
  });

  it("returns a faint trace with valid input", () => {
    const trace = deriveCivicTrace(makeInput({ completedAt: daysAgo(5), verifiedCount: 1 }));
    expect(trace).not.toBeNull();
    expect(trace!.initiativeId).toBe("init-001");
    expect(trace!.strength).toBe("faint");
    expect(trace!.vitality).toBe("fresh");
    expect(trace!.narrative).toContain("huella aún es tenue");
  });

  it("returns a settled trace with 3 verifications and recent activity", () => {
    const trace = deriveCivicTrace(makeInput({ completedAt: daysAgo(45), verifiedCount: 3 }));
    expect(trace).not.toBeNull();
    expect(trace!.strength).toBe("settled");
    expect(trace!.vitality).toBe("settling");
    expect(trace!.narrative).toContain("huella visible");
  });

  it("returns a landmark trace with 5+ verifications", () => {
    const trace = deriveCivicTrace(makeInput({ completedAt: daysAgo(10), verifiedCount: 5 }));
    expect(trace).not.toBeNull();
    expect(trace!.strength).toBe("landmark");
    expect(trace!.vitality).toBe("fresh");
    expect(trace!.narrative).toContain("hito cívico");
  });

  it("returns a dormant trace for old completions", () => {
    const trace = deriveCivicTrace(makeInput({ completedAt: daysAgo(200), verifiedCount: 2 }));
    expect(trace).not.toBeNull();
    expect(trace!.strength).toBe("settled");
    expect(trace!.vitality).toBe("dormant");
    expect(trace!.narrative).toContain("anteriormente");
  });

  it("preserves all input fields in output", () => {
    const input = makeInput({
      completedAt: daysAgo(3),
      verifiedCount: 2,
      coords: { lat: -12.14, lng: -77.02 },
      boundary: { type: "Feature", properties: {}, geometry: null },
    });
    const trace = deriveCivicTrace(input);
    expect(trace).not.toBeNull();
    expect(trace!.initiativeId).toBe(input.initiativeId);
    expect(trace!.districtSlug).toBe(input.districtSlug);
    expect(trace!.region).toBe(input.region);
    expect(trace!.category).toBe(input.category);
    expect(trace!.coords).toEqual(input.coords);
    expect(trace!.boundary).toEqual(input.boundary);
    expect(trace!.completedAt).toBe(input.completedAt);
    expect(trace!.verifiedCount).toBe(input.verifiedCount);
  });

  it("handles null coords gracefully", () => {
    const trace = deriveCivicTrace(
      makeInput({ completedAt: daysAgo(1), verifiedCount: 2, coords: null }),
    );
    expect(trace).not.toBeNull();
    expect(trace!.coords).toBeNull();
  });
});
