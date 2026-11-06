import { Room, type RoomRepository, type RoomSnapshot } from '@thelever-app/game';
import type { Kysely, Transaction } from 'kysely';
import { jsonArrayFrom } from 'kysely/helpers/postgres';
import type { GameTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

/**
 * A room in its rows. Inside a command, reading it locks it until the command commits, so two commands
 * on one room never overlap, whatever instance runs them.
 */
export class PostgresRoomRepository implements RoomRepository {
  readonly #db: Kysely<GameTables>;
  /** The instance of the server this repository runs in: the one serving the connections it saves. */
  readonly #instanceId: string;

  constructor(db: Kysely<GameTables>, instanceId: string) {
    this.#db = db;
    this.#instanceId = instanceId;
  }

  async save(room: Room): Promise<void> {
    const transaction = currentTransaction<GameTables>();
    if (transaction) return this.#save(transaction, room.toSnapshot());
    await this.#db.transaction().execute((own) => this.#save(own, room.toSnapshot()));
  }

  async findById(id: string): Promise<Room | undefined> {
    const transaction = currentTransaction<GameTables>();
    // Only a command locks: a query reads without waiting.
    if (transaction) await lockRoom(transaction, id);
    const room = await readRoom(transaction ?? this.#db, id);
    if (!room) return undefined;
    return Room.restore({
      id: room.id,
      hostId: room.host_player_id,
      version: room.version,
      players: room.players,
      connections: room.connections,
    });
  }

  async #save(db: Transaction<GameTables>, snapshot: RoomSnapshot): Promise<void> {
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

/**
 * Locks the room, in a statement of its own: one that also read its players and connections would see
 * them as they were before waiting for the lock, without what the command that held it committed.
 */
async function lockRoom(transaction: Transaction<GameTables>, id: string): Promise<void> {
  await transaction.selectFrom('rooms').select('id').where('id', '=', id).forUpdate().execute();
}

/** The room with its players and connections, in one round trip. */
function readRoom(db: Kysely<GameTables>, id: string) {
  return db
    .selectFrom('rooms')
    .selectAll('rooms')
    .select((eb) => [
      jsonArrayFrom(
        eb
          .selectFrom('room_players')
          .select(['room_players.id', 'room_players.nickname', 'room_players.identity'])
          .whereRef('room_players.room_id', '=', 'rooms.id')
          .orderBy('room_players.position'),
      ).as('players'),
      jsonArrayFrom(
        eb
          .selectFrom('room_connections')
          .innerJoin('room_players', 'room_players.id', 'room_connections.player_id')
          .select(['room_connections.player_id as playerId', 'room_connections.id as connectionId'])
          .whereRef('room_players.room_id', '=', 'rooms.id'),
      ).as('connections'),
    ])
    .where('rooms.id', '=', id)
    .executeTakeFirst();
}
