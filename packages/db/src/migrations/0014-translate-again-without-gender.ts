import { type Kysely, sql } from 'kysely';

// The first automatic translations gave a gender to the reader and to the player in the gap, which
// nobody knows: they are deleted, with everything of their versions, so that the next load of the
// catalog translates every original again. A translation a person reviewed stays. A direct
// migration, with no expand and contract, until real players arrive; no game points to a dilemma.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    create temporary table automatic_translations on commit drop as
      select id from dilemmas
      where translation_of is not null
        and not exists (
          select 1 from dilemma_versions
          where dilemma_versions.dilemma_id = dilemmas.id and translation = 'reviewed'
        )
  `.execute(db);
  // Their options, tags and arguments go with each version.
  await sql`
    delete from dilemma_versions where dilemma_id in (select id from automatic_translations)
  `.execute(db);
  await sql`delete from dilemmas where id in (select id from automatic_translations)`.execute(db);
}
