import { type Kysely, sql } from 'kysely';

// The room keeps whether each dilemma of its lobby is compromising, as it keeps its minimum age, to
// leave it out when the room no longer suits it. The dilemmas already in a lobby were not, since no
// room could take one. A direct migration, with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  for (const table of ['room_added_dilemmas', 'room_picked_dilemmas']) {
    await sql`
      alter table ${sql.table(table)} add column compromising boolean not null default false
    `.execute(db);
    await sql`alter table ${sql.table(table)} alter column compromising drop default`.execute(db);
  }
  await sql`alter table rooms add column first_dilemma_compromising boolean`.execute(db);
  await sql`
    update rooms set first_dilemma_compromising = false where first_dilemma_id is not null
  `.execute(db);
  await sql`
    alter table rooms
      drop constraint rooms_first_dilemma_whole,
      add constraint rooms_first_dilemma_whole check (
        (first_dilemma_id is null) = (first_dilemma_minimum_age is null)
        and (first_dilemma_id is null) = (first_dilemma_compromising is null)
      )
  `.execute(db);
}
