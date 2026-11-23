import type { AnalyticsFact } from '../../domain/entities/analytics-event.ts';
import type { AnalyticsEventRepository } from '../ports/analytics-event-repository.port.ts';

/** An analytics event as the file a player downloads shows it. */
export interface AnalyticsEventData {
  readonly occurredAt: string;
  readonly fact: AnalyticsFact;
}

/** The analytics events of an identity, oldest first. */
export interface ExportAnalyticsData {
  execute(identity: string): Promise<AnalyticsEventData[] | undefined>;
}

export class ExportAnalyticsDataUseCase implements ExportAnalyticsData {
  readonly #events: AnalyticsEventRepository;

  constructor(events: AnalyticsEventRepository) {
    this.#events = events;
  }

  async execute(identity: string): Promise<AnalyticsEventData[] | undefined> {
    const events = await this.#events.ofIdentity(identity);
    if (events.length === 0) return undefined;
    return events.map(({ occurredAt, fact }) => ({ occurredAt: occurredAt.toISOString(), fact }));
  }
}

/** Deletes every analytics event of an identity: when it objects, and when its data are deleted. */
export interface EraseAnalyticsData {
  execute(identity: string): Promise<void>;
}

export class EraseAnalyticsDataUseCase implements EraseAnalyticsData {
  readonly #events: AnalyticsEventRepository;

  constructor(events: AnalyticsEventRepository) {
    this.#events = events;
  }

  async execute(identity: string): Promise<void> {
    await this.#events.erase(identity);
  }
}
