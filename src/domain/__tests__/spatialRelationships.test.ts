import { describe, expect, it } from "vitest";
import type { DistrictGeometry } from "@/services/spatialRepository";
import type { MapCoords } from "@/types";
import {
  buildAdjacencyMap,
  buildGeometryCoordMap,
  computeTerritorialSpread,
  checkContiguity,
  detectCorridor,
  detectIsolation,
  findConvergenceZones,
} from "../spatialRelationships";

function makeGeo(
  slug: string,
  lat: number,
  lng: number,
  displayName?: string,
): DistrictGeometry {
  return {
    id: slug,
    slug,
    displayName: displayName ?? slug,
    region: "sierra",
    department: null,
    latitude: lat,
    longitude: lng,
    boundary: null,
    svgX: null,
    svgY: null,
    narrative: null,
  };
}

describe("buildAdjacencyMap", () => {
  const geometries = [
    makeGeo("a", -13.5, -72.0, "A"),
    makeGeo("b", -13.6, -72.1, "B"),
    makeGeo("c", -14.0, -73.0, "C"),
  ];

  it("returns neighbors within threshold", () => {
    const map = buildAdjacencyMap(geometries, 25);
    expect(map.get("a")!.map((n) => n.slug)).toContain("b");
    expect(map.get("a")!.map((n) => n.slug)).not.toContain("c");
  });

  it("sorts neighbors by distance ascending", () => {
    const closeGeos = [
      makeGeo("a", -13.5, -72.0, "A"),
      makeGeo("b", -13.51, -72.01, "B"),
      makeGeo("c", -13.52, -72.02, "C"),
    ];
    const map = buildAdjacencyMap(closeGeos, 20);
    const aNeighbors = map.get("a")!;
    expect(aNeighbors.length).toBeGreaterThanOrEqual(2);
    expect(aNeighbors[0].distanceKm).toBeLessThanOrEqual(aNeighbors[1].distanceKm);
  });

  it("returns empty neighbors for isolated district", () => {
    const geo = [makeGeo("alone", -15.0, -75.0), makeGeo("far", -5.0, -80.0)];
    const map = buildAdjacencyMap(geo, 25);
    expect(map.get("alone")).toEqual([]);
  });
});

describe("buildGeometryCoordMap", () => {
  it("builds a lookup from slug to coords", () => {
    const geometries = [makeGeo("x", -13.0, -72.0)];
    const map = buildGeometryCoordMap(geometries);
    expect(map.get("x")).toEqual({ lat: -13.0, lng: -72.0 });
  });

  it("skips entries with null lat/lng", () => {
    const geometries = [
      { ...makeGeo("ok", -13.0, -72.0), latitude: null as unknown as number },
    ];
    const map = buildGeometryCoordMap(geometries);
    expect(map.has("ok")).toBe(false);
  });
});

describe("computeTerritorialSpread", () => {
  const coordMap = new Map<string, MapCoords>([
    ["a", { lat: -13.5, lng: -72.0 }],
    ["b", { lat: -13.6, lng: -72.1 }],
    ["c", { lat: -14.0, lng: -73.0 }],
  ]);

  it("returns compact for a single district", () => {
    const result = computeTerritorialSpread(["a"], coordMap);
    expect(result.level).toBe("compact");
    expect(result.spreadKm).toBe(0);
  });

  it("returns compact for close districts", () => {
    const result = computeTerritorialSpread(["a", "b"], coordMap);
    expect(result.level).toBe("compact");
  });
});

describe("checkContiguity", () => {
  it("returns isolated for single district", () => {
    const map = buildAdjacencyMap([makeGeo("a", -13.5, -72.0)]);
    expect(checkContiguity(["a"], map)).toBe("isolated");
  });

  it("returns contiguous for connected chain", () => {
    const geometries = [
      makeGeo("a", -13.5, -72.0),
      makeGeo("b", -13.55, -72.05),
      makeGeo("c", -13.6, -72.1),
    ];
    const map = buildAdjacencyMap(geometries, 20);
    expect(checkContiguity(["a", "b", "c"], map)).toBe("contiguous");
  });
});

describe("detectCorridor", () => {
  it("returns false for fewer than 3 districts", () => {
    const map = buildAdjacencyMap([makeGeo("a", -13.5, -72.0), makeGeo("b", -13.6, -72.1)], 20);
    expect(detectCorridor(["a", "b"], map).isCorridor).toBe(false);
  });

  it("detects corridor for 3 connected districts", () => {
    const geometries = [
      makeGeo("a", -13.5, -72.0),
      makeGeo("b", -13.55, -72.05),
      makeGeo("c", -13.6, -72.1),
    ];
    const map = buildAdjacencyMap(geometries, 20);
    const result = detectCorridor(["a", "b", "c"], map);
    expect(result.isCorridor).toBe(true);
    expect(result.chainLength).toBeGreaterThanOrEqual(3);
  });
});

describe("detectIsolation", () => {
  it("returns true when district has no active neighbors", () => {
    const geometries = [
      makeGeo("active", -13.5, -72.0),
      makeGeo("far", -10.0, -75.0),
    ];
    const map = buildAdjacencyMap(geometries, 20);
    expect(detectIsolation("active", ["active"], map)).toBe(true);
  });
});

describe("findConvergenceZones", () => {
  it("finds connected components among active districts", () => {
    const geometries = [
      makeGeo("a", -13.5, -72.0),
      makeGeo("b", -13.55, -72.05),
      makeGeo("c", -14.0, -73.0),
      makeGeo("d", -14.05, -73.05),
    ];
    const map = buildAdjacencyMap(geometries, 25);
    const zones = findConvergenceZones(["a", "b", "c", "d"], map);
    expect(zones.length).toBeGreaterThanOrEqual(2);
  });
});
