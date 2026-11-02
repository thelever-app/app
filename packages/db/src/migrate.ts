import { databaseConfigFrom, openDatabase } from './connection.ts';
import { grantRowAccess } from './grants.ts';
import { migrateToLatest } from './migrator.ts';

// `pnpm db:migrate` locally; in each environment, the migrate job runs it before every deploy.
const { db, close } = await openDatabase<unknown>(databaseConfigFrom(process.env), {
  maxConnections: 1,
});
try {
  const applied = await migrateToLatest(db);
  console.log(applied.length > 0 ? `applied ${applied.join(', ')}` : 'nothing to apply');
  // In Cloud Run, the user of the room server, which reads and writes rows but never changes the schema.
  const appUser = process.env.DB_APP_USER;
  if (appUser) {
    await grantRowAccess(db, appUser);
    console.log(`granted the rows to ${appUser}`);
  }
} finally {
  await close();
}
