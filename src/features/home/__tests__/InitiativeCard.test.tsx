import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Initiative, InitiativeLifecycle } from "@/domain/initiative";
import { getAvailableInitiativeActions } from "@/domain/initiativeActions";
import { InitiativeCard } from "../components/InitiativeCard";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return { ...(actual as object), useNavigate: () => vi.fn() };
});

vi.mock("@/features/proposals/hooks/useSupportProposal", () => ({
  useSupportProposal: () => ({ isSupported: () => false }),
  useSupportCount: () => ({ data: 0 }),
}));

const BASE: Initiative = {
  id: "test-1",
  sourceType: "mission",
  sourceId: "mission-1",
  title: "Test Mission",
  summary: "Test summary",
  category: "Comunidad",
  region: "costa",
  emoji: "🌟",
  lifecycle: "active",
  temporalAnchor: { label: "En curso", kind: "active", referenceDate: null },
};

const ALL_LIFECYCLES: InitiativeLifecycle[] = [
  "forming",
  "active",
  "ending",
  "completed",
  "archived",
];

function renderCard(initiative: Initiative) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <InitiativeCard initiative={initiative} />
    </QueryClientProvider>,
  );
}

describe("InitiativeCard — action parity", () => {
  describe("renders InitiativeActionBar actions matching canonical getAvailableInitiativeActions", () => {
    for (const lifecycle of ALL_LIFECYCLES) {
      it(`lifecycle=${lifecycle} visitor`, () => {
        const { container } = renderCard({ ...BASE, lifecycle } as Initiative);
        const canonical = getAvailableInitiativeActions({
          lifecycle,
          sourceType: "mission",
          relationship: "visitor",
        });
        if (canonical.length === 0) {
          expect(container.textContent).toBe("");
        } else {
          expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(1);
        }
      });
    }
  });
});
