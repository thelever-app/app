import { isDeepStrictEqual } from 'node:util';
import { Game, type GameRepository, type GameSnapshot } from '@thelever-app/game';
import type { Insertable, Kysely, Transaction } from 'kysely';
import { jsonArrayFrom } from 'kysely/helpers/postgres';
import type { GameTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

type AnswerRow = Insertable<GameTables['answers']>;
type PlayerDilemmaRow = Insertable<GameTables['game_player_dilemmas']>;
type PlayerRow = Insertable<GameTables['game_players']>;

/**
 * A game in its rows. Inside a command, reading it locks the row of its room, the same lock every
 * command on that room takes, so commands on a room and on its games never overlap. A command
 * writes only the rows it changed since it read or saved the game: in a room of 50, one answer
 * is one row, not the 600 the game may hold.
 */
export class PostgresGameRepository implements GameRepository {
  readonly #db: Kysely<GameTables>;
  /** What each command last read or saved of each game, to compare with what it saves next. */
  readonly #known = new WeakMap<Transaction<GameTables>, Map<string, GameSnapshot>>();

  constructor(db: Kysely<GameTables>) {
    this.#db = db;
  }

  async save(game: Game): Promise<void> {
    const snapshot = game.toSnapshot();
    const transaction = currentTransaction<GameTables>();
    if (!transaction) {
      await this.#db.transaction().execute((own) => this.#save(own, snapshot, undefined));
      return;
    }
    await this.#save(transaction, snapshot, this.#known.get(transaction)?.get(snapshot.id));
    this.#remember(transaction, snapshot);
  }

  #remember(transaction: Transaction<GameTables>, snapshot: GameSnapshot): void {
    const known = this.#known.get(transaction) ?? new Map<string, GameSnapshot>();
    known.set(snapshot.id, snapshot);
    this.#known.set(transaction, known);
  }

  async findById(id: string): Promise<Game | undefined> {
    const transaction = currentTransaction<GameTables>();
    if (transaction) await lockRoomOf(transaction, id);
    const row = await readGame(transaction ?? this.#db, id);
    if (!row) return undefined;
    const found = Game.restore(snapshotOf(row));
    if (transaction) this.#remember(transaction, found.toSnapshot());
    return found;
  }

  /** Writes the game: only what changed since the command last knew it, or all of it if it did not. */
  async #save(
    db: Transaction<GameTables>,
    snapshot: GameSnapshot,
    known: GameSnapshot | undefined,
  ): Promise<void> {
    await this.#saveGame(db, snapshot);
    if (known) await this.#saveChanges(db, known, snapshot);
    else await this.#saveWhole(db, snapshot);
  }

  /** Replaces whatever was stored of the game, which the command had not read. */
  async #saveWhole(db: Transaction<GameTables>, snapshot: GameSnapshot): Promise<void> {
    await this.#saveDilemmas(db, snapshot);
    // The answers and the dilemmas of each player go before the players they belong to.
    await db.deleteFrom('answers').where('game_id', '=', snapshot.id).execute();
    await db.deleteFrom('game_player_dilemmas').where('game_id', '=', snapshot.id).execute();
    await this.#savePlayers(db, snapshot, playerRowsOf(snapshot));
    await this.#upsertPlayerDilemmas(db, playerDilemmaRowsOf(snapshot));
    await this.#upsertAnswers(db, answerRowsOf(snapshot));
  }

  /** Writes only what the command changed since it read or saved the game. */
  async #saveChanges(
    db: Transaction<GameTables>,
    known: GameSnapshot,
    snapshot: GameSnapshot,
  ): Promise<void> {
    if (!isDeepStrictEqual(known.peopleInTheGap, snapshot.peopleInTheGap)) {
      await this.#saveDilemmas(db, snapshot);
    }
    const answers = changesOf(answerRowsOf(known), answerRowsOf(snapshot), answerKey);
    // The answers go before the players they belong to.
    await this.#deleteAnswers(db, answers.gone);
    const players = changesOf(playerRowsOf(known), playerRowsOf(snapshot), playerKey);
    if (players.gone.length > 0 || players.changed.length > 0) {
      await this.#savePlayers(db, snapshot, players.changed);
    }
    await this.#upsertPlayerDilemmas(
      db,
      changesOf(playerDilemmaRowsOf(known), playerDilemmaRowsOf(snapshot), answerKey).changed,
    );
    await this.#upsertAnswers(db, answers.changed);
  }

  /** What the game copied of its room when it started never changes either. */
  async #saveGame(
    db: Transaction<GameTables>,
    { id, roomId, phase, version, settings, totalTime }: GameSnapshot,
  ): Promise<void> {
    const changing = {
      phase,
      version,
      started_at: totalTime?.startedAt ?? null,
      total_time_ends_at: totalTime?.endsAt ?? null,
      total_time_ran_out: totalTime?.ranOut ?? false,
    };
    await db
      .insertInto('games')
      .values({
        id,
        room_id: roomId,
        ...changing,
        variant: settings.variant,
        group_nature: settings.groupNature,
        place: settings.place,
        dilemma_language: settings.dilemmaLanguage,
        total_time_in_minutes: settings.totalTimeInMinutes,
      })
      .onConflict((conflict) => conflict.column('id').doUpdateSet(changing))
      .execute();
  }

  /**
   * The dilemmas of a game, and the options it copied of each, never change once it exists; who
   * takes the gap of each is chosen when the decision phase starts.
   */
  async #saveDilemmas(
    db: Transaction<GameTables>,
    { id, dilemmas, peopleInTheGap }: GameSnapshot,
  ): Promise<void> {
    const people = new Map(peopleInTheGap.map(({ dilemmaId, playerId }) => [dilemmaId, playerId]));
    await db
      .insertInto('game_dilemmas')
      .values(
        dilemmas.map(({ dilemmaId, version, origin, hasGap }, position) => ({
          game_id: id,
          position,
          dilemma_id: dilemmaId,
          dilemma_version: version,
          origin,
          has_gap: hasGap,
          person_in_the_gap: people.get(dilemmaId) ?? null,
        })),
      )
      .onConflict((conflict) =>
        conflict.columns(['game_id', 'position']).doUpdateSet((eb) => ({
          person_in_the_gap: eb.ref('excluded.person_in_the_gap'),
        })),
      )
      .execute();
    await db
      .insertInto('game_dilemma_options')
      .values(
        dilemmas.flatMap(({ dilemmaId, optionIds }) =>
          optionIds.map((optionId, position) => ({
            game_id: id,
            dilemma_id: dilemmaId,
            option_id: optionId,
            position,
          })),
        ),
      )
      .onConflict((conflict) => conflict.doNothing())
      .execute();
  }

  /** Leaves exactly the players of the snapshot, writing those given. */
  async #savePlayers(
    db: Transaction<GameTables>,
    { id, players }: GameSnapshot,
    rows: readonly PlayerRow[],
  ): Promise<void> {
    const playerIds = players.map((player) => player.id);
    await db
      .deleteFrom('game_players')
      .where('game_id', '=', id)
      .$if(playerIds.length > 0, (query) => query.where('player_id', 'not in', playerIds))
      .execute();
    if (rows.length === 0) return;
    await db
      .insertInto('game_players')
      .values([...rows])
      .onConflict((conflict) =>
        conflict.columns(['game_id', 'player_id']).doUpdateSet((eb) => ({
          has_left: eb.ref('excluded.has_left'),
          current_since: eb.ref('excluded.current_since'),
        })),
      )
      .execute();
  }

  async #upsertPlayerDilemmas(
    db: Transaction<GameTables>,
    rows: readonly PlayerDilemmaRow[],
  ): Promise<void> {
    if (rows.length === 0) return;
    await db
      .insertInto('game_player_dilemmas')
      .values([...rows])
      .onConflict((conflict) =>
        conflict.columns(['game_id', 'player_id', 'dilemma_id']).doUpdateSet((eb) => ({
          did_not_vote: eb.ref('excluded.did_not_vote'),
          reported: eb.ref('excluded.reported'),
          scored: eb.ref('excluded.scored'),
          match_points: eb.ref('excluded.match_points'),
          vote_points: eb.ref('excluded.vote_points'),
        })),
      )
      .execute();
  }

  async #deleteAnswers(db: Transaction<GameTables>, rows: readonly AnswerRow[]): Promise<void> {
    if (rows.length === 0) return;
    await db
      .deleteFrom('answers')
      .where((eb) =>
        eb.or(
          rows.map(({ game_id, player_id, dilemma_id }) =>
            eb.and({ game_id, player_id, dilemma_id }),
          ),
        ),
      )
      .execute();
  }

  async #upsertAnswers(db: Transaction<GameTables>, rows: readonly AnswerRow[]): Promise<void> {
    if (rows.length === 0) return;
    await db
      .insertInto('answers')
      .values([...rows])
      .onConflict((conflict) =>
        conflict.columns(['game_id', 'player_id', 'dilemma_id']).doUpdateSet((eb) => ({
          dilemma_version: eb.ref('excluded.dilemma_version'),
          vote: eb.ref('excluded.vote'),
          match_prediction: eb.ref('excluded.match_prediction'),
          vote_predictions: eb.ref('excluded.vote_predictions'),
          option_order: eb.ref('excluded.option_order'),
          response_time_ms: eb.ref('excluded.response_time_ms'),
          game_consent_version: eb.ref('excluded.game_consent_version'),
          research_consent_version: eb.ref('excluded.research_consent_version'),
          commercial_licence_consent_version: eb.ref('excluded.commercial_licence_consent_version'),
          under_eighteen: eb.ref('excluded.under_eighteen'),
          voter_in_the_gap: eb.ref('excluded.voter_in_the_gap'),
        })),
      )
      .execute();
  }
}

