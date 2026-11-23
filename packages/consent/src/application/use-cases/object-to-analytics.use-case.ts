import type { Clock } from '../../domain/ports/clock.port.ts';
import type { AnalyticsEvents } from '../ports/analytics-events.port.ts';
import type { AnalyticsObjectionRepository } from '../ports/analytics-objection-repository.port.ts';

/**
 * A player objects to product analytics: from now on no analytics event of theirs is
 * recorded, and those recorded before are deleted.
 */
export class ObjectToAnalyticsUseCase {
  readonly #objections: AnalyticsObjectionRepository;
  readonly #clock: Clock;
  readonly #events: AnalyticsEvents;

  constructor(objections: AnalyticsObjectionRepository, clock: Clock, events: AnalyticsEvents) {
    this.#objections = objections;
    this.#clock = clock;
    this.#events = events;
  }

  async execute(identity: string): Promise<void> {
    await this.#objections.object(identity, this.#clock.now());
    await this.#events.erase(identity);
  }
}
