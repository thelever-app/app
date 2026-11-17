import { type Kysely, sql } from 'kysely';

// The room keeps its rounds in order, each with where its dilemma comes from: random, from its
// categories (null, every one); specific, the dilemma the host chose; or the players, with the
// dilemma one of them chose and who, once chosen. A dilemma is in one round only. The rounds replace
// the number of dilemmas, the categories, the dilemmas picked and added, how many each player adds
// and the first dilemma: a room in a lobby now gets as many random rounds as it had dilemmas, from its
// categories, and loses what was picked or added; those rooms close within the day. Each game keeps
// where the round of each of its dilemmas took it from, and who chose it. A direct migration, with
// no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    create table room_rounds (
      room_id text not null references rooms (id) on delete cascade,
      position smallint not null check (position >= 0),
      round_id smallint not null check (round_id > 0),
      origin text not null check (origin in ('random', 'specific', 'players')),
      categories text[],
      dilemma_id text,
      minimum_age smallint check (minimum_age in (16, 18)),
      compromising boolean,
      chosen_by_player_id text,
      primary key (room_id, position),
      unique (room_id, round_id),
      unique (room_id, dilemma_id),
      foreign key (room_id, chosen_by_player_id) references room_players (room_id, id)
        on delete cascade,
      check (
        (dilemma_id is null) = (minimum_age is null)
        and (dilemma_id is null) = (compromising is null)
      ),
      check (origin = 'random' or categories is null),
      check (categories is null or cardinality(categories) > 0),
      check (origin <> 'random' or dilemma_id is null),
      check (origin <> 'specific' or (dilemma_id is not null and chosen_by_player_id is null)),
      check (origin <> 'players' or (dilemma_id is null) = (chosen_by_player_id is null))
    )
  `.execute(db);
  await sql`
    insert into room_rounds (room_id, position, round_id, origin, categories)
    select rooms.id, round - 1, round, 'random', nullif(rooms.categories, '{}')
    from rooms, generate_series(1, rooms.dilemma_count) as round
  `.execute(db);
  await sql`drop table room_added_dilemmas, room_picked_dilemmas`.execute(db);
  await sql`
    alter table rooms
      drop column categories,
      drop column dilemma_count,
      drop column dilemmas_per_player,
      drop column first_dilemma_id,
      drop column first_dilemma_minimum_age,
      drop column first_dilemma_compromising
  `.execute(db);

  await sql`alter table game_dilemmas drop constraint game_dilemmas_origin`.execute(db);
  await sql`
    update game_dilemmas set origin = case origin
      when 'added-by-a-player' then 'players'
      when 'picked-by-the-host' then 'specific'
      else 'random'
    end
  `.execute(db);
  await sql`
    alter table game_dilemmas
      add constraint game_dilemmas_origin check (origin in ('random', 'specific', 'players'))
  `.execute(db);
  await sql`
    alter table game_dilemmas rename column added_by_player_id to chosen_by_player_id
  `.execute(db);
}
