import { describe, expect, it } from 'vitest';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { RoomNotFoundError } from '../../errors/room-not-found.error.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { LobbyChangedEvent } from '../../../domain/events/lobby-changed.event.ts';
import { lobbyOfThree } from '../support/game-in-decision-phase.ts';

async function arrange() {
  const lobby = await lobbyOfThree();
  const notifier = new InMemoryPlayerNotifier();
  const joinRoom = new JoinRoomUseCase(
    lobby.roomRepository,
    notifier,
    lobby.idGenerator,
    lobby.randomness,
  );
  return { ...lobby, notifier, joinRoom };
}

describe('JoinRoomUseCase', () => {
  describe('execute', () => {
    it('should add a new player, with an avatar nobody else in the room has', async () => {
      // Arrange
      const { joinRoom, roomRepository, roomId } = await arrange();

      // Act
      const { playerId } = await joinRoom.execute({
        roomId,
        nickname: 'Pablo',
        identity: 'TestPabloIdentity',
      });

      // Assert
      const room = await roomRepository.findById(roomId);
      const pablo = room?.players.find(({ id }) => id === playerId);
      expect(pablo?.nickname).toBe('Pablo');
      const others = room?.players.filter(({ id }) => id !== playerId) ?? [];
      expect(others.some(({ avatar }) => avatar.equals(pablo!.avatar))).toBe(false);
    });

    it('should tell everyone in the room that the lobby changed', async () => {
      // Arrange
      const { joinRoom, notifier, roomId, anaId } = await arrange();

      // Act
      const { playerId } = await joinRoom.execute({
        roomId,
        nickname: 'Pablo',
        identity: 'TestPabloIdentity',
      });

      // Assert
      expect(notifier.receivedBy(anaId)).toEqual([
        new LobbyChangedEvent(roomId, 'player-joined', 3),
      ]);
      expect(notifier.receivedBy(playerId)).toHaveLength(1);
    });

    it('should give back the player of someone already in the room, telling nobody', async () => {
      // Arrange
      const { joinRoom, notifier, roomId, luisId } = await arrange();

      // Act
      const { playerId } = await joinRoom.execute({
        roomId,
        nickname: 'Luis',
        identity: 'TestLuisIdentity',
      });

      // Assert
      expect(playerId).toBe(luisId);
      expect(notifier.receivedBy(luisId)).toEqual([]);
    });

    it('should throw an error if the room does not exist', async () => {
      // Arrange
      const { joinRoom } = await arrange();

      // Act & Assert
      await expect(
        joinRoom.execute({ roomId: 'TestUnknownId', nickname: 'Pablo', identity: 'TestId' }),
      ).rejects.toThrow(RoomNotFoundError);
    });
  });
});
