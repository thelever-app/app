import type { PlayerNotifier } from '../../application/ports/player-notifier.port.ts';
import type { DomainEvent } from '../../domain/events/domain-event.ts';

/** Keeps what each player received, so tests can check who saw what. */
export class InMemoryPlayerNotifier implements PlayerNotifier {
  readonly #received = new Map<string, DomainEvent[]>();

  async notify(playerId: string, event: DomainEvent): Promise<void> {
    this.#received.set(playerId, [...this.receivedBy(playerId), event]);
  }

  receivedBy(playerId: string): readonly DomainEvent[] {
    return this.#received.get(playerId) ?? [];
  }
}
