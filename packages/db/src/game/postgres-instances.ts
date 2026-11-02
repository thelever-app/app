import { type Kysely, sql } from 'kysely';
import type { Database } from '../schema.ts';

/**
 * The instances of the room server and the connections each one serves. The times are those of the
 * database, so the clocks of the instances never disagree.
 */
export class PostgresInstances {
  readonly #db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.#db = db;
  }

  /** The instance is alive now: its first sign registers it. */
  async beat(id: string): Promise<void> {
    await this.#db
      .insertInto('instances')
      .values({ id, seen_at: sql<Date>`now()` })
      .onConflict((conflict) => conflict.column('id').doUpdateSet({ seen_at: sql<Date>`now()` }))
      .execute();
  }

  /** The other instances with no sign for longer than that, which are taken for dead. */
  async findSilent({
    forMs,
    except,
  }: {
    readonly forMs: number;
    readonly except: string;
  }): Promise<readonly string[]> {
    const rows = await this.#db
      .selectFrom('instances')
      .select('id')
      .where('seen_at', '<', sql<Date>`now() - make_interval(secs => ${forMs / 1000})`)
      .where('id', '<>', except)
      .orderBy('id')
      .execute();
    return rows.map(({ id }) => id);
  }

  /** The connections that instance serves, room by room. */
  async connectionsOf(instanceId: string): Promise<
    readonly {
      readonly roomId: string;
      readonly connections: readonly { readonly playerId: string; readonly connectionId: string }[];
    }[]
  > {
    const rows = await this.#db
      .selectFrom('room_connections')
      .innerJoin('room_players', 'room_players.id', 'room_connections.player_id')
      .select([
        'room_players.room_id as roomId',
        'room_connections.player_id as playerId',
        'room_connections.id as connectionId',
      ])
      .where('room_connections.instance_id', '=', instanceId)
      .orderBy('room_players.room_id')
      .orderBy('room_connections.id')
      .execute();
    const rooms = new Map<string, { playerId: string; connectionId: string }[]>();
    for (const { roomId, playerId, connectionId } of rows) {
      rooms.set(roomId, [...(rooms.get(roomId) ?? []), { playerId, connectionId }]);
    }
    return [...rooms].map(([roomId, connections]) => ({ roomId, connections }));
  }

  /** Forgets the instance; the database refuses while it still has connections. */
  async remove(id: string): Promise<void> {
    await this.#db.deleteFrom('instances').where('id', '=', id).execute();
  }
}
