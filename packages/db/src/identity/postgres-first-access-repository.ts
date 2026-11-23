import { FirstAccess, type FirstAccessRepository } from '@thelever-app/identity';
import type { Kysely, Selectable } from 'kysely';
import type { IdentityTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

/** The first access of each identity, one row per identity, with a request code no other row has. */
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
    return row && firstAccessOf(row);
  }

  async findByRequestCode(requestCode: string): Promise<FirstAccess | undefined> {
    const row = await (currentTransaction<IdentityTables>() ?? this.#db)
      .selectFrom('first_accesses')
      .selectAll()
      .where('request_code', '=', requestCode)
      .executeTakeFirst();
    return row && firstAccessOf(row);
  }

  /**
   * A declared age stays, even if what is saved was read before it was declared; the request code
   * is written once, and the unique column refuses one another identity has.
   */
  async save(firstAccess: FirstAccess): Promise<void> {
    const { identity, region, birthYear, birthMonth, lastOpenedAt, requestCode } =
      firstAccess.toSnapshot();
    await (currentTransaction<IdentityTables>() ?? this.#db)
      .insertInto('first_accesses')
      .values({
        identity,
        region,
        birth_year: birthYear,
        birth_month: birthMonth,
        last_opened_at: lastOpenedAt,
        request_code: requestCode,
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

  async delete(identity: string): Promise<void> {
    await (currentTransaction<IdentityTables>() ?? this.#db)
      .deleteFrom('first_accesses')
      .where('identity', '=', identity)
      .execute();
  }
}

function firstAccessOf(row: Selectable<IdentityTables['first_accesses']>): FirstAccess {
  return FirstAccess.fromSnapshot({
    identity: row.identity,
    region: row.region,
    birthYear: row.birth_year,
    birthMonth: row.birth_month,
    lastOpenedAt: row.last_opened_at,
    requestCode: row.request_code,
  });
}
