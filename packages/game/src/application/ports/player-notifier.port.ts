import type { DomainEvent } from '../../domain/events/domain-event.ts';

/** Delivers an event to one player. Who receives what is decided by the use cases. */
export interface PlayerNotifier {
  notify(playerId: string, event: DomainEvent): Promise<void>;
}
