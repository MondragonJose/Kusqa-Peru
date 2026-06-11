import { describe, expect, it } from "vitest";
import { isDormant } from "../initiative";
import type { Initiative, InitiativeLifecycle } from "../initiative";
import {
  getAvailableInitiativeActions,
  deriveRelationship,
  actionToLabel,
  actionToIcon,
  ACTION_PRIORITY,
  type InitiativeAction,
  type UserRelationship,
} from "../initiativeActions";

const ALL_LIFECYCLES: InitiativeLifecycle[] = [
  "forming",
  "active",
  "ending",
  "completed",
  "archived",
];

const ALL_RELATIONSHIPS: UserRelationship[] = [
  "visitor",
  "supporter",
  "participant",
  "collaborator",
  "organizer",
];

function act(lifecycle: InitiativeLifecycle, relationship: UserRelationship): InitiativeAction[] {
  return getAvailableInitiativeActions({
    lifecycle,
    sourceType: "mission",
    relationship,
  });
}

function sorted(a: InitiativeAction[]): InitiativeAction[] {
  return [...a].sort();
}

// ─── FORMING ───────────────────────────────────────────────────────────────

describe("forming", () => {
  it("visitor → support, share, report", () => {
    expect(sorted(act("forming", "visitor"))).toEqual(["report", "share", "support"]);
  });

  it("supporter → support, comment, share", () => {
    expect(sorted(act("forming", "supporter"))).toEqual(["comment", "share", "support"]);
  });

  it("collaborator → comment, share", () => {
    expect(sorted(act("forming", "collaborator"))).toEqual(["comment", "share"]);
  });

  it("organizer → edit, comment, share", () => {
    expect(sorted(act("forming", "organizer"))).toEqual(["comment", "edit", "share"]);
  });

  it("participant → comment, share (edge case)", () => {
    expect(sorted(act("forming", "participant"))).toEqual(["comment", "share"]);
  });
});

// ─── ACTIVE ────────────────────────────────────────────────────────────────

describe("active", () => {
  it("visitor → join, share, report", () => {
    expect(sorted(act("active", "visitor"))).toEqual(["join", "report", "share"]);
  });

  it("participant → comment, share", () => {
    expect(sorted(act("active", "participant"))).toEqual(["comment", "share"]);
  });

  it("supporter → comment, share", () => {
    expect(sorted(act("active", "supporter"))).toEqual(["comment", "share"]);
  });

  it("collaborator → comment, share", () => {
    expect(sorted(act("active", "collaborator"))).toEqual(["comment", "share"]);
  });

  it("organizer → edit, comment, share", () => {
    expect(sorted(act("active", "organizer"))).toEqual(["comment", "edit", "share"]);
  });
});

// ─── ENDING (same rules as ACTIVE) ─────────────────────────────────────────

describe("ending", () => {
  it("visitor → join, share, report", () => {
    expect(sorted(act("ending", "visitor"))).toEqual(["join", "report", "share"]);
  });

  it("participant → comment, share", () => {
    expect(sorted(act("ending", "participant"))).toEqual(["comment", "share"]);
  });

  it("supporter → comment, share", () => {
    expect(sorted(act("ending", "supporter"))).toEqual(["comment", "share"]);
  });

  it("collaborator → comment, share", () => {
    expect(sorted(act("ending", "collaborator"))).toEqual(["comment", "share"]);
  });

  it("organizer → edit, comment, share", () => {
    expect(sorted(act("ending", "organizer"))).toEqual(["comment", "edit", "share"]);
  });
});

// ─── COMPLETED ────────────────────────────────────────────────────────────

