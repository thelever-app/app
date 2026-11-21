import { type Kysely, sql } from 'kysely';

/**
 * Lets that user read and write the rows of every table of the app, and nothing else: it cannot
 * change the schema, which only the migrator owns, nor see the tables of the migrator. Run after
 * every migration, so a new table is granted too; granting again changes nothing.
 */
export async function grantRowAccess<DB>(db: Kysely<DB>, user: string): Promise<void> {
  const { rows } = await sql<{ name: string }>`
    select tablename as name from pg_tables
    where schemaname = 'public' and tablename not like 'kysely\\_%'
  `.execute(db);
  for (const { name } of rows) {
    await sql`grant select, insert, update, delete on table ${sql.table(name)} to ${sql.id(user)}`.execute(
      db,
    );
  }
}

/**
 * The tables of the catalog: the dilemmas and their versions, which the job that loads the catalog
 * writes and the one that generates the public web reads. Named one by one, so neither gets a
 * table that another context adds with a name that starts the same, such as the likes or the
 * reports.
 */
const CATALOG_TABLES = [
  'dilemmas',
  'dilemma_versions',
  'dilemma_version_options',
  'dilemma_version_tags',
  'dilemma_version_arguments',
  'dilemma_version_option_arguments',
] as const;

/**
 * Lets that user read and write the rows of the tables of the catalog only, which the job that
 * loads it needs, and takes away whatever else it had: nothing of the rooms, the games, the likes
 * or the reports. Run after every migration, like grantRowAccess.
 */
export async function grantDilemmaAccess<DB>(db: Kysely<DB>, user: string): Promise<void> {
  // In one transaction, so a catalog job running meanwhile never finds its tables taken away.
  await db.transaction().execute(async (transaction) => {
    await sql`revoke all on all tables in schema public from ${sql.id(user)}`.execute(transaction);
    for (const name of CATALOG_TABLES) {
      await sql`grant select, insert, update, delete on table ${sql.table(name)} to ${sql.id(user)}`.execute(
        transaction,
      );
    }
  });
}

/**
 * Lets that user only read the tables the public web is made of, and nothing else: not the rooms
 * and games, nor the likes or the reports. Run after every migration, like grantRowAccess.
 */
export async function grantDilemmaReadAccess<DB>(db: Kysely<DB>, user: string): Promise<void> {
  for (const name of CATALOG_TABLES) {
    await sql`grant select on table ${sql.table(name)} to ${sql.id(user)}`.execute(db);
  }
}
