import type { Ballot, WorldResultRepository } from '@thelever-app/dilemmas';
import { type Kysely, sql, type Transaction } from 'kysely';
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

  async publish(minimumNewAnswers: number): Promise<void> {
    const publish = async (db: Transaction<DilemmasTables>) => {
      // The versions with that many new answers since they were last published, and only those.
      await sql`
        create temporary table due on commit drop as
        select counts.dilemma_id, counts.version
        from world_counts counts
        group by counts.dilemma_id, counts.version
        having sum(counts.answers) - coalesce((
          select sum(results.answers) from world_results results
          where results.dilemma_id = counts.dilemma_id and results.version = counts.version
        ), 0) >= ${minimumNewAnswers}
      `.execute(db);
      await sql`
        delete from world_results results using due
        where results.dilemma_id = due.dilemma_id and results.version = due.version
      `.execute(db);
      await sql`
        insert into world_results (dilemma_id, version, position, answers)
        select counts.dilemma_id, counts.version, counts.position, counts.answers
        from world_counts counts join due using (dilemma_id, version)
      `.execute(db);
    };
    const transaction = currentTransaction<DilemmasTables>();
    if (transaction) return publish(transaction);
    await this.#db.transaction().execute(publish);
  }

  async forgetReceiptsOfFormerVersions(): Promise<void> {
    await sql`
      delete from world_vote_receipts receipts
      where exists (
        select 1 from dilemma_versions later
        where later.dilemma_id = receipts.dilemma_id and later.number > receipts.version
      )
    `.execute(currentTransaction<DilemmasTables>() ?? this.#db);
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
