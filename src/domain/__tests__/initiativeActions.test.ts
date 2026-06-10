import { describe, expect, it } from "vitest";
import type { InitiativeLifecycle } from "../initiative";
import {
  getAvailableInitiativeActions,
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

function act(
  lifecycle: InitiativeLifecycle,
  relationship: UserRelationship,
): InitiativeAction[] {
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
    expect(sorted(act("forming", "visitor"))).toEqual([
      "report",
      "share",
      "support",
    ]);
  });

  it("supporter → support, comment, share", () => {
    expect(sorted(act("forming", "supporter"))).toEqual([
      "comment",
      "share",
      "support",
    ]);
  });

  it("collaborator → comment, share", () => {
    expect(sorted(act("forming", "collaborator"))).toEqual([
      "comment",
      "share",
    ]);
  });

  it("organizer → edit, comment, share", () => {
    expect(sorted(act("forming", "organizer"))).toEqual([
      "comment",
      "edit",
      "share",
    ]);
  });

  it("participant → comment, share (edge case)", () => {
    expect(sorted(act("forming", "participant"))).toEqual([
      "comment",
      "share",
    ]);
  });
});

// ─── ACTIVE ────────────────────────────────────────────────────────────────

describe("active", () => {
  it("visitor → join, share, report", () => {
    expect(sorted(act("active", "visitor"))).toEqual([
      "join",
      "report",
      "share",
    ]);
  });

  it("participant → comment, share", () => {
    expect(sorted(act("active", "participant"))).toEqual([
      "comment",
      "share",
    ]);
  });

  it("supporter → comment, share", () => {
    expect(sorted(act("active", "supporter"))).toEqual([
      "comment",
      "share",
    ]);
  });

  it("collaborator → comment, share", () => {
    expect(sorted(act("active", "collaborator"))).toEqual([
      "comment",
      "share",
    ]);
  });

  it("organizer → edit, comment, share", () => {
    expect(sorted(act("active", "organizer"))).toEqual([
      "comment",
      "edit",
      "share",
    ]);
  });
});

// ─── ENDING (same rules as ACTIVE) ─────────────────────────────────────────

describe("ending", () => {
  it("visitor → join, share, report", () => {
    expect(sorted(act("ending", "visitor"))).toEqual([
      "join",
      "report",
      "share",
    ]);
  });

  it("participant → comment, share", () => {
    expect(sorted(act("ending", "participant"))).toEqual([
      "comment",
      "share",
    ]);
  });

  it("supporter → comment, share", () => {
    expect(sorted(act("ending", "supporter"))).toEqual([
      "comment",
      "share",
    ]);
  });

  it("collaborator → comment, share", () => {
    expect(sorted(act("ending", "collaborator"))).toEqual([
      "comment",
      "share",
    ]);
  });

  it("organizer → edit, comment, share", () => {
    expect(sorted(act("ending", "organizer"))).toEqual([
      "comment",
      "edit",
      "share",
    ]);
  });
});

// ─── COMPLETED ────────────────────────────────────────────────────────────

describe("completed", () => {
  it("visitor → share, report", () => {
    expect(sorted(act("completed", "visitor"))).toEqual(["report", "share"]);
  });

  it("participant → comment, share", () => {
    expect(sorted(act("completed", "participant"))).toEqual([
      "comment",
      "share",
    ]);
  });

  it("supporter → comment, share", () => {
    expect(sorted(act("completed", "supporter"))).toEqual([
      "comment",
      "share",
    ]);
  });

  it("collaborator → comment, share", () => {
    expect(sorted(act("completed", "collaborator"))).toEqual([
      "comment",
      "share",
    ]);
  });

  it("organizer → edit, share", () => {
    expect(sorted(act("completed", "organizer"))).toEqual(["edit", "share"]);
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
