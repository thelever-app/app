import { Room, type RoomRepository, type RoomSnapshot } from '@thelever-app/game';
import type { Kysely, Transaction } from 'kysely';
import type { Database } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

/**
 * A room in its rows. Inside a command, reading it locks it until the command commits, so two commands
 * on one room never overlap, whatever instance runs them.
 */
export class PostgresRoomRepository implements RoomRepository {
  readonly #db: Kysely<Database>;
  /** The instance of the server this repository runs in: the one serving the connections it saves. */
  readonly #instanceId: string;

  constructor(db: Kysely<Database>, instanceId: string) {
    this.#db = db;
    this.#instanceId = instanceId;
  }

  async save(room: Room): Promise<void> {
    const transaction = currentTransaction();
    if (transaction) return this.#save(transaction, room.toSnapshot());
    await this.#db.transaction().execute((own) => this.#save(own, room.toSnapshot()));
  }

  async findById(id: string): Promise<Room | undefined> {
    const transaction = currentTransaction();
    const db = transaction ?? this.#db;
    // Only a command locks: a query reads without waiting.
    const room = await db
      .selectFrom('rooms')
      .selectAll()
      .where('id', '=', id)
      .$if(transaction !== undefined, (query) => query.forUpdate())
      .executeTakeFirst();
    if (!room) return undefined;

    const players = await db
      .selectFrom('room_players')
      .select(['id', 'nickname', 'identity'])
      .where('room_id', '=', id)
      .orderBy('position')
      .execute();
    const connections = await db
      .selectFrom('room_connections')
      .innerJoin('room_players', 'room_players.id', 'room_connections.player_id')
      .select(['room_connections.player_id as playerId', 'room_connections.id as connectionId'])
      .where('room_players.room_id', '=', id)
      .execute();

    return Room.restore({
      id: room.id,
      hostId: room.host_player_id,
      version: room.version,
      players,
      connections,
    });
  }

  async #save(db: Transaction<Database>, snapshot: RoomSnapshot): Promise<void> {
    const { id, hostId, version, players, connections } = snapshot;
    await db
      .insertInto('rooms')
      .values({ id, host_player_id: hostId, version })
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({ host_player_id: hostId, version }),
      )
      .execute();

    const playerIds = players.map((player) => player.id);
    await db
      .deleteFrom('room_players')
      .where('room_id', '=', id)
      .where('id', 'not in', playerIds)
      .execute();
    await db
      .insertInto('room_players')
      .values(
        players.map(({ id: playerId, nickname, identity }, position) => ({
          id: playerId,
          room_id: id,
          position,
          nickname,
          identity,
        })),
      )
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet((eb) => ({
          position: eb.ref('excluded.position'),
          nickname: eb.ref('excluded.nickname'),
        })),
      )
      .execute();

    const connectionIds = connections.map(({ connectionId }) => connectionId);
    await db
      .deleteFrom('room_connections')
      .where('player_id', 'in', playerIds)
      .$if(connectionIds.length > 0, (query) => query.where('id', 'not in', connectionIds))
      .execute();
    if (connections.length === 0) return;
    // A connection keeps the instance it was opened in; only the new ones are this instance's.
    await db
      .insertInto('room_connections')
      .values(
        connections.map(({ playerId, connectionId }) => ({
          id: connectionId,
          player_id: playerId,
          instance_id: this.#instanceId,
        })),
      )
      .onConflict((conflict) => conflict.column('id').doNothing())
      .execute();
  }
}
