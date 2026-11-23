import type { RecordAnalyticsEvent } from '@thelever-app/analytics/published';
import type { Usage, UsageFact } from '@thelever-app/game';

/** The facts of use of Game as analytics events of Analytics, one per identity. */
export class AnalyticsUsage implements Usage {
  readonly #record: RecordAnalyticsEvent;

  constructor(record: RecordAnalyticsEvent) {
    this.#record = record;
  }

  async record(fact: UsageFact): Promise<void> {
    switch (fact.kind) {
      case 'room-created':
      case 'room-joined':
        await this.#record.execute({
          identity: fact.identity,
          fact: { kind: fact.kind, roomId: fact.roomId },
        });
        return;
      case 'game-started':
      case 'game-ended':
        for (const identity of fact.identities) {
          await this.#record.execute({
            identity,
            fact: {
              kind: fact.kind,
              roomId: fact.roomId,
              gameId: fact.gameId,
              players: fact.players,
            },
          });
        }
    }
  }
}
