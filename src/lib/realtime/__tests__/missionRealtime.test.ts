import { describe, expect, it } from "vitest";
import { planRealtimeReconciliation } from "@/lib/realtime/missionRealtime";

describe("planRealtimeReconciliation", () => {
  it("ignores remote events when local write is in flight", () => {
    const decision = planRealtimeReconciliation(
      {
        type: "mission.completed",
        actorId: "user-1",
        missionId: "mission-1",
        occurredAt: new Date().toISOString(),
        xpGranted: 320,
      },
      { hasLocalWriteInFlight: true }
    );
    expect(decision.action).toBe("ignore");
  });

  it("schedules invalidation when safe to reconcile", () => {
    const decision = planRealtimeReconciliation(
      {
        type: "progress.updated",
        actorId: "00000000-0000-4000-8000-000000000002",
        occurredAt: new Date().toISOString(),
      },
      { hasLocalWriteInFlight: false }
    );
    expect(decision.action).toBe("invalidate");
    if (decision.action === "invalidate") {
      expect(decision.scope.userId).toBe("00000000-0000-4000-8000-000000000002");
    }
  });

  it("invalidates notification events per user", () => {
    const decision = planRealtimeReconciliation(
      {
        type: "notification.received",
        actorId: "00000000-0000-4000-8000-000000000002",
        occurredAt: new Date().toISOString(),
      },
      { hasLocalWriteInFlight: false }
    );
    expect(decision.action).toBe("invalidate");
  });
});
