import type { AnalyticsEventRepository } from '../../application/ports/analytics-event-repository.port.ts';
import type { AnalyticsEvent, AnalyticsEventKind } from '../../domain/entities/analytics-event.ts';

export class InMemoryAnalyticsEventRepository implements AnalyticsEventRepository {
  readonly #events: AnalyticsEvent[] = [];

  async record(event: AnalyticsEvent): Promise<void> {
    this.#events.push(copyOf(event));
  }

  async ofIdentity(identity: string): Promise<AnalyticsEvent[]> {
    return this.#events
      .filter((event) => event.identity === identity)
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      .map((event) => copyOf(event));
  }

  async has(identity: string, kind: AnalyticsEventKind): Promise<boolean> {
    return this.#events.some((event) => event.identity === identity && event.fact.kind === kind);
  }

  async erase(identity: string): Promise<void> {
    for (let index = this.#events.length - 1; index >= 0; index -= 1) {
      if (this.#events[index]?.identity === identity) this.#events.splice(index, 1);
    }
  }
}

/** A copy, so what it gives back is never the object that was recorded. */
function copyOf(event: AnalyticsEvent): AnalyticsEvent {
  const { fact } = event;
  return {
    ...event,
    occurredAt: new Date(event.occurredAt),
    fact: fact.kind === 'first-visit' ? { ...fact, origin: { ...fact.origin } } : { ...fact },
  };
}