/**
 * Locks the room of the game, in a statement of its own: one that also read the game would see it as
 * it was before waiting for the lock, without what the command that held it committed.
 */
async function lockRoomOf(transaction: Transaction<GameTables>, gameId: string): Promise<void> {
  await transaction
    .selectFrom('rooms')
    .select('rooms.id')
    .where('rooms.id', '=', (eb) =>
      eb.selectFrom('games').select('games.room_id').where('games.id', '=', gameId),
    )
    .forUpdate()
    .execute();
}

/** The game with its dilemmas, its players, the dilemmas of each and the answers, in one round trip. */
function readGame(db: Kysely<GameTables>, id: string) {
  return db
    .selectFrom('games')
    .selectAll('games')
    .select((eb) => [
      // The options of each dilemma are those of the version played, in their order.
      jsonArrayFrom(
        eb
          .selectFrom('game_dilemmas')
          .innerJoin('game_dilemma_options', (join) =>
            join
              .onRef('game_dilemma_options.game_id', '=', 'game_dilemmas.game_id')
              .onRef('game_dilemma_options.dilemma_id', '=', 'game_dilemmas.dilemma_id'),
          )
          .select([
            'game_dilemmas.dilemma_id as dilemmaId',
            'game_dilemmas.dilemma_version as version',
            'game_dilemmas.origin',
            'game_dilemmas.has_gap as hasGap',
            'game_dilemmas.person_in_the_gap as personInTheGap',
            'game_dilemma_options.option_id as optionId',
          ])
          .whereRef('game_dilemmas.game_id', '=', 'games.id')
          .orderBy('game_dilemmas.position')
          .orderBy('game_dilemma_options.position'),
      ).as('options'),
      jsonArrayFrom(
        eb
          .selectFrom('game_players')
          .select(['game_players.player_id', 'game_players.has_left', 'game_players.current_since'])
          .whereRef('game_players.game_id', '=', 'games.id')
          .orderBy('game_players.position'),
      ).as('players'),
      jsonArrayFrom(
        eb
          .selectFrom('game_player_dilemmas')
          .innerJoin('game_dilemmas', (join) =>
            join
              .onRef('game_dilemmas.game_id', '=', 'game_player_dilemmas.game_id')
              .onRef('game_dilemmas.dilemma_id', '=', 'game_player_dilemmas.dilemma_id'),
          )
          .selectAll('game_player_dilemmas')
          .whereRef('game_player_dilemmas.game_id', '=', 'games.id')
          .orderBy('game_dilemmas.position'),
      ).as('playerDilemmas'),
      jsonArrayFrom(
        eb
          .selectFrom('answers')
          .innerJoin('game_dilemmas', (join) =>
            join
              .onRef('game_dilemmas.game_id', '=', 'answers.game_id')
              .onRef('game_dilemmas.dilemma_id', '=', 'answers.dilemma_id'),
          )
          .selectAll('answers')
          .whereRef('answers.game_id', '=', 'games.id')
          .orderBy('game_dilemmas.position'),
      ).as('answers'),
    ])
    .where('games.id', '=', id)
    .executeTakeFirst();
}

