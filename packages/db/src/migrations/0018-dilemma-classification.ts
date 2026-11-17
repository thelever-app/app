import { type Kysely, sql } from 'kysely';

// Each version says its type, whether it is compromising, its scale and whether its options keep a
// fixed order, instead of tags of the curated catalog. The versions already there take the values
// nothing had given them until now; the next load of the curated catalog gives each dilemma its own
// with a new version. The content of a version still never changes, these four included. A direct
// migration, with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table dilemma_versions
      add column type text not null default 'standard'
        constraint dilemma_versions_type
          check (type in ('standard', 'game-theory', 'would-you-rather')),
      add column compromising boolean not null default false,
      add column scale text not null default 'everyday'
        constraint dilemma_versions_scale check (scale in ('everyday', 'medium', 'extreme')),
      add column fixed_order boolean not null default false
  `.execute(db);
  await sql`
    alter table dilemma_versions
      alter column type drop default,
      alter column compromising drop default,
      alter column scale drop default,
      alter column fixed_order drop default
  `.execute(db);
  await sql`
    create or replace function dilemma_version_content_never_changes() returns trigger
    language plpgsql as $$
    begin
      if (
        new.dilemma_id, new.number, new.text, new.category, new.minimum_age,
        new.type, new.compromising, new.scale, new.fixed_order
      ) is distinct from (
        old.dilemma_id, old.number, old.text, old.category, old.minimum_age,
        old.type, old.compromising, old.scale, old.fixed_order
      ) then
        raise exception 'the content of a version of a dilemma never changes';
      end if;
      return new;
    end
    $$
  `.execute(db);
}
