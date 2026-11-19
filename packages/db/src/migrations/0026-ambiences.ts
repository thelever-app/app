import { type Kysely, sql } from 'kysely';

// The ambiences. A room keeps whether it includes compromising dilemmas, off in every room there
// is, and each random round its content, any in every round there is. A game keeps the ambience
// whose configuration its room had when it started, or custom; a game that already started
// counts as custom, since nobody chose an ambience for it. A direct migration, with no expand and
// contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table rooms add column compromising_dilemmas boolean not null default false
  `.execute(db);
  await sql`alter table rooms alter column compromising_dilemmas drop default`.execute(db);
  await sql`
    alter table rooms add constraint rooms_compromising_dilemmas_only_anonymous
      check (not compromising_dilemmas or variant = 'anonymous')
  `.execute(db);
  await sql`
    alter table room_rounds add column content text
      check (content in ('any', 'adults-only', 'compromising'))
  `.execute(db);
  await sql`update room_rounds set content = 'any' where origin = 'random'`.execute(db);
  await sql`
    alter table room_rounds add constraint room_rounds_content_of_random_rounds
      check ((origin = 'random') = (content is not null))
  `.execute(db);
  await sql`
    alter table games add column ambience text not null default 'custom'
      check (ambience in ('classic', 'spicy', 'no-filter', 'custom'))
  `.execute(db);
  await sql`alter table games alter column ambience drop default`.execute(db);
}
