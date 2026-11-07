import { isDeepStrictEqual } from 'node:util';
import { Game, type GameRepository, type GameSnapshot } from '@thelever-app/game';
import type { Insertable, Kysely, Transaction } from 'kysely';
import { jsonArrayFrom } from 'kysely/helpers/postgres';
import type { GameTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

type AnswerRow = Insertable<GameTables['answers']>;

/**
 * A game in its rows. Inside a command, reading it locks the row of its room, the same lock every
 * command on that room takes, so commands on a room and on its games never overlap. A command
 * writes only the rows it changed since it read or saved the game: in a room of 50, one answer
 * is one row, not the 300 the game may hold.
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
    // The answers go before the players they belong to.
    await db.deleteFrom('answers').where('game_id', '=', snapshot.id).execute();
    await this.#savePlayers(db, snapshot);
    await this.#upsertAnswers(db, answerRowsOf(snapshot));
  }

  /** Writes only what the command changed since it read or saved the game. */
  async #saveChanges(
    db: Transaction<GameTables>,
    known: GameSnapshot,
    snapshot: GameSnapshot,
  ): Promise<void> {
    const { changed, gone } = answerChanges(known, snapshot);
    // The answers go before the players they belong to.
    await this.#deleteAnswers(db, gone);
    if (!samePlayers(known, snapshot)) await this.#savePlayers(db, snapshot);
    await this.#upsertAnswers(db, changed);
  }

  /** What the game copied of its room when it started never changes either. */
  async #saveGame(
    db: Transaction<GameTables>,
    { id, roomId, inDecisionPhase, version, settings }: GameSnapshot,
  ): Promise<void> {
    await db
      .insertInto('games')
      .values({
        id,
        room_id: roomId,
        in_decision_phase: inDecisionPhase,
        version,
        variant: settings.variant,
        group_nature: settings.groupNature,
        place: settings.place,
        dilemma_language: settings.dilemmaLanguage,
        total_time_in_minutes: settings.totalTimeInMinutes,
      })
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({ in_decision_phase: inDecisionPhase, version }),
      )
      .execute();
  }

  /** The dilemmas of a game, and the options it copied of each, never change once it exists. */
  async #saveDilemmas(db: Transaction<GameTables>, { id, dilemmas }: GameSnapshot): Promise<void> {
    await db
      .insertInto('game_dilemmas')
      .values(
        dilemmas.map(({ dilemmaId, version, origin }, position) => ({
          game_id: id,
          position,
          dilemma_id: dilemmaId,
          dilemma_version: version,
          origin,
        })),
      )
      .onConflict((conflict) => conflict.columns(['game_id', 'position']).doNothing())
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

  /** Leaves exactly the players of the snapshot, keeping those already there. */
  async #savePlayers(db: Transaction<GameTables>, { id, players }: GameSnapshot): Promise<void> {
    const playerIds = players.map((player) => player.id);
    await db
      .deleteFrom('game_players')
      .where('game_id', '=', id)
      .$if(playerIds.length > 0, (query) => query.where('player_id', 'not in', playerIds))
      .execute();
    if (playerIds.length === 0) return;
    await db
      .insertInto('game_players')
      .values(
        playerIds.map((playerId, position) => ({ game_id: id, player_id: playerId, position })),
      )
      .onConflict((conflict) => conflict.columns(['game_id', 'player_id']).doNothing())
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

/** The game with its dilemmas, players and answers, in one round trip. */
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
            'game_dilemma_options.option_id as optionId',
          ])
          .whereRef('game_dilemmas.game_id', '=', 'games.id')
          .orderBy('game_dilemmas.position')
          .orderBy('game_dilemma_options.position'),
      ).as('options'),
      jsonArrayFrom(
        eb
          .selectFrom('game_players')
          .select('game_players.player_id')
          .whereRef('game_players.game_id', '=', 'games.id')
          .orderBy('game_players.position'),
      ).as('players'),
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
  return {
    id: row.id,
    roomId: row.room_id,
    inDecisionPhase: row.in_decision_phase,
    version: row.version,
    settings: {
      variant: row.variant,
      groupNature: row.group_nature,
      place: row.place,
      dilemmaLanguage: row.dilemma_language,
      totalTimeInMinutes: row.total_time_in_minutes,
    },
    dilemmas: dilemmasOf(row.options),
    players: row.players.map(({ player_id }) => ({
      id: player_id,
      answers: row.answers
        .filter((answer) => answer.player_id === player_id)
        .map((answer) => ({
          dilemmaId: answer.dilemma_id,
          vote: answer.vote,
          seal: {
            gameConsentVersion: answer.game_consent_version,
            researchConsentVersion: answer.research_consent_version,
            commercialLicenceConsentVersion: answer.commercial_licence_consent_version,
            underEighteen: answer.under_eighteen,
          },
          voterInTheGap: answer.voter_in_the_gap,
        })),
    })),
  };
}

/** One row per option, in order, grouped into the dilemmas they belong to. */
function dilemmasOf(options: GameRow['options']): GameSnapshot['dilemmas'] {
  const dilemmas = new Map<
    string,
    { version: number; origin: GameRow['options'][number]['origin']; optionIds: string[] }
  >();
  for (const { dilemmaId, version, origin, optionId } of options) {
    const dilemma = dilemmas.get(dilemmaId) ?? { version, origin, optionIds: [] };
    dilemma.optionIds.push(optionId);
    dilemmas.set(dilemmaId, dilemma);
  }
  return [...dilemmas].map(([dilemmaId, { version, origin, optionIds }]) => ({
    dilemmaId,
    version,
    origin,
    optionIds,
  }));
}

/** The answers that are new or different since `before`, and those that are no longer there. */
function answerChanges(
  before: GameSnapshot,
  after: GameSnapshot,
): { readonly changed: readonly AnswerRow[]; readonly gone: readonly AnswerRow[] } {
  const previous = new Map(answerRowsOf(before).map((row) => [keyOf(row), row]));
  const current = answerRowsOf(after);
  const kept = new Set(current.map(keyOf));
  return {
    changed: current.filter((row) => !isDeepStrictEqual(previous.get(keyOf(row)), row)),
    gone: [...previous.values()].filter((row) => !kept.has(keyOf(row))),
  };
}

function samePlayers(before: GameSnapshot, after: GameSnapshot): boolean {
  return isDeepStrictEqual(
    before.players.map((player) => player.id),
    after.players.map((player) => player.id),
  );
}

/** The rows of the answers of a game, one per player and dilemma. */
function answerRowsOf({ id, dilemmas, players }: GameSnapshot): AnswerRow[] {
  const versions = new Map(dilemmas.map(({ dilemmaId, version }) => [dilemmaId, version]));
  return players.flatMap((player) =>
    player.answers.map(({ dilemmaId, vote, seal, voterInTheGap }) => ({
      game_id: id,
      player_id: player.id,
      dilemma_id: dilemmaId,
      dilemma_version: versions.get(dilemmaId) ?? 0,
      vote,
      game_consent_version: seal.gameConsentVersion,
      research_consent_version: seal.researchConsentVersion,
      commercial_licence_consent_version: seal.commercialLicenceConsentVersion,
      under_eighteen: seal.underEighteen,
      voter_in_the_gap: voterInTheGap,
    })),
  );
}

/** The key of an answer row within its game. */
function keyOf({ player_id, dilemma_id }: AnswerRow): string {
  return JSON.stringify([player_id, dilemma_id]);
}
