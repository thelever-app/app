import { type Kysely, sql } from 'kysely';

// Each translation is a dilemma of its own: it points to its original, and each of its versions
// to the version of the original it translates. The name and the arguments are for the public
// web: they change without a new version, so they are not part of what never changes. A direct
// migration, with no expand and contract, until real players arrive.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  await sql`
    alter table dilemmas
      add column name text,
      add column translation_of text references dilemmas (id)
  `.execute(db);
  await sql`create index dilemmas_translation_of on dilemmas (translation_of, language)`.execute(
    db,
  );

  await sql`
    alter table dilemma_versions
      add column translation_of_version integer,
      add column translation text,
      add constraint dilemma_versions_translation check (translation in ('automatic', 'reviewed')),
      add constraint dilemma_versions_translation_of_version
        check ((translation_of_version is null) = (translation is null))
  `.execute(db);

  await db.schema
    .createTable('dilemma_version_arguments')
    .addColumn('dilemma_id', 'text', (column) => column.notNull())
    .addColumn('version', 'integer', (column) => column.notNull())
    .addColumn('context', 'text')
    .addPrimaryKeyConstraint('dilemma_version_arguments_pkey', ['dilemma_id', 'version'])
    .addForeignKeyConstraint(
      'dilemma_version_arguments_version',
      ['dilemma_id', 'version'],
      'dilemma_versions',
      ['dilemma_id', 'number'],
      (constraint) => constraint.onDelete('cascade'),
    )
    .execute();

  await db.schema
    .createTable('dilemma_version_option_arguments')
    .addColumn('dilemma_id', 'text', (column) => column.notNull())
    .addColumn('version', 'integer', (column) => column.notNull())
    .addColumn('option_id', 'text', (column) => column.notNull())
    .addColumn('argument_for', 'text', (column) => column.notNull())
    .addColumn('argument_against', 'text', (column) => column.notNull())
    .addPrimaryKeyConstraint('dilemma_version_option_arguments_pkey', [
      'dilemma_id',
      'version',
      'option_id',
    ])
    .addForeignKeyConstraint(
      'dilemma_version_option_arguments_arguments',
      ['dilemma_id', 'version'],
      'dilemma_version_arguments',
      ['dilemma_id', 'version'],
      (constraint) => constraint.onDelete('cascade'),
    )
    .addForeignKeyConstraint(
      'dilemma_version_option_arguments_option',
      ['dilemma_id', 'version', 'option_id'],
      'dilemma_version_options',
      ['dilemma_id', 'version', 'option_id'],
      (constraint) => constraint.onDelete('cascade'),
    )
    .execute();
}
