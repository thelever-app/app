import type { Ballot, WorldResultRepository } from '@thelever-app/dilemmas';
import type { Kysely, Transaction } from 'kysely';
import type { DilemmasTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

export class PostgresWorldResultRepository implements WorldResultRepository {
  readonly #db: Kysely<DilemmasTables>;

  constructor(db: Kysely<DilemmasTables>) {
    this.#db = db;
  }

  async countVote(identity: string, ballot: Ballot): Promise<boolean> {
    const transaction = currentTransaction<DilemmasTables>();
    if (transaction) return this.#countVote(transaction, identity, ballot);
    return this.#db.transaction().execute((own) => this.#countVote(own, identity, ballot));
  }

  /** The receipt and the answer together, or neither: a second vote of the identity finds its receipt. */
  async #countVote(
    db: Transaction<DilemmasTables>,
    identity: string,
    { dilemmaId, version, position }: Ballot,
  ): Promise<boolean> {
    const receipt = await db
      .insertInto('world_vote_receipts')
      .values({ identity, dilemma_id: dilemmaId, version })
      .onConflict((conflict) => conflict.doNothing())
      .returning('identity')
      .executeTakeFirst();
    if (!receipt) return false;
    await db
      .insertInto('world_counts')
      .values({ dilemma_id: dilemmaId, version, position, answers: 1 })
      .onConflict((conflict) =>
        conflict
          .columns(['dilemma_id', 'version', 'position'])
          .doUpdateSet((eb) => ({ answers: eb('world_counts.answers', '+', 1) })),
      )
      .execute();
    return true;
  }

  async publish(): Promise<void> {
    const publish = async (db: Transaction<DilemmasTables>) => {
      await db.deleteFrom('world_results').execute();
      await db
        .insertInto('world_results')
        .columns(['dilemma_id', 'version', 'position', 'answers'])
        .expression((eb) =>
          eb.selectFrom('world_counts').select(['dilemma_id', 'version', 'position', 'answers']),
        )
        .execute();
    };
    const transaction = currentTransaction<DilemmasTables>();
    if (transaction) return publish(transaction);
    await this.#db.transaction().execute(publish);
  }

  async publishedCountsOf(
    dilemmaId: string,
    version: number,
  ): Promise<ReadonlyMap<number, number>> {
    const rows = await (currentTransaction<DilemmasTables>() ?? this.#db)
      .selectFrom('world_results')
      .select(['position', 'answers'])
      .where('dilemma_id', '=', dilemmaId)
      .where('version', '=', version)
      .orderBy('position')
      .execute();
    return new Map(rows.map(({ position, answers }) => [position, answers]));
  }
}
