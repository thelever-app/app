import { type Kysely, sql } from 'kysely';

// A room closes when every player has left, or after a while with nobody connected; a timer in
// memory would be lost when Cloud Run scales to zero, so the room keeps both moments. The rooms
// already there count from now. A direct migration, with no expand and contract, until real
// players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table rooms
      add column last_connected_at timestamptz not null default now(),
      add column closed_at timestamptz
  `.execute(db);
}