type GameRow = NonNullable<Awaited<ReturnType<typeof readGame>>>;

function snapshotOf(row: GameRow): GameSnapshot {
  const { dilemmas, peopleInTheGap } = dilemmasOf(row.options);
  return {
    id: row.id,
    roomId: row.room_id,
    phase: row.phase,
    version: row.version,
    settings: {
      variant: row.variant,
      groupNature: row.group_nature,
      place: row.place,
      dilemmaLanguage: row.dilemma_language,
      totalTimeInMinutes: row.total_time_in_minutes,
    },
    totalTime:
      row.started_at && row.total_time_ends_at
        ? {
            startedAt: row.started_at,
            endsAt: row.total_time_ends_at,
            ranOut: row.total_time_ran_out,
          }
        : null,
    dilemmas,
    peopleInTheGap,
    players: row.players.map(({ player_id, has_left, current_since }) => {
      const ofPlayer = row.playerDilemmas.filter((dilemma) => dilemma.player_id === player_id);
      return {
        id: player_id,
        left: has_left,
        // Inside JSON, a time comes as text.
        currentSince: current_since === null ? null : new Date(current_since),
        optionOrders: ofPlayer.map(({ dilemma_id, option_order }) => ({
          dilemmaId: dilemma_id,
          optionOrder: option_order,
        })),
        predictionSubsets: ofPlayer.map(({ dilemma_id, prediction_subset }) => ({
          dilemmaId: dilemma_id,
          predictionSubset: prediction_subset,
        })),
        answers: row.answers
          .filter((answer) => answer.player_id === player_id)
          .map((answer) => ({
            dilemmaId: answer.dilemma_id,
            vote: answer.vote,
            matchPrediction: answer.match_prediction,
            votePredictions: answer.vote_predictions,
            optionOrder: answer.option_order,
            responseTimeMs: answer.response_time_ms,
            seal: {
              gameConsentVersion: answer.game_consent_version,
              researchConsentVersion: answer.research_consent_version,
              commercialLicenceConsentVersion: answer.commercial_licence_consent_version,
              underEighteen: answer.under_eighteen,
            },
            voterInTheGap: answer.voter_in_the_gap,
          })),
        didNotVote: ofPlayer.flatMap(({ dilemma_id, did_not_vote }) =>
          did_not_vote ? [{ dilemmaId: dilemma_id, reason: did_not_vote }] : [],
        ),
        points: ofPlayer.flatMap(({ dilemma_id, scored, match_points, vote_points }) =>
          scored ? [{ dilemmaId: dilemma_id, match: match_points, votes: vote_points }] : [],
        ),
        reports: ofPlayer.flatMap(({ dilemma_id, reported }) =>
          reported ? [{ dilemmaId: dilemma_id, offensive: reported === 'offensive' }] : [],
        ),
      };
    }),
  };
}

