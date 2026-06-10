import { describe, expect, it } from "vitest";
import { traceToNarrative, type CivicTraceNarrativeCtx } from "../civicTraceNarrative";
import type { CivicTrace } from "../civicTrace";
import type { AdjacencyMap } from "../spatialRelationships";

function makeTrace(overrides: Partial<CivicTrace> = {}): CivicTrace {
  return {
    initiativeId: "init-001",
    title: "Limpieza del río",
    districtSlug: "barranco",
    district: "Barranco",
    region: "costa",
    category: "Medio ambiente",
    coords: { lat: -12.14, lng: -77.02 },
    boundary: null,
    completedAt: "2026-06-01T00:00:00Z",
    verifiedCount: 3,
    strength: "settled",
    vitality: "settling",
    narrative:
      "Ruta completada en Barranco (Limpieza del río). La participación ha dejado una huella visible recientemente.",
    ...overrides,
  };
}

function corridorAdjacency(): AdjacencyMap {
  return new Map([
    ["barranco", [{ slug: "miraflores", name: "Miraflores", distanceKm: 3.5 }]],
    [
      "miraflores",
      [
        { slug: "barranco", name: "Barranco", distanceKm: 3.5 },
        { slug: "san_isidro", name: "San Isidro", distanceKm: 2.8 },
      ],
    ],
    ["san_isidro", [{ slug: "miraflores", name: "Miraflores", distanceKm: 2.8 }]],
  ]);
}

function isolatedAdjacency(): AdjacencyMap {
  return new Map([
    ["barranco", []],
    ["sjl", []],
  ]);
}

describe("traceToNarrative", () => {
  it("is deterministic: same input produces same output", () => {
    const trace = makeTrace();
    const ctx: CivicTraceNarrativeCtx = {
      activeSlugs: ["barranco", "miraflores"],
      adjacency: corridorAdjacency(),
      districtNarrative: "Barranco es un distrito costero con tradición comunitaria.",
    };
    const a = traceToNarrative(trace, ctx);
    const b = traceToNarrative(trace, ctx);
    expect(a).toBe(b);
  });

  it("uses districtNarrative when available without spatial context", () => {
    const trace = makeTrace({ coords: null });
    const ctx: CivicTraceNarrativeCtx = {
      activeSlugs: ["barranco"],
      adjacency: isolatedAdjacency(),
      districtNarrative: "Barranco es un distrito costero con tradición comunitaria.",
    };
    const result = traceToNarrative(trace, ctx);
    expect(result).toContain("Barranco es un distrito costero");
  });

  it("appends spatial context after districtNarrative", () => {
    const trace = makeTrace();
    const ctx: CivicTraceNarrativeCtx = {
      activeSlugs: ["barranco", "miraflores", "san_isidro"],
      adjacency: corridorAdjacency(),
      districtNarrative: "Barranco es un distrito costero con tradición comunitaria.",
    };
    const result = traceToNarrative(trace, ctx);
    expect(result).toContain("Barranco es un distrito costero");
    expect(result).toContain("corredor de 3 distritos");
  });

  it("mentions corridor when 3+ districts form a chain", () => {
    const trace = makeTrace();
    const ctx: CivicTraceNarrativeCtx = {
      activeSlugs: ["barranco", "miraflores", "san_isidro"],
      adjacency: corridorAdjacency(),
      districtNarrative: null,
    };
    const result = traceToNarrative(trace, ctx);
    expect(result).toContain("corredor de 3 distritos");
  });

  it("does not mention corridor when fewer than 3 districts", () => {
    const trace = makeTrace();
    const ctx: CivicTraceNarrativeCtx = {
      activeSlugs: ["barranco", "miraflores"],
      adjacency: corridorAdjacency(),
      districtNarrative: null,
    };
    const result = traceToNarrative(trace, ctx);
    expect(result).not.toContain("corredor");
  });

  it("mentions convergence zone when trace district is in a cluster", () => {
    const trace = makeTrace();
    const ctx: CivicTraceNarrativeCtx = {
      activeSlugs: ["barranco", "miraflores", "san_isidro"],
      adjacency: corridorAdjacency(),
      districtNarrative: null,
    };
    const result = traceToNarrative(trace, ctx);
    expect(result).toContain("zona de convergencia cívica");
  });

  it("does not mention convergence when trace district is isolated", () => {
    const trace = makeTrace({ districtSlug: "sjl", coords: { lat: -11.98, lng: -77.01 } });
    const ctx: CivicTraceNarrativeCtx = {
      activeSlugs: ["sjl"],
      adjacency: isolatedAdjacency(),
      districtNarrative: null,
    };
    const result = traceToNarrative(trace, ctx);
    expect(result).not.toContain("convergencia");
  });

  it("reports huella compacta when coords are available", () => {
    const trace = makeTrace();
    const ctx: CivicTraceNarrativeCtx = {
      activeSlugs: ["barranco"],
      adjacency: isolatedAdjacency(),
      districtNarrative: null,
    };
    const result = traceToNarrative(trace, ctx);
    expect(result).toContain("Huella compacta");
  });

  it("skips spread when coords are null", () => {
    const trace = makeTrace({ coords: null });
    const ctx: CivicTraceNarrativeCtx = {
      activeSlugs: ["barranco"],
      adjacency: isolatedAdjacency(),
      districtNarrative: null,
    };
    const result = traceToNarrative(trace, ctx);
    expect(result).not.toContain("Huella");
  });

  it("returns fallback when no spatial info and no district narrative", () => {
    const trace = makeTrace({ coords: null });
    const ctx: CivicTraceNarrativeCtx = {
      activeSlugs: ["barranco"],
      adjacency: isolatedAdjacency(),
      districtNarrative: null,
    };
    const result = traceToNarrative(trace, ctx);
    expect(result).toBe("No hay información espacial disponible para esta huella.");
  });

  it("composes corridor, convergence and spread together", () => {
    const trace = makeTrace();
    const ctx: CivicTraceNarrativeCtx = {
      activeSlugs: ["barranco", "miraflores", "san_isidro"],
      adjacency: corridorAdjacency(),
      districtNarrative: null,
    };
    const result = traceToNarrative(trace, ctx);
    expect(result).toContain("corredor de 3 distritos");
    expect(result).toContain("zona de convergencia cívica");
    expect(result).toContain("Huella compacta");
  });
});
