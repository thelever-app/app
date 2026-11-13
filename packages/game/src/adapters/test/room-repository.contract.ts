import { describe, expect, it } from 'vitest';
import type { RoomRepository } from '../../application/ports/room-repository.port.ts';
import { Room, type RoomSnapshot } from '../../domain/entities/room.ts';
import { FixedIdGenerator } from '../../domain/test/support/fixed-id-generator.ts';
import { FixedRandomness } from '../../domain/test/support/fixed-randomness.ts';
import { AvatarVO } from '../../domain/vos/avatar.vo.ts';

/** When everything in these tests happens, unless a test says otherwise. */
const NOW = new Date('2026-11-12T10:00:00Z');

function room(id = 'TestRoomId', hostId = 'TestAnaId', code = 'K7M2Q'): Room {
  return Room.create(
    {
      hostNickname: 'Ana',
      hostIdentity: 'TestAnaIdentity',
      hostAvatar: new AvatarVO('face-01', 'khaki'),
      groupNature: 'friends',
      place: 'together',
      dilemmaLanguage: 'es',
      code,
      createdAt: NOW,
    },
    new FixedIdGenerator(id, hostId),
  );
}

/** A new player joins with the next free avatar. */
function join(saved: Room, name: string): void {
  saved.join(
    {
      nickname: name,
      identity: `Test${name}Identity`,
      avatar: saved.suggestAvatar(new FixedRandomness()),
    },
    new FixedIdGenerator(`Test${name}Id`),
    NOW,
  );
}

/** The order of the players matters, since it decides who takes over as host; that of the connections does not. */
function comparable(snapshot: RoomSnapshot | undefined) {
  return (
    snapshot && {
      ...snapshot,
      connections: [...snapshot.connections].sort((a, b) =>
        a.connectionId.localeCompare(b.connectionId),
      ),
    }
  );
}

/**
 * What every RoomRepository must do, in memory or in PostgreSQL (ADR 0002).
 * `create` returns a repository with no rooms.
 */
