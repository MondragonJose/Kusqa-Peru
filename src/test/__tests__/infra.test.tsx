/**
 * Test infrastructure smoke test — Phase 5A.
 *
 * Verifies the helpers (`renderWithProviders`, `supabaseMock`,
 * `factories`) compile and execute correctly. Not a feature test.
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../renderWithProviders";
import { createSupabaseMock } from "../createSupabaseMock";
import { makeProposalRow } from "../factories";

describe("test infrastructure smoke", () => {
  it("renderWithProviders mounts a component", async () => {
    renderWithProviders(<div data-testid="infra-ok">ok</div>);
    await waitFor(() => {
      expect(screen.getByTestId("infra-ok")).toHaveTextContent("ok");
    });
  });

  it("createSupabaseMock exposes a from/rpc/channel client", () => {
    const m = createSupabaseMock();
    expect(typeof m.client.from).toBe("function");
    expect(typeof m.client.rpc).toBe("function");
    expect(typeof m.client.channel).toBe("function");
  });

  it("createSupabaseMock routes rpc to a configured response", async () => {
    const m = createSupabaseMock();
    m.queue.rpcResponse("get_public_profile", { data: { id: "u1" }, error: null });
    const result = (await m.client.rpc("get_public_profile", { p_user_id: "u1" })) as {
      data: unknown;
    };
    expect(result.data).toEqual({ id: "u1" });
    expect(m.queue.rpcCalls).toHaveLength(1);
    expect(m.queue.rpcCalls[0]).toEqual({
      name: "get_public_profile",
      params: { p_user_id: "u1" },
    });
  });

  it("factories produce Zod-valid rows", () => {
    const row = makeProposalRow({ team_size: 5 });
    expect(row.team_size).toBe(5);
  });
});
