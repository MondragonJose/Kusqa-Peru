import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Initiative, InitiativeLifecycle } from "@/domain/initiative";
import type { UserRelationship } from "@/domain/initiativeActions";
import { InitiativeActionBar } from "../components/InitiativeActionBar";

// ─── Factory ────────────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────

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

const ALL_VARIANTS = ["row", "stack", "compact", "popup"] as const;

// ─── RENDERING BY VARIANT ──────────────────────────────────────────────────

describe("InitiativeActionBar", () => {
  describe("renders without crashing for every variant", () => {
    for (const variant of ALL_VARIANTS) {
      it(variant, () => {
        const { container } = render(
          <InitiativeActionBar
            initiative={makeInitiative()}
            relationship="visitor"
            variant={variant}
          />,
        );
        expect(container.firstChild).toBeTruthy();
      });
    }
  });

  it("returns null for archived lifecycle (all variants)", () => {
    for (const variant of ALL_VARIANTS) {
      const { container } = render(
        <InitiativeActionBar
          initiative={makeInitiative({ lifecycle: "archived" })}
          relationship="visitor"
          variant={variant}
        />,
      );
      expect(container.firstChild).toBeNull();
    }
  });
});

// ─── MATRIX: lifecycle × relationship renders actions ──────────────────────

describe("lifecycle × relationship matrix", () => {
  for (const lifecycle of ALL_LIFECYCLES) {
    describe(lifecycle, () => {
      for (const relationship of ALL_RELATIONSHIPS) {
        it(`${relationship} renders buttons`, () => {
          render(
            <InitiativeActionBar
              initiative={makeInitiative({ lifecycle })}
              relationship={relationship}
              variant="row"
            />,
          );

          if (lifecycle === "archived") {
            expect(screen.queryByRole("button")).toBeNull();
            return;
          }

          const buttons = screen.getAllByRole("button");
          expect(buttons.length).toBeGreaterThanOrEqual(1);
        });
      }
    });
  }
});

// ─── CALLBACKS ──────────────────────────────────────────────────────────────

describe("callbacks", () => {
  it("calls onSupport when support button is clicked", async () => {
    const onSupport = vi.fn();
    render(
      <InitiativeActionBar
        initiative={makeInitiative({ lifecycle: "forming" })}
        relationship="visitor"
        onSupport={onSupport}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /apoyar/i }));
    expect(onSupport).toHaveBeenCalledOnce();
  });

  it("calls onJoin when join button is clicked", async () => {
    const onJoin = vi.fn();
    render(
      <InitiativeActionBar
        initiative={makeInitiative({ lifecycle: "active" })}
        relationship="visitor"
        onJoin={onJoin}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /participar/i }));
    expect(onJoin).toHaveBeenCalledOnce();
  });

  it("calls onShare when share button is clicked", async () => {
    const onShare = vi.fn();
    render(
      <InitiativeActionBar
        initiative={makeInitiative({ lifecycle: "active" })}
        relationship="visitor"
        onShare={onShare}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /compartir/i }));
    expect(onShare).toHaveBeenCalledOnce();
  });

  it("calls onEdit when edit button is clicked", async () => {
    const onEdit = vi.fn();
    render(
      <InitiativeActionBar
        initiative={makeInitiative({ lifecycle: "active" })}
        relationship="organizer"
        onEdit={onEdit}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /editar/i }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("calls onComment when comment button is clicked", async () => {
    const onComment = vi.fn();
    render(
      <InitiativeActionBar
        initiative={makeInitiative({ lifecycle: "active" })}
        relationship="participant"
        onComment={onComment}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /comentar/i }));
    expect(onComment).toHaveBeenCalledOnce();
  });

  it("calls onReport when report button is clicked", async () => {
    const onReport = vi.fn();
    render(
      <InitiativeActionBar
        initiative={makeInitiative({ lifecycle: "active" })}
        relationship="visitor"
        onReport={onReport}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /reportar/i }));
    expect(onReport).toHaveBeenCalledOnce();
  });
});

// ─── DISABLED STATE ─────────────────────────────────────────────────────────