export function describeRoomRepositoryContract(
  name: string,
  create: () => Promise<RoomRepository>,
): void {
  describe(`${name} (RoomRepository contract)`, () => {
    describe('findById', () => {
      it('should find a saved room as it was saved, with its players in the order they joined', async () => {
        // Arrange
        const repository = await create();
        const saved = room();
        join(saved, 'Luis');
        join(saved, 'Eva');
        saved.connect('TestAnaId', 'TestAnaConnection1', NOW);
        saved.connect('TestAnaId', 'TestAnaConnection2', NOW);
        saved.connect('TestEvaId', 'TestEvaConnection', NOW);
        await repository.save(saved);

        // Act
        const found = await repository.findById('TestRoomId');

        // Assert
        expect(comparable(found?.toSnapshot())).toEqual(comparable(saved.toSnapshot()));
        expect(found?.players.map(({ id }) => id)).toEqual([
          'TestAnaId',
          'TestLuisId',
          'TestEvaId',
        ]);
      });

      it('should return undefined if the room does not exist', async () => {
        // Arrange
        const repository = await create();

        // Act
        const found = await repository.findById('TestUnknownId');

        // Assert
        expect(found).toBeUndefined();
      });

      it('should not see changes that were not saved', async () => {
        // Arrange
        const repository = await create();
        const saved = room();
        await repository.save(saved);

        // Act
        join(saved, 'Luis');
        saved.connect('TestLuisId', 'TestLuisConnection', NOW);

        // Assert
        const found = await repository.findById('TestRoomId');
        expect(found?.players).toHaveLength(1);
        expect(found?.toSnapshot().connections).toEqual([]);
      });
    });

    describe('findByCode', () => {
      it('should find the room with that code, typed in any case', async () => {
        // Arrange
        const repository = await create();
        await repository.save(room('TestRoomId', 'TestAnaId', 'K7M2Q'));
        await repository.save(room('TestOtherRoomId', 'TestOtherAnaId', 'P3X8W'));

        // Act
        const found = await repository.findByCode('p3x8w');

        // Assert
        expect(found?.id).toBe('TestOtherRoomId');
      });

      it('should return undefined if no room has that code', async () => {
        // Arrange
        const repository = await create();
        await repository.save(room());

        // Act
        const found = await repository.findByCode('ZZZZZ');

        // Assert
        expect(found).toBeUndefined();
      });
    });

    describe('findIdsWithNobodyConnected', () => {
      it('should give the rooms with no connection open, whether anyone ever connected or not', async () => {
        // Arrange
        const repository = await create();
        const neverConnected = room('TestNeverRoomId', 'TestNeverAnaId', 'K7M2Q');
        const connected = room('TestConnectedRoomId', 'TestConnectedAnaId', 'P3X8W');
        connected.connect('TestConnectedAnaId', 'TestConnectedAnaConnection', NOW);
        const disconnected = room('TestDisconnectedRoomId', 'TestDisconnectedAnaId', 'H4N9R');
        disconnected.connect('TestDisconnectedAnaId', 'TestDisconnectedAnaConnection', NOW);
        disconnected.disconnect('TestDisconnectedAnaId', 'TestDisconnectedAnaConnection', NOW);
        for (const saved of [neverConnected, connected, disconnected]) await repository.save(saved);

        // Act
        const found = await repository.findIdsWithNobodyConnected();

        // Assert
        expect([...found].sort()).toEqual(['TestDisconnectedRoomId', 'TestNeverRoomId']);
      });
    });

    describe('delete', () => {
      it('should delete the room as it was read, with its code, and say so', async () => {
        // Arrange
        const repository = await create();
        const saved = room();
        join(saved, 'Luis');
        await repository.save(saved);
        const read = await repository.findById('TestRoomId');

        // Act
        const deleted = await repository.delete(read!);

        // Assert
        expect(deleted).toBe(true);
        expect(await repository.findById('TestRoomId')).toBeUndefined();
        expect(await repository.findByCode('K7M2Q')).toBeUndefined();
      });

      it('should keep a room that changed since it was read, and say so', async () => {
        // Arrange
        const repository = await create();
        await repository.save(room());
        const read = await repository.findById('TestRoomId');
        const meanwhile = await repository.findById('TestRoomId');
        meanwhile!.connect('TestAnaId', 'TestAnaConnection', NOW);
        await repository.save(meanwhile!);

        // Act
        const deleted = await repository.delete(read!);

        // Assert
        expect(deleted).toBe(false);
        expect(await repository.findById('TestRoomId')).toBeDefined();
      });
    });

    describe('save', () => {
      it('should keep everything about the lobby: settings, avatars, dilemmas and who was expelled', async () => {
        // Arrange
        const repository = await create();
        const saved = room();
        join(saved, 'Luis');
        join(saved, 'Marta');
        join(saved, 'Pablo');
        saved.changeAvatar('TestLuisId', new AvatarVO('face-12', 'teal'));
        saved.changeSettings('TestAnaId', {
          variant: 'anonymous',
          adultsOnly: true,
          dilemmaLanguage: 'ca',
          categories: ['honesty', 'loyalty'],
          dilemmaCount: 12,
          timePerDilemmaSeconds: 60,
          newDilemmas: false,
          dilemmasPerPlayer: 2,
        });
        saved.addDilemma('TestLuisId', { dilemmaId: 'TestAddedDilemma', minimumAge: 18 });
        saved.addDilemma('TestLuisId', { dilemmaId: 'TestOtherAddedDilemma', minimumAge: 16 });
        saved.pickDilemmas('TestAnaId', [
          { dilemmaId: 'TestPickedDilemma1', minimumAge: 16 },
          { dilemmaId: 'TestPickedDilemma2', minimumAge: 18 },
        ]);
        saved.expel('TestAnaId', 'TestPabloId');

        // Act
        await repository.save(saved);

        // Assert
        const found = await repository.findById('TestRoomId');
        expect(comparable(found?.toSnapshot())).toEqual(comparable(saved.toSnapshot()));
      });

      it('should keep two players with the same avatar and different nicknames', async () => {
        // Arrange
        const repository = await create();
        const saved = room();
        saved.join(
          { nickname: 'Luis', identity: 'TestLuisIdentity', avatar: saved.host.avatar },
          new FixedIdGenerator('TestLuisId'),
          NOW,
        );

        // Act
        await repository.save(saved);

        // Assert
        const found = await repository.findById('TestRoomId');
        const [ana, luis] = found?.players ?? [];
        expect(luis?.avatar.equals(ana!.avatar)).toBe(true);
      });

      it('should keep only the last save of a room', async () => {
        // Arrange
        const repository = await create();
        const saved = room();
        await repository.save(saved);
        join(saved, 'Luis');
        saved.connect('TestLuisId', 'TestLuisConnection', NOW);

        // Act
        await repository.save(saved);

        // Assert
        const found = await repository.findById('TestRoomId');
        expect(comparable(found?.toSnapshot())).toEqual(comparable(saved.toSnapshot()));
        expect(found?.version).toBe(saved.version);
      });

      it('should forget the connections closed before saving again', async () => {
        // Arrange
        const repository = await create();
        const saved = room();
        join(saved, 'Luis');
        saved.connect('TestAnaId', 'TestAnaConnection1', NOW);
        saved.connect('TestAnaId', 'TestAnaConnection2', NOW);
        saved.connect('TestLuisId', 'TestLuisConnection', NOW);
        await repository.save(saved);
        saved.disconnect('TestAnaId', 'TestAnaConnection1', NOW);
        saved.disconnect('TestLuisId', 'TestLuisConnection', NOW);

        // Act
        await repository.save(saved);

        // Assert
        const found = await repository.findById('TestRoomId');
        expect(found?.toSnapshot().connections).toEqual([
          { playerId: 'TestAnaId', connectionId: 'TestAnaConnection2' },
        ]);
        expect(found?.isConnected('TestLuisId')).toBe(false);
      });
    });
  });
}
