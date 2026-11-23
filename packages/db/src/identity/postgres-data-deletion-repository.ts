import { DataDeletion, type DataDeletionRepository } from '@thelever-app/identity';
import type { Kysely, Selectable } from 'kysely';
import type { IdentityTables } from '../schema.ts';
import { currentTransaction } from '../transaction.ts';

/** The deletion log, one row per deletion. */
export class PostgresDataDeletionRepository implements DataDeletionRepository {
  readonly #db: Kysely<IdentityTables>;

  constructor(db: Kysely<IdentityTables>) {
    this.#db = db;
  }

  /** Once erased it stays so: a save of what was read before cannot make it pending again. */
  async save(deletion: DataDeletion): Promise<void> {
    const { id, identity, reason, requestedAt, erasedAt } = deletion.toSnapshot();
    await (currentTransaction<IdentityTables>() ?? this.#db)
      .insertInto('data_deletions')
      .values({ id, identity, reason, requested_at: requestedAt, erased_at: erasedAt })
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet((eb) => ({
          erased_at: eb.fn.coalesce('data_deletions.erased_at', eb.ref('excluded.erased_at')),
        })),
      )
      .execute();
  }

  async findById(id: string): Promise<DataDeletion | undefined> {
    const row = await this.#db
      .selectFrom('data_deletions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row && deletionOf(row);
  }

  async pending(): Promise<DataDeletion[]> {
    const rows = await this.#db
      .selectFrom('data_deletions')
      .selectAll()
      .where('erased_at', 'is', null)
      .orderBy('requested_at')
      .orderBy('id')
      .execute();
    return rows.map(deletionOf);
  }

  async all(): Promise<DataDeletion[]> {
    const rows = await this.#db
      .selectFrom('data_deletions')
      .selectAll()
      .orderBy('requested_at')
      .orderBy('id')
      .execute();
    return rows.map(deletionOf);
  }

  async ofIdentity(identity: string): Promise<DataDeletion[]> {
    const rows = await (currentTransaction<IdentityTables>() ?? this.#db)
      .selectFrom('data_deletions')
      .selectAll()
      .where('identity', '=', identity)
      .orderBy('requested_at')
      .orderBy('id')
      .execute();
    return rows.map(deletionOf);
  }
}

function deletionOf(row: Selectable<IdentityTables['data_deletions']>): DataDeletion {
  return DataDeletion.fromSnapshot({
    id: row.id,
    identity: row.identity,
    reason: row.reason,
    requestedAt: row.requested_at,
    erasedAt: row.erased_at,
  });
}
