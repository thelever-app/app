import { type Kysely, sql } from 'kysely';

// Everything of a room hangs from it in cascade, so the deletion after 24 hours is deleting the room.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('rooms')
    .addColumn('id', 'text', (column) => column.primaryKey())
    .addColumn('host_player_id', 'text', (column) => column.notNull())
    .addColumn('version', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('room_players')
    .addColumn('id', 'text', (column) => column.primaryKey())
    .addColumn('room_id', 'text', (column) =>
      column.notNull().references('rooms.id').onDelete('cascade'),
    )
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('nickname', 'text', (column) => column.notNull())
    .addColumn('identity', 'text', (column) => column.notNull())
    .addUniqueConstraint('room_players_room_and_id', ['room_id', 'id'])
    .addUniqueConstraint('room_players_position', ['room_id', 'position'])
    .addUniqueConstraint('room_players_identity', ['room_id', 'identity'])
    .execute();
  // To find everything of a player when their data has to be deleted.
  await db.schema
    .createIndex('room_players_by_identity')
    .on('room_players')
    .column('identity')
    .execute();

  // Checked at the commit, since a room and its host are inserted in the same transaction.
  await db.schema
    .alterTable('rooms')
    .addForeignKeyConstraint(
      'rooms_host',
      ['id', 'host_player_id'],
      'room_players',
      ['room_id', 'id'],
      (constraint) => constraint.deferrable().initiallyDeferred(),
    )
    .execute();

  await db.schema
    .createTable('instances')
    .addColumn('id', 'text', (column) => column.primaryKey())
    .addColumn('seen_at', 'timestamptz', (column) => column.notNull())
    .execute();

  // No cascade from instances: an instance is deleted only once its connections are closed.
  await db.schema
    .createTable('room_connections')
    .addColumn('id', 'text', (column) => column.primaryKey())
    .addColumn('player_id', 'text', (column) =>
      column.notNull().references('room_players.id').onDelete('cascade'),
    )
    .addColumn('instance_id', 'text', (column) => column.notNull().references('instances.id'))
    .execute();
  // PostgreSQL indexes no foreign key by itself: without these, each cascade and each check of a
  // deleted row would read the whole table.
  await db.schema
    .createIndex('room_connections_by_instance')
    .on('room_connections')
    .column('instance_id')
    .execute();
  await db.schema
    .createIndex('room_connections_by_player')
    .on('room_connections')
    .column('player_id')
    .execute();

  await db.schema
    .createTable('games')
    .addColumn('id', 'text', (column) => column.primaryKey())
    .addColumn('room_id', 'text', (column) =>
      column.notNull().references('rooms.id').onDelete('cascade'),
    )
    .addColumn('in_decision_phase', 'boolean', (column) => column.notNull())
    .addColumn('version', 'integer', (column) => column.notNull())
    .execute();
  await db.schema.createIndex('games_by_room').on('games').column('room_id').execute();

  await db.schema
    .createTable('game_dilemmas')
    .addColumn('game_id', 'text', (column) =>
      column.notNull().references('games.id').onDelete('cascade'),
    )
    .addColumn('position', 'smallint', (column) => column.notNull())
    .addColumn('dilemma_id', 'text', (column) => column.notNull())
    .addColumn('dilemma_version', 'integer', (column) => column.notNull())
    .addPrimaryKeyConstraint('game_dilemmas_pkey', ['game_id', 'position'])
    .addUniqueConstraint('game_dilemmas_dilemma', ['game_id', 'dilemma_id'])
    .addUniqueConstraint('game_dilemmas_dilemma_version', [
      'game_id',
      'dilemma_id',
      'dilemma_version',
    ])
    .addForeignKeyConstraint(
      'game_dilemmas_version',
      ['dilemma_id', 'dilemma_version'],
      'dilemma_versions',
      ['dilemma_id', 'number'],
    )
    .execute();

  await db.schema
    .createTable('game_players')
    .addColumn('game_id', 'text', (column) =>
      column.notNull().references('games.id').onDelete('cascade'),
    )
    .addColumn('player_id', 'text', (column) => column.notNull().references('room_players.id'))
    .addColumn('position', 'integer', (column) => column.notNull())
    .addPrimaryKeyConstraint('game_players_pkey', ['game_id', 'player_id'])
    .addUniqueConstraint('game_players_position', ['game_id', 'position'])
    .execute();
  await db.schema
    .createIndex('game_players_by_player')
    .on('game_players')
    .column('player_id')
    .execute();

  await db.schema
    .createTable('answers')
    .addColumn('game_id', 'text', (column) => column.notNull())
    .addColumn('player_id', 'text', (column) => column.notNull())
    .addColumn('dilemma_id', 'text', (column) => column.notNull())
    .addColumn('dilemma_version', 'integer', (column) => column.notNull())
    .addColumn('vote', 'text', (column) => column.notNull())
    .addColumn('game_consent_version', 'text', (column) => column.notNull())
    .addColumn('research_consent_version', 'text')
    .addColumn('commercial_licence_consent_version', 'text')
    .addColumn('under_eighteen', 'boolean', (column) => column.notNull())
    .addColumn('voter_in_the_gap', 'boolean', (column) => column.notNull())
    .addPrimaryKeyConstraint('answers_pkey', ['game_id', 'player_id', 'dilemma_id'])
    .addForeignKeyConstraint(
      'answers_player',
      ['game_id', 'player_id'],
      'game_players',
      ['game_id', 'player_id'],
      (constraint) => constraint.onDelete('cascade'),
    )
    .addForeignKeyConstraint(
      'answers_dilemma',
      ['game_id', 'dilemma_id', 'dilemma_version'],
      'game_dilemmas',
      ['game_id', 'dilemma_id', 'dilemma_version'],
      (constraint) => constraint.onDelete('cascade'),
    )
    .addForeignKeyConstraint(
      'answers_vote',
      ['dilemma_id', 'dilemma_version', 'vote'],
      'dilemma_version_options',
      ['dilemma_id', 'version', 'option_id'],
    )
    .execute();
}
