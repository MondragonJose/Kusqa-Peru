import type { KusqaDomainEvent } from "@/domain/events";

export function replayEntityState(
  events: readonly KusqaDomainEvent[],
): readonly KusqaDomainEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}
