import { type Kysely, sql } from 'kysely';

// A room plays any of several categories, none meaning every one, and the host says how many
// dilemmas each player may add, from none to three. The rooms in the lobby keep what they had:
// their category, as the only one, and one dilemma for each player where they could add it.
// A direct migration, with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);

  await sql`
    alter table rooms
      add column categories text[] not null default '{}',
      add column dilemmas_per_player smallint not null default 0
  `.execute(db);
  await sql`
    update rooms set
      categories = array[category],
      dilemmas_per_player = case when players_can_add_dilemmas then 1 else 0 end
  `.execute(db);
  await sql`
    alter table rooms
      alter column categories drop default,
      alter column dilemmas_per_player drop default,
      drop column category,
      drop column players_can_add_dilemmas,
      add constraint rooms_dilemmas_per_player check (dilemmas_per_player in (0, 1, 2, 3))
  `.execute(db);

  // Each player adds as many as the room allows: the room checks it, not the table.
  await sql`alter table room_added_dilemmas drop constraint room_added_dilemmas_player`.execute(db);
}
