import { type Kysely, sql } from 'kysely';

// The person in the gap no longer votes the dilemma about them: their answer has no vote, and no
// answer keeps whether its voter was in the gap, which the game already keeps for each dilemma. A
// person in the gap who voted a game in progress keeps their predictions without the vote. Each
// game keeps whether each of its dilemmas shows its options in a fixed order, which the dilemmas
// of the games started before do not. Each player of a room keeps the dilemmas their device says
// they played, which the room puts the games together with. The room keeps, of each dilemma of its
// rounds, its type, its scale and whether it has the gap, as it keeps its minimum age; the dilemmas
// already in a lobby take a standard one, everyday and without the gap, since nothing kept them
// until now; those rooms close within the day. Each version of a dilemma keeps whether its text or
// an option has the gap, which a game draws by along with its status and age, instead of looking
// for it in every text each time. A direct migration, with no expand and contract, until real
// players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table answers alter column vote drop not null, drop column voter_in_the_gap
  `.execute(db);
  await sql`
    update answers set vote = null
    from game_dilemmas
    where game_dilemmas.game_id = answers.game_id
      and game_dilemmas.dilemma_id = answers.dilemma_id
      and game_dilemmas.person_in_the_gap = answers.player_id
  `.execute(db);
  await sql`
    alter table game_dilemmas add column fixed_order boolean not null default false
  `.execute(db);
  await sql`alter table game_dilemmas alter column fixed_order drop default`.execute(db);
  await sql`
    alter table room_players add column played_dilemma_ids text[] not null default '{}'
  `.execute(db);
  await sql`alter table room_players alter column played_dilemma_ids drop default`.execute(db);
  await sql`
    alter table room_rounds
      add column type text check (type in ('standard', 'game-theory', 'would-you-rather')),
      add column scale text check (scale in ('everyday', 'medium', 'extreme')),
      add column has_gap boolean
  `.execute(db);
  await sql`
    update room_rounds set type = 'standard', scale = 'everyday', has_gap = false
    where dilemma_id is not null
  `.execute(db);
  await sql`
    alter table room_rounds add constraint room_rounds_dilemma_classified check (
      (dilemma_id is null) = (type is null)
      and (dilemma_id is null) = (scale is null)
      and (dilemma_id is null) = (has_gap is null)
    )
  `.execute(db);
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
  await sql`drop index dilemma_versions_by_status`.execute(db);
  await sql`
    create index dilemma_versions_by_status
      on dilemma_versions (status, has_gap, minimum_age, category)
  `.execute(db);
}
