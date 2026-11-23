import type { Outbox, PendingEvent } from '../../application/ports/outbox.port.ts';
import type { IssueEvent } from '../../domain/events/issue-event.ts';

export class InMemoryOutbox implements Outbox {
  readonly #pending: PendingEvent[] = [];
  #next = 1;

  async add(issueId: string, events: readonly IssueEvent[]): Promise<void> {
    for (const event of events) {
      this.#pending.push({ id: this.#next++, issueId, event: { ...event } });
    }
  }

  async pending(): Promise<PendingEvent[]> {
    return this.#pending.map((pending) => ({ ...pending }));
  }

  async sent(id: number): Promise<void> {
    const index = this.#pending.findIndex((pending) => pending.id === id);
    if (index >= 0) this.#pending.splice(index, 1);
  }
}
