import { InMemorySealProvider } from '../../../adapters/in-memory/in-memory-seal-provider.ts';
import { describe, expect, it } from 'vitest';
import { CreateRoomUseCase } from '../../use-cases/create-room.use-case.ts';
import { RoomCodeUnavailableError } from '../../errors/room-code-unavailable.error.ts';
import { InMemoryRoomRepository } from '../../../adapters/in-memory/in-memory-room-repository.ts';
import { ManualClock } from '../../../adapters/in-memory/manual-clock.ts';
import { SequentialIdGenerator } from '../../../adapters/in-memory/sequential-id-generator.ts';
import { SequentialRandomness } from '../../../adapters/in-memory/sequential-randomness.ts';
import { InvalidAvatarError } from '../../../domain/errors/invalid-avatar.error.ts';
import { NicknameMissingError } from '../../../domain/errors/nickname-missing.error.ts';
import { FixedRandomness } from '../../../domain/test/support/fixed-randomness.ts';
import { DilemmaNotSuitableError } from '../../../domain/errors/dilemma-not-suitable.error.ts';
import { DilemmaNotFoundError } from '../../errors/dilemma-not-found.error.ts';
import { lobbyCatalog, testCatalog } from '../support/test-catalog.ts';

const ANA = {
  ambience: 'classic',
  hostNickname: 'Ana',
  hostIdentity: 'TestAnaIdentity',
  hostAvatar: { face: 'face-05', color: 'cyan' },
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
        testCatalog(),
        new SequentialIdGenerator(),
        new SequentialRandomness(),
        new ManualClock(),
        new InMemorySealProvider(),
      );

      // Act
      const { roomId, code, hostId } = await createRoom.execute(ANA);

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.host.id).toBe(hostId);
      expect(room?.host.nickname).toBe('Ana');
      expect(room?.host.avatar).toMatchObject({ face: 'face-05', color: 'cyan' });
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
        testCatalog(),
        idGenerator,
        new FixedRandomness(0, 0, 0, 0, 0),
        new ManualClock(),
        new InMemorySealProvider(),
      ).execute(ANA);

      // Act
      const second = await new CreateRoomUseCase(
        roomRepository,
        testCatalog(),
        idGenerator,
        new FixedRandomness(0, 0, 0, 0, 0, 1, 1, 1, 1, 1),
        new ManualClock(),
        new InMemorySealProvider(),
      ).execute(ANA);

      // Assert
      expect(first.code).toBe('AAAAA');
      expect(second.code).toBe('BBBBB');
    });

    it('should give up if it finds no free code after several tries', async () => {
      // Arrange: a randomness that always draws AAAAA, which is taken.
      const roomRepository = new InMemoryRoomRepository();
      const idGenerator = new SequentialIdGenerator();
      await new CreateRoomUseCase(
        roomRepository,
        testCatalog(),
        idGenerator,
        new FixedRandomness(),
        new ManualClock(),
        new InMemorySealProvider(),
      ).execute(ANA);

      // Act & Assert
      await expect(
        new CreateRoomUseCase(
          roomRepository,
          testCatalog(),
          idGenerator,
          new FixedRandomness(),
          new ManualClock(),
          new InMemorySealProvider(),
        ).execute(ANA),
      ).rejects.toThrow(RoomCodeUnavailableError);
    });

    it('should create a room whose first game plays first the dilemma it is given', async () => {
      // Arrange
      const roomRepository = new InMemoryRoomRepository();
      const createRoom = new CreateRoomUseCase(
        roomRepository,
        lobbyCatalog(),
        new SequentialIdGenerator(),
        new SequentialRandomness(),
        new ManualClock(),
        new InMemorySealProvider(),
      );

      // Act
      const { roomId } = await createRoom.execute({
        ...ANA,
        dilemmaLanguage: 'es',
        firstRoundDilemmaId: 'TestCatalog5',
      });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.settings.rounds[0]).toEqual({
        id: 1,
        origin: 'specific',
        dilemma: {
          dilemmaId: 'TestCatalog5',
          type: 'standard',
          scale: 'everyday',
          minimumAge: 16,
          hasGap: false,
          compromising: false,
        },
      });
    });

    it.each([
      ['in exploration', 'TestNew1'],
      ['in another language', 'TestCatalan1'],
      ['that does not exist', 'TestMissing'],
    ])('should create no room with a first dilemma %s', async (_case, firstRoundDilemmaId) => {
      // Arrange
      const roomRepository = new InMemoryRoomRepository();
      const createRoom = new CreateRoomUseCase(
        roomRepository,
        lobbyCatalog(),
        new SequentialIdGenerator(),
        new SequentialRandomness(),
        new ManualClock(),
        new InMemorySealProvider(),
      );

      // Act & Assert
      await expect(
        createRoom.execute({ ...ANA, dilemmaLanguage: 'es', firstRoundDilemmaId }),
      ).rejects.toThrow(DilemmaNotFoundError);
    });

    it('should create no room with a first dilemma for adults: a new room is for everyone', async () => {
      // Arrange
      const createRoom = new CreateRoomUseCase(
        new InMemoryRoomRepository(),
        lobbyCatalog(),
        new SequentialIdGenerator(),
        new SequentialRandomness(),
        new ManualClock(),
        new InMemorySealProvider(),
      );

      // Act & Assert
      await expect(
        createRoom.execute({ ...ANA, dilemmaLanguage: 'es', firstRoundDilemmaId: 'TestCatalog1' }),
      ).rejects.toThrow(DilemmaNotSuitableError);
    });

    it('should create no room with a compromising first dilemma', async () => {
      // Arrange
      const createRoom = new CreateRoomUseCase(
        new InMemoryRoomRepository(),
        lobbyCatalog(),
        new SequentialIdGenerator(),
        new SequentialRandomness(),
        new ManualClock(),
        new InMemorySealProvider(),
      );

      // Act & Assert
      await expect(
        createRoom.execute({
          ...ANA,
          dilemmaLanguage: 'es',
          firstRoundDilemmaId: 'TestCompromising1',
        }),
      ).rejects.toThrow(DilemmaNotSuitableError);
    });

    it('should throw an error if the avatar is not one of the closed list', async () => {
      // Arrange
      const createRoom = new CreateRoomUseCase(
        new InMemoryRoomRepository(),
        testCatalog(),
        new SequentialIdGenerator(),
        new SequentialRandomness(),
        new ManualClock(),
        new InMemorySealProvider(),
      );

      // Act & Assert
      await expect(
        createRoom.execute({ ...ANA, hostAvatar: { face: 'face-99', color: 'cyan' } }),
      ).rejects.toThrow(InvalidAvatarError);
    });

    it('should throw an error if the nickname is missing', async () => {
      // Arrange
      const createRoom = new CreateRoomUseCase(
        new InMemoryRoomRepository(),
        testCatalog(),
        new SequentialIdGenerator(),
        new SequentialRandomness(),
        new ManualClock(),
        new InMemorySealProvider(),
      );

      // Act & Assert
      await expect(createRoom.execute({ ...ANA, hostNickname: '' })).rejects.toThrow(
        NicknameMissingError,
      );
    });
  });
});
