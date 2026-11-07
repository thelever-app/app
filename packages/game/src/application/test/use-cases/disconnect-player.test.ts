import { describe, expect, it } from 'vitest';
import { ConnectPlayerUseCase } from '../../use-cases/connect-player.use-case.ts';
import { DisconnectPlayerUseCase } from '../../use-cases/disconnect-player.use-case.ts';
import { RoomNotFoundError } from '../../errors/room-not-found.error.ts';
import { ConnectionChangedEvent } from '../../../domain/events/connection-changed.event.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import {
  gameInDecisionPhase,
  ROOM_VERSION_WHEN_THE_GAME_STARTS,
} from '../support/game-in-decision-phase.ts';

/** Like the arranged game, with Luis connected. */
async function arrange() {
  const game = await gameInDecisionPhase();
  const notifier = new InMemoryPlayerNotifier();
  const connectPlayer = new ConnectPlayerUseCase(game.roomRepository, notifier, game.idGenerator);
  const disconnectPlayer = new DisconnectPlayerUseCase(game.roomRepository, notifier);
  const { connectionId } = await connectPlayer.execute({
    roomId: game.roomId,
    identity: 'TestLuisIdentity',
  });
  return { ...game, notifier, connectPlayer, disconnectPlayer, connectionId };
}

describe('DisconnectPlayerUseCase', () => {
  describe('execute', () => {
    it('should disconnect the player from their room', async () => {
      // Arrange
      const { disconnectPlayer, roomRepository, roomId, luisId, connectionId } = await arrange();

      // Act
      await disconnectPlayer.execute({ roomId, playerId: luisId, connectionId });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.isConnected(luisId)).toBe(false);
    });

    it('should tell the other players of the room', async () => {
      // Arrange
      const { disconnectPlayer, notifier, roomId, anaId, luisId, connectionId } = await arrange();

      // Act
      await disconnectPlayer.execute({ roomId, playerId: luisId, connectionId });

      // Assert
      expect(notifier.receivedBy(anaId).at(-1)).toEqual(
        new ConnectionChangedEvent(roomId, luisId, false, ROOM_VERSION_WHEN_THE_GAME_STARTS + 2),
      );
    });

    it('should change nothing when a connection the player already replaced closes late', async () => {
      // Arrange
      const {
        connectPlayer,
        disconnectPlayer,
        notifier,
        roomRepository,
        roomId,
        anaId,
        luisId,
        connectionId,
      } = await arrange();
      await connectPlayer.execute({ roomId, identity: 'TestLuisIdentity' });

      // Act
      await disconnectPlayer.execute({ roomId, playerId: luisId, connectionId });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.isConnected(luisId)).toBe(true);
      expect(notifier.receivedBy(anaId)).toHaveLength(1);
    });

    it('should disconnect the player when their last connection closes after another one', async () => {
      // Arrange
      const {
        connectPlayer,
        disconnectPlayer,
        notifier,
        roomRepository,
        roomId,
        anaId,
        luisId,
        connectionId,
      } = await arrange();
      const second = await connectPlayer.execute({ roomId, identity: 'TestLuisIdentity' });
      await disconnectPlayer.execute({ roomId, playerId: luisId, connectionId });

      // Act
      await disconnectPlayer.execute({
        roomId,
        playerId: luisId,
        connectionId: second.connectionId,
      });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.isConnected(luisId)).toBe(false);
      expect(notifier.receivedBy(anaId).at(-1)).toEqual(
        new ConnectionChangedEvent(roomId, luisId, false, ROOM_VERSION_WHEN_THE_GAME_STARTS + 2),
      );
    });

    it('should throw an error if the room does not exist', async () => {
      // Arrange
      const { disconnectPlayer, luisId, connectionId } = await arrange();

      // Act & Assert
      await expect(
        disconnectPlayer.execute({ roomId: 'TestUnknownRoomId', playerId: luisId, connectionId }),
      ).rejects.toThrow(RoomNotFoundError);
    });
  });
});
