import { type Kysely, sql } from 'kysely';

// Each dilemma gets a random public id, with which a link opens it without letting anyone guess the
// others from its number. The dilemmas already there get one now; from here on Dilemmas gives it.
// A direct migration, with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table dilemmas
      add column public_id text not null default gen_random_uuid()::text
        constraint dilemmas_public_id_unique unique
  `.execute(db);
  await sql`alter table dilemmas alter column public_id drop default`.execute(db);
}
