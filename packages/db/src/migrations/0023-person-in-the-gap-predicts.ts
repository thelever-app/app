import { type Kysely, sql } from 'kysely';

// The person in the gap no longer votes the dilemma about them: their answer has no vote, and no
// answer keeps whether its voter was in the gap, which the game already keeps for each dilemma. In
// a round being decided when this runs, the person in the gap keeps their predictions without the
// vote, and the others lose their predictions of them, which nobody makes now; the rounds already
// revealed keep the answers they were revealed with. Each game keeps whether each of its dilemmas
// shows its options in a fixed order, which the dilemmas of the games started before do not. Each
// player of a room keeps the dilemmas their device says they played, which the room puts the games
// together with. Each version of a dilemma keeps whether its text or an option has the gap, which a
// game draws by along with its status and age, instead of looking for it in every text each time;
// like the rest of its content, it never changes. The room keeps, of each dilemma of its rounds,
// its type, its scale and whether it has the gap, as it keeps its minimum age: those of its current
// version, or a standard one, everyday and without the gap, if it is gone. A direct migration, with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table answers alter column vote drop not null, drop column voter_in_the_gap
  `.execute(db);
  await sql`
    update answers set
      vote = case when answers.player_id = gap.person_in_the_gap then null else answers.vote end,
      vote_predictions = coalesce((
        select jsonb_agg(prediction order by position)
        from jsonb_array_elements(answers.vote_predictions) with ordinality as made (prediction, position)
        where prediction ->> 'playerId' <> gap.person_in_the_gap
      ), '[]'::jsonb)
    from game_dilemmas as gap, games
    where gap.game_id = answers.game_id
      and gap.dilemma_id = answers.dilemma_id
      and gap.person_in_the_gap is not null
      and games.id = answers.game_id
      and games.stage = 'rounds'
      and games.round_phase = 'decision'
      and games.round_position = gap.position
  `.execute(db);
  await sql`
    alter table game_dilemmas add column fixed_order boolean not null default false
  `.execute(db);
  await sql`alter table game_dilemmas alter column fixed_order drop default`.execute(db);
  await sql`
    alter table room_players add column played_dilemma_ids text[] not null default '{}'
  `.execute(db);
  await sql`alter table room_players alter column played_dilemma_ids drop default`.execute(db);
  await sql`alter table dilemma_versions add column has_gap boolean`.execute(db);
  await sql`
    update dilemma_versions set has_gap = strpos(text, '{gap}') > 0 or exists (
      select 1 from dilemma_version_options as options
      where options.dilemma_id = dilemma_versions.dilemma_id
        and options.version = dilemma_versions.number
        and strpos(options.text, '{gap}') > 0
    )
  `.execute(db);
  await sql`alter table dilemma_versions alter column has_gap set not null`.execute(db);
  await sql`
    create or replace function dilemma_version_content_never_changes() returns trigger
    language plpgsql as $$
    begin
      if (
        new.dilemma_id, new.number, new.text, new.category, new.minimum_age,
        new.type, new.compromising, new.scale, new.fixed_order, new.has_gap
      ) is distinct from (
        old.dilemma_id, old.number, old.text, old.category, old.minimum_age,
        old.type, old.compromising, old.scale, old.fixed_order, old.has_gap
      ) then
        raise exception 'the content of a version of a dilemma never changes';
      end if;
      return new;
    end
    $$
  `.execute(db);
  await sql`drop index dilemma_versions_by_status`.execute(db);
  await sql`
    create index dilemma_versions_by_status
      on dilemma_versions (status, has_gap, minimum_age, category)
  `.execute(db);
  await sql`
    alter table room_rounds
      add column type text check (type in ('standard', 'game-theory', 'would-you-rather')),
      add column scale text check (scale in ('everyday', 'medium', 'extreme')),
      add column has_gap boolean
  `.execute(db);
  await sql`
    update room_rounds set type = current.type, scale = current.scale, has_gap = current.has_gap
    from dilemma_versions as current
    where current.dilemma_id = room_rounds.dilemma_id
      and not exists (
        select 1 from dilemma_versions as later
        where later.dilemma_id = current.dilemma_id and later.number > current.number
      )
  `.execute(db);
  // Nothing ties a round to its dilemma: one no longer in the catalog takes a standard one,
  // everyday and without the gap, so the migration never stops on it.
  await sql`
    update room_rounds set type = 'standard', scale = 'everyday', has_gap = false
    where dilemma_id is not null and type is null
  `.execute(db);
  await sql`
    alter table room_rounds add constraint room_rounds_dilemma_classified check (
      (dilemma_id is null) = (type is null)
      and (dilemma_id is null) = (scale is null)
      and (dilemma_id is null) = (has_gap is null)
    )
  `.execute(db);
}
