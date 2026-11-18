import { type Kysely, sql } from 'kysely';

// The end of the game. A game keeps when the dilemma of its round was revealed, how long the group
// spent on the reveal of each dilemma it moved on from, which nobody sees, and the screen of its
// results everyone is on. The reactions of each reveal hang from their game, so they go with the
// room, each with the seal of the player who made it; their position keeps the order they were
// made in. A like belongs to the identity and the dilemma, not to the room, so it outlives it: one
// per identity and dilemma in all, given in a game or from the catalog, with its seal. A room keeps
// the dilemmas of the games it played before, which its rematches do not repeat. A direct migration,
// with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table games
      add column round_revealed_at timestamptz,
      add column stage_step integer check (stage_step >= 0)
  `.execute(db);
  // A game already in its results was on the only screen they had: the ranking of an anonymous room.
  await sql`update games set stage_step = 0 where stage = 'results'`.execute(db);
  await sql`
    alter table games add constraint games_stage_step_in_the_results
      check ((stage = 'results') = (stage_step is not null))
  `.execute(db);
  await sql`
    alter table game_dilemmas add column time_spent_ms integer check (time_spent_ms >= 0)
  `.execute(db);
  await sql`
    create table reactions (
      game_id text not null references games (id) on delete cascade,
      position integer not null check (position >= 0),
      dilemma_id text not null,
      player_id text not null,
      about_player_id text,
      emoji text not null check (char_length(emoji) between 1 and 32),
      game_consent_version text not null,
      research_consent_version text,
      commercial_licence_consent_version text,
      under_eighteen boolean not null,
      primary key (game_id, position)
    )
  `.execute(db);
  await sql`
    create unique index reactions_one_per_target
      on reactions (game_id, dilemma_id, player_id, coalesce(about_player_id, ''))
  `.execute(db);
  await sql`
    create table dilemma_likes (
      identity text not null,
      dilemma_id text not null references dilemmas (id) on delete cascade,
      given_in text not null check (given_in in ('game', 'catalog')),
      liked_at timestamptz not null,
      game_consent_version text not null,
      research_consent_version text,
      commercial_licence_consent_version text,
      under_eighteen boolean not null,
      primary key (identity, dilemma_id)
    )
  `.execute(db);
  await sql`
    alter table rooms add column played_dilemma_ids text[] not null default '{}'
  `.execute(db);
  await sql`alter table rooms alter column played_dilemma_ids drop default`.execute(db);
  // A game keeps who played it also once they are out of the room: the rematch takes out who left,
  // and its lobby can expel who played the game before. The game goes with the room all the same.
  await sql`alter table game_players drop constraint game_players_player_id_fkey`.execute(db);
  await sql`drop index game_players_by_player`.execute(db);
}
