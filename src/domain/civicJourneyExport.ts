/**
 * Civic Journey Export — pure serialization of InstitutionalRecord.
 *
 * NO I/O. NO React. Pure derivation from CivicJourney only.
 */

import type { CivicJourney } from "./civicJourney";

// ─── Institutional Record ────────────────────────────────────────────────────

export type InstitutionalRecord = {
  participationCount: number;
  verifiedCount: number;
  initiativesCreated: number;
  initiativesSupported: number;
  missionsCompleted: number;
  districts: string[];
  regions: string[];
  categories: string[];
  firstActivityAt: string;
  lastActivityAt: string;
};

// ─── toInstitutionalRecord ────────────────────────────────────────────────────

export function toInstitutionalRecord(j: CivicJourney): InstitutionalRecord {
  const beats = j.arc.beats;
  const timestamps = beats
    .map((b) => b.timestamp)
    .filter(Boolean)
    .sort();

  const createdIds = new Set(
    beats
      .filter((b) => b.kind === "created_proposal" && b.sourceId)
      .map((b) => b.sourceId as string),
  );

  const supportedIds = new Set(
    beats
      .filter((b) => b.kind === "supported_proposal" && b.sourceId)
      .map((b) => b.sourceId as string),
  );

  return {
    participationCount: beats.length,
    verifiedCount: beats.filter((b) => b.kind === "completed_mission").length,
    initiativesCreated: createdIds.size,
    initiativesSupported: supportedIds.size,
    missionsCompleted: beats.filter((b) => b.kind === "completed_mission").length,
    districts: [...j.footprint.districts],
    regions: [...j.footprint.regions],
    categories: [...j.footprint.categories],
    firstActivityAt: timestamps[0] ?? "",
    lastActivityAt: timestamps[timestamps.length - 1] ?? "",
  };
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(record: InstitutionalRecord): string {
  const vert = [
    ["campo", "valor"],
    ["participacion", String(record.participationCount)],
    ["verificadas", String(record.verifiedCount)],
    ["iniciativas_creadas", String(record.initiativesCreated)],
    ["iniciativas_apoyadas", String(record.initiativesSupported)],
    ["misiones_completadas", String(record.missionsCompleted)],
    ["distritos", record.districts.join("; ")],
    ["regiones", record.regions.join("; ")],
    ["categorias", record.categories.join("; ")],
    ["primera_actividad", record.firstActivityAt],
    ["ultima_actividad", record.lastActivityAt],
  ];
  return vert.map((row) => row.map(csvEscape).join(",")).join("\n");
}

// ─── toExport ─────────────────────────────────────────────────────────────────

export type ExportFormat = "json" | "csv";

export function toExport(record: InstitutionalRecord, format: ExportFormat): string {
  if (format === "json") {
    return JSON.stringify(record, null, 2) + "\n";
  }
  return toCsv(record) + "\n";
}
