import { type Kysely, sql } from 'kysely';

// The whole decision phase: each game keeps its phase and its total time; each dilemma, whether
// it has the gap and who takes it; each player, whether they left and since when they are on their
// dilemma; each dilemma as each player plays it (the order of its options, their prediction
// subset), whether they reported it, whether they did not vote it and what their predictions
// scored; and each answer, its
// predictions, the order of the options seen and the time it took. The room keeps the host who is
// away and who left. A direct migration, with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  // The games from before have none of that, and only tests made them: they go, and their rooms
  // go back to the lobby. The rooms first: they point at their game in progress.
  await sql`update rooms set current_game_id = null`.execute(db);
  await sql`delete from games`.execute(db);
  // The checks deferred to the commit run now: a table with checks pending cannot be altered.
  await sql`set constraints all immediate`.execute(db);

  await sql`
    alter table games
      drop column in_decision_phase,
      add column phase text,
      add column started_at timestamptz,
      add column total_time_ends_at timestamptz,
      add column total_time_ran_out boolean not null default false,
      add constraint games_phase check (phase in ('decision', 'reveal')),
      add constraint games_total_time_running check (
        (phase is null) = (started_at is null) and (phase is null) = (total_time_ends_at is null)
      )
  `.execute(db);
  await sql`
    alter table game_dilemmas
      add column has_gap boolean not null,
      add column person_in_the_gap text
  `.execute(db);
  await sql`
    alter table game_players
      add column has_left boolean not null default false,
      add column current_since timestamptz
  `.execute(db);
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

  await sql`
    alter table rooms add column absent_host_player_id text;
    alter table room_players add column has_left boolean not null default false
  `.execute(db);
}
