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
      accepted: rows.map(({ document, version, accepted_at }) => ({
        document,
        version,
        acceptedAt: accepted_at,
      })),
    });
  }

  /** A document never goes back to a version before the one kept, even from what was read before. */
  async save(acceptances: Acceptances): Promise<void> {
    const { identity, accepted } = acceptances.toSnapshot();
    if (accepted.length === 0) return;
    await (currentTransaction<ConsentTables>() ?? this.#db)
      .insertInto('legal_acceptances')
      .values(
        accepted.map(({ document, version, acceptedAt }) => ({
          identity,
          document,
          version,
          accepted_at: acceptedAt,
        })),
      )
      .onConflict((conflict) =>
        conflict
          .columns(['identity', 'document'])
          .doUpdateSet((eb) => ({
            version: eb.ref('excluded.version'),
            accepted_at: eb.ref('excluded.accepted_at'),
          }))
          .where((eb) => eb('legal_acceptances.version', '<=', eb.ref('excluded.version'))),
      )
      .execute();
  }
}