describe("completed", () => {
  it("visitor → join (Ver resultados), share, report", () => {
    expect(sorted(act("completed", "visitor"))).toEqual(["join", "report", "share"]);
  });

  it("participant → join (Ver resultados), comment, share", () => {
    expect(sorted(act("completed", "participant"))).toEqual(["comment", "join", "share"]);
  });

  it("supporter → join (Ver resultados), comment, share", () => {
    expect(sorted(act("completed", "supporter"))).toEqual(["comment", "join", "share"]);
  });

  it("collaborator → join (Ver resultados), comment, share", () => {
    expect(sorted(act("completed", "collaborator"))).toEqual(["comment", "join", "share"]);
  });

  it("organizer → join (Ver resultados), edit, share", () => {
    expect(sorted(act("completed", "organizer"))).toEqual(["edit", "join", "share"]);
  });
});

// ─── ARCHIVED ───────────────────────────────────────────────────────────────

describe("archived", () => {
  it("all relationships return empty array", () => {
    for (const rel of ALL_RELATIONSHIPS) {
      expect(act("archived", rel)).toEqual([]);
    }
  });
});

// ─── EXHAUSTIVE: every lifecycle × relationship combination ────────────────

describe("exhaustive matrix", () => {
  it("covers all 25 combinations without throwing", () => {
    for (const lifecycle of ALL_LIFECYCLES) {
      for (const relationship of ALL_RELATIONSHIPS) {
        const result = act(lifecycle, relationship);
        expect(Array.isArray(result)).toBe(true);
        // Every action must be a valid InitiativeAction
        for (const action of result) {
          expect([
            "support",
            "join",
            "comment",
            "share",
            "edit",
            "report",
          ] satisfies InitiativeAction[]).toContain(action);
        }
      }
    }
  });

  it("share is present for all non-archived combinations", () => {
    for (const lifecycle of ALL_LIFECYCLES) {
      for (const relationship of ALL_RELATIONSHIPS) {
        const result = act(lifecycle, relationship);
        if (lifecycle === "archived") {
          expect(result).not.toContain("share");
        } else {
          expect(result).toContain("share");
        }
      }
    }
  });

  it("edit only appears for organizer", () => {
    for (const lifecycle of ALL_LIFECYCLES) {
      for (const relationship of ALL_RELATIONSHIPS) {
        const result = act(lifecycle, relationship);
        if (relationship === "organizer" && lifecycle !== "archived") {
          expect(result).toContain("edit");
        } else {
          expect(result).not.toContain("edit");
        }
      }
    }
  });

  it("report only appears for visitor", () => {
    for (const lifecycle of ALL_LIFECYCLES) {
      for (const relationship of ALL_RELATIONSHIPS) {
        const result = act(lifecycle, relationship);
        if (relationship === "visitor" && lifecycle !== "archived") {
          expect(result).toContain("report");
        } else {
          expect(result).not.toContain("report");
        }
      }
    }
  });

  it("archived returns empty for every relationship", () => {
    for (const relationship of ALL_RELATIONSHIPS) {
      expect(act("archived", relationship)).toEqual([]);
    }
  });
});

// ─── ACTION PARITY — surface rendering vs canonical domain ──────────────────
//
// For every surface that renders InitiativeActionBar, verifies:
//   canon(lifecycle, relationship) ⊆ surface.wiredActions
//
// If canon returns an action that the surface does NOT wire (disabled/hidden),
// the test fails — the surface would show a button the user can't use.
//
// If the surface wires an action that is NOT in canon, the button is hidden
// by InitiativeActionBar filtering, so the handler is dead code. The test
// flags this with a .notify call (non-blocking) for documentation.
//
// Each surface definition mirrors the actual relationship resolver + handler
// set found in the source code (see action parity audit).

type SurfaceParity = {
  name: string;
  /** Which relationships this surface can produce, given initiative context. */
  possibleRelationships: (initiative: Pick<Initiative, "ownerId">) => UserRelationship[];
  /** Which actions this surface provides real handlers for (enabled buttons). */
  wiredActions: InitiativeAction[];
};

