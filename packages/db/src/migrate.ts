import { databaseConfigFrom, openDatabase } from './connection.ts';
import { ConsoleLogger } from './console-logger.ts';
import { grantDilemmaAccess, grantDilemmaReadAccess, grantRowAccess } from './grants.ts';
import { migrateToLatest } from './migrator.ts';

// `pnpm db:migrate` locally; in each environment, the migrate job runs it before every deploy.
const { db, close } = await openDatabase<unknown>(databaseConfigFrom(process.env), {
  maxConnections: 1,
  logger: new ConsoleLogger(),
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
  // In Cloud Run, the user of the job of moderation, which applies the decisions on the dilemmas
  // and the nicknames of the rooms besides keeping the issues, and deletes and exports the data of
  // the players in every context: the rows the room server has.
  const moderationUser = process.env.DB_MODERATION_USER;
  if (moderationUser) {
    await grantRowAccess(db, moderationUser);
    console.log(`granted the rows to ${moderationUser}`);
  }
  // In Cloud Run, the user of the job that loads the catalog, which only touches the dilemmas.
  const catalogUser = process.env.DB_CATALOG_USER;
  if (catalogUser) {
    await grantDilemmaAccess(db, catalogUser);
    console.log(`granted the dilemmas to ${catalogUser}`);
  }
  // In Cloud Run, the user of the job that generates the public web, which only reads the dilemmas.
  const siteUser = process.env.DB_SITE_USER;
  if (siteUser) {
    await grantDilemmaReadAccess(db, siteUser);
    console.log(`granted reading the dilemmas to ${siteUser}`);
  }
} finally {
  await close();
}
