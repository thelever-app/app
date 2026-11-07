import { type Kysely, sql } from 'kysely';

// The lobby: each room gets its code, the nature of the group, where it plays and its
// configuration; each player, an avatar; and the room keeps who was expelled, the dilemmas added
// and picked, and the game in progress. Each game copies what it plays with and the origin of each
// dilemma. A direct migration, with no expand and contract, until real players arrive.
// The lists are written here, not imported from the domain: a migration is history and must not change.
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`set local lock_timeout = '5s'`.execute(db);
  // The rooms from before the lobby have none of that, and only tests made them: they go, with
  // their games. The games first: their players point at the players of the room with no cascade.
  await sql`delete from games`.execute(db);
  await sql`delete from rooms`.execute(db);
  // The checks deferred to the commit run now: a table with checks pending cannot be altered.
  await sql`set constraints all immediate`.execute(db);

  await db.schema
    .alterTable('rooms')
    .addColumn('code', 'text', (column) => column.notNull())
    .addColumn('group_nature', 'text', (column) => column.notNull())
    .addColumn('place', 'text', (column) => column.notNull())
    .addColumn('variant', 'text', (column) => column.notNull())
    .addColumn('adults_only', 'boolean', (column) => column.notNull())
    .addColumn('dilemma_language', 'text', (column) => column.notNull())
    .addColumn('category', 'text', (column) => column.notNull())
    .addColumn('dilemma_count', 'smallint', (column) => column.notNull())
    .addColumn('total_time_in_minutes', 'smallint', (column) => column.notNull())
    .addColumn('new_dilemmas', 'boolean', (column) => column.notNull())
    .addColumn('players_can_add_dilemmas', 'boolean', (column) => column.notNull())
    .addColumn('current_game_id', 'text')
    .execute();
  // Among the open rooms: a room is deleted after 24 hours and its code can come back.
  await db.schema.alterTable('rooms').addUniqueConstraint('rooms_code', ['code']).execute();
  await sql`
    alter table rooms
      add constraint rooms_code_format check (code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$'),
      add constraint rooms_group_nature check (group_nature in ('family', 'friends', 'work', 'mixed')),
      add constraint rooms_place check (place in ('together', 'remote')),
      add constraint rooms_variant check (variant in ('nominal', 'anonymous')),
      add constraint rooms_dilemma_language check (dilemma_language in ('es', 'en', 'fr', 'de', 'it', 'pt', 'ca')),
      add constraint rooms_dilemma_count check (dilemma_count in (6, 8, 10, 12)),
      add constraint rooms_total_time check (total_time_in_minutes in (4, 6, 8, 10))
  `.execute(db);

  // The game in progress is a game of that same room. Checked at the commit, since a command
  // that starts a game saves the room and the game in the same transaction.
  await db.schema
    .alterTable('games')
    .addUniqueConstraint('games_room_and_id', ['room_id', 'id'])
    .execute();
  await db.schema
    .alterTable('rooms')
    .addForeignKeyConstraint(
      'rooms_current_game',
      ['id', 'current_game_id'],
      'games',
      ['room_id', 'id'],
      (constraint) => constraint.deferrable().initiallyDeferred(),
    )
    .execute();

  await db.schema
    .alterTable('room_players')
    .addColumn('avatar_face', 'text', (column) => column.notNull())
    .addColumn('avatar_color', 'text', (column) => column.notNull())
    .execute();
  // Checked at the commit, so a command may give out the avatars of the room in any order.
  await sql`
    alter table room_players
      add constraint room_players_avatar unique (room_id, avatar_face, avatar_color) deferrable initially deferred,
      add constraint room_players_avatar_face check (avatar_face ~ '^face-(0[1-9]|1[0-2])$'),
      add constraint room_players_avatar_color check (avatar_color in ('khaki', 'teal', 'brown', 'slate', 'cyan', 'rust', 'olive', 'stone'))
  `.execute(db);

  await db.schema
    .createTable('room_expelled_identities')
    .addColumn('room_id', 'text', (column) =>
      column.notNull().references('rooms.id').onDelete('cascade'),
    )
    .addColumn('identity', 'text', (column) => column.notNull())
    .addPrimaryKeyConstraint('room_expelled_identities_pkey', ['room_id', 'identity'])
    .execute();
  // To find everything of a player when their data has to be deleted.
  await db.schema
    .createIndex('room_expelled_identities_by_identity')
    .on('room_expelled_identities')
    .column('identity')
    .execute();

  // One dilemma per player; it goes with the player who added it.
  await db.schema
    .createTable('room_added_dilemmas')
    .addColumn('room_id', 'text', (column) => column.notNull())
    .addColumn('player_id', 'text', (column) => column.notNull())
    .addColumn('position', 'smallint', (column) => column.notNull())
    .addColumn('dilemma_id', 'text', (column) => column.notNull())
    .addColumn('minimum_age', 'smallint', (column) => column.notNull())
    .addPrimaryKeyConstraint('room_added_dilemmas_pkey', ['room_id', 'dilemma_id'])
    .addUniqueConstraint('room_added_dilemmas_player', ['room_id', 'player_id'])
    .addUniqueConstraint('room_added_dilemmas_position', ['room_id', 'position'])
    .addForeignKeyConstraint(
      'room_added_dilemmas_player_in_room',
      ['room_id', 'player_id'],
      'room_players',
      ['room_id', 'id'],
      (constraint) => constraint.onDelete('cascade'),
    )
    .addCheckConstraint('room_added_dilemmas_minimum_age', sql`minimum_age in (16, 18)`)
    .execute();

  await db.schema
    .createTable('room_picked_dilemmas')
    .addColumn('room_id', 'text', (column) =>
      column.notNull().references('rooms.id').onDelete('cascade'),
    )
    .addColumn('position', 'smallint', (column) => column.notNull())
    .addColumn('dilemma_id', 'text', (column) => column.notNull())
    .addColumn('minimum_age', 'smallint', (column) => column.notNull())
    .addPrimaryKeyConstraint('room_picked_dilemmas_pkey', ['room_id', 'position'])
    .addUniqueConstraint('room_picked_dilemmas_dilemma', ['room_id', 'dilemma_id'])
    .addCheckConstraint('room_picked_dilemmas_minimum_age', sql`minimum_age in (16, 18)`)
    .execute();

  await db.schema
    .alterTable('games')
    .addColumn('variant', 'text', (column) => column.notNull())
    .addColumn('group_nature', 'text', (column) => column.notNull())
    .addColumn('place', 'text', (column) => column.notNull())
    .addColumn('dilemma_language', 'text', (column) => column.notNull())
    .addColumn('total_time_in_minutes', 'smallint', (column) => column.notNull())
    .execute();
  await sql`
    alter table games
      add constraint games_variant check (variant in ('nominal', 'anonymous')),
      add constraint games_group_nature check (group_nature in ('family', 'friends', 'work', 'mixed')),
      add constraint games_place check (place in ('together', 'remote')),
      add constraint games_dilemma_language check (dilemma_language in ('es', 'en', 'fr', 'de', 'it', 'pt', 'ca')),
      add constraint games_total_time check (total_time_in_minutes in (4, 6, 8, 10))
  `.execute(db);

  await db.schema
    .alterTable('game_dilemmas')
    .addColumn('origin', 'text', (column) => column.notNull())
    .execute();
  await sql`
    alter table game_dilemmas add constraint game_dilemmas_origin
      check (origin in ('added-by-a-player', 'picked-by-the-host', 'picked-by-the-system'))
  `.execute(db);
}