const SURFACES: SurfaceParity[] = [
  {
    name: "InitiativeCard (feed card) / app.index drawer",
    possibleRelationships: (i) => [
      "visitor",
      ...(i.ownerId ? ["supporter" as const] : []),
    ],
    wiredActions: ["support", "join", "share"],
  },
  {
    name: "Map sidebar/bottom-sheet (app.mapa.tsx)",
    possibleRelationships: () => ["visitor"],
    wiredActions: ["support", "join", "share"],
  },
  {
    name: "Map popup (useMissionMarkerLayer.tsx)",
    possibleRelationships: () => ["visitor"],
    // catch-all handler navigates to detail for every rendered action
    wiredActions: ["support", "join", "comment", "share", "edit", "report"],
  },
  {
    name: "Mission detail (app.mision.$missionId.tsx)",
    possibleRelationships: (i) => [i.ownerId ? "organizer" : "visitor"],
    wiredActions: ["join", "share", "report", "comment"],
  },
  {
    name: "Proposal detail (app.propuesta.$proposalId.tsx)",
    possibleRelationships: () => ["visitor"],
    wiredActions: ["support", "share", "report"],
  },
];

function canon(lifecycle: InitiativeLifecycle, relationship: UserRelationship): InitiativeAction[] {
  return getAvailableInitiativeActions({ lifecycle, sourceType: "mission", relationship });
}

describe("action parity — surface rendering vs canonical domain", () => {
  for (const surface of SURFACES) {
    describe(surface.name, () => {
      // Build the set of (lifecycle, relationship) pairs this surface encounters
      const pairs: Array<{ lifecycle: InitiativeLifecycle; rel: UserRelationship }> = [];
      for (const lifecycle of ["forming", "active", "ending", "completed"] as InitiativeLifecycle[]) {
          for (const initiative of [{ ownerId: undefined }, { ownerId: "uid" }] as const) {
          for (const rel of surface.possibleRelationships(initiative)) {
            if (!pairs.some((p) => p.lifecycle === lifecycle && p.rel === rel)) {
              pairs.push({ lifecycle, rel });
            }
          }
        }
      }
      // archived: only visitor matters (all relationships return [])
      pairs.push({ lifecycle: "archived" as const, rel: "visitor" as const });

      for (const { lifecycle, rel } of pairs) {
        const label = `${lifecycle} / ${rel}`;

        it(`handles every canonical action for ${label}`, () => {
          const canonical = canon(lifecycle, rel);
          const missing = canonical.filter((a) => !surface.wiredActions.includes(a));

          expect(missing, [
            `Surface "${surface.name}" is MISSING handlers for: [${missing.join(", ")}]`,
            `  canon returned: [${canonical.join(", ")}]`,
            `  surface wires:  [${surface.wiredActions.join(", ")}]`,
          ].join("\n")).toEqual([]);
        });

        it(`no dead-code handlers for ${label}`, () => {
          const canonical = canon(lifecycle, rel);
          const deadCode = surface.wiredActions.filter((a) => !canonical.includes(a));

          if (deadCode.length > 0) {
            // Non-blocking notification: handler exists but button hidden by canon
            // eslint-disable-next-line no-console
            console.warn(
              `[parity note] ${surface.name} wires [${deadCode.join(", ")}] ` +
              `but canon returns [${canonical.join(", ")}] for ${label} — ` +
              `handler is dead code (button hidden by InitiativeActionBar)`,
            );
          }

          // Archived at visitor returns [], so all wired actions would be dead code — skip
          if (lifecycle === "archived") return;

          // For non-archived, at least the common actions should be present
          expect(canonical.length).toBeGreaterThan(0);
        });
      }
    });
  }

  // ─── Cross-surface invariant checks ──────────────────────────────────────
  describe("cross-surface invariants", () => {
    it("share is wired by every surface", () => {
      for (const surface of SURFACES) {
        expect(surface.wiredActions).toContain("share");
      }
    });

    it("only map popup wires edit (catch-all navigates to detail)", () => {
      const withEdit = SURFACES.filter((s) => s.wiredActions.includes("edit")).map((s) => s.name);
      expect(withEdit).toEqual(["Map popup (useMissionMarkerLayer.tsx)"]);
    });

    it("map popup, mission detail and proposal detail wire report", () => {
      const withReport = SURFACES.filter((s) => s.wiredActions.includes("report")).map((s) => s.name);
      expect(withReport.sort()).toEqual([
        "Map popup (useMissionMarkerLayer.tsx)",
        "Mission detail (app.mision.$missionId.tsx)",
        "Proposal detail (app.propuesta.$proposalId.tsx)",
      ]);
    });

    it("feed card and map sidebar have the same wired set", () => {
      const feed = SURFACES.find((s) => s.name.startsWith("InitiativeCard"))!;
      const sidebar = SURFACES.find((s) => s.name.startsWith("Map sidebar"))!;
      expect(feed.wiredActions).toEqual(sidebar.wiredActions);
    });
  });
});

