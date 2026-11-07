import { describe, expect, it } from 'vitest';
import { CreateRoomUseCase } from '../../use-cases/create-room.use-case.ts';
import { RoomCodeUnavailableError } from '../../errors/room-code-unavailable.error.ts';
import { InMemoryRoomRepository } from '../../../adapters/in-memory/in-memory-room-repository.ts';
import { SequentialIdGenerator } from '../../../adapters/in-memory/sequential-id-generator.ts';
import { SequentialRandomness } from '../../../adapters/in-memory/sequential-randomness.ts';
import { NicknameMissingError } from '../../../domain/errors/nickname-missing.error.ts';
import { FixedRandomness } from '../../../domain/test/support/fixed-randomness.ts';

const ANA = {
  hostNickname: 'Ana',
  hostIdentity: 'TestAnaIdentity',
  groupNature: 'friends',
  place: 'remote',
  dilemmaLanguage: 'en',
};

describe('CreateRoomUseCase', () => {
  describe('execute', () => {
    it('should save a room hosted by a new player, with a code and the default settings', async () => {
      // Arrange
      const roomRepository = new InMemoryRoomRepository();
      const createRoom = new CreateRoomUseCase(
        roomRepository,
        new SequentialIdGenerator(),
        new SequentialRandomness(),
      );

      // Act
      const { roomId, code, hostId } = await createRoom.execute(ANA);

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.host.id).toBe(hostId);
      expect(room?.host.nickname).toBe('Ana');
      expect(room?.code).toBe(code);
      expect(room?.groupNature).toBe('friends');
      expect(room?.place).toBe('remote');
      expect(room?.settings.dilemmaLanguage).toBe('en');
      expect(room?.settings.variant).toBe('nominal');
    });

    it('should give each room a code no other open room has', async () => {
      // Arrange: the first code it draws is the one the first room already has.
      const roomRepository = new InMemoryRoomRepository();
      const idGenerator = new SequentialIdGenerator();
      const first = await new CreateRoomUseCase(
        roomRepository,
        idGenerator,
        new FixedRandomness(0, 0, 0, 0, 0),
      ).execute(ANA);

      // Act
      const second = await new CreateRoomUseCase(
        roomRepository,
        idGenerator,
        new FixedRandomness(0, 0, 0, 0, 0, 1, 1, 1, 1, 1),
      ).execute(ANA);

      // Assert
      expect(first.code).toBe('AAAAA');
      expect(second.code).toBe('BBBBB');
    });

    it('should give up if it finds no free code after several tries', async () => {
      // Arrange: a randomness that always draws AAAAA, which is taken.
      const roomRepository = new InMemoryRoomRepository();
      const idGenerator = new SequentialIdGenerator();
      await new CreateRoomUseCase(roomRepository, idGenerator, new FixedRandomness()).execute(ANA);

      // Act & Assert
      await expect(
        new CreateRoomUseCase(roomRepository, idGenerator, new FixedRandomness()).execute(ANA),
      ).rejects.toThrow(RoomCodeUnavailableError);
    });

    it('should throw an error if the nickname is missing', async () => {
      // Arrange
      const createRoom = new CreateRoomUseCase(
        new InMemoryRoomRepository(),
        new SequentialIdGenerator(),
        new SequentialRandomness(),
      );

      // Act & Assert
      await expect(createRoom.execute({ ...ANA, hostNickname: '' })).rejects.toThrow(
        NicknameMissingError,
      );
    });
  });
});
