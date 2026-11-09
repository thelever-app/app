import { type Kysely, sql } from 'kysely';

// The game by rounds: each room and each game keep the time per dilemma instead of the total time;
// each game, its round in progress (its position, its phase, when it started and ends, what
// revealed it and who moved on to it); each dilemma, whether it has the gap, who takes it and who
// added it; each player, whether they left; each dilemma as each player plays it (the order of its
// options, their prediction subset), whether they reported it, whether they did not vote it and
// what their predictions scored; and each answer, its predictions, the order of the options seen
// and the time it took. The room keeps the host who is away and who left. A direct migration, with
// no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  // The games from before have none of that, and only tests made them: they go, and their rooms
  // go back to the lobby. The rooms first: they point at their game in progress.
  await sql`update rooms set current_game_id = null`.execute(db);
  await sql`delete from games`.execute(db);
  // The checks deferred to the commit run now: a table with checks pending cannot be altered.
  await sql`set constraints all immediate`.execute(db);

  // Every room plays a minute per dilemma, the default, whatever total time it had.
  await sql`
    alter table rooms
      drop constraint rooms_total_time,
      drop column total_time_in_minutes,
      add column time_per_dilemma_seconds smallint not null default 60,
      add constraint rooms_time_per_dilemma check (time_per_dilemma_seconds in (30, 45, 60, 90)),
      add column absent_host_player_id text
  `.execute(db);
  await sql`alter table rooms alter column time_per_dilemma_seconds drop default`.execute(db);
  await sql`alter table room_players add column has_left boolean not null default false`.execute(
    db,
  );

  await sql`
    alter table games
      drop constraint games_total_time,
      drop column total_time_in_minutes,
      drop column in_decision_phase,
      add column time_per_dilemma_seconds smallint not null,
      add constraint games_time_per_dilemma check (time_per_dilemma_seconds in (30, 45, 60, 90)),
      add column round_position smallint,
      add column round_phase text,
      add column round_started_at timestamptz,
      add column round_ends_at timestamptz,
      add column round_revealed_by text,
      add column round_moved_on_by text,
      add constraint games_round_phase check (round_phase in ('decision', 'reveal')),
      add constraint games_round_revealed_by check (round_revealed_by in ('everyone', 'time', 'host')),
      add constraint games_round check (
        (round_position is null) = (round_phase is null)
        and (round_position is null) = (round_started_at is null)
        and (round_position is null) = (round_ends_at is null)
        and (round_phase = 'reveal') = (round_revealed_by is not null)
      )
  `.execute(db);
  await sql`
    alter table game_dilemmas
      add column has_gap boolean not null,
      add column person_in_the_gap text,
      add column added_by_player_id text
  `.execute(db);
  await sql`alter table game_players add column has_left boolean not null default false`.execute(
    db,
  );
  await sql`
    create table game_player_dilemmas (
      game_id text not null,
      player_id text not null,
      dilemma_id text not null,
      option_order text[] not null,
      prediction_subset text[] not null,
      did_not_vote text,
      reported text,
      scored boolean not null default false,
      match_points smallint,
      vote_points smallint,
      primary key (game_id, player_id, dilemma_id),
      foreign key (game_id, player_id) references game_players (game_id, player_id) on delete cascade,
      constraint game_player_dilemmas_did_not_vote check (did_not_vote in ('not-answered', 'reported')),
      constraint game_player_dilemmas_reported check (reported in ('offensive', 'other'))
    )
  `.execute(db);
  await sql`
    alter table answers
      add column match_prediction smallint,
      add column vote_predictions jsonb not null,
      add column option_order text[] not null,
      add column response_time_ms integer
  `.execute(db);
}
