import { describe, expect, it } from 'vitest';
import { ConnectPlayerUseCase } from '../../use-cases/connect-player.use-case.ts';
import { GameNotFoundError } from '../../errors/game-not-found.error.ts';
import { IdentityNotInGameError } from '../../errors/identity-not-in-game.error.ts';
import { ConnectionChangedEvent } from '../../../domain/events/connection-changed.event.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { gameInDecisionPhase } from '../support/game-in-decision-phase.ts';

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
    it('should connect the player to the room of the game', async () => {
      // Arrange
      const { connectPlayer, roomRepository, roomId, gameId, luisId } = await arrange();

      // Act
      await connectPlayer.execute({ gameId, identity: 'TestLuisIdentity' });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.isConnected(luisId)).toBe(true);
    });

    it('should return the player behind that identity', async () => {
      // Arrange
      const { connectPlayer, gameId, luisId } = await arrange();

      // Act
      const { playerId } = await connectPlayer.execute({ gameId, identity: 'TestLuisIdentity' });

      // Assert
      expect(playerId).toBe(luisId);
    });

    it('should return a new connection id for each connection', async () => {
      // Arrange
      const { connectPlayer, gameId } = await arrange();

      // Act
      const first = await connectPlayer.execute({ gameId, identity: 'TestLuisIdentity' });
      const second = await connectPlayer.execute({ gameId, identity: 'TestLuisIdentity' });

      // Assert
      expect(first.connectionId).toBeTruthy();
      expect(second.connectionId).not.toBe(first.connectionId);
    });

    it('should tell the other players of the game, and not the player who connects', async () => {
      // Arrange
      const { connectPlayer, notifier, roomId, gameId, anaId, luisId, martaId } = await arrange();

      // Act
      await connectPlayer.execute({ gameId, identity: 'TestLuisIdentity' });

      // Assert
      const expected = [new ConnectionChangedEvent(roomId, luisId, true, 1)];
      expect(notifier.receivedBy(anaId)).toEqual(expected);
      expect(notifier.receivedBy(martaId)).toEqual(expected);
      expect(notifier.receivedBy(luisId)).toEqual([]);
    });

    it('should not tell anybody when the player only replaces their connection', async () => {
      // Arrange
      const { connectPlayer, notifier, gameId, anaId } = await arrange();
      await connectPlayer.execute({ gameId, identity: 'TestLuisIdentity' });

      // Act
      await connectPlayer.execute({ gameId, identity: 'TestLuisIdentity' });

      // Assert
      expect(notifier.receivedBy(anaId)).toHaveLength(1);
    });

    it('should throw an error if the game does not exist', async () => {
      // Arrange
      const { connectPlayer } = await arrange();

      // Act & Assert
      await expect(
        connectPlayer.execute({ gameId: 'TestUnknownGameId', identity: 'TestLuisIdentity' }),
      ).rejects.toThrow(GameNotFoundError);
    });

    it('should throw an error if no player of the game has that identity', async () => {
      // Arrange
      const { connectPlayer, gameId } = await arrange();

      // Act & Assert
      await expect(
        connectPlayer.execute({ gameId, identity: 'TestStrangerIdentity' }),
      ).rejects.toThrow(IdentityNotInGameError);
    });
  });
});
