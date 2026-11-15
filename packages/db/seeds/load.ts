import { loadSeedDilemmas } from '@thelever-app/dilemmas/seed';
import { databaseConfigFrom, openDatabase } from '../src/connection.ts';
import { ConsoleLogger } from '../src/console-logger.ts';
import { PostgresDilemmaRepository } from '../src/dilemmas/postgres-dilemma-repository.ts';
import type { Database } from '../src/schema.ts';
import { inTransaction } from '../src/transaction.ts';

// `pnpm db:seed` locally, for a database without the curated catalog; the environments load the
// curated catalog instead, with the job catalog-import, which withdraws these.
const { db, close } = await openDatabase<Database>(databaseConfigFrom(process.env), {
  maxConnections: 1,
  logger: new ConsoleLogger(),
});
try {
  // All of the seed or none of it.
  const ids = await inTransaction(db, () => loadSeedDilemmas(new PostgresDilemmaRepository(db)));
  console.log(`seed: ${ids.length} dilemmas`);
} finally {
  await close();
}
