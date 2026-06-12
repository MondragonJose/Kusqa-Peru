import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockContinue = vi.fn();
const mockIsLivingTerritoryEnabled = vi.fn();
const mockResolveUserId = vi.fn(() => Promise.resolve("test-actor-id"));

vi.doMock("@/lib/operationalFeature", () => ({
  isLivingTerritoryEnabled: mockIsLivingTerritoryEnabled,
}));

vi.doMock("@/services/initiativeContinuationRepository", () => ({
  initiativeContinuationRepository: {
    continue: mockContinue,
  },
}));

vi.doMock("@/features/auth/mutations/authMutationContext", () => ({
  resolveAuthenticatedUserId: mockResolveUserId,
}));

const { useContinueInitiative } = await import("../useContinueInitiative");

const initiativeId = "11111111-1111-1111-1111-111111111111";
const stewardId = "22222222-2222-2222-2222-222222222222";
const eventId = "33333333-3333-3333-3333-333333333333";
const ownerId = "44444444-4444-4444-4444-444444444444";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  vi.spyOn(queryClient, "invalidateQueries");
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe("useContinueInitiative", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws and makes ZERO rpc calls when flag is off", async () => {
    mockIsLivingTerritoryEnabled.mockReturnValue(false);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useContinueInitiative(), { wrapper });

    result.current.mutate({ initiativeId, kind: "proposal" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toBeDefined();
    expect((result.current.error as Error).message).toMatch(/no disponible/);
    expect(mockContinue).not.toHaveBeenCalled();
  });

  it("calls continue_initiative once and invalidates proposal keys on success", async () => {
    mockIsLivingTerritoryEnabled.mockReturnValue(true);
    mockContinue.mockResolvedValue({
      status: "success",
      data: { initiativeId, stewardId, eventId, ownerId },
    });

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useContinueInitiative(), { wrapper });

    result.current.mutate({ initiativeId, kind: "proposal" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockContinue).toHaveBeenCalledTimes(1);
    expect(mockContinue).toHaveBeenCalledWith(initiativeId, "test-actor-id");
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
    expect(result.current.data?.ownerId).toBe(ownerId);
  });

  it("calls continue_initiative once and invalidates mission keys on mission kind", async () => {
    mockIsLivingTerritoryEnabled.mockReturnValue(true);
    mockContinue.mockResolvedValue({
      status: "success",
      data: { initiativeId, stewardId, eventId, ownerId },
    });

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useContinueInitiative(), { wrapper });

    result.current.mutate({ initiativeId, kind: "mission" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockContinue).toHaveBeenCalledTimes(1);
    expect(mockContinue).toHaveBeenCalledWith(initiativeId, "test-actor-id");
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
    expect(result.current.data?.ownerId).toBe(ownerId);
  });

  it("surfaces repository error through the mutation error", async () => {
    mockIsLivingTerritoryEnabled.mockReturnValue(true);
    mockContinue.mockResolvedValue({
      status: "error",
      error: "Solo las iniciativas inactivas pueden ser continuadas.",
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useContinueInitiative(), { wrapper });

    result.current.mutate({ initiativeId, kind: "proposal" });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect((result.current.error as Error).message).toBe(
      "Solo las iniciativas inactivas pueden ser continuadas.",
    );
  });
});
