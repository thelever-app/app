import { databaseConfigFrom, openDatabase } from './connection.ts';
import { migrateToLatest } from './migrator.ts';

// `pnpm db:migrate` locally; in each environment, the migrate job runs it before every deploy.
const { db, close } = await openDatabase<unknown>(databaseConfigFrom(process.env), {
  maxConnections: 1,
});
try {
  const applied = await migrateToLatest(db);
  console.log(applied.length > 0 ? `applied ${applied.join(', ')}` : 'nothing to apply');
} finally {
  await close();
}
