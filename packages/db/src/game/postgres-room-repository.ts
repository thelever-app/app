import {
  type AvatarFace,
  type LobbyDilemma,
  type PlayerColor,
  Room,
  type RoomRepository,
  type RoomSnapshot,
  type RoundSnapshot,
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

  async findIdsWith(identity: string): Promise<readonly string[]> {
    const rows = await (currentTransaction<GameTables>() ?? this.#db)
      .selectFrom('room_players')
      .select('room_id')
      .distinct()
      .where('identity', '=', identity)
      .orderBy('room_id')
      .execute();
    return rows.map(({ room_id }) => room_id);
  }

  async findIdsWithNobodyConnected(): Promise<readonly string[]> {
    const rows = await (currentTransaction<GameTables>() ?? this.#db)
      .selectFrom('rooms')
      .select('id')
      .where(({ not, exists, selectFrom }) =>
        not(
          exists(
            selectFrom('room_connections')
              .innerJoin('room_players', 'room_players.id', 'room_connections.player_id')
              .select('room_connections.id')
              .whereRef('room_players.room_id', '=', 'rooms.id'),
          ),
        ),
      )
      .orderBy('id')
      .execute();
    return rows.map(({ id }) => id);
  }

  async delete(room: Room): Promise<boolean> {
    const transaction = currentTransaction<GameTables>();
    if (transaction) return this.#delete(transaction, room);
    return this.#db.transaction().execute((own) => this.#delete(own, room));
  }

  /**
   * Its games first, with what hangs from them: their players point to the players of the room,
   * which the cascade from the room would delete before them. Then the room, and its players, their
   * connections and its lobby go with it. The version tells whether it changed since it was read.
   */
  async #delete(db: Transaction<GameTables>, room: Room): Promise<boolean> {
    const unchanged = await db
      .selectFrom('rooms')
      .select('id')
      .where('id', '=', room.id)
      .where('version', '=', room.version)
      .forUpdate()
      .executeTakeFirst();
    if (!unchanged) return false;
    await db.deleteFrom('games').where('room_id', '=', room.id).execute();
    await db.deleteFrom('rooms').where('id', '=', room.id).execute();
    return true;
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
        players.map(
          (
            { id: playerId, nickname, identity, avatar, playedDilemmaIds, underEighteen },
            position,
          ) => ({
            id: playerId,
            room_id: id,
            position,
            nickname,
            identity,
            avatar_face: avatar.face as AvatarFace,
            avatar_color: avatar.color as PlayerColor,
            has_left: snapshot.leftPlayerIds.includes(playerId),
            played_dilemma_ids: [...playedDilemmaIds],
            under_eighteen: underEighteen,
          }),
        ),
      )
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet((eb) => ({
          position: eb.ref('excluded.position'),
          nickname: eb.ref('excluded.nickname'),
          // Only forgetting changes it: the player stays, tied to nobody.
          identity: eb.ref('excluded.identity'),
          avatar_face: eb.ref('excluded.avatar_face'),
          avatar_color: eb.ref('excluded.avatar_color'),
          has_left: eb.ref('excluded.has_left'),
          played_dilemma_ids: eb.ref('excluded.played_dilemma_ids'),
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

  /** Who was expelled and the rounds: few rows, written again whole. */
  async #saveLobby(db: Transaction<GameTables>, snapshot: RoomSnapshot): Promise<void> {
    const { id, expelledIdentities, settings, chosenDilemmas } = snapshot;
    await db.deleteFrom('room_expelled_identities').where('room_id', '=', id).execute();
    await db.deleteFrom('room_rounds').where('room_id', '=', id).execute();
    if (expelledIdentities.length > 0) {
      await db
        .insertInto('room_expelled_identities')
        .values(expelledIdentities.map((identity) => ({ room_id: id, identity })))
        .execute();
    }
    await db
      .insertInto('room_rounds')
      .values(
        settings.rounds.map((round, position) => {
          const chosen = chosenDilemmas.find(({ roundId }) => roundId === round.id);
          const dilemma = round.origin === 'specific' ? round.dilemma : chosen;
          return {
            room_id: id,
            position,
            round_id: round.id,
            origin: round.origin,
            categories:
              round.origin === 'random' && round.categories ? [...round.categories] : null,
            content_age: round.origin === 'random' ? round.content.age : null,
            content_compromising: round.origin === 'random' ? round.content.compromising : null,
            dilemma_id: dilemma?.dilemmaId ?? null,
            minimum_age: dilemma?.minimumAge ?? null,
            compromising: dilemma?.compromising ?? null,
            type: dilemma?.type ?? null,
            scale: dilemma?.scale ?? null,
            has_gap: dilemma?.hasGap ?? null,
            chosen_by_player_id: round.origin === 'players' ? (chosen?.playerId ?? null) : null,
          };
        }),
      )
      .execute();
  }
}

/** What the row of the room holds of it. */
function roomColumnsOf(snapshot: RoomSnapshot) {
  const { settings } = snapshot;
  return {
    code: snapshot.code,
    host_player_id: snapshot.hostId,
    version: snapshot.version,
    place: snapshot.place,
    variant: settings.variant,
    adults_only: settings.adultsOnly,
    compromising_dilemmas: settings.compromisingDilemmas,
    dilemma_language: settings.dilemmaLanguage,
    time_per_dilemma_seconds: settings.timePerDilemmaSeconds,
    new_dilemmas: settings.newDilemmas,
    current_game_id: snapshot.currentGameId,
    absent_host_player_id: snapshot.absentHostId,
    last_connected_at: snapshot.lastConnectedAt,
    closed_at: snapshot.closedAt,
    played_dilemma_ids: [...snapshot.playedDilemmaIds],
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
            'room_players.played_dilemma_ids',
            'room_players.under_eighteen',
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
          .selectFrom('room_rounds')
          .select([
            'room_rounds.round_id as roundId',
            'room_rounds.origin',
            'room_rounds.categories',
            'room_rounds.content_age as contentAge',
            'room_rounds.content_compromising as contentCompromising',
            'room_rounds.dilemma_id as dilemmaId',
            'room_rounds.minimum_age as minimumAge',
            'room_rounds.compromising',
            'room_rounds.type',
            'room_rounds.scale',
            'room_rounds.has_gap as hasGap',
            'room_rounds.chosen_by_player_id as chosenBy',
          ])
          .whereRef('room_rounds.room_id', '=', 'rooms.id')
          .orderBy('room_rounds.position'),
      ).as('rounds'),
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
    place: row.place,
    settings: {
      variant: row.variant,
      adultsOnly: row.adults_only,
      compromisingDilemmas: row.compromising_dilemmas,
      dilemmaLanguage: row.dilemma_language,
      rounds: row.rounds.map(roundOf),
      timePerDilemmaSeconds: row.time_per_dilemma_seconds,
      newDilemmas: row.new_dilemmas,
    },
    players: row.players.map(
      ({
        id,
        nickname,
        identity,
        avatar_face,
        avatar_color,
        played_dilemma_ids,
        under_eighteen,
      }) => ({
        id,
        nickname,
        identity,
        avatar: { face: avatar_face, color: avatar_color },
        playedDilemmaIds: played_dilemma_ids,
        underEighteen: under_eighteen,
      }),
    ),
    version: row.version,
    connections: row.connections,
    expelledIdentities: row.expelled.map(({ identity }) => identity),
    chosenDilemmas: row.rounds.flatMap((round) => {
      const dilemma = round.origin === 'players' ? lobbyDilemmaOf(round) : undefined;
      return dilemma ? [{ ...dilemma, roundId: round.roundId, playerId: round.chosenBy }] : [];
    }),
    currentGameId: row.current_game_id,
    absentHostId: row.absent_host_player_id,
    leftPlayerIds: row.players.filter(({ has_left }) => has_left).map(({ id }) => id),
    playedDilemmaIds: row.played_dilemma_ids,
    lastConnectedAt: row.last_connected_at,
    closedAt: row.closed_at,
  };
}

/** A round as the settings keep it; the dilemma a player chose stays apart, in the room. */
function roundOf(row: RoomRow['rounds'][number]): RoundSnapshot {
  const { roundId: id } = row;
  if (row.origin === 'random') {
    return {
      id,
      origin: 'random',
      categories: row.categories,
      content: { age: row.contentAge ?? 'any', compromising: row.contentCompromising ?? 'any' },
    };
  }
  if (row.origin === 'players') return { id, origin: 'players' };
  const dilemma = lobbyDilemmaOf(row);
  if (!dilemma) throw new Error(`round ${id} of a room is specific and has no dilemma`);
  return { id, origin: 'specific', dilemma };
}

/** The dilemma of a round, whole; none for a round without one, which the checks keep whole. */
function lobbyDilemmaOf(row: RoomRow['rounds'][number]): LobbyDilemma | undefined {
  const { dilemmaId, type, scale, minimumAge, hasGap, compromising } = row;
  if (
    dilemmaId === null ||
    type === null ||
    scale === null ||
    minimumAge === null ||
    hasGap === null ||
    compromising === null
  ) {
    return undefined;
  }
  return { dilemmaId, type, scale, minimumAge, hasGap, compromising };
}
