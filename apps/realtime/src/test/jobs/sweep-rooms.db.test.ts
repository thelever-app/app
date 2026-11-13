import {
  ConsoleLogger,
  type Database,
  inTransaction,
  PostgresGameRepository,
  PostgresInstances,
  PostgresPlayerNotifier,
  PostgresRoomRepository,
} from '@thelever-app/db';
import { emptyTables, useTestDatabase } from '@thelever-app/db/test';
import {
  AvatarVO,
  DeleteClosedRoomsUseCase,
  DisconnectConnectionsUseCase,
  Room,
} from '@thelever-app/game';
import { ManualClock, SequentialIdGenerator } from '@thelever-app/game/in-memory';
import { beforeEach, describe, expect, it } from 'vitest';
import { sweepRooms } from '../../jobs/sweep-rooms.ts';
import { SILENT_AFTER_MS } from '../../rooms/silent-instances.ts';

const database = useTestDatabase<Database>();
const ids = new SequentialIdGenerator();

/** A room hosted by Ana, created at that moment, with that code. */
function roomOf(code: string, createdAt: Date): Room {
  return Room.create(
    {
      hostNickname: 'Ana',
      hostIdentity: `TestAna${code}Identity`,
      hostAvatar: new AvatarVO('face-01', 'khaki'),
      groupNature: 'friends',
      place: 'together',
      dilemmaLanguage: 'es',
      code,
      createdAt,
    },
    ids,
  );
}

/** The instance gave its last sign that many seconds ago. */
async function lastSeenAgo(id: string, seconds: number): Promise<void> {
  await database
    .db()
    .updateTable('instances')
    .set({ seen_at: new Date(Date.now() - seconds * 1000) })
    .where('id', '=', id)
    .execute();
}

/** Saves the room with its host connected through that instance. */
async function connectedThrough(instanceId: string, room: Room): Promise<void> {
  room.connect(room.host.id, `${instanceId}Connection${room.code}`);
  await new PostgresRoomRepository(database.db(), instanceId).save(room);
}

async function sweep(): Promise<readonly string[]> {
  const db = database.db();
  const rooms = new PostgresRoomRepository(db, 'TestJob');
  const { deletedRoomIds } = await sweepRooms({
    instances: new PostgresInstances(db),
    disconnectConnections: new DisconnectConnectionsUseCase(rooms, new PostgresPlayerNotifier(db)),
    runCommand: (command) => inTransaction(db, command),
    deleteClosedRooms: new DeleteClosedRoomsUseCase(
      rooms,
      new PostgresGameRepository(db),
      new ManualClock(new Date()),
    ),
    silentAfterMs: SILENT_AFTER_MS,
    logger: new ConsoleLogger(),
  });
  return deletedRoomIds;
}

async function roomIds(): Promise<string[]> {
  const rows = await database.db().selectFrom('rooms').select('id').orderBy('id').execute();
  return rows.map(({ id }) => id);
}

describe('sweepRooms', () => {
  beforeEach(async () => {
    await emptyTables(database.db());
  });

  it('should delete a room whose only player was connected through an instance that died long ago', async () => {
    // Arrange
    const instances = new PostgresInstances(database.db());
    await instances.beat('TestDeadInstance');
    const room = roomOf('K7M2Q', new Date());
    await connectedThrough('TestDeadInstance', room);
    await lastSeenAgo('TestDeadInstance', 2 * 60 * 60);

    // Act
    const deleted = await sweep();

    // Assert
    expect(deleted).toEqual([room.id]);
    expect(await roomIds()).toEqual([]);
    expect(await database.db().selectFrom('instances').select('id').execute()).toEqual([]);
  });

  it('should count the 15 minutes from when a dead instance was last seen, not from the sweep', async () => {
    // Arrange
    const instances = new PostgresInstances(database.db());
    await instances.beat('TestDeadInstance');
    const room = roomOf('K7M2Q', new Date());
    await connectedThrough('TestDeadInstance', room);
    await lastSeenAgo('TestDeadInstance', 10 * 60);

    // Act
    const deleted = await sweep();

    // Assert
    expect(deleted).toEqual([]);
    expect(await roomIds()).toEqual([room.id]);
    const connections = await database.db().selectFrom('room_connections').select('id').execute();
    expect(connections).toEqual([]);
  });

  it('should keep the rooms with a player connected through a live instance, and the new ones', async () => {
    // Arrange
    const instances = new PostgresInstances(database.db());
    await instances.beat('TestLiveInstance');
    const connected = roomOf('K7M2Q', new Date(Date.now() - 60 * 60_000));
    await connectedThrough('TestLiveInstance', connected);
    const created = roomOf('P3X8W', new Date());
    await new PostgresRoomRepository(database.db(), 'TestLiveInstance').save(created);

    // Act
    const deleted = await sweep();

    // Assert
    expect(deleted).toEqual([]);
    expect(await roomIds()).toEqual([connected.id, created.id].sort());
  });
});
