import { describe, expect, it } from 'vitest';
import { CreateRoomUseCase } from '../../use-cases/create-room.use-case.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { RoomNotFoundError } from '../../errors/room-not-found.error.ts';
import { InMemoryRoomRepository } from '../../../adapters/in-memory/in-memory-room-repository.ts';
import { SequentialIdGenerator } from '../../../adapters/in-memory/sequential-id-generator.ts';

describe('JoinRoomUseCase', () => {
  describe('execute', () => {
    it('should add a new player with that nickname to the room', async () => {
      // Arrange
      const roomRepository = new InMemoryRoomRepository();
      const idGenerator = new SequentialIdGenerator();
      const { roomId } = await new CreateRoomUseCase(roomRepository, idGenerator).execute({
        hostNickname: 'Ana',
        hostIdentity: 'TestAnaIdentity',
      });
      const joinRoom = new JoinRoomUseCase(roomRepository, idGenerator);

      // Act
      const { playerId } = await joinRoom.execute({
        roomId,
        nickname: 'Luis',
        identity: 'TestLuisIdentity',
      });

      // Assert
      const room = await roomRepository.findById(roomId);
      const player = room?.players.find((candidate) => candidate.id === playerId);
      expect(player?.nickname).toBe('Luis');
    });

    it('should return the same player when the same identity joins again', async () => {
      // Arrange
      const roomRepository = new InMemoryRoomRepository();
      const idGenerator = new SequentialIdGenerator();
      const { roomId } = await new CreateRoomUseCase(roomRepository, idGenerator).execute({
        hostNickname: 'Ana',
        hostIdentity: 'TestAnaIdentity',
      });
      const joinRoom = new JoinRoomUseCase(roomRepository, idGenerator);
      const first = await joinRoom.execute({
        roomId,
        nickname: 'Luis',
        identity: 'TestLuisIdentity',
      });

      // Act
      const second = await joinRoom.execute({
        roomId,
        nickname: 'Luis',
        identity: 'TestLuisIdentity',
      });

      // Assert
      expect(second.playerId).toBe(first.playerId);
      const room = await roomRepository.findById(roomId);
      expect(room?.players).toHaveLength(2);
    });

    it('should throw an error if the room does not exist', async () => {
      // Arrange
      const joinRoom = new JoinRoomUseCase(
        new InMemoryRoomRepository(),
        new SequentialIdGenerator(),
      );

      // Act & Assert
      await expect(
        joinRoom.execute({
          roomId: 'TestUnknownId',
          nickname: 'Luis',
          identity: 'TestLuisIdentity',
        }),
      ).rejects.toThrow(RoomNotFoundError);
    });
  });
});
