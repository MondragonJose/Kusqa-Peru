import { supabase } from "@/lib/supabase";
import type { Region } from "@/types";

export type DistrictGeometry = {
  id: string;
  slug: string;
  displayName: string;
  region: Region;
  department: string | null;
  latitude: number;
  longitude: number;
  boundary: {
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: { type: "Polygon"; coordinates: number[][][] };
  } | null;
  svgX: number | null;
  svgY: number | null;
  narrative: string | null;
};

export type RegionMetadata = {
  slug: string;
  displayName: string;
  svgX: number;
  svgY: number;
};

export type TerritoryNode = {
  id: string;
  name: string;
  type: "region" | "department" | "district";
  coords: { lat: number; lng: number };
  zoom: number;
  regionKey: Region;
};

type RawDistrictRow = {
  id: string;
  slug: string;
  display_name: string;
  region: string;
  department: string | null;
  latitude: number | null;
  longitude: number | null;
  boundary: Record<string, unknown> | null;
  svg_x: number | null;
  svg_y: number | null;
  narrative: string | null;
};

type RawRegionRow = {
  slug: string;
  display_name: string;
  svg_x: number;
  svg_y: number;
};

function parseRaw(row: RawDistrictRow): DistrictGeometry {
  const region = (["costa", "sierra", "selva"] as Region[]).includes(row.region as Region)
    ? (row.region as Region)
    : "costa";
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    region,
    department: row.department,
    latitude: row.latitude ?? 0,
    longitude: row.longitude ?? 0,
    boundary: row.boundary as DistrictGeometry["boundary"],
    svgX: row.svg_x,
    svgY: row.svg_y,
    narrative: row.narrative,
  };
}

const ZOOM_FOR_SIZE: Record<string, number> = {
  region: 7,
  department: 10,
  district: 14,
};

