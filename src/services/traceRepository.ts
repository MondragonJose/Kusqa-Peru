import { supabase } from "@/lib/supabase";
import { spatialRepository } from "@/services/spatialRepository";
import { dbToCategory } from "@/domain/categories";
import type { CivicTraceInput } from "@/domain/civicTrace";

export type BBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

type MissionRow = {
  id: string;
  title: string;
  district: string;
  district_id: string | null;
  category: string;
  latitude: number;
  longitude: number;
  end_date: string | null;
};

async function countVerifiedEvidence(missionIds: string[]): Promise<Map<string, number>> {
  if (missionIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("mission_evidence")
    .select("mission_id")
    .in("mission_id", missionIds)
    .eq("moderation_status", "approved");

  if (error) {
    console.error("[traceRepository] Error counting evidence:", error);
    return new Map();
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.mission_id, (counts.get(row.mission_id) ?? 0) + 1);
  }
  return counts;
}

export const traceRepository = {
  async findTraces(
    bbox?: BBox,
    pg?: { limit?: number; offset?: number },
  ): Promise<CivicTraceInput[]> {
    const limit = pg?.limit ?? 100;
    const offset = pg?.offset ?? 0;

    let query = supabase
      .from("missions")
      .select("id, title, district, district_id, category, latitude, longitude, end_date")
      .not("end_date", "is", null)
      .order("end_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (bbox) {
      query = query
        .gte("latitude", bbox.minLat)
        .lte("latitude", bbox.maxLat)
        .gte("longitude", bbox.minLng)
        .lte("longitude", bbox.maxLng);
    }

    const { data: missions, error } = await query;

    if (error) {
      console.error("[traceRepository] Error fetching completed missions:", error);
      return [];
    }

    if (!missions || missions.length === 0) return [];

    const rows = missions as unknown as MissionRow[];
    const missionIds = rows.map((m) => m.id);
    const evidenceCounts = await countVerifiedEvidence(missionIds);

    const geometries = await spatialRepository.getAllGeometry();
    const geoBySlug = new Map(geometries.map((g) => [g.slug, g]));
    const geoById = new Map(geometries.map((g) => [g.id, g]));

    const traces: CivicTraceInput[] = [];

    for (const row of rows) {
      const districtGeo = row.district_id
        ? (geoById.get(row.district_id) ?? null)
        : (geoBySlug.get(row.district.toLowerCase().trim()) ?? null);

      traces.push({
        initiativeId: row.id,
        title: row.title,
        districtSlug: districtGeo?.slug ?? row.district.toLowerCase().trim(),
        district: row.district,
        region: districtGeo?.region ?? "costa",
        category: dbToCategory(row.category),
        coords:
          row.latitude != null && row.longitude != null
            ? { lat: row.latitude, lng: row.longitude }
            : null,
        boundary: districtGeo?.boundary ?? null,
        completedAt: row.end_date,
        verifiedCount: evidenceCounts.get(row.id) ?? 0,
      });
    }

    return traces;
  },
};