// ─── EDGE CASES ─────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("does not mutate caller state across calls", () => {
    const a = act("forming", "visitor");
    const b = act("active", "visitor");
    // Verify they return correct independent results
    expect(a).toContain("support");
    expect(b).not.toContain("support");
    expect(b).toContain("join");
  });

  it("sourceType does not affect result (future-proofing)", () => {
    const mission = getAvailableInitiativeActions({
      lifecycle: "active",
      sourceType: "mission",
      relationship: "visitor",
    });
    const proposal = getAvailableInitiativeActions({
      lifecycle: "active",
      sourceType: "proposal",
      relationship: "visitor",
    });
    expect(mission).toEqual(proposal);
  });
});

// ─── DERIVE RELATIONSHIP (Initiative-based overload) ────────────────────────

describe("deriveRelationship(userId, initiative)", () => {
  function makeInitiative(overrides?: Partial<Initiative>): Initiative {
    return {
      id: "test_1",
      sourceType: "mission",
      sourceId: "mission-1",
      title: "Test",
      summary: "Test initiative",
      category: "Comunidad",
      region: "costa",
      lifecycle: "active",
      temporalAnchor: { label: "En curso", kind: "active", referenceDate: null },
      emoji: "🌟",
      ...overrides,
    };
  }

  it("returns visitor when userId is null", () => {
    expect(deriveRelationship(null, makeInitiative())).toBe("visitor");
  });

  it("returns organizer when userId matches ownerId", () => {
    const initiative = makeInitiative({ ownerId: "user-1" });
    expect(deriveRelationship("user-1", initiative)).toBe("organizer");
  });

  it("returns visitor when userId does not match ownerId", () => {
    const initiative = makeInitiative({ ownerId: "user-1" });
    expect(deriveRelationship("user-2", initiative)).toBe("visitor");
  });

  it("returns visitor when ownerId is undefined", () => {
    expect(deriveRelationship("user-1", makeInitiative())).toBe("visitor");
  });

  it("returns organizer for all lifecycle stages when ownerId matches", () => {
    const lifecycles: InitiativeLifecycle[] = [
      "forming",
      "active",
      "ending",
      "completed",
      "archived",
    ];
    for (const lifecycle of lifecycles) {
      const initiative = makeInitiative({ lifecycle, ownerId: "user-1" });
      expect(deriveRelationship("user-1", initiative)).toBe("organizer");
    }
  });

  it("returns visitor for all lifecycle stages when userId does not match", () => {
    const lifecycles: InitiativeLifecycle[] = [
      "forming",
      "active",
      "ending",
      "completed",
      "archived",
    ];
    for (const lifecycle of lifecycles) {
      const initiative = makeInitiative({ lifecycle, ownerId: "user-1" });
      expect(deriveRelationship("user-2", initiative)).toBe("visitor");
    }
  });

  it("works with both sourceTypes", () => {
    const mission = makeInitiative({ sourceType: "mission", ownerId: "u1" });
    const proposal = makeInitiative({ sourceType: "proposal", ownerId: "u1" });
    expect(deriveRelationship("u1", mission)).toBe("organizer");
    expect(deriveRelationship("u1", proposal)).toBe("organizer");
    expect(deriveRelationship("u2", mission)).toBe("visitor");
    expect(deriveRelationship("u2", proposal)).toBe("visitor");
  });
});

// ─── ACTION TO LABEL ────────────────────────────────────────────────────────

