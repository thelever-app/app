import { Game, type GameRepository, type GameSnapshot } from '@thelever-app/game';
import type { Kysely, Transaction } from 'kysely';
import type { Database } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

/**
 * A game in its rows. Inside a command, reading it locks the row of its room, the same lock every
 * command on that room takes, so commands on a room and on its games never overlap.
 */
export class PostgresGameRepository implements GameRepository {
  readonly #db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.#db = db;
  }

  async save(game: Game): Promise<void> {
    const transaction = currentTransaction();
    if (transaction) return this.#save(transaction, game.toSnapshot());
    await this.#db.transaction().execute((own) => this.#save(own, game.toSnapshot()));
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

    // The options of each dilemma are those of the version played, in their order.
    const options = await db
      .selectFrom('game_dilemmas')
      .innerJoin('dilemma_version_options', (join) =>
        join
          .onRef('dilemma_version_options.dilemma_id', '=', 'game_dilemmas.dilemma_id')
          .onRef('dilemma_version_options.version', '=', 'game_dilemmas.dilemma_version'),
      )
      .select([
        'game_dilemmas.dilemma_id as dilemmaId',
        'game_dilemmas.dilemma_version as version',
        'dilemma_version_options.option_id as optionId',
      ])
      .where('game_dilemmas.game_id', '=', id)
      .orderBy('game_dilemmas.position')
      .orderBy('dilemma_version_options.position')
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

    return Game.restore({
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
  }

  async #save(db: Transaction<Database>, snapshot: GameSnapshot): Promise<void> {
    const { id, roomId, inDecisionPhase, version, dilemmas, players } = snapshot;
    await db
      .insertInto('games')
      .values({ id, room_id: roomId, in_decision_phase: inDecisionPhase, version })
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({ in_decision_phase: inDecisionPhase, version }),
      )
      .execute();
    // The dilemmas of a game never change once it exists.
    await db
      .insertInto('game_dilemmas')
      .values(
        dilemmas.map(({ dilemmaId, version: dilemmaVersion }, position) => ({
          game_id: id,
          position,
          dilemma_id: dilemmaId,
          dilemma_version: dilemmaVersion,
        })),
      )
      .onConflict((conflict) => conflict.columns(['game_id', 'position']).doNothing())
      .execute();

    // The answers are replaced as a whole: none of them is referenced by anything else.
    await db.deleteFrom('answers').where('game_id', '=', id).execute();
    await db
      .deleteFrom('game_players')
      .where('game_id', '=', id)
      .$if(players.length > 0, (query) =>
        query.where(
          'player_id',
          'not in',
          players.map((player) => player.id),
        ),
      )
      .execute();
    if (players.length === 0) return;
    await db
      .insertInto('game_players')
      .values(players.map((player, position) => ({ game_id: id, player_id: player.id, position })))
      .onConflict((conflict) => conflict.columns(['game_id', 'player_id']).doNothing())
      .execute();

    const versions = new Map(dilemmas.map(({ dilemmaId, version: v }) => [dilemmaId, v]));
    const answers = players.flatMap((player) =>
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
    if (answers.length > 0) await db.insertInto('answers').values(answers).execute();
  }
}
