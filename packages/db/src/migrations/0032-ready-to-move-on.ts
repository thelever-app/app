import { type Kysely, sql } from 'kysely';

// The group moves on once every player is ready, or when the host moves everyone on: the game keeps
// who is ready on the reveal or the screen of the results it is on, and a game out of its rounds
// keeps the host who moved everyone there only if one did. A stopped game still keeps who stopped
// it. A direct migration, with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table games
      add column ready_to_move_on text[] not null default '{}',
      drop constraint games_check,
      add constraint games_moved_on_by check (
        (stage <> 'rounds' or stage_moved_on_by is null)
        and (stage <> 'stopped' or stage_moved_on_by is not null)
      )
  `.execute(db);
}
