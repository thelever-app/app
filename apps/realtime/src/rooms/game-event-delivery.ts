import { type Attributes, SpanKind } from '@opentelemetry/api';
import type { Logger } from '@thelever-app/db';
import type { DomainEvent, PlayerNotifier } from '@thelever-app/game';
import type { KeyedLock } from '../concurrency/keyed-lock.ts';
import { GAME_ID } from '../telemetry/game-sampler.ts';
import { instruments } from '../telemetry/instruments.ts';
import { inSpan } from '../telemetry/tracing.ts';
import type { GameStateSender } from './sockets/game-state-sender.ts';
import type { RoomConnection } from './sockets/room-connection.ts';

/**
 * Delivers to the sockets of this instance the events another instance published, each in turn with
 * the commands of the game its player plays: the answerer gets their fresh state inside the lock of
 * the game, and the screen applies a later change only on top of that state.
 */
export class GameEventDelivery {
  readonly #notifier: PlayerNotifier;
  readonly #stateSender: Pick<GameStateSender, 'send'>;
  readonly #gameLock: KeyedLock;
  readonly #logger: Logger;
  /** The connections of this instance now, with the game of each player. */
  readonly #connections: () => readonly RoomConnection[];

  constructor(
    notifier: PlayerNotifier,
    stateSender: Pick<GameStateSender, 'send'>,
    gameLock: KeyedLock,
    logger: Logger,
    connections: () => readonly RoomConnection[],
  ) {
    this.#notifier = notifier;
    this.#stateSender = stateSender;
    this.#gameLock = gameLock;
    this.#logger = logger;
    this.#connections = connections;
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
        () => this.#deliverInTurn(playerIds, event),
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

  /**
   * Sends every player connected here a fresh state, in turn with the commands of their game: what
   * was published while this instance was not listening is lost. Never throws.
   */
  async catchUp(): Promise<void> {
    await Promise.all(
      this.#connections().map(async (connection) => {
        const { session } = connection;
        if (!session) return;
        try {
          await this.#inTurn(session.gameId, () => this.#stateSender.send(connection, session));
        } catch (error) {
          this.#logger.error('sending the game state after listening again failed', error);
        }
      }),
    );
  }

  /** An event of a game waits for that game; one of the room, for the game of each player. */
  async #deliverInTurn(playerIds: readonly string[], event: DomainEvent): Promise<void> {
    const gameId = gameIdOf(event);
    if (gameId !== undefined) {
      await this.#inTurn(gameId, () => this.#notifier.notify(playerIds, event));
      return;
    }
    await Promise.all(
      [...this.#byGame(playerIds)].map(([game, players]) =>
        this.#inTurn(game, () => this.#notifier.notify(players, event)),
      ),
    );
  }

  /** The players connected here, by the game each one plays. */
  #byGame(playerIds: readonly string[]): Map<string, string[]> {
    const wanted = new Set(playerIds);
    const byGame = new Map<string, string[]>();
    for (const { session } of this.#connections()) {
      if (!session || !wanted.has(session.playerId)) continue;
      const players = byGame.get(session.gameId) ?? [];
      if (!players.includes(session.playerId)) players.push(session.playerId);
      byGame.set(session.gameId, players);
    }
    return byGame;
  }

  async #inTurn(gameId: string, work: () => Promise<void>): Promise<void> {
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
