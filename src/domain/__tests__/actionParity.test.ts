import { describe, expect, it } from "vitest";
import {
  getAvailableInitiativeActions,
  type InitiativeAction,
  type UserRelationship,
  type ActionContext,
} from "../initiativeActions";
import type { InitiativeLifecycle } from "../initiative";

type BruteForceEntry = {
  lifecycle: InitiativeLifecycle;
  relationship: UserRelationship;
  expected: InitiativeAction[];
};

/**
 * Brute-force manifest of expected actions per (lifecycle, relationship).
 *
 * This is the CANONICAL spec. Every surface must derive its actions
 * exclusively from getAvailableInitiativeActions; any deviation is a
 * regression. If you must change the set of actions a surface shows,
 * update BOTH getAvailableInitiativeActions AND this manifest.
 */
const BRUTE_FORCE_MANIFEST: BruteForceEntry[] = [
  // ── archived ──────────────────────────────────────────────────────────────
  ...(["visitor", "supporter", "participant", "collaborator", "organizer"] as const).map(
    (relationship) => ({
      lifecycle: "archived" as const,
      relationship,
      expected: [] as InitiativeAction[],
    }),
  ),

  // ── forming ──────────────────────────────────────────────────────────────
  ...(["visitor"] as const).map((r) => ({
    lifecycle: "forming" as const,
    relationship: r,
    expected: ["share", "support", "report"] as InitiativeAction[],
  })),
  ...(["supporter"] as const).map((r) => ({
    lifecycle: "forming" as const,
    relationship: r,
    expected: ["share", "support", "comment"] as InitiativeAction[],
  })),
  ...(["collaborator", "participant"] as const).map((r) => ({
    lifecycle: "forming" as const,
    relationship: r,
    expected: ["share", "comment"] as InitiativeAction[],
  })),
  {
    lifecycle: "forming" as const,
    relationship: "organizer" as const,
    expected: ["share", "edit", "comment"] as InitiativeAction[],
  },

  // ── active / ending ──────────────────────────────────────────────────────
  ...(["visitor"] as const).map((r) => ({
    lifecycle: "active" as const,
    relationship: r,
    expected: ["share", "join", "report"] as InitiativeAction[],
  })),
  ...(["participant", "supporter", "collaborator"] as const).map((r) => ({
    lifecycle: "active" as const,
    relationship: r,
    expected: ["share", "comment"] as InitiativeAction[],
  })),
  {
    lifecycle: "active" as const,
    relationship: "organizer" as const,
    expected: ["share", "edit", "comment"] as InitiativeAction[],
  },

  // ending has the same action set as active
  ...(["visitor"] as const).map((r) => ({
    lifecycle: "ending" as const,
    relationship: r,
    expected: ["share", "join", "report"] as InitiativeAction[],
  })),
  ...(["participant", "supporter", "collaborator"] as const).map((r) => ({
    lifecycle: "ending" as const,
    relationship: r,
    expected: ["share", "comment"] as InitiativeAction[],
  })),
  {
    lifecycle: "ending" as const,
    relationship: "organizer" as const,
    expected: ["share", "edit", "comment"] as InitiativeAction[],
  },

  // ── completed ────────────────────────────────────────────────────────────
  ...(["visitor"] as const).map((r) => ({
    lifecycle: "completed" as const,
    relationship: r,
    expected: ["share", "join", "report"] as InitiativeAction[],
  })),
  ...(["participant", "supporter", "collaborator"] as const).map((r) => ({
    lifecycle: "completed" as const,
    relationship: r,
    expected: ["share", "join", "comment"] as InitiativeAction[],
  })),
  {
    lifecycle: "completed" as const,
    relationship: "organizer" as const,
    expected: ["share", "join", "edit"] as InitiativeAction[],
  },
];

describe("action parity — getAvailableInitiativeActions matches canonical manifest", () => {
  for (const { lifecycle, relationship, expected } of BRUTE_FORCE_MANIFEST) {
    it(`lifecycle=${lifecycle} relationship=${relationship}`, () => {
      const context: ActionContext = { lifecycle, relationship, sourceType: "mission" };
      const actual = getAvailableInitiativeActions(context);
      expect(actual.sort()).toEqual([...expected].sort());
    });
  }
});

describe("action parity — sourceType invariance (report excluded)", () => {
  const LIFECYCLES: InitiativeLifecycle[] = [
    "forming",
    "active",
    "ending",
    "completed",
    "archived",
  ];
  const RELATIONSHIPS: UserRelationship[] = [
    "visitor",
    "supporter",
    "participant",
    "collaborator",
    "organizer",
  ];

  for (const lifecycle of LIFECYCLES) {
    for (const relationship of RELATIONSHIPS) {
      it(`lifecycle=${lifecycle} relationship=${relationship} — proposal actions subset of mission actions`, () => {
        const missionCtx: ActionContext = { lifecycle, relationship, sourceType: "mission" };
        const proposalCtx: ActionContext = { lifecycle, relationship, sourceType: "proposal" };
        const missionActions = getAvailableInitiativeActions(missionCtx);
        const proposalActions = getAvailableInitiativeActions(proposalCtx);

        // proposal actions should be a subset (report excluded for proposals is not our concern here,
        // but the canonical model currently returns same set regardless of sourceType)
        for (const action of proposalActions) {
          expect(missionActions).toContain(action);
        }
      });
    }
  }
});
