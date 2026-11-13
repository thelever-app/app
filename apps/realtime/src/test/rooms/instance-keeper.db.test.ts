import {
  ConsoleLogger,
  type Database,
  type DatabaseClient,
  inTransaction,
  PostgresInstances,
  PostgresPlayerNotifier,
  PostgresRoomRepository,
} from '@thelever-app/db';
import { useTestDatabase } from '@thelever-app/db/test';
import { AvatarVO, DisconnectConnectionsUseCase, Room } from '@thelever-app/game';
import { SequentialIdGenerator } from '@thelever-app/game/in-memory';
import { describe, expect, it } from 'vitest';
import { InstanceKeeper } from '../../rooms/instance-keeper.ts';

const database = useTestDatabase<Database>();

/** The instances, while a command saves one more connection right after the first look at them. */
class InstancesWithALateConnection extends PostgresInstances {
  #late: (() => Promise<void>) | undefined;

  constructor(db: DatabaseClient, late: () => Promise<void>) {
    super(db);
    this.#late = late;
  }

  override async connectionsOf(instanceId: string) {
    const rooms = await super.connectionsOf(instanceId);
    const late = this.#late;
    this.#late = undefined;
    await late?.();
    return rooms;
  }
}

describe('InstanceKeeper', () => {
  describe('leave', () => {
    it('should close every connection of the instance and forget it, though a command saves one more after it looked', async () => {
      // Arrange
      const db = database.db();
      const rooms = new PostgresRoomRepository(db, 'TestInstance');
      const room = Room.create(
        {
          hostNickname: 'Ana',
          hostIdentity: 'TestAna',
          hostAvatar: new AvatarVO('face-01', 'khaki'),
          groupNature: 'friends',
          place: 'together',
          dilemmaLanguage: 'es',
          code: 'K7M2Q',
          createdAt: new Date(),
        },
        new SequentialIdGenerator(),
      );
      room.connect(room.host.id, 'TestAnaConnection');
      const instances = new InstancesWithALateConnection(db, async () => {
        const saved = await rooms.findById(room.id);
        saved!.connect(saved!.host.id, 'TestLateConnection');
        await rooms.save(saved!);
      });
      const keeper = new InstanceKeeper(
        instances,
        new DisconnectConnectionsUseCase(rooms, new PostgresPlayerNotifier(db)),
        (command) => inTransaction(db, command),
        {
          instanceId: 'TestInstance',
          beatEveryMs: 60_000,
          silentAfterMs: 60_000,
          onForgotten: () => {},
          logger: new ConsoleLogger(),
        },
      );
      await keeper.start();
      await rooms.save(room);

      // Act
      await keeper.leave();

      // Assert
      expect(await db.selectFrom('room_connections').select('id').execute()).toEqual([]);
      expect(await db.selectFrom('instances').select('id').execute()).toEqual([]);
    });
  });
});