/** One row per option, in order, grouped into the dilemmas they belong to. */
function dilemmasOf(
  options: GameRow['options'],
): Pick<GameSnapshot, 'dilemmas' | 'peopleInTheGap'> {
  const dilemmas = new Map<
    string,
    {
      version: number;
      origin: GameRow['options'][number]['origin'];
      hasGap: boolean;
      personInTheGap: string | null;
      optionIds: string[];
    }
  >();
  for (const { dilemmaId, version, origin, hasGap, personInTheGap, optionId } of options) {
    const dilemma = dilemmas.get(dilemmaId) ?? {
      version,
      origin,
      hasGap,
      personInTheGap,
      optionIds: [],
    };
    dilemma.optionIds.push(optionId);
    dilemmas.set(dilemmaId, dilemma);
  }
  return {
    dilemmas: [...dilemmas].map(([dilemmaId, { version, origin, hasGap, optionIds }]) => ({
      dilemmaId,
      version,
      optionIds,
      hasGap,
      origin,
    })),
    peopleInTheGap: [...dilemmas].flatMap(([dilemmaId, { personInTheGap }]) =>
      personInTheGap ? [{ dilemmaId, playerId: personInTheGap }] : [],
    ),
  };
}

/** The rows that are new or different since `before`, and those that are no longer there. */
function changesOf<Row>(
  before: readonly Row[],
  after: readonly Row[],
  key: (row: Row) => string,
): { readonly changed: readonly Row[]; readonly gone: readonly Row[] } {
  const previous = new Map(before.map((row) => [key(row), row]));
  const kept = new Set(after.map(key));
  return {
    changed: after.filter((row) => !isDeepStrictEqual(previous.get(key(row)), row)),
    gone: before.filter((row) => !kept.has(key(row))),
  };
}

