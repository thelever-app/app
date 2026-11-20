import { type Kysely, sql } from 'kysely';

// The host may restart a game in its rounds: the game is left stopped, with who stopped it where a
// game out of its rounds keeps who moved everyone on. A direct migration, with no expand and
// contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table games
      drop constraint games_stage_check,
      add constraint games_stage check (stage in ('rounds', 'results', 'ended', 'stopped'))
  `.execute(db);
}
