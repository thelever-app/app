import { AsyncLocalStorage } from 'node:async_hooks';
import { type Kysely, sql, type Transaction } from 'kysely';
import type { Database } from './schema.ts';

const current = new AsyncLocalStorage<Transaction<Database>>();

/**
 * Runs a command in one transaction that the PostgreSQL repositories take up without being passed it,
 * so a use case reads, locks and saves through the same connection and commits all of it or nothing.
 * Inside another one, it joins it.
 */
export async function inTransaction<T>(db: Kysely<Database>, work: () => Promise<T>): Promise<T> {
  if (current.getStore()) return work();
  return db.transaction().execute((transaction) => current.run(transaction, work));
}

/**
 * The transaction of the command in progress, if any, seen through the tables of the context that
 * asks: the same connection, with only the tables its adapters may touch.
 */
export function currentTransaction<Tables extends Partial<Database> = Database>():
  Transaction<Tables> | undefined {
  return current.getStore() as Transaction<Tables> | undefined;
}

/**
 * Runs, through the transaction of the command if any, statements whose failure must not undo it:
 * a statement that fails aborts the whole transaction, and its commit would then undo the command
 * without an error. The savepoint makes the failure lose only these statements, and it still throws.
 */
export async function withoutAbortingTheCommand<Tables extends Partial<Database>, T>(
  db: Kysely<Tables>,
  work: (db: Kysely<Tables>) => Promise<T>,
): Promise<T> {
  const transaction = currentTransaction<Tables>();
  if (!transaction) return work(db);
  await sql`savepoint without_aborting_the_command`.execute(transaction);
  try {
    const result = await work(transaction);
    await sql`release savepoint without_aborting_the_command`.execute(transaction);
    return result;
  } catch (error) {
    await sql`rollback to savepoint without_aborting_the_command`.execute(transaction);
    throw error;
  }
}
