import { describe, expect, it } from "vitest";
import {
  getFootprintMarkerStyle,
  type FootprintMarkerStyle,
} from "../useFootprintMarkerLayer";
import { deriveCivicTrace, type CivicTraceInput } from "@/domain/civicTrace";
import type { CivicTrace } from "@/domain/civicTrace";

function mkTrace(overrides: Partial<CivicTrace> = {}): CivicTrace {
  return {
    initiativeId: "m1",
    title: "Limpieza de playa",
    districtSlug: "barranco",
    district: "Barranco",
    region: "costa",
    category: "Comunidad",
    coords: { lat: -12.1, lng: -77.0 },
    boundary: null,
    completedAt: "2025-06-10T00:00:00Z",
    verifiedCount: 3,
    strength: "settled",
    vitality: "settling",
    narrative: "Huella visible en Barranco.",
    ...overrides,
  };
}

// ─── getFootprintMarkerStyle ──────────────────────────────────────────────

describe("getFootprintMarkerStyle", () => {
  it("returns landmark size 40 for landmark-strength traces", () => {
    const style = getFootprintMarkerStyle(mkTrace({ strength: "landmark", verifiedCount: 5 }));
    expect(style.iconSize).toBe(40);
  });

  it("returns settled size 34 for settled traces", () => {
    const style = getFootprintMarkerStyle(mkTrace({ strength: "settled", verifiedCount: 3 }));
    expect(style.iconSize).toBe(34);
  });

  it("returns faint size 32 for faint traces", () => {
    const style = getFootprintMarkerStyle(mkTrace({ strength: "faint", verifiedCount: 1 }));
    expect(style.iconSize).toBe(32);
  });

  it("marks dormant traces with opacity 50%", () => {
    const style = getFootprintMarkerStyle(mkTrace({ vitality: "dormant" }));
    expect(style.opacity).toBe(50);
  });

  it("marks non-dormant traces with opacity 75%", () => {
    const style = getFootprintMarkerStyle(mkTrace({ vitality: "fresh" }));
    expect(style.opacity).toBe(75);
  });

  it("returns lower saturate for dormant traces", () => {
    const dormant = getFootprintMarkerStyle(mkTrace({ vitality: "dormant" }));
    const fresh = getFootprintMarkerStyle(mkTrace({ vitality: "fresh" }));
    expect(dormant.saturate).toBeLessThan(fresh.saturate);
  });

  it("returns landmark emoji 🏛️ for landmarks", () => {
    const style = getFootprintMarkerStyle(mkTrace({ strength: "landmark" }));
    expect(style.emoji).toBe("🏛️");
  });

  it("returns settled emoji 🦙 for settled traces", () => {
    const style = getFootprintMarkerStyle(mkTrace({ strength: "settled" }));
    expect(style.emoji).toBe("🦙");
  });

  it("returns faint emoji 📍 for faint traces", () => {
    const style = getFootprintMarkerStyle(mkTrace({ strength: "faint" }));
    expect(style.emoji).toBe("📍");
  });

  it("returns amber border for landmark traces", () => {
    const style = getFootprintMarkerStyle(mkTrace({ strength: "landmark" }));
    expect(style.borderClass).toContain("amber");
  });

  it("returns stone border for non-landmark traces", () => {
    const settled = getFootprintMarkerStyle(mkTrace({ strength: "settled" }));
    const faint = getFootprintMarkerStyle(mkTrace({ strength: "faint" }));
    expect(settled.borderClass).toContain("stone");
    expect(faint.borderClass).toContain("stone");
  });

  it("returns a valid FootprintMarkerStyle for all strength+vitality combinations", () => {
    const strengths: CivicTrace["strength"][] = ["faint", "settled", "landmark"];
    const vitalities: CivicTrace["vitality"][] = ["fresh", "settling", "dormant"];
    for (const strength of strengths) {
      for (const vitality of vitalities) {
        const style = getFootprintMarkerStyle(mkTrace({ strength, vitality }));
        expect(style.iconSize).toBeGreaterThanOrEqual(32);
        expect(style.opacity).toBeGreaterThanOrEqual(50);
        expect(style.emoji).toBeTruthy();
        expect(style.borderClass).toBeTruthy();
      }
    }
  });
});

// ─── deriveCivicTrace → FootprintMarkerStyle integration ──────────────────

describe("deriveCivicTrace → getFootprintMarkerStyle integration", () => {
  function mkInput(overrides: Partial<CivicTraceInput> = {}): CivicTraceInput {
    return {
      initiativeId: "m1",
      title: "Limpieza de playa",
      districtSlug: "barranco",
      district: "Barranco",
      region: "costa",
      category: "Medio ambiente",
      coords: { lat: -12.1, lng: -77.0 },
      boundary: null,
      completedAt: "2025-06-10T00:00:00Z",
      verifiedCount: 1,
      ...overrides,
    };
  }

  it("returns faint style when verifiedCount < 2", () => {
    const trace = deriveCivicTrace(mkInput({ verifiedCount: 1 }));
    expect(trace).not.toBeNull();
    const style = getFootprintMarkerStyle(trace!);
    expect(style.emoji).toBe("📍");
    expect(style.iconSize).toBe(32);
  });

  it("returns settled style when verifiedCount >= 2 and < 5", () => {
    const trace = deriveCivicTrace(mkInput({ verifiedCount: 3 }));
    expect(trace).not.toBeNull();
    expect(trace!.strength).toBe("settled");
    const style = getFootprintMarkerStyle(trace!);
    expect(style.emoji).toBe("🦙");
    expect(style.iconSize).toBe(34);
  });

  it("returns landmark style when verifiedCount >= 5", () => {
    const trace = deriveCivicTrace(mkInput({ verifiedCount: 7 }));
    expect(trace).not.toBeNull();
    expect(trace!.strength).toBe("landmark");
    const style = getFootprintMarkerStyle(trace!);
    expect(style.emoji).toBe("🏛️");
    expect(style.iconSize).toBe(40);
  });

  it("returns null (no marker) when verifiedCount < 1", () => {
    const trace = deriveCivicTrace(mkInput({ verifiedCount: 0 }));
    expect(trace).toBeNull();
  });

  it("returns null (no marker) when completedAt is null", () => {
    const trace = deriveCivicTrace(mkInput({ completedAt: null }));
    expect(trace).toBeNull();
  });

  it("returns fresh vitality for recent completion", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 5);
    const trace = deriveCivicTrace(mkInput({
      verifiedCount: 2,
      completedAt: recent.toISOString(),
    }));
    expect(trace).not.toBeNull();
    expect(trace!.vitality).toBe("fresh");
  });

  it("returns dormant vitality for old completion (90+ days)", () => {
    const old = new Date();
    old.setDate(old.getDate() - 120);
    const trace = deriveCivicTrace(mkInput({
      verifiedCount: 2,
      completedAt: old.toISOString(),
    }));
    expect(trace).not.toBeNull();
    expect(trace!.vitality).toBe("dormant");
  });

  it("dormant traces get lower opacity via getFootprintMarkerStyle", () => {
    const old = new Date();
    old.setDate(old.getDate() - 120);
    const trace = deriveCivicTrace(mkInput({
      verifiedCount: 5,
      completedAt: old.toISOString(),
    }));
    expect(trace).not.toBeNull();
    expect(trace!.strength).toBe("landmark");
    expect(trace!.vitality).toBe("dormant");
    const style = getFootprintMarkerStyle(trace!);
    expect(style.opacity).toBe(50);
    expect(style.saturate).toBe(0.3);
  });
});
