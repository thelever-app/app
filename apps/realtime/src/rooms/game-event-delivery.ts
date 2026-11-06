import { type Attributes, SpanKind } from '@opentelemetry/api';
import type { Logger } from '@thelever-app/db';
import type { DomainEvent, PlayerNotifier } from '@thelever-app/game';
import type { KeyedLock } from '../concurrency/keyed-lock.ts';
import { GAME_ID } from '../telemetry/game-sampler.ts';
import { instruments } from '../telemetry/instruments.ts';
import { inSpan } from '../telemetry/tracing.ts';

/**
 * Delivers to the sockets of this instance the events another instance published. An event of a
 * game waits for the command of that game in progress here: its answerer gets their fresh state
 * inside the lock, and the screen applies a later change only on top of that state.
 */
export class GameEventDelivery {
  readonly #notifier: PlayerNotifier;
  readonly #gameLock: KeyedLock;
  readonly #logger: Logger;

  constructor(notifier: PlayerNotifier, gameLock: KeyedLock, logger: Logger) {
    this.#notifier = notifier;
    this.#gameLock = gameLock;
    this.#logger = logger;
  }

  /** Never throws: a delivery that fails is logged, and the next one goes on. */
  async deliver(
    playerIds: readonly string[],
    event: DomainEvent,
    publishedAt: number | undefined,
  ): Promise<void> {
    try {
      // One span per instance that delivers, not per player: a room of 50 would make 50 spans.
      await inSpan(
        'deliver game event',
        attributesOf(playerIds, event),
        () => this.#inTurn(gameIdOf(event), () => this.#notifier.notify(playerIds, event)),
        { kind: SpanKind.CONSUMER },
      );
    } catch (error) {
      this.#logger.error('delivering a game event failed', error, { event: event.type });
      return;
    }
    if (publishedAt !== undefined) {
      instruments().eventDelay.record(Date.now() - publishedAt, { 'event.type': event.type });
    }
  }

  async #inTurn(gameId: string | undefined, work: () => Promise<void>): Promise<void> {
    if (gameId === undefined) return work();
    const release = await this.#gameLock.acquire(gameId);
    try {
      await work();
    } finally {
      release();
    }
  }
}

function gameIdOf(event: DomainEvent): string | undefined {
  return 'gameId' in event ? String(event.gameId) : undefined;
}

/** What a delivery span says: the event, its game or room, and how many players it is for. */
function attributesOf(playerIds: readonly string[], event: DomainEvent): Attributes {
  return {
    'event.type': event.type,
    'event.recipients': playerIds.length,
    [GAME_ID]: gameIdOf(event),
    'room.id': 'roomId' in event ? String(event.roomId) : undefined,
  };
}
