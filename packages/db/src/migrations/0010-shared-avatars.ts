import { type Kysely, sql } from 'kysely';

// Two players of a room may share an avatar, as long as they do not share the nickname as well.
// The room decides that, comparing nicknames without case or accents; the database no longer
// refuses a repeated avatar. A direct migration, with no expand and contract, until real players.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`alter table room_players drop constraint room_players_avatar`.execute(db);
}
