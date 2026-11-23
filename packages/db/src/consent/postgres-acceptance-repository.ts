import { type AcceptanceRepository, Acceptances } from '@thelever-app/consent';
import type { Kysely } from 'kysely';
import type { ConsentTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

/** The last version of each legal document each identity accepted, one row per document. */
export class PostgresAcceptanceRepository implements AcceptanceRepository {
  readonly #db: Kysely<ConsentTables>;

  constructor(db: Kysely<ConsentTables>) {
    this.#db = db;
  }

  async findByIdentity(identity: string): Promise<Acceptances> {
    const rows = await (currentTransaction<ConsentTables>() ?? this.#db)
      .selectFrom('legal_acceptances')
      .selectAll()
      .where('identity', '=', identity)
      .execute();
    return Acceptances.fromSnapshot({
      identity,
      accepted: rows.map(({ document, version, accepted_at, withdrawn_at }) => ({
        document,
        version,
        acceptedAt: accepted_at,
        withdrawnAt: withdrawn_at,
      })),
    });
  }

  /**
   * A document never goes back to a version before the one kept, even from what was read before;
   * nor does a withdrawal go back, unless the document is given again after it.
   */
  async save(acceptances: Acceptances): Promise<void> {
    const { identity, accepted } = acceptances.toSnapshot();
    if (accepted.length === 0) return;
    await (currentTransaction<ConsentTables>() ?? this.#db)
      .insertInto('legal_acceptances')
      .values(
        accepted.map(({ document, version, acceptedAt, withdrawnAt }) => ({
          identity,
          document,
          version,
          accepted_at: acceptedAt,
          withdrawn_at: withdrawnAt,
        })),
      )
      .onConflict((conflict) =>
        conflict
          .columns(['identity', 'document'])
          .doUpdateSet((eb) => ({
            version: eb.ref('excluded.version'),
            accepted_at: eb.ref('excluded.accepted_at'),
            withdrawn_at: eb
              .case()
              .when(
                eb.and([
                  eb('legal_acceptances.withdrawn_at', 'is not', null),
                  eb('excluded.accepted_at', '<=', eb.ref('legal_acceptances.accepted_at')),
                ]),
              )
              .then(eb.ref('legal_acceptances.withdrawn_at'))
              .else(eb.ref('excluded.withdrawn_at'))
              .end(),
          }))
          .where((eb) => eb('legal_acceptances.version', '<=', eb.ref('excluded.version'))),
      )
      .execute();
  }
}
