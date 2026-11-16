import { type Kysely, sql } from 'kysely';

// A room created from the public page of a dilemma keeps that dilemma, with the minimum age it had,
// until its first game plays it first. A direct migration, with no expand and contract, until real
// players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table rooms
      add column first_dilemma_id text,
      add column first_dilemma_minimum_age smallint
        check (first_dilemma_minimum_age in (16, 18)),
      add constraint rooms_first_dilemma_whole
        check ((first_dilemma_id is null) = (first_dilemma_minimum_age is null))
  `.execute(db);
}
