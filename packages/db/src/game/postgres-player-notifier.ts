import {
  ConnectionChangedEvent,
  type DomainEvent,
  type PlayerNotifier,
  ProgressUpdatedEvent,
} from '@thelever-app/game';
import { type Kysely, sql } from 'kysely';
import type { Database } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

/** The only channel: every instance listens to it and delivers to the players it has sockets for. */
export const GAME_EVENTS_CHANNEL = 'game_events';

/** What travels on the channel: ids, counters and versions, never votes, nicknames or identities. */
interface Notification {
  readonly playerIds: readonly string[];
  readonly event: DomainEvent;
}

/** The event and who receives it, rebuilt from what an instance published. */
export function readNotification(payload: string): Notification {
  const { playerIds, event } = JSON.parse(payload) as {
    playerIds: string[];
    event: Record<string, unknown>;
  };
  switch (event.type) {
    case 'ProgressUpdated':
      return {
        playerIds,
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
  readonly #db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.#db = db;
  }

  async notify(playerIds: readonly string[], event: DomainEvent): Promise<void> {
    if (playerIds.length === 0) return;
    const payload = JSON.stringify({ playerIds, event } satisfies Notification);
    await sql`select pg_notify(${GAME_EVENTS_CHANNEL}, ${payload})`.execute(
      currentTransaction() ?? this.#db,
    );
  }
}
