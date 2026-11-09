import { describe, expect, it } from 'vitest';
import { ConnectPlayerUseCase } from '../../use-cases/connect-player.use-case.ts';
import { RoomNotFoundError } from '../../errors/room-not-found.error.ts';
import { IdentityNotInRoomError } from '../../errors/identity-not-in-room.error.ts';
import { ConnectionChangedEvent } from '../../../domain/events/connection-changed.event.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import {
  gameInDecisionPhase,
  ROOM_VERSION_WHEN_THE_GAME_STARTS,
} from '../support/game-in-decision-phase.ts';

async function arrange() {
  const game = await gameInDecisionPhase();
  const notifier = new InMemoryPlayerNotifier();
  const connectPlayer = new ConnectPlayerUseCase(
    game.roomRepository,
    game.gameRepository,
    notifier,
    game.idGenerator,
  );
  return { ...game, notifier, connectPlayer };
}

describe('ConnectPlayerUseCase', () => {
  describe('execute', () => {
    it('should connect the player to their room', async () => {
      // Arrange
      const { connectPlayer, roomRepository, roomId, luisId } = await arrange();

      // Act
      await connectPlayer.execute({ roomId, identity: 'TestLuisIdentity' });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.isConnected(luisId)).toBe(true);
    });

    it('should return the player behind that identity', async () => {
      // Arrange
      const { connectPlayer, roomId, luisId } = await arrange();

      // Act
      const { playerId } = await connectPlayer.execute({ roomId, identity: 'TestLuisIdentity' });

      // Assert
      expect(playerId).toBe(luisId);
    });

    it('should return a new connection id for each connection', async () => {
      // Arrange
      const { connectPlayer, roomId } = await arrange();

      // Act
      const first = await connectPlayer.execute({ roomId, identity: 'TestLuisIdentity' });
      const second = await connectPlayer.execute({ roomId, identity: 'TestLuisIdentity' });

      // Assert
      expect(first.connectionId).toBeTruthy();
      expect(second.connectionId).not.toBe(first.connectionId);
    });

    it('should tell the other players of the room, and not the player who connects', async () => {
      // Arrange
      const { connectPlayer, notifier, roomId, anaId, luisId, martaId } = await arrange();

      // Act
      await connectPlayer.execute({ roomId, identity: 'TestLuisIdentity' });

      // Assert
      const expected = [
        new ConnectionChangedEvent(roomId, luisId, true, ROOM_VERSION_WHEN_THE_GAME_STARTS + 1),
      ];
      expect(notifier.receivedBy(anaId)).toEqual(expected);
      expect(notifier.receivedBy(martaId)).toEqual(expected);
      expect(notifier.receivedBy(luisId)).toEqual([]);
    });

    it('should not tell anybody when the player only replaces their connection', async () => {
      // Arrange
      const { connectPlayer, notifier, roomId, anaId } = await arrange();
      await connectPlayer.execute({ roomId, identity: 'TestLuisIdentity' });

      // Act
      await connectPlayer.execute({ roomId, identity: 'TestLuisIdentity' });

      // Assert
      expect(notifier.receivedBy(anaId)).toHaveLength(1);
    });

    it('should throw an error if the room does not exist', async () => {
      // Arrange
      const { connectPlayer } = await arrange();

      // Act & Assert
      await expect(
        connectPlayer.execute({ roomId: 'TestUnknownRoomId', identity: 'TestLuisIdentity' }),
      ).rejects.toThrow(RoomNotFoundError);
    });

    it('should throw an error if no player of the room has that identity', async () => {
      // Arrange
      const { connectPlayer, roomId } = await arrange();

      // Act & Assert
      await expect(
        connectPlayer.execute({ roomId, identity: 'TestStrangerIdentity' }),
      ).rejects.toThrow(IdentityNotInRoomError);
    });
  });
});
