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

  /** A declared age stays, even if what is saved was read before it was declared. */
  async save(firstAccess: FirstAccess): Promise<void> {
    const { identity, region, birthYear, birthMonth, lastOpenedAt } = firstAccess.toSnapshot();
    await (currentTransaction<IdentityTables>() ?? this.#db)
      .insertInto('first_accesses')
      .values({
        identity,
        region,
        birth_year: birthYear,
        birth_month: birthMonth,
        last_opened_at: lastOpenedAt,
      })
      .onConflict((conflict) =>
        conflict.column('identity').doUpdateSet((eb) => {
          const declared = eb('first_accesses.birth_year', 'is not', null);
          return {
            region: eb.ref('excluded.region'),
            birth_year: eb
              .case()
              .when(declared)
              .then(eb.ref('first_accesses.birth_year'))
              .else(eb.ref('excluded.birth_year'))
              .end(),
            birth_month: eb
              .case()
              .when(declared)
              .then(eb.ref('first_accesses.birth_month'))
              .else(eb.ref('excluded.birth_month'))
              .end(),
            last_opened_at: eb.ref('excluded.last_opened_at'),
          };
        }),
      )
      .execute();
  }
}
