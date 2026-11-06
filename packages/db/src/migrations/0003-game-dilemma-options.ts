import { type Kysely, sql } from 'kysely';

// Game keeps the options of each dilemma it plays in its own table, taken when the game starts,
// and stops pointing at the versions of Dilemmas: each context owns its tables (ADR 0001).
// Expand only: the revision still serving starts games without writing that table, so a trigger
// copies their options until the next migration, which drops it and moves the votes to this table.
export async function up(db: Kysely<unknown>): Promise<void> {
  // Every command on a game waits behind the migration while it waits for a lock: if another
  // transaction keeps a table long, the migration fails soon and the deploy can run it again.
  await sql`set local lock_timeout = '5s'`.execute(db);
  // Both locks at once, in the order a command that starts a game takes them (it reads the versions,
  // then inserts its dilemmas): the migration waits for that command instead of deadlocking with it.
  await sql`lock table dilemma_versions, game_dilemmas in access exclusive mode`.execute(db);
  await db.schema.alterTable('game_dilemmas').dropConstraint('game_dilemmas_version').execute();

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

  // For as long as the previous revision serves: the options of each game it starts.
  await sql`
    create function copy_game_dilemma_options() returns trigger language plpgsql
    -- With the rights of the owner of the schema: the user of the room server only gets this table
    -- once the migrate job grants it, after the migration. Its own temporary tables go last, so none
    -- of them can stand for a table of the schema.
    security definer set search_path = pg_catalog, public, pg_temp as $$
    begin
      insert into game_dilemma_options (game_id, dilemma_id, option_id, position)
      select new.game_id, new.dilemma_id, options.option_id, options.position
      from dilemma_version_options as options
      where options.dilemma_id = new.dilemma_id and options.version = new.dilemma_version
      on conflict do nothing;
      return new;
    end;
    $$
  `.execute(db);
  await sql`revoke execute on function copy_game_dilemma_options() from public`.execute(db);
  await sql`
    create trigger copy_game_dilemma_options after insert on game_dilemmas
    for each row execute function copy_game_dilemma_options()
  `.execute(db);

  await sql`
    insert into game_dilemma_options (game_id, dilemma_id, option_id, position)
    select game_dilemmas.game_id, game_dilemmas.dilemma_id, options.option_id, options.position
    from game_dilemmas
    join dilemma_version_options as options
      on options.dilemma_id = game_dilemmas.dilemma_id
     and options.version = game_dilemmas.dilemma_version
  `.execute(db);
}
