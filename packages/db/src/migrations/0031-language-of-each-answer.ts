import { type Kysely, sql } from 'kysely';

// Each answer keeps the language the player read the dilemma in, which the room no longer shows:
// unknown for the answers there are. A direct migration, with no expand and contract, until real
// players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table answers add column language text
      constraint answers_language check (language in ('es', 'en', 'fr', 'de', 'it', 'pt', 'ca'))
  `.execute(db);
}