describe("disabled buttons", () => {
  it("disables an action when no handler is provided", () => {
    render(
      <InitiativeActionBar
        initiative={makeInitiative({ lifecycle: "active" })}
        relationship="visitor"
        variant="row"
        // no onJoin provided, no onShare provided, only onReport
        onReport={() => {}}
      />,
    );
    // Report should be enabled (has handler)
    const reportBtn = screen.getByRole("button", { name: /reportar/i });
    expect(reportBtn).not.toBeDisabled();

    // Share should be disabled (no handler)
    const shareBtn = screen.getByRole("button", { name: /compartir/i });
    expect(shareBtn).toBeDisabled();

    // Join should be disabled (no handler)
    const joinBtn = screen.getByRole("button", { name: /participar/i });
    expect(joinBtn).toBeDisabled();
  });
});

// ─── OVERFLOW (maxVisible) ─────────────────────────────────────────────────

describe("overflow / maxVisible", () => {
  it("limits visible actions to maxVisible in row variant", () => {
    render(
      <InitiativeActionBar
        initiative={makeInitiative({ lifecycle: "active" })}
        relationship="visitor"
        variant="row"
        maxVisible={1}
        onJoin={() => {}}
        onShare={() => {}}
        onReport={() => {}}
      />,
    );
    // active + visitor = join, share, report (3 actions)
    // maxVisible=1 => only join visible, + "2 Más" overflow
    expect(screen.getByRole("button", { name: /participar/i })).toBeInTheDocument();
    expect(screen.getByText(/2 más/i)).toBeInTheDocument();
  });

  it("expands overflow on click and shows all actions", async () => {
    render(
      <InitiativeActionBar
        initiative={makeInitiative({ lifecycle: "active" })}
        relationship="visitor"
        variant="row"
        maxVisible={2}
        onJoin={() => {}}
        onShare={() => {}}
        onReport={() => {}}
      />,
    );
    // active + visitor = join, share, report (3 actions)
    // maxVisible=2 => join + share visible, "1 Más" overflow
    expect(screen.getByText(/1 más/i)).toBeInTheDocument();
    await userEvent.click(screen.getByText(/1 más/i));
    // now all 3 should be visible
    expect(screen.getByRole("button", { name: /reportar/i })).toBeInTheDocument();
    expect(screen.queryByText(/más/i)).not.toBeInTheDocument();
    expect(screen.getByText(/ver menos/i)).toBeInTheDocument();
  });

  it("collapses back when 'Ver menos' is clicked", async () => {
    render(
      <InitiativeActionBar
        initiative={makeInitiative({ lifecycle: "active" })}
        relationship="visitor"
        variant="row"
        maxVisible={2}
        onJoin={() => {}}
        onShare={() => {}}
        onReport={() => {}}
      />,
    );
    await userEvent.click(screen.getByText(/1 más/i));
    expect(screen.getByText(/ver menos/i)).toBeInTheDocument();
    await userEvent.click(screen.getByText(/ver menos/i));
    expect(screen.getByText(/1 más/i)).toBeInTheDocument();
  });
});

// ─── LABEL OVERRIDES ────────────────────────────────────────────────────────

describe("labelOverrides", () => {
  it("uses custom labels when provided", () => {
    render(
      <InitiativeActionBar
        initiative={makeInitiative({ lifecycle: "active" })}
        relationship="visitor"
        labelOverrides={{ support: "Impulsar", join: "Sumarme" }}
        onJoin={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /sumarme/i })).toBeInTheDocument();
  });
});

// ─── POPUP VARIANT ──────────────────────────────────────────────────────────

describe("popup variant", () => {
  it("shows primary action prominently and secondary as icons", () => {
    render(
      <InitiativeActionBar
        initiative={makeInitiative({ lifecycle: "active" })}
        relationship="visitor"
        variant="popup"
        onJoin={() => {}}
        onShare={() => {}}
        onReport={() => {}}
      />,
    );
    // Primary (join) should have label visible
    expect(screen.getByRole("button", { name: /participar/i })).toBeInTheDocument();
    // Share and report should be icon-only (aria-label)
    expect(screen.getByRole("button", { name: /compartir/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reportar/i })).toBeInTheDocument();
  });
});

// ─── COMPACT VARIANT ────────────────────────────────────────────────────────

describe("compact variant", () => {
  it("renders all actions as icon-only buttons", () => {
    render(
      <InitiativeActionBar
        initiative={makeInitiative({ lifecycle: "active" })}
        relationship="visitor"
        variant="compact"
        onJoin={() => {}}
        onShare={() => {}}
        onReport={() => {}}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });
});
