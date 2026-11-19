import { FirstAccess, type FirstAccessRepository } from '@thelever-app/identity';
import type { Kysely } from 'kysely';
import type { IdentityTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

/** The first access of each identity, one row per identity. */
export class PostgresFirstAccessRepository implements FirstAccessRepository {
  readonly #db: Kysely<IdentityTables>;

  constructor(db: Kysely<IdentityTables>) {
    this.#db = db;
  }

  async findByIdentity(identity: string): Promise<FirstAccess | undefined> {
    const row = await (currentTransaction<IdentityTables>() ?? this.#db)
      .selectFrom('first_accesses')
      .selectAll()
      .where('identity', '=', identity)
      .executeTakeFirst();
    return (
      row &&
      FirstAccess.fromSnapshot({
        identity: row.identity,
        region: row.region,
        birthYear: row.birth_year,
        birthMonth: row.birth_month,
        lastOpenedAt: row.last_opened_at,
      })
    );
  }

  async save(firstAccess: FirstAccess): Promise<void> {
    const { identity, region, birthYear, birthMonth, lastOpenedAt } = firstAccess.toSnapshot();
    const row = {
      region,
      birth_year: birthYear,
      birth_month: birthMonth,
      last_opened_at: lastOpenedAt,
    };
    await (currentTransaction<IdentityTables>() ?? this.#db)
      .insertInto('first_accesses')
      .values({ identity, ...row })
      .onConflict((conflict) => conflict.column('identity').doUpdateSet(row))
      .execute();
  }
}
