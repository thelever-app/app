import { type Kysely, sql } from 'kysely';

// Game keeps the options of each dilemma it plays in its own table, taken when the game starts,
// and stops pointing at the versions of Dilemmas: each context owns its tables (ADR 0001).
// Expand only: the revision still serving reads the options of Dilemmas and keeps working; the
// votes move to this table in the next migration, once no revision reads the old way.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('game_dilemma_options')
    .addColumn('game_id', 'text', (column) => column.notNull())
    .addColumn('dilemma_id', 'text', (column) => column.notNull())
    .addColumn('option_id', 'text', (column) => column.notNull())
    .addColumn('position', 'smallint', (column) => column.notNull())
    .addPrimaryKeyConstraint('game_dilemma_options_pkey', ['game_id', 'dilemma_id', 'option_id'])
    .addUniqueConstraint('game_dilemma_options_position', ['game_id', 'dilemma_id', 'position'])
    .addForeignKeyConstraint(
      'game_dilemma_options_dilemma',
      ['game_id', 'dilemma_id'],
      'game_dilemmas',
      ['game_id', 'dilemma_id'],
      (constraint) => constraint.onDelete('cascade'),
    )
    .execute();

  await sql`
    insert into game_dilemma_options (game_id, dilemma_id, option_id, position)
    select game_dilemmas.game_id, game_dilemmas.dilemma_id, options.option_id, options.position
    from game_dilemmas
    join dilemma_version_options as options
      on options.dilemma_id = game_dilemmas.dilemma_id
     and options.version = game_dilemmas.dilemma_version
  `.execute(db);

  await db.schema.alterTable('game_dilemmas').dropConstraint('game_dilemmas_version').execute();
}
