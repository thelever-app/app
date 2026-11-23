import type { AnalyticsObjectionRepository } from '@thelever-app/consent';
import type { Kysely } from 'kysely';
import type { ConsentTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

/** Who objects to product analytics, one row per identity. */
export class PostgresAnalyticsObjectionRepository implements AnalyticsObjectionRepository {
  readonly #db: Kysely<ConsentTables>;

  constructor(db: Kysely<ConsentTables>) {
    this.#db = db;
  }

  async objectedAt(identity: string): Promise<Date | undefined> {
    const row = await (currentTransaction<ConsentTables>() ?? this.#db)
      .selectFrom('analytics_objections')
      .select('objected_at')
      .where('identity', '=', identity)
      .executeTakeFirst();
    return row?.objected_at;
  }

  async object(identity: string, at: Date): Promise<void> {
    await (currentTransaction<ConsentTables>() ?? this.#db)
      .insertInto('analytics_objections')
      .values({ identity, objected_at: at })
      .onConflict((conflict) => conflict.column('identity').doNothing())
      .execute();
  }

  async lift(identity: string): Promise<void> {
    await (currentTransaction<ConsentTables>() ?? this.#db)
      .deleteFrom('analytics_objections')
      .where('identity', '=', identity)
      .execute();
  }
}
