import { type Kysely, sql } from 'kysely';

// A player may join a game once it has started: each player of a game keeps whether they joined it
// late, and each dilemma already revealed when they joined is recorded as "did not vote" with a
// reason of its own. A direct migration, with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table game_players add column joined_late boolean not null default false
  `.execute(db);
  await sql`
    alter table game_player_dilemmas
      drop constraint game_player_dilemmas_did_not_vote,
      add constraint game_player_dilemmas_did_not_vote
        check (did_not_vote in ('not-answered', 'reported', 'joined-late'))
  `.execute(db);
}
