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
 * Lets that user read and write the rows of the tables of Dilemmas only, which the job that loads
 * the catalog needs, and nothing of the rooms and games. Run after every migration, like
 * grantRowAccess.
 */
export async function grantDilemmaAccess<DB>(db: Kysely<DB>, user: string): Promise<void> {
  const { rows } = await sql<{ name: string }>`
    select tablename as name from pg_tables
    where schemaname = 'public' and (tablename = 'dilemmas' or tablename like 'dilemma\\_%')
  `.execute(db);
  for (const { name } of rows) {
    await sql`grant select, insert, update, delete on table ${sql.table(name)} to ${sql.id(user)}`.execute(
      db,
    );
  }
}

/** The tables the job that generates the public web reads: the dilemmas and their versions. */
const PUBLIC_CATALOG_TABLES = [
  'dilemmas',
  'dilemma_versions',
  'dilemma_version_options',
  'dilemma_version_tags',
  'dilemma_version_arguments',
  'dilemma_version_option_arguments',
] as const;

/**
 * Lets that user only read the tables the public web is made of, and nothing else: not the rooms
 * and games, nor any table Dilemmas adds later, such as the reports. Run after every migration,
 * like grantRowAccess.
 */
export async function grantDilemmaReadAccess<DB>(db: Kysely<DB>, user: string): Promise<void> {
  for (const name of PUBLIC_CATALOG_TABLES) {
    await sql`grant select on table ${sql.table(name)} to ${sql.id(user)}`.execute(db);
  }
}
