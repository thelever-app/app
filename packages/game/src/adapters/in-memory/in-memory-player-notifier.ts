import type { PlayerNotifier } from '../../application/ports/player-notifier.port.ts';
import type { DomainEvent } from '../../domain/events/domain-event.ts';

/** Keeps what each player received, so tests can check who saw what. */
export class InMemoryPlayerNotifier implements PlayerNotifier {
  readonly #received = new Map<string, DomainEvent[]>();

  async notify(playerId: string, event: DomainEvent): Promise<void> {
    const received = this.#received.get(playerId) ?? [];
    received.push(event);
    this.#received.set(playerId, received);
  }

  receivedBy(playerId: string): readonly DomainEvent[] {
    return this.#received.get(playerId) ?? [];
  }
}
