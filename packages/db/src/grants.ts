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
