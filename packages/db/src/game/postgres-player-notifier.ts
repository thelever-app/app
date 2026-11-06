import { context, propagation } from '@opentelemetry/api';
import {
  ConnectionChangedEvent,
  type DomainEvent,
  type PlayerNotifier,
  ProgressUpdatedEvent,
} from '@thelever-app/game';
import { type Kysely, sql } from 'kysely';
import type { GameTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

/** The only channel: every instance listens to it and delivers to the players it has sockets for. */
export const GAME_EVENTS_CHANNEL = 'game_events';

/** What travels on the channel: ids, counters and versions, never votes, nicknames or identities. */
interface Notification {
  readonly playerIds: readonly string[];
  readonly event: DomainEvent;
  /** The trace of the command that published it, as W3C headers, so the delivery continues it. */
  readonly trace: Readonly<Record<string, string>>;
  /**
   * When it was published, in milliseconds since the epoch, to measure how long delivering takes.
   * A revision still serving from before it existed publishes without it.
   */
  readonly publishedAt: number | undefined;
}

/** The event and who receives it, rebuilt from what an instance published. */
export function readNotification(payload: string): Notification {
  const {
    playerIds,
    event,
    trace = {},
    publishedAt,
  } = JSON.parse(payload) as {
    playerIds: string[];
    event: Record<string, unknown>;
    trace?: Record<string, string>;
    publishedAt?: number;
  };
  switch (event.type) {
    case 'ProgressUpdated':
      return {
        playerIds,
        trace,
        publishedAt,
        event: new ProgressUpdatedEvent(
          String(event.gameId),
          String(event.playerId),
          Number(event.progress),
          Number(event.gameVersion),
        ),
      };
    case 'ConnectionChanged':
      return {
        playerIds,
        trace,
        publishedAt,
        event: new ConnectionChangedEvent(
          String(event.roomId),
          String(event.playerId),
          Boolean(event.connected),
          Number(event.roomVersion),
        ),
      };
    default:
      throw new Error(`no event of type ${String(event.type)} travels between instances`);
  }
}

/**
 * Publishes each event, with who receives it, for every instance. Inside a command it leaves at the
 * commit, so nobody hears of a change that was not saved.
 */
export class PostgresPlayerNotifier implements PlayerNotifier {
  readonly #db: Kysely<GameTables>;

  constructor(db: Kysely<GameTables>) {
    this.#db = db;
  }

  async notify(playerIds: readonly string[], event: DomainEvent): Promise<void> {
    const trace: Record<string, string> = {};
    propagation.inject(context.active(), trace);
    const publishedAt = Date.now();
    for (const payload of payloadsOf(playerIds, event, { trace, publishedAt })) {
      await this.#publish(payload);
    }
  }

  async #publish(payload: string): Promise<void> {
    const transaction = currentTransaction<GameTables>();
    const notify = sql`select pg_notify(${GAME_EVENTS_CHANNEL}, ${payload})`;
    if (!transaction) {
      await notify.execute(this.#db);
      return;
    }
    // A statement that fails aborts the whole transaction, and its commit would then undo the
    // command without an error: the savepoint makes a failed notification lose only itself.
    await sql`savepoint notify`.execute(transaction);
    try {
      await notify.execute(transaction);
    } catch (error) {
      await sql`rollback to savepoint notify`.execute(transaction);
      throw error;
    }
    await sql`release savepoint notify`.execute(transaction);
  }
}

/** PostgreSQL refuses a payload of 8000 bytes or more. */
const MAX_PAYLOAD_BYTES = 7999;

/** The payloads that carry the event to those players: as few as fit them, each below the limit. */
/** What every payload of one notification carries besides the players. */
type Stamp = Pick<Notification, 'trace' | 'publishedAt'>;

function payloadsOf(
  playerIds: readonly string[],
  event: DomainEvent,
  stamp: Stamp,
): readonly string[] {
  const payloads: string[] = [];
  let batch: string[] = [];
  let bytes = 0;
  const emptyBytes = Buffer.byteLength(payloadOf([], event, stamp));
  for (const playerId of playerIds) {
    // Its quotes and the comma before it.
    const idBytes = Buffer.byteLength(JSON.stringify(playerId)) + 1;
    if (batch.length > 0 && emptyBytes + bytes + idBytes > MAX_PAYLOAD_BYTES) {
      payloads.push(payloadOf(batch, event, stamp));
      batch = [];
      bytes = 0;
    }
    batch.push(playerId);
    bytes += idBytes;
  }
  if (batch.length > 0) payloads.push(payloadOf(batch, event, stamp));
  return payloads;
}

function payloadOf(playerIds: readonly string[], event: DomainEvent, stamp: Stamp): string {
  return JSON.stringify({ playerIds, event, ...stamp } satisfies Notification);
}
