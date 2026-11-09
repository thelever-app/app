import { describe, expect, it } from 'vitest';
import type { RoomRepository } from '../../application/ports/room-repository.port.ts';
import { Room, type RoomSnapshot } from '../../domain/entities/room.ts';
import { FixedIdGenerator } from '../../domain/test/support/fixed-id-generator.ts';
import { FixedRandomness } from '../../domain/test/support/fixed-randomness.ts';
import { AvatarVO } from '../../domain/vos/avatar.vo.ts';

function room(id = 'TestRoomId', hostId = 'TestAnaId', code = 'K7M2Q'): Room {
  return Room.create(
    {
      hostNickname: 'Ana',
      hostIdentity: 'TestAnaIdentity',
      groupNature: 'friends',
      place: 'together',
      dilemmaLanguage: 'es',
      code,
    },
    new FixedIdGenerator(id, hostId),
    new FixedRandomness(),
  );
}

/** A new player joins with the next free avatar. */
function join(saved: Room, name: string): void {
  saved.join(
    { nickname: name, identity: `Test${name}Identity` },
    new FixedIdGenerator(`Test${name}Id`),
    new FixedRandomness(),
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
        saved.connect('TestAnaId', 'TestAnaConnection1');
        saved.connect('TestAnaId', 'TestAnaConnection2');
        saved.connect('TestEvaId', 'TestEvaConnection');
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
        saved.connect('TestLuisId', 'TestLuisConnection');

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

      it('should keep only the last save of a room', async () => {
        // Arrange
        const repository = await create();
        const saved = room();
        await repository.save(saved);
        join(saved, 'Luis');
        saved.connect('TestLuisId', 'TestLuisConnection');

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
        saved.connect('TestAnaId', 'TestAnaConnection1');
        saved.connect('TestAnaId', 'TestAnaConnection2');
        saved.connect('TestLuisId', 'TestLuisConnection');
        await repository.save(saved);
        saved.disconnect('TestAnaId', 'TestAnaConnection1');
        saved.disconnect('TestLuisId', 'TestLuisConnection');

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
