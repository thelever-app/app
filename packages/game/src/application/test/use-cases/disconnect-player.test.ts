import { describe, expect, it } from 'vitest';
import { ConnectPlayerUseCase } from '../../use-cases/connect-player.use-case.ts';
import { DisconnectPlayerUseCase } from '../../use-cases/disconnect-player.use-case.ts';
import { GameNotFoundError } from '../../errors/game-not-found.error.ts';
import { ConnectionChangedEvent } from '../../../domain/events/connection-changed.event.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { gameInDecisionPhase } from '../support/game-in-decision-phase.ts';

/** Like the arranged game, with Luis connected. */
async function arrange() {
  const game = await gameInDecisionPhase();
  const notifier = new InMemoryPlayerNotifier();
  const connectPlayer = new ConnectPlayerUseCase(
    game.roomRepository,
    game.gameRepository,
    notifier,
    game.idGenerator,
  );
  const disconnectPlayer = new DisconnectPlayerUseCase(
    game.roomRepository,
    game.gameRepository,
    notifier,
  );
  const { connectionId } = await connectPlayer.execute({
    gameId: game.gameId,
    identity: 'TestLuisIdentity',
  });
  return { ...game, notifier, connectPlayer, disconnectPlayer, connectionId };
}

describe('DisconnectPlayerUseCase', () => {
  describe('execute', () => {
    it('should disconnect the player from the room of the game', async () => {
      // Arrange
      const { disconnectPlayer, roomRepository, roomId, gameId, luisId, connectionId } =
        await arrange();

      // Act
      await disconnectPlayer.execute({ gameId, playerId: luisId, connectionId });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.isConnected(luisId)).toBe(false);
    });

    it('should tell the other players of the game', async () => {
      // Arrange
      const { disconnectPlayer, notifier, roomId, gameId, anaId, luisId, connectionId } =
        await arrange();

      // Act
      await disconnectPlayer.execute({ gameId, playerId: luisId, connectionId });

      // Assert
      expect(notifier.receivedBy(anaId).at(-1)).toEqual(
        new ConnectionChangedEvent(roomId, luisId, false, 2),
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
        gameId,
        anaId,
        luisId,
        connectionId,
      } = await arrange();
      await connectPlayer.execute({ gameId, identity: 'TestLuisIdentity' });

      // Act
      await disconnectPlayer.execute({ gameId, playerId: luisId, connectionId });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.isConnected(luisId)).toBe(true);
      expect(notifier.receivedBy(anaId)).toHaveLength(1);
    });

    it('should throw an error if the game does not exist', async () => {
      // Arrange
      const { disconnectPlayer, luisId, connectionId } = await arrange();

      // Act & Assert
      await expect(
        disconnectPlayer.execute({ gameId: 'TestUnknownGameId', playerId: luisId, connectionId }),
      ).rejects.toThrow(GameNotFoundError);
    });
  });
});
