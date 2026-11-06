import { isDeepStrictEqual } from 'node:util';
import { Game, type GameRepository, type GameSnapshot } from '@thelever-app/game';
import type { Insertable, Kysely, Transaction } from 'kysely';
import type { Database } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

type AnswerRow = Insertable<Database['answers']>;

/**
 * A game in its rows. Inside a command, reading it locks the row of its room, the same lock every
 * command on that room takes, so commands on a room and on its games never overlap. A command
 * writes only the rows it changed since it read or saved the game: in a room of 50, one answer
 * is one row, not the 300 the game may hold.
 */
export class PostgresGameRepository implements GameRepository {
  readonly #db: Kysely<Database>;
  /** What each command last read or saved of each game, to compare with what it saves next. */
  readonly #known = new WeakMap<Transaction<Database>, Map<string, GameSnapshot>>();

  constructor(db: Kysely<Database>) {
    this.#db = db;
  }

  async save(game: Game): Promise<void> {
    const snapshot = game.toSnapshot();
    const transaction = currentTransaction();
    if (!transaction) {
      await this.#db.transaction().execute((own) => this.#save(own, snapshot, undefined));
      return;
    }
    await this.#save(transaction, snapshot, this.#known.get(transaction)?.get(snapshot.id));
    this.#remember(transaction, snapshot);
  }

  #remember(transaction: Transaction<Database>, snapshot: GameSnapshot): void {
    const known = this.#known.get(transaction) ?? new Map<string, GameSnapshot>();
    known.set(snapshot.id, snapshot);
    this.#known.set(transaction, known);
  }

  async findById(id: string): Promise<Game | undefined> {
    const transaction = currentTransaction();
    const db = transaction ?? this.#db;
    if (transaction) {
      await transaction
        .selectFrom('rooms')
        .select('rooms.id')
        .where('rooms.id', '=', (eb) =>
          eb.selectFrom('games').select('games.room_id').where('games.id', '=', id),
        )
        .forUpdate()
        .execute();
    }
    const game = await db.selectFrom('games').selectAll().where('id', '=', id).executeTakeFirst();
    if (!game) return undefined;

    // The options the game copied of each dilemma when it started, in their order.
    const options = await db
      .selectFrom('game_dilemmas')
      .innerJoin('game_dilemma_options', (join) =>
        join
          .onRef('game_dilemma_options.game_id', '=', 'game_dilemmas.game_id')
          .onRef('game_dilemma_options.dilemma_id', '=', 'game_dilemmas.dilemma_id'),
      )
      .select([
        'game_dilemmas.dilemma_id as dilemmaId',
        'game_dilemmas.dilemma_version as version',
        'game_dilemma_options.option_id as optionId',
      ])
      .where('game_dilemmas.game_id', '=', id)
      .orderBy('game_dilemmas.position')
      .orderBy('game_dilemma_options.position')
      .execute();
    const dilemmas = new Map<string, { version: number; optionIds: string[] }>();
    for (const { dilemmaId, version, optionId } of options) {
      const dilemma = dilemmas.get(dilemmaId) ?? { version, optionIds: [] };
      dilemma.optionIds.push(optionId);
      dilemmas.set(dilemmaId, dilemma);
    }

    const players = await db
      .selectFrom('game_players')
      .select('player_id')
      .where('game_id', '=', id)
      .orderBy('position')
      .execute();
    const answers = await db
      .selectFrom('answers')
      .innerJoin('game_dilemmas', (join) =>
        join
          .onRef('game_dilemmas.game_id', '=', 'answers.game_id')
          .onRef('game_dilemmas.dilemma_id', '=', 'answers.dilemma_id'),
      )
      .selectAll('answers')
      .where('answers.game_id', '=', id)
      .orderBy('game_dilemmas.position')
      .execute();

    const found = Game.restore({
      id: game.id,
      roomId: game.room_id,
      inDecisionPhase: game.in_decision_phase,
      version: game.version,
      dilemmas: [...dilemmas].map(([dilemmaId, { version, optionIds }]) => ({
        dilemmaId,
        version,
        optionIds,
      })),
      players: players.map(({ player_id }) => ({
        id: player_id,
        answers: answers
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
    });
    if (transaction) this.#remember(transaction, found.toSnapshot());
    return found;
  }

  /** Writes the game: only what changed since the command last knew it, or all of it if it did not. */
  async #save(
    db: Transaction<Database>,
    snapshot: GameSnapshot,
    known: GameSnapshot | undefined,
  ): Promise<void> {
    await this.#saveGame(db, snapshot);
    if (known) await this.#saveChanges(db, known, snapshot);
    else await this.#saveWhole(db, snapshot);
  }

  /** Replaces whatever was stored of the game, which the command had not read. */
  async #saveWhole(db: Transaction<Database>, snapshot: GameSnapshot): Promise<void> {
    await this.#saveDilemmas(db, snapshot);
    // The answers go before the players they belong to.
    await db.deleteFrom('answers').where('game_id', '=', snapshot.id).execute();
    await this.#savePlayers(db, snapshot);
    await this.#upsertAnswers(db, answerRowsOf(snapshot));
  }

  /** Writes only what the command changed since it read or saved the game. */
  async #saveChanges(
    db: Transaction<Database>,
    known: GameSnapshot,
    snapshot: GameSnapshot,
  ): Promise<void> {
    const { changed, gone } = answerChanges(known, snapshot);
    // The answers go before the players they belong to.
    await this.#deleteAnswers(db, gone);
    if (!samePlayers(known, snapshot)) await this.#savePlayers(db, snapshot);
    await this.#upsertAnswers(db, changed);
  }

  async #saveGame(
    db: Transaction<Database>,
    { id, roomId, inDecisionPhase, version }: GameSnapshot,
  ): Promise<void> {
    await db
      .insertInto('games')
      .values({ id, room_id: roomId, in_decision_phase: inDecisionPhase, version })
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({ in_decision_phase: inDecisionPhase, version }),
      )
      .execute();
  }

  /** The dilemmas of a game, and the options it copied of each, never change once it exists. */
  async #saveDilemmas(db: Transaction<Database>, { id, dilemmas }: GameSnapshot): Promise<void> {
    await db
      .insertInto('game_dilemmas')
      .values(
        dilemmas.map(({ dilemmaId, version }, position) => ({
          game_id: id,
          position,
          dilemma_id: dilemmaId,
          dilemma_version: version,
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
      .onConflict((conflict) =>
        conflict.columns(['game_id', 'dilemma_id', 'option_id']).doNothing(),
      )
      .execute();
  }

  /** Leaves exactly the players of the snapshot, keeping those already there. */
  async #savePlayers(db: Transaction<Database>, { id, players }: GameSnapshot): Promise<void> {
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

  async #deleteAnswers(db: Transaction<Database>, rows: readonly AnswerRow[]): Promise<void> {
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

  async #upsertAnswers(db: Transaction<Database>, rows: readonly AnswerRow[]): Promise<void> {
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
