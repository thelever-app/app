import { type Kysely, sql } from 'kysely';

// In an anonymous room, each answer keeps the distribution prediction of the player, the share of
// the group in steps of 5 % they believe chose each option, and whether they pressed Ready; a
// nominal room keeps none. An answer of an anonymous room from before was complete with the vote,
// so it stays complete, without a prediction. The game keeps where it is: its rounds, its results
// or its end, and who moved everyone there. A direct migration, with no expand and contract, until
// real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table answers
      add column distribution_prediction jsonb,
      add column ready boolean not null default false
  `.execute(db);
  await sql`
    update answers set ready = true
    from games
    where games.id = answers.game_id and games.variant = 'anonymous'
  `.execute(db);
  await sql`
    alter table games
      add column stage text not null default 'rounds'
        check (stage in ('rounds', 'results', 'ended')),
      add column stage_moved_on_by text,
      add check ((stage = 'rounds') = (stage_moved_on_by is null))
  `.execute(db);
}