describe("actionToLabel", () => {
  const ALL_ACTIONS: InitiativeAction[] = ["support", "join", "comment", "share", "edit", "report"];

  const ALL_LIFECYCLES: InitiativeLifecycle[] = [
    "forming",
    "active",
    "ending",
    "completed",
    "archived",
  ];

  const ALL_SOURCE_TYPES: ("mission" | "proposal")[] = ["mission", "proposal"];

  it("returns non-empty string for every action without lifecycle/sourceType", () => {
    for (const action of ALL_ACTIONS) {
      const label = actionToLabel(action);
      expect(label).toBeTruthy();
      expect(typeof label).toBe("string");
    }
  });

  it("returns non-empty string for every lifecycle×action combination", () => {
    for (const lifecycle of ALL_LIFECYCLES) {
      for (const action of ALL_ACTIONS) {
        const label = actionToLabel(action, lifecycle);
        expect(label).toBeTruthy();
        expect(typeof label).toBe("string");
      }
    }
  });

  it("returns non-empty string for every lifecycle×action×sourceType combination", () => {
    for (const lifecycle of ALL_LIFECYCLES) {
      for (const action of ALL_ACTIONS) {
        for (const sourceType of ALL_SOURCE_TYPES) {
          const label = actionToLabel(action, lifecycle, sourceType);
          expect(label).toBeTruthy();
          expect(typeof label).toBe("string");
        }
      }
    }
  });

  it("returns same label for both sourceTypes except join (proposal → 'Ver misión')", () => {
    for (const lifecycle of ALL_LIFECYCLES) {
      for (const action of ALL_ACTIONS) {
        if (action === "join") {
          if (lifecycle === "completed") {
            expect(actionToLabel("join", lifecycle, "mission")).toBe("Ver resultados");
            expect(actionToLabel("join", lifecycle, "proposal")).toBe("Ver resultados");
          } else {
            expect(actionToLabel("join", lifecycle, "proposal")).toBe("Ver misión");
          }
        } else {
          expect(actionToLabel(action, lifecycle, "mission")).toBe(
            actionToLabel(action, lifecycle, "proposal"),
          );
        }
      }
    }
  });

  it("returns lifecycle-appropriate label for join", () => {
    expect(actionToLabel("join", "forming")).toBe("Unirme");
    expect(actionToLabel("join", "active")).toBe("Participar");
    expect(actionToLabel("join", "ending")).toBe("Participar");
    expect(actionToLabel("join", "completed")).toBe("Ver resultados");
    expect(actionToLabel("join", "archived")).toBe("Participar");
    // proposal with lifecycle=active → "Ver misión"
    expect(actionToLabel("join", "active", "proposal")).toBe("Ver misión");
    // completed overrides sourceType
    expect(actionToLabel("join", "completed", "proposal")).toBe("Ver resultados");
  });

  it("returns 'Reactivar' for join when dormant is true and lifecycle is active/ending", () => {
    expect(actionToLabel("join", "active", "mission", true)).toBe("Reactivar");
    expect(actionToLabel("join", "ending", "mission", true)).toBe("Reactivar");
    // forming with dormant still shows 'Unirme' (forming takes precedence over dormant)
    expect(actionToLabel("join", "forming", "mission", true)).toBe("Unirme");
    // completed with dormant still shows 'Ver resultados' (completed takes precedence)
    expect(actionToLabel("join", "completed", "mission", true)).toBe("Ver resultados");
    // proposal with dormant still shows 'Ver misión' (proposal takes precedence)
    expect(actionToLabel("join", "active", "proposal", true)).toBe("Ver misión");
    // not dormant → normal label
    expect(actionToLabel("join", "active", "mission", false)).toBe("Participar");
    expect(actionToLabel("join", "active", "mission")).toBe("Participar");
  });

  it("returns lifecycle-agnostic labels for non-join actions", () => {
    const staticLabels: Record<string, string> = {
      support: "Apoyar",
      comment: "Comentar",
      share: "Compartir",
      edit: "Editar",
      report: "Reportar",
    };
    for (const lifecycle of ALL_LIFECYCLES) {
      for (const [action, expected] of Object.entries(staticLabels)) {
        expect(actionToLabel(action as InitiativeAction, lifecycle)).toBe(expected);
      }
    }
  });
});

