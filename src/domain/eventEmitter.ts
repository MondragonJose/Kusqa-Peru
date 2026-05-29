/**
 * KUSQA Domain Event Emitter — synchronous, in-process pub/sub.
 *
 * No external infrastructure.
 * No async queues.
 * Deterministic ordering (FIFO per subscription).
 * Every emitted event is appended to the in-memory registry AND
 * mirrored to the event_store (fire-and-forget, never blocks).
 */

import type { KusqaDomainEvent } from "@/domain/events";
import { appendToRegistry } from "@/domain/eventRegistry";
import { appendEventToStore } from "@/domain/eventStore";

type EventHandler = (event: KusqaDomainEvent) => void;

let handlers: EventHandler[] = [];

export function emit(event: KusqaDomainEvent): void {
  appendToRegistry(event);
  appendEventToStore(event);
  for (const handler of handlers) {
    handler(event);
  }
}

export function subscribe(handler: EventHandler): void {
  handlers.push(handler);
}

export function unsubscribe(handler: EventHandler): void {
  handlers = handlers.filter((h) => h !== handler);
}

export function clearSubscriptions(): void {
  handlers = [];
}