function playerRowsOf({ id, players }: GameSnapshot): PlayerRow[] {
  return players.map((player, position) => ({
    game_id: id,
    player_id: player.id,
    position,
    has_left: player.left,
    current_since: player.currentSince,
  }));
}

/** One row per player and dilemma, with how it ended for them. */
function playerDilemmaRowsOf({ id, players }: GameSnapshot): PlayerDilemmaRow[] {
  return players.flatMap((player) => {
    const didNotVote = new Map(
      player.didNotVote.map(({ dilemmaId, reason }) => [dilemmaId, reason]),
    );
    const points = new Map(player.points.map(({ dilemmaId, ...scored }) => [dilemmaId, scored]));
    const reports = new Map(
      player.reports.map(({ dilemmaId, offensive }) => [dilemmaId, offensive]),
    );
    const subsets = new Map(
      player.predictionSubsets.map(({ dilemmaId, predictionSubset }) => [
        dilemmaId,
        predictionSubset,
      ]),
    );
    return player.optionOrders.map(({ dilemmaId, optionOrder }) => ({
      game_id: id,
      player_id: player.id,
      dilemma_id: dilemmaId,
      option_order: [...optionOrder],
      prediction_subset: [...(subsets.get(dilemmaId) ?? [])],
      did_not_vote: didNotVote.get(dilemmaId) ?? null,
      reported: reportOf(reports.get(dilemmaId)),
      scored: points.has(dilemmaId),
      match_points: points.get(dilemmaId)?.match ?? null,
      vote_points: points.get(dilemmaId)?.votes ?? null,
    }));
  });
}

/** The rows of the answers of a game, one per player and dilemma. */
function answerRowsOf({ id, dilemmas, players }: GameSnapshot): AnswerRow[] {
  const versions = new Map(dilemmas.map(({ dilemmaId, version }) => [dilemmaId, version]));
  return players.flatMap((player) =>
    player.answers.map((answer) => ({
      game_id: id,
      player_id: player.id,
      dilemma_id: answer.dilemmaId,
      dilemma_version: versions.get(answer.dilemmaId) ?? 0,
      vote: answer.vote,
      match_prediction: answer.matchPrediction,
      vote_predictions: JSON.stringify(answer.votePredictions),
      option_order: [...answer.optionOrder],
      response_time_ms: answer.responseTimeMs,
      game_consent_version: answer.seal.gameConsentVersion,
      research_consent_version: answer.seal.researchConsentVersion,
      commercial_licence_consent_version: answer.seal.commercialLicenceConsentVersion,
      under_eighteen: answer.seal.underEighteen,
      voter_in_the_gap: answer.voterInTheGap,
    })),
  );
}

/** The key of an answer, or of a dilemma of a player, within its game. */
function answerKey({ player_id, dilemma_id }: { player_id: string; dilemma_id: string }): string {
  return JSON.stringify([player_id, dilemma_id]);
}

function playerKey({ player_id }: PlayerRow): string {
  return player_id;
}

function reportOf(offensive: boolean | undefined): 'offensive' | 'other' | null {
  if (offensive === undefined) return null;
  return offensive ? 'offensive' : 'other';
}
