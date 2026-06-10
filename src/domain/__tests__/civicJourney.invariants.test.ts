import { describe, expect, it, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatToNarrative, phaseToHeadline } from "../civicJourneyNarrative";
import { deriveCivicJourney } from "../civicJourney";
import type { NarrativeBeat, JourneyArc, TerritorialFootprint, CivicJourneyInput } from "../civicJourney";

const __dirname = dirname(fileURLToPath(import.meta.url));

function beat(overrides: Partial<NarrativeBeat> & { kind: NarrativeBeat["kind"] }): NarrativeBeat {
  return {
    timestamp: "2025-06-01T00:00:00Z",
    datePrecision: "exact",
    provenance: "derived",
    title: "",
    description: "",
    ...overrides,
  };
}

function arc(overrides: Partial<JourneyArc> = {}): JourneyArc {
  return {
    phase: "primer_paso",
    phaseLabel: "Primer paso",
    beats: [],
    milestones: [],
    prologue: [],
    totalBeats: 0,
    totalMilestones: 0,
    isDormant: false,
    ...overrides,
  };
}

function footprint(overrides: Partial<TerritorialFootprint> = {}): TerritorialFootprint {
  return {
    regions: ["costa"],
    districts: ["barranco"],
    categories: ["Comunidad"],
    reach: "local",
    missionCount: 0,
    proposalCount: 0,
    districtCount: 1,
    ...overrides,
  };
}

// ─── 1. No score language in narratives ───────────────────────────────────────

describe("invariant — sin score language en narrativas", () => {
  const narrativeTexts: string[] = [];

  beforeAll(() => {
    const kinds: NarrativeBeat["kind"][] = [
      "first_mission",
      "completed_mission",
      "supported_proposal",
      "created_proposal",
      "proposal_converted",
      "joined_mission",
      "district_activated",
      "region_unlocked",
    ];
    for (const kind of kinds) {
      narrativeTexts.push(beatToNarrative(beat({ kind, title: "Test" })));
    }
    const phases: JourneyArc["phase"][] = [
      "primer_paso",
      "explorando",
      "organizando",
      "construyendo",
      "tejiendo_territorio",
      "en_pausa",
    ];
    for (const p of phases) {
      narrativeTexts.push(
        phaseToHeadline(
          arc({ phase: p }),
          footprint({ districts: ["a", "b"], districtCount: 2, regions: ["costa", "sierra"], missionCount: 3 }),
        ),
      );
    }
  });

  const FORBIDDEN_RE = [/\bXP\b/i, /\bNivel\b/i, /\bpuntos\b/i, /\branking\b/i, /top\s+\d/i];

  for (const re of FORBIDDEN_RE) {
    it(`does not match ${re.source}`, () => {
      for (const text of narrativeTexts) {
        expect(text).not.toMatch(re);
      }
    });
  }
});

// ─── 2. Determinism ───────────────────────────────────────────────────────────

describe("invariant — determinismo de deriveCivicJourney", () => {
  const NOW = new Date("2025-06-20T00:00:00Z").getTime();

  const RICH_INPUT: CivicJourneyInput = {
    userMissions: [
      {
        id: "um1",
        missionId: "m1",
        status: "in_progress",
        joinedAt: "2025-06-01T00:00:00Z",
        completedAt: null,
        mission: {
          id: "m1",
          title: "Reforestación",
          district: "barranco",
          region: "costa",
          category: "Medio ambiente",
          startDate: "2025-06-01T00:00:00Z",
          endDate: "2025-06-15T00:00:00Z",
        },
      },
      {
        id: "um2",
        missionId: "m2",
        status: "completed",
        joinedAt: "2025-05-01T00:00:00Z",
        completedAt: "2025-05-20T00:00:00Z",
        mission: {
          id: "m2",
          title: "Limpieza de playa",
          district: "miraflores",
          region: "costa",
          category: "Comunidad",
          startDate: "2025-05-01T00:00:00Z",
          endDate: "2025-05-25T00:00:00Z",
        },
      },
    ],
    supportedProposals: [
      { id: "sp1", title: "Biblioteca popular", createdAt: "2025-06-10T00:00:00Z" },
    ],
    userProposals: [
      {
        id: "up1",
        title: "Huerto urbano",
        status: "converted",
        createdAt: "2025-04-01T00:00:00Z",
        convertedAt: "2025-04-15T00:00:00Z",
      },
    ],
    userDistrict: "barranco",
  };

  it("returns identical output for the same input (idempotent)", () => {
    const a = deriveCivicJourney(RICH_INPUT, NOW);
    const b = deriveCivicJourney(RICH_INPUT, NOW);
    expect(a).toEqual(b);
  });

  it("matches snapshot", () => {
    const result = deriveCivicJourney(RICH_INPUT, NOW);
    expect(result).toMatchSnapshot();
  });
});

// ─── 3. Purity of imports ─────────────────────────────────────────────────────

describe("invariant — pureza de imports en civicJourney", () => {
  const BASE = resolve(__dirname, "..");
  const FILES = ["civicJourney.ts", "civicJourneyNarrative.ts", "civicJourneyExport.ts"];

  const FORBIDDEN_IMPORT_PATTERNS = [
    { pattern: /from\s+['"]react['"]/, label: "React" },
    { pattern: /from\s+['"]@supabase\//, label: "Supabase" },
    { pattern: /from\s+['"]@\/services\//, label: "services" },
  ];

  for (const fileName of FILES) {
    const filePath = resolve(BASE, fileName);
    const content = readFileSync(filePath, "utf-8");

    for (const { pattern, label } of FORBIDDEN_IMPORT_PATTERNS) {
      it(`${fileName} no importa ${label}`, () => {
        const offendingLines = content
          .split("\n")
          .filter((line) => pattern.test(line))
          .map((l) => l.trim());
        expect(offendingLines, [
          `${fileName} imports ${label}:`,
          ...offendingLines.map((l) => `  → ${l}`),
        ].join("\n")).toEqual([]);
      });
    }
  }
});
