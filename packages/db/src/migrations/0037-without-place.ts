import { type Kysely, sql } from 'kysely';

// The game does not use whether the group plays together or remotely: rooms and games no longer
// keep it. A direct migration, as Mario chose on 27 November: until the traffic moves to the new
// revision, the one still serving can neither create nor save rooms and games.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`alter table rooms drop column place`.execute(db);
  await sql`alter table games drop column place`.execute(db);
}
