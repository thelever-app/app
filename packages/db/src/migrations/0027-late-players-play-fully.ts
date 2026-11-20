import { type Kysely, sql } from 'kysely';

// A player who joins a game once started plays fully from the round after the one they joined in:
// each player of a game keeps the position of that round, null for who started it, instead of
// whether they joined late. For the late players there are, it is how many dilemmas they found
// revealed, which is that position, or the one after when they joined in a reveal. A direct
// migration, with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`alter table game_players add column joined_at_position integer`.execute(db);
  await sql`
    update game_players
      set joined_at_position = (
        select count(*)
          from game_player_dilemmas
          where game_player_dilemmas.game_id = game_players.game_id
            and game_player_dilemmas.player_id = game_players.player_id
            and game_player_dilemmas.did_not_vote = 'joined-late'
      )
      where joined_late
  `.execute(db);
  await sql`
    alter table game_players
      drop column joined_late,
      add constraint game_players_joined_at_position check (joined_at_position >= 0)
  `.execute(db);
}
