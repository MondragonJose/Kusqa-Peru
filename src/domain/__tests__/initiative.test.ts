/**
 * Initiative domain tests — temporal anchor derivation.
 *
 * Covers:
 *   - computeMissionAnchor labels and kinds for every lifecycle state
 *   - computeProposalAnchor labels and kinds for every proposal status
 *   - isDormant detection
 *
 * All tests use vi.setSystemTime so daysUntil/daysSince are deterministic.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  computeMissionAnchor,
  computeProposalAnchor,
  isDormant,
  deriveLifecycleFromMission,
  deriveLifecycleFromProposal,
} from "@/domain/initiative";
import type { MissionLifecycleInfo } from "@/types/lifecycle";

// Fixed "today": Wednesday 2026-06-10 12:00 UTC
const NOW = new Date("2026-06-10T12:00:00Z");

function lifecycleFixture(lifecycle: string, timeToEnd?: number | null): MissionLifecycleInfo {
  return {
    lifecycle: lifecycle as MissionLifecycleInfo["lifecycle"],
    isJoinable: lifecycle === "upcoming" || lifecycle === "active",
    isCompletable: lifecycle === "active",
    isVisible: lifecycle !== "archived",
    lifecyclePriority: 0,
    timeToStart: null,
    timeToEnd: timeToEnd ?? null,
    timeToStartLabel: null,
    timeToEndLabel: null,
  };
}

function isoDate(daysFromNow: number, hour = 10): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + daysFromNow);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe("computeMissionAnchor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Upcoming ───────────────────────────────────────────────────────────────

  it('returns "Mañana" when startDate is tomorrow', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("upcoming"), isoDate(1), null);
    expect(anchor).toEqual({ label: "Mañana", kind: "countdown", referenceDate: isoDate(1) });
  });

  it('returns "Este sábado" when startDate is this Saturday', () => {
    // 2026-06-10 is Wednesday → next Saturday is 3 days later
    const saturday = isoDate(3);
    const anchor = computeMissionAnchor(lifecycleFixture("upcoming"), saturday, null);
    expect(anchor.label).toBe("Este sábado");
    expect(anchor.kind).toBe("scheduled");
    expect(anchor.referenceDate).toBe(saturday);
  });

  it('returns "Este lunes" when startDate is Monday (5 days ahead)', () => {
    const monday = isoDate(5);
    const anchor = computeMissionAnchor(lifecycleFixture("upcoming"), monday, null);
    expect(anchor.label).toBe("Este lunes");
  });

  it('returns "Esta semana" when startDate is 10 days out', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("upcoming"), isoDate(10), null);
    expect(anchor).toEqual({ label: "Esta semana", kind: "scheduled", referenceDate: isoDate(10) });
  });

  it('returns "Comienza en N días" when startDate is 20 days out', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("upcoming"), isoDate(20), null);
    expect(anchor).toEqual({
      label: "Comienza en 20 días",
      kind: "countdown",
      referenceDate: isoDate(20),
    });
  });

  it('returns "Comienza en 30 días" when startDate is 30 days out', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("upcoming"), isoDate(30), null);
    expect(anchor).toEqual({
      label: "Comienza en 30 días",
      kind: "countdown",
      referenceDate: isoDate(30),
    });
  });

  it('returns "Próximamente" when startDate is >30 days out', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("upcoming"), isoDate(45), null);
    expect(anchor).toEqual({
      label: "Próximamente",
      kind: "scheduled",
      referenceDate: isoDate(45),
    });
  });

  it('returns indefinite "Próximamente" when startDate is null', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("upcoming"), null, null);
    expect(anchor).toEqual({ label: "Próximamente", kind: "indefinite", referenceDate: null });
  });

  // ── Active ─────────────────────────────────────────────────────────────────

  it('returns "Termina pronto" when active and endDate is within 7 days', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("active", null), null, isoDate(3));
    expect(anchor).toEqual({ label: "Termina pronto", kind: "active", referenceDate: isoDate(3) });
  });

  it('returns "En curso" when active and no endDate', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("active"), null, null);
    expect(anchor).toEqual({ label: "En curso", kind: "active", referenceDate: null });
  });

  it('returns "En curso" when active and endDate is far out', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("active"), null, isoDate(20));
    expect(anchor).toEqual({ label: "En curso", kind: "active", referenceDate: null });
  });

  // ── Ending soon ────────────────────────────────────────────────────────────

  it('returns "Hoy" when endDate is today', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("ending_soon"), null, isoDate(0));
    expect(anchor).toEqual({ label: "Hoy", kind: "active", referenceDate: isoDate(0) });
  });

  it('returns "Termina mañana" when endDate is tomorrow', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("ending_soon"), null, isoDate(1));
    expect(anchor).toEqual({ label: "Termina mañana", kind: "ending", referenceDate: isoDate(1) });
  });

  it('returns "Termina en 5 días" when endDate is 5 days out', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("ending_soon"), null, isoDate(5));
    expect(anchor).toEqual({
      label: "Termina en 5 días",
      kind: "ending",
      referenceDate: isoDate(5),
    });
  });

  it('returns "Finalizando" when ending_soon and no endDate', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("ending_soon"), null, null);
    expect(anchor).toEqual({ label: "Finalizando", kind: "ending", referenceDate: null });
  });

  // ── Completed ──────────────────────────────────────────────────────────────

  it('returns "Finalizó ayer" when endDate was yesterday', () => {
    const yesterday = isoDate(-1);
    const anchor = computeMissionAnchor(lifecycleFixture("completed"), null, yesterday);
    expect(anchor).toEqual({ label: "Finalizó ayer", kind: "recent", referenceDate: yesterday });
  });

  it('returns "Finalizó esta semana" when endDate was 3 days ago', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("completed"), null, isoDate(-3));
    expect(anchor).toEqual({
      label: "Finalizó esta semana",
      kind: "recent",
      referenceDate: isoDate(-3),
    });
  });

  it('returns "Finalizó hace 2 semanas" when endDate was 10 days ago', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("completed"), null, isoDate(-10));
    expect(anchor).toEqual({
      label: "Finalizó hace 2 semanas",
      kind: "recent",
      referenceDate: isoDate(-10),
    });
  });

  it('returns "Completada" when endDate was >14 days ago', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("completed"), null, isoDate(-20));
    expect(anchor).toEqual({ label: "Completada", kind: "completed", referenceDate: isoDate(-20) });
  });

  it('returns "Completada" when completed and no endDate', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("completed"), null, null);
    expect(anchor).toEqual({ label: "Completada", kind: "completed", referenceDate: null });
  });

  // ── Archived ───────────────────────────────────────────────────────────────

  it('returns "Archivada" for archived lifecycle', () => {
    const anchor = computeMissionAnchor(lifecycleFixture("archived"), null, null);
    expect(anchor).toEqual({ label: "Archivada", kind: "completed", referenceDate: null });
  });
});

describe("deriveLifecycleFromMission", () => {
  it('maps "upcoming" → "forming"', () => {
    expect(deriveLifecycleFromMission("upcoming")).toBe("forming");
  });
  it('maps "active" → "active"', () => {
    expect(deriveLifecycleFromMission("active")).toBe("active");
  });
  it('maps "ending_soon" → "ending"', () => {
    expect(deriveLifecycleFromMission("ending_soon")).toBe("ending");
  });
  it('maps "completed" → "completed"', () => {
    expect(deriveLifecycleFromMission("completed")).toBe("completed");
  });
  it('maps "archived" → "archived"', () => {
    expect(deriveLifecycleFromMission("archived")).toBe("archived");
  });
});

describe("computeProposalAnchor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "No procede" for rejected proposals', () => {
    const anchor = computeProposalAnchor("rejected", null, NOW.toISOString(), null, null, 0, 0);
    expect(anchor.label).toBe("No procede");
  });

  it('returns "Se completó ayer" when completedAt is yesterday', () => {
    const yesterday = isoDate(-1);
    const anchor = computeProposalAnchor("active", null, NOW.toISOString(), null, yesterday, 0, 0);
    expect(anchor.label).toBe("Se completó ayer");
  });

  it('returns "Completada" when completedAt is old', () => {
    const anchor = computeProposalAnchor(
      "active",
      null,
      NOW.toISOString(),
      null,
      isoDate(-30),
      0,
      0,
    );
    expect(anchor.label).toBe("Completada");
  });

  it('returns "Recién convertida en misión" when convertedAt is recent', () => {
    const anchor = computeProposalAnchor(
      "active",
      null,
      NOW.toISOString(),
      isoDate(-1),
      null,
      0,
      0,
    );
    expect(anchor.label).toBe("Recién convertida en misión");
  });

  it('returns "Convertida en misión" when convertedAt is old', () => {
    const anchor = computeProposalAnchor(
      "active",
      null,
      NOW.toISOString(),
      isoDate(-30),
      null,
      0,
      0,
    );
    expect(anchor.label).toBe("Convertida en misión");
  });

  it('returns "Lista para movilizar" when pending with enough support', () => {
    const anchor = computeProposalAnchor("pending", null, NOW.toISOString(), null, null, 5, 5);
    expect(anchor.label).toBe("Lista para movilizar");
  });

  it('returns "Recién propuesta" when pending with recent proposedDate', () => {
    const anchor = computeProposalAnchor(
      "pending",
      isoDate(0),
      NOW.toISOString(),
      null,
      null,
      0,
      5,
    );
    expect(anchor.label).toBe("Recién propuesta");
  });

  it('returns "Buscando personas para empezar" when pending with old proposedDate', () => {
    const anchor = computeProposalAnchor(
      "pending",
      isoDate(-30),
      NOW.toISOString(),
      null,
      null,
      0,
      5,
    );
    expect(anchor.label).toBe("Buscando personas para empezar");
  });

  it('returns "En marcha" for active proposals', () => {
    const anchor = computeProposalAnchor("active", null, NOW.toISOString(), null, null, 0, 0);
    expect(anchor.label).toBe("En marcha");
  });
});

describe("deriveLifecycleFromProposal", () => {
  it('maps "pending" → "forming"', () => {
    expect(deriveLifecycleFromProposal("pending", null, null)).toBe("forming");
  });

  it('maps "active" without convertedAt/completedAt → "active"', () => {
    expect(deriveLifecycleFromProposal("active", null, null)).toBe("active");
  });

  it('maps "active" with completedAt → "completed"', () => {
    expect(deriveLifecycleFromProposal("active", null, "2026-06-09")).toBe("completed");
  });

  it('maps "rejected" → "archived"', () => {
    expect(deriveLifecycleFromProposal("rejected", null, null)).toBe("archived");
  });
});

describe("isDormant", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false for archived initiatives", () => {
    expect(
      isDormant({
        lifecycle: "archived",
        temporalAnchor: { label: "", kind: "completed", referenceDate: null },
      }),
    ).toBe(false);
  });

  it("returns false for completed initiatives", () => {
    expect(
      isDormant({
        lifecycle: "completed",
        temporalAnchor: { label: "", kind: "completed", referenceDate: null },
      }),
    ).toBe(false);
  });

  it("returns false when referenceDate is null", () => {
    expect(
      isDormant({
        lifecycle: "forming",
        temporalAnchor: { label: "", kind: "indefinite", referenceDate: null },
      }),
    ).toBe(false);
  });

  it("returns false when referenceDate is recent (<60 days)", () => {
    expect(
      isDormant({
        lifecycle: "active",
        temporalAnchor: { label: "", kind: "active", referenceDate: isoDate(-30) },
      }),
    ).toBe(false);
  });

  it("returns true when referenceDate is >60 days ago", () => {
    expect(
      isDormant({
        lifecycle: "active",
        temporalAnchor: { label: "", kind: "active", referenceDate: isoDate(-61) },
      }),
    ).toBe(true);
  });
});