export const spatialRepository = {
  async getAllGeometry(): Promise<DistrictGeometry[]> {
    const { data, error } = await supabase
      .from("districts")
      .select(
        "id, slug, display_name, region, department, latitude, longitude, boundary, svg_x, svg_y, narrative",
      )
      .not("latitude", "is", null)
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true });

    if (error) {
      console.error("[KUSQA SPATIAL] Error loading geometry:", error);
      return [];
    }

    return (data ?? []).map((row: unknown) => parseRaw(row as RawDistrictRow));
  },

  async getDistrictGeometry(slug: string): Promise<DistrictGeometry | null> {
    const { data, error } = await supabase
      .from("districts")
      .select(
        "id, slug, display_name, region, department, latitude, longitude, boundary, svg_x, svg_y, narrative",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;
    return parseRaw(data as unknown as RawDistrictRow);
  },

  async getAllRegionMetadata(): Promise<RegionMetadata[]> {
    const { data, error } = await supabase
      .from("region_metadata")
      .select("slug, display_name, svg_x, svg_y")
      .order("slug");

    if (error) {
      console.error("[KUSQA SPATIAL] Error loading region metadata:", error);
      return [];
    }

    return (data ?? []).map((row: unknown) => {
      const r = row as RawRegionRow;
      return { slug: r.slug, displayName: r.display_name, svgX: r.svg_x, svgY: r.svg_y };
    });
  },

  buildHierarchy(geometry: DistrictGeometry[]): TerritoryNode[] {
    const nodes: TerritoryNode[] = [];
    const seenRegions = new Set<string>();
    const seenDepartments = new Set<string>();

    for (const g of geometry) {
      // Region node (once per region)
      if (!seenRegions.has(g.region)) {
        seenRegions.add(g.region);
        const regionCoords = this.regionCenter(g.region);
        nodes.push({
          id: g.region,
          name: this.regionDisplayName(g.region),
          type: "region",
          coords: regionCoords,
          zoom: ZOOM_FOR_SIZE.region,
          regionKey: g.region,
        });
      }

      // Department node (once per department)
      const deptId = g.department ?? g.region;
      if (!seenDepartments.has(deptId)) {
        seenDepartments.add(deptId);
        nodes.push({
          id: deptId,
          name: g.department ?? this.regionDisplayName(g.region),
          type: "department",
          coords: { lat: g.latitude, lng: g.longitude },
          zoom: ZOOM_FOR_SIZE.department,
          regionKey: g.region,
        });
      }

      // District node
      nodes.push({
        id: g.slug,
        name: g.displayName,
        type: "district",
        coords: { lat: g.latitude, lng: g.longitude },
        zoom: ZOOM_FOR_SIZE.district,
        regionKey: g.region,
      });
    }

    return nodes;
  },

  regionCenter(region: Region): { lat: number; lng: number } {
    switch (region) {
      case "costa":
        return { lat: -10.0, lng: -77.5 };
      case "sierra":
        return { lat: -13.5, lng: -71.9 };
      case "selva":
        return { lat: -3.7, lng: -73.2 };
    }
  },

  regionDisplayName(region: Region): string {
    switch (region) {
      case "costa":
        return "Costa";
      case "sierra":
        return "Sierra";
      case "selva":
        return "Selva";
    }
  },

  svgCoords(
    geometry: DistrictGeometry[],
    slug: string,
    region: Region,
  ): { x: number; y: number } | null {
    const district = geometry.find((g) => g.slug === slug);
    if (district?.svgX != null && district.svgY != null) {
      return { x: district.svgX, y: district.svgY };
    }

    const partial = geometry.find((g) => slug.includes(g.slug) || g.slug.includes(slug));
    if (partial?.svgX != null && partial.svgY != null) {
      return { x: partial.svgX, y: partial.svgY };
    }

    return null;
  },

  /**
   * Build a hierarchy tree matching the TERRITORY_HIERARCHY shape:
   *   Record<string, TerritoryNode[]>
   * Key "root" → region nodes.
   * Each region key → department nodes within that region.
   * Each department id → district nodes within that department.
   */
  buildHierarchyTree(geometry: DistrictGeometry[]): Record<string, TerritoryNode[]> {
    const tree: Record<string, TerritoryNode[]> = {};
    const byRegion: Record<string, { department: string; nodes: TerritoryNode[] }[]> = {};
    const byDepartment: Record<string, TerritoryNode[]> = {};

    const seenRegions = new Set<string>();
    const seenDepartments = new Set<string>();

    for (const g of geometry) {
      const regionKey = g.region;

      // Region node (once)
      if (!seenRegions.has(regionKey)) {
        seenRegions.add(regionKey);
        const rootNodes = tree.root ?? [];
        rootNodes.push({
          id: regionKey,
          name: this.regionDisplayName(regionKey),
          type: "region",
          coords: this.regionCenter(regionKey),
          zoom: ZOOM_FOR_SIZE.region,
          regionKey,
        });
        tree.root = rootNodes;
      }

      // Department node (once per department within region)
      const deptId = g.department ?? regionKey;
      const deptKey = `${regionKey}:${deptId}`;
      if (!seenDepartments.has(deptKey)) {
        seenDepartments.add(deptKey);
        const regionNodes = tree[regionKey] ?? [];
        regionNodes.push({
          id: deptId,
          name: g.department ?? this.regionDisplayName(regionKey),
          type: "department",
          coords: { lat: g.latitude, lng: g.longitude },
          zoom: ZOOM_FOR_SIZE.department,
          regionKey,
        });
        tree[regionKey] = regionNodes;
      }

      // District node
      const deptNodes = byDepartment[deptId] ?? [];
      deptNodes.push({
        id: g.slug,
        name: g.displayName,
        type: "district",
        coords: { lat: g.latitude, lng: g.longitude },
        zoom: ZOOM_FOR_SIZE.district,
        regionKey,
      });
      byDepartment[deptId] = deptNodes;
    }

    // Merge district nodes into tree
    for (const [deptId, nodes] of Object.entries(byDepartment)) {
      tree[deptId] = nodes;
    }

    return tree;
  },
};