// ─── ACTION TO ICON ─────────────────────────────────────────────────────────

describe("actionToIcon", () => {
  const ALL_ACTIONS: InitiativeAction[] = ["support", "join", "comment", "share", "edit", "report"];

  it("returns non-empty string for every action", () => {
    for (const action of ALL_ACTIONS) {
      const icon = actionToIcon(action);
      expect(icon).toBeTruthy();
      expect(typeof icon).toBe("string");
    }
  });

  it("returns valid lucide icon names", () => {
    expect(actionToIcon("support")).toBe("Sparkles");
    expect(actionToIcon("join")).toBe("ArrowRight");
    expect(actionToIcon("comment")).toBe("MessageCircle");
    expect(actionToIcon("share")).toBe("Share2");
    expect(actionToIcon("edit")).toBe("Pencil");
    expect(actionToIcon("report")).toBe("Flag");
  });
});

// ─── ACTION PRIORITY ────────────────────────────────────────────────────────

describe("ACTION_PRIORITY", () => {
  it("has entries for all actions", () => {
    const expected: InitiativeAction[] = ["support", "join", "comment", "share", "edit", "report"];
    for (const action of expected) {
      expect(typeof ACTION_PRIORITY[action]).toBe("number");
    }
  });

  it("orders by spec: support|join > comment > share > edit > report", () => {
    const entries = Object.entries(ACTION_PRIORITY) as [InitiativeAction, number][];
    const sorted = [...entries].sort(([, a], [, b]) => a - b);
    const orderedActions = sorted.map(([action]) => action);
    expect(orderedActions).toEqual(["support", "join", "comment", "share", "edit", "report"]);
  });

  it("has unique priority values", () => {
    const values = Object.values(ACTION_PRIORITY);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ─── IS DORMANT ──────────────────────────────────────────────────────────────

describe("isDormant", () => {
  const refDate = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

  const mk = (overrides: Partial<Parameters<typeof isDormant>[0]>) =>
    isDormant({
      lifecycle: "active",
      temporalAnchor: { label: "", kind: "active", referenceDate: refDate(10) },
      ...overrides,
    });

  it("returns false when lifecycle is archived", () => {
    expect(mk({ lifecycle: "archived" })).toBe(false);
  });

  it("returns false when lifecycle is completed", () => {
    expect(mk({ lifecycle: "completed" })).toBe(false);
  });

  it("returns false when no referenceDate", () => {
    expect(mk({ temporalAnchor: { label: "", kind: "active", referenceDate: null } })).toBe(false);
  });

  it("returns false when activity is ≤60 days ago", () => {
    expect(mk({ temporalAnchor: { label: "", kind: "active", referenceDate: refDate(60) } })).toBe(
      false,
    );
    expect(mk({ temporalAnchor: { label: "", kind: "active", referenceDate: refDate(30) } })).toBe(
      false,
    );
    expect(mk({ temporalAnchor: { label: "", kind: "active", referenceDate: refDate(1) } })).toBe(
      false,
    );
  });

  it("returns true when activity is >60 days ago", () => {
    expect(mk({ temporalAnchor: { label: "", kind: "active", referenceDate: refDate(61) } })).toBe(
      true,
    );
    expect(mk({ temporalAnchor: { label: "", kind: "active", referenceDate: refDate(90) } })).toBe(
      true,
    );
  });

  it("works for forming lifecycle", () => {
    expect(
      mk({
        lifecycle: "forming",
        temporalAnchor: { label: "", kind: "active", referenceDate: refDate(61) },
      }),
    ).toBe(true);
    expect(
      mk({
        lifecycle: "forming",
        temporalAnchor: { label: "", kind: "active", referenceDate: refDate(10) },
      }),
    ).toBe(false);
  });
});
