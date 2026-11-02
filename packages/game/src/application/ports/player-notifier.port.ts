import type { DomainEvent } from '../../domain/events/domain-event.ts';

/** Delivers an event to some players at once. Who receives what is decided by the use cases. */
export interface PlayerNotifier {
  notify(playerIds: readonly string[], event: DomainEvent): Promise<void>;
}
