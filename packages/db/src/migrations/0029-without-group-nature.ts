import { type Kysely, sql } from 'kysely';

// The game does not use the nature of the group, which only served the dataset: rooms and games no
// longer keep it. A direct migration, with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`alter table rooms drop column group_nature`.execute(db);
  await sql`alter table games drop column group_nature`.execute(db);
}
