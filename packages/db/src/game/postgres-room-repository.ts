import {
  type AvatarFace,
  type PlayerColor,
  Room,
  type RoomRepository,
  type RoomSnapshot,
} from '@thelever-app/game';
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
    const row = await readRoom(transaction ?? this.#db, id);
    return row && Room.restore(snapshotOf(row));
  }

  async findByCode(code: string): Promise<Room | undefined> {
    const found = await (currentTransaction<GameTables>() ?? this.#db)
      .selectFrom('rooms')
      .select('id')
      // As players type it: the codes are kept in capitals.
      .where('code', '=', code.trim().toUpperCase())
      .executeTakeFirst();
    return found && this.findById(found.id);
  }

  async #save(db: Transaction<GameTables>, snapshot: RoomSnapshot): Promise<void> {
    const { id, players, connections } = snapshot;
    const columns = roomColumnsOf(snapshot);
    await db
      .insertInto('rooms')
      .values({ id, ...columns })
      .onConflict((conflict) => conflict.column('id').doUpdateSet(columns))
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
        players.map(({ id: playerId, nickname, identity, avatar }, position) => ({
          id: playerId,
          room_id: id,
          position,
          nickname,
          identity,
          avatar_face: avatar.face as AvatarFace,
          avatar_color: avatar.color as PlayerColor,
          has_left: snapshot.leftPlayerIds.includes(playerId),
        })),
      )
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet((eb) => ({
          position: eb.ref('excluded.position'),
          nickname: eb.ref('excluded.nickname'),
          avatar_face: eb.ref('excluded.avatar_face'),
          avatar_color: eb.ref('excluded.avatar_color'),
          has_left: eb.ref('excluded.has_left'),
        })),
      )
      .execute();
    await this.#saveLobby(db, snapshot);

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

  /** Who was expelled and the dilemmas added and picked: few rows, written again whole. */
  async #saveLobby(db: Transaction<GameTables>, snapshot: RoomSnapshot): Promise<void> {
    const { id, expelledIdentities, addedDilemmas, pickedDilemmas } = snapshot;
    await db.deleteFrom('room_expelled_identities').where('room_id', '=', id).execute();
    await db.deleteFrom('room_added_dilemmas').where('room_id', '=', id).execute();
    await db.deleteFrom('room_picked_dilemmas').where('room_id', '=', id).execute();
    if (expelledIdentities.length > 0) {
      await db
        .insertInto('room_expelled_identities')
        .values(expelledIdentities.map((identity) => ({ room_id: id, identity })))
        .execute();
    }
    if (addedDilemmas.length > 0) {
      await db
        .insertInto('room_added_dilemmas')
        .values(
          addedDilemmas.map(({ dilemmaId, minimumAge, playerId }, position) => ({
            room_id: id,
            player_id: playerId,
            position,
            dilemma_id: dilemmaId,
            minimum_age: minimumAge,
          })),
        )
        .execute();
    }
    if (pickedDilemmas.length > 0) {
      await db
        .insertInto('room_picked_dilemmas')
        .values(
          pickedDilemmas.map(({ dilemmaId, minimumAge }, position) => ({
            room_id: id,
            position,
            dilemma_id: dilemmaId,
            minimum_age: minimumAge,
          })),
        )
        .execute();
    }
  }
}

/** What the row of the room holds of it. */
function roomColumnsOf(snapshot: RoomSnapshot) {
  const { settings } = snapshot;
  return {
    code: snapshot.code,
    host_player_id: snapshot.hostId,
    version: snapshot.version,
    group_nature: snapshot.groupNature,
    place: snapshot.place,
    variant: settings.variant,
    adults_only: settings.adultsOnly,
    dilemma_language: settings.dilemmaLanguage,
    categories: settings.categories && [...settings.categories],
    dilemma_count: settings.dilemmaCount,
    total_time_in_minutes: settings.totalTimeInMinutes,
    new_dilemmas: settings.newDilemmas,
    dilemmas_per_player: settings.dilemmasPerPlayer,
    current_game_id: snapshot.currentGameId,
    absent_host_player_id: snapshot.absentHostId,
  };
}

/**
 * Locks the room, in a statement of its own: one that also read its players and connections would see
 * them as they were before waiting for the lock, without what the command that held it committed.
 */
async function lockRoom(transaction: Transaction<GameTables>, id: string): Promise<void> {
  await transaction.selectFrom('rooms').select('id').where('id', '=', id).forUpdate().execute();
}

/** The room with everything that hangs from it, in one round trip. */
function readRoom(db: Kysely<GameTables>, id: string) {
  return db
    .selectFrom('rooms')
    .selectAll('rooms')
    .select((eb) => [
      jsonArrayFrom(
        eb
          .selectFrom('room_players')
          .select([
            'room_players.id',
            'room_players.nickname',
            'room_players.identity',
            'room_players.avatar_face',
            'room_players.avatar_color',
            'room_players.has_left',
          ])
          .whereRef('room_players.room_id', '=', 'rooms.id')
          .orderBy('room_players.position'),
      ).as('players'),
      jsonArrayFrom(
        eb
          .selectFrom('room_expelled_identities')
          .select('room_expelled_identities.identity')
          .whereRef('room_expelled_identities.room_id', '=', 'rooms.id')
          .orderBy('room_expelled_identities.identity'),
      ).as('expelled'),
      jsonArrayFrom(
        eb
          .selectFrom('room_added_dilemmas')
          .select([
            'room_added_dilemmas.dilemma_id as dilemmaId',
            'room_added_dilemmas.minimum_age as minimumAge',
            'room_added_dilemmas.player_id as playerId',
          ])
          .whereRef('room_added_dilemmas.room_id', '=', 'rooms.id')
          .orderBy('room_added_dilemmas.position'),
      ).as('added'),
      jsonArrayFrom(
        eb
          .selectFrom('room_picked_dilemmas')
          .select([
            'room_picked_dilemmas.dilemma_id as dilemmaId',
            'room_picked_dilemmas.minimum_age as minimumAge',
          ])
          .whereRef('room_picked_dilemmas.room_id', '=', 'rooms.id')
          .orderBy('room_picked_dilemmas.position'),
      ).as('picked'),
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

type RoomRow = NonNullable<Awaited<ReturnType<typeof readRoom>>>;

function snapshotOf(row: RoomRow): RoomSnapshot {
  return {
    id: row.id,
    code: row.code,
    hostId: row.host_player_id,
    groupNature: row.group_nature,
    place: row.place,
    settings: {
      variant: row.variant,
      adultsOnly: row.adults_only,
      dilemmaLanguage: row.dilemma_language,
      categories: row.categories,
      dilemmaCount: row.dilemma_count,
      totalTimeInMinutes: row.total_time_in_minutes,
      newDilemmas: row.new_dilemmas,
      dilemmasPerPlayer: row.dilemmas_per_player,
    },
    players: row.players.map(({ id, nickname, identity, avatar_face, avatar_color }) => ({
      id,
      nickname,
      identity,
      avatar: { face: avatar_face, color: avatar_color },
    })),
    version: row.version,
    connections: row.connections,
    expelledIdentities: row.expelled.map(({ identity }) => identity),
    addedDilemmas: row.added,
    pickedDilemmas: row.picked,
    currentGameId: row.current_game_id,
    absentHostId: row.absent_host_player_id,
    leftPlayerIds: row.players.filter(({ has_left }) => has_left).map(({ id }) => id),
  };
}
