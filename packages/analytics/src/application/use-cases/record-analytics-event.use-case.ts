import type { AnalyticsFact } from '../../domain/entities/analytics-event.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { AnalyticsEventRepository } from '../ports/analytics-event-repository.port.ts';
import type { Objections } from '../ports/objections.port.ts';

export interface RecordAnalyticsEventInput {
  readonly identity: string;
  readonly fact: AnalyticsFact;
}

/** Records a fact of use of an identity, unless it objects to product analytics. */
export interface RecordAnalyticsEvent {
  execute(input: RecordAnalyticsEventInput): Promise<void>;
}

/**
 * Records a fact of use of an identity, computed on the server only (RES-20): nothing of who
 * objects to product analytics, and the first visit only once.
 */
export class RecordAnalyticsEventUseCase implements RecordAnalyticsEvent {
  readonly #events: AnalyticsEventRepository;
  readonly #objections: Objections;
  readonly #ids: IdGenerator;
  readonly #clock: Clock;

  constructor(
    events: AnalyticsEventRepository,
    objections: Objections,
    ids: IdGenerator,
    clock: Clock,
  ) {
    this.#events = events;
    this.#objections = objections;
    this.#ids = ids;
    this.#clock = clock;
  }

  async execute({ identity, fact }: RecordAnalyticsEventInput): Promise<void> {
    if (await this.#objections.objects(identity)) return;
    if (fact.kind === 'first-visit' && (await this.#events.has(identity, 'first-visit'))) return;
    await this.#events.record({
      id: this.#ids.generate(),
      identity,
      occurredAt: this.#clock.now(),
      fact,
    });
  }
}
