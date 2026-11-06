import { type Kysely, sql } from 'kysely';

// Contract after 0003: every revision serving now writes the options of the games it starts, so
// the trigger that copied them from Dilemmas goes, and a vote is checked against the options Game
// keeps, not against the versions of Dilemmas. Game no longer points at any table of Dilemmas.
export async function up(db: Kysely<unknown>): Promise<void> {
  // Every command on a game waits behind the migration while it waits for a lock: if another
  // transaction keeps a table long, the migration fails soon and the deploy can run it again.
  await sql`set local lock_timeout = '5s'`.execute(db);
  // The tables of Game first, in the order a command that answers reads them, so the migration
  // waits for it instead of deadlocking. Dropping the old key then locks the options of Dilemmas,
  // which a command that starts a game reads before its dilemmas: no order fits both. Should one
  // start a game right then, PostgreSQL aborts one of the two, the command or this migration,
  // which the deploy then runs again.
  await sql`lock table game_dilemmas, game_dilemma_options, answers in access exclusive mode`.execute(
    db,
  );

  await sql`drop trigger copy_game_dilemma_options on game_dilemmas`.execute(db);
  await sql`drop function copy_game_dilemma_options()`.execute(db);

  await db.schema.alterTable('answers').dropConstraint('answers_vote').execute();
  await db.schema
    .alterTable('answers')
    .addForeignKeyConstraint(
      'answers_vote',
      ['game_id', 'dilemma_id', 'vote'],
      'game_dilemma_options',
      ['game_id', 'dilemma_id', 'option_id'],
    )
    .execute();
}
