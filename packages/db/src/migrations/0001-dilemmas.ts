import { type Kysely, sql } from 'kysely';

// The lists are written here, not imported from the domain: a migration is history and must not change.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('dilemmas')
    .addColumn('id', 'text', (column) => column.primaryKey())
    .addColumn('language', 'text', (column) => column.notNull())
    .addColumn('creator_type', 'text', (column) => column.notNull())
    .addColumn('creator_identity', 'text')
    .addColumn('visibility', 'text', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addCheckConstraint(
      'dilemmas_creator_type',
      sql`creator_type in ('curation-team', 'player', 'unlinked-player')`,
    )
    .addCheckConstraint(
      'dilemmas_creator_identity',
      sql`(creator_type = 'player') = (creator_identity is not null)`,
    )
    .addCheckConstraint('dilemmas_visibility', sql`visibility in ('private', 'public')`)
    .execute();

  await db.schema
    .createTable('dilemma_versions')
    .addColumn('dilemma_id', 'text', (column) => column.notNull().references('dilemmas.id'))
    .addColumn('number', 'integer', (column) => column.notNull())
    .addColumn('text', 'text', (column) => column.notNull())
    .addColumn('category', 'text', (column) => column.notNull())
    .addColumn('minimum_age', 'smallint', (column) => column.notNull())
    .addColumn('status', 'text', (column) => column.notNull())
    .addPrimaryKeyConstraint('dilemma_versions_pkey', ['dilemma_id', 'number'])
    .addCheckConstraint('dilemma_versions_number', sql`number >= 1`)
    .addCheckConstraint(
      'dilemma_versions_category',
      sql`category in ('life-and-death', 'honesty', 'loyalty', 'justice', 'love-and-relationships', 'work-and-money', 'technology-and-the-future')`,
    )
    .addCheckConstraint('dilemma_versions_minimum_age', sql`minimum_age in (16, 18)`)
    .addCheckConstraint(
      'dilemma_versions_status',
      sql`status in ('in-review', 'rejected', 'approved', 'in-exploration', 'in-catalog', 'out-of-exploration', 'hidden-by-reports', 'withdrawn')`,
    )
    .execute();

  await db.schema
    .createTable('dilemma_version_options')
    .addColumn('dilemma_id', 'text', (column) => column.notNull())
    .addColumn('version', 'integer', (column) => column.notNull())
    .addColumn('position', 'smallint', (column) => column.notNull())
    .addColumn('option_id', 'text', (column) => column.notNull())
    .addColumn('text', 'text', (column) => column.notNull())
    .addPrimaryKeyConstraint('dilemma_version_options_pkey', ['dilemma_id', 'version', 'position'])
    .addUniqueConstraint('dilemma_version_options_option', ['dilemma_id', 'version', 'option_id'])
    .addForeignKeyConstraint(
      'dilemma_version_options_version',
      ['dilemma_id', 'version'],
      'dilemma_versions',
      ['dilemma_id', 'number'],
      (constraint) => constraint.onDelete('cascade'),
    )
    .execute();

  await db.schema
    .createTable('dilemma_version_tags')
    .addColumn('dilemma_id', 'text', (column) => column.notNull())
    .addColumn('version', 'integer', (column) => column.notNull())
    .addColumn('position', 'smallint', (column) => column.notNull())
    .addColumn('tag', 'text', (column) => column.notNull())
    .addPrimaryKeyConstraint('dilemma_version_tags_pkey', ['dilemma_id', 'version', 'position'])
    .addUniqueConstraint('dilemma_version_tags_tag', ['dilemma_id', 'version', 'tag'])
    .addForeignKeyConstraint(
      'dilemma_version_tags_version',
      ['dilemma_id', 'version'],
      'dilemma_versions',
      ['dilemma_id', 'number'],
      (constraint) => constraint.onDelete('cascade'),
    )
    .execute();

  // Answers point to the exact version played, so what a player read never changes: only its status does.
  await sql`
    create function dilemma_version_content_never_changes() returns trigger language plpgsql as $$
    begin
      if (new.dilemma_id, new.number, new.text, new.category, new.minimum_age)
        is distinct from (old.dilemma_id, old.number, old.text, old.category, old.minimum_age) then
        raise exception 'the content of a version of a dilemma never changes';
      end if;
      return new;
    end
    $$
  `.execute(db);
  await sql`
    create trigger dilemma_versions_content_never_changes before update on dilemma_versions
    for each row execute function dilemma_version_content_never_changes()
  `.execute(db);
  await sql`
    create function dilemma_version_rows_never_change() returns trigger language plpgsql as $$
    begin
      raise exception 'the options and tags of a version of a dilemma never change';
    end
    $$
  `.execute(db);
  for (const table of ['dilemma_version_options', 'dilemma_version_tags']) {
    await sql`
      create trigger ${sql.id(`${table}_never_change`)} before update on ${sql.table(table)}
      for each row execute function dilemma_version_rows_never_change()
    `.execute(db);
  }
}
