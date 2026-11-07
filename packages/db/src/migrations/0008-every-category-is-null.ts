import { type Kysely, sql } from 'kysely';

// A room plays every category with null and none with an empty list. Until now an empty list
// meant every category, so the rooms saved with one get null: they were created to play them all.
// A direct migration, with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`alter table rooms alter column categories drop not null`.execute(db);
  await sql`update rooms set categories = null where categories = '{}'`.execute(db);
}
