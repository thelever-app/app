import { describe, expect, it } from 'vitest';
import { ConnectPlayerUseCase } from '../../use-cases/connect-player.use-case.ts';
import { DisconnectConnectionsUseCase } from '../../use-cases/disconnect-connections.use-case.ts';
import { RoomNotFoundError } from '../../errors/room-not-found.error.ts';
import { ConnectionChangedEvent } from '../../../domain/events/connection-changed.event.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import {
  gameInDecisionPhase,
  ROOM_VERSION_WHEN_THE_GAME_STARTS,
} from '../support/game-in-decision-phase.ts';

/** Like the arranged game, with Ana connected once and Luis twice, as from two tabs. */
async function arrange() {
  const game = await gameInDecisionPhase();
  const notifier = new InMemoryPlayerNotifier();
  const connectPlayer = new ConnectPlayerUseCase(game.roomRepository, notifier, game.idGenerator);
  const ana = await connectPlayer.execute({ roomId: game.roomId, identity: 'TestAnaIdentity' });
  const luis1 = await connectPlayer.execute({ roomId: game.roomId, identity: 'TestLuisIdentity' });
  const luis2 = await connectPlayer.execute({ roomId: game.roomId, identity: 'TestLuisIdentity' });
  const disconnectConnections = new DisconnectConnectionsUseCase(game.roomRepository, notifier);
  return { ...game, notifier, disconnectConnections, ana, luis1, luis2 };
}

describe('DisconnectConnectionsUseCase', () => {
  describe('execute', () => {
    it('should close every connection it is given', async () => {
      // Arrange
      const { disconnectConnections, roomRepository, roomId, anaId, luisId, ana, luis1, luis2 } =
        await arrange();

      // Act
      await disconnectConnections.execute({ roomId, connections: [ana, luis1, luis2] });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.isConnected(anaId)).toBe(false);
      expect(room?.isConnected(luisId)).toBe(false);
      expect(room?.toSnapshot().connections).toEqual([]);
    });

    it('should keep a player connected through a connection it is not given', async () => {
      // Arrange
      const { disconnectConnections, roomRepository, roomId, luisId, luis1, luis2 } =
        await arrange();

      // Act
      await disconnectConnections.execute({ roomId, connections: [luis1] });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.isConnected(luisId)).toBe(true);
      expect(room?.toSnapshot().connections.filter(({ playerId }) => playerId === luisId)).toEqual([
        { playerId: luisId, connectionId: luis2.connectionId },
      ]);
    });

    it('should tell the other players of the room who is now disconnected', async () => {
      // Arrange
      const { disconnectConnections, notifier, roomId, anaId, luisId, martaId, luis1, luis2 } =
        await arrange();
      const before = notifier.receivedBy(anaId).length;

      // Act
      await disconnectConnections.execute({ roomId, connections: [luis1, luis2] });

      // Assert
      const event = new ConnectionChangedEvent(
        roomId,
        luisId,
        false,
        ROOM_VERSION_WHEN_THE_GAME_STARTS + 3,
      );
      expect(notifier.receivedBy(anaId).slice(before)).toEqual([event]);
      expect(notifier.receivedBy(martaId).at(-1)).toEqual(event);
      expect(notifier.receivedBy(luisId)).not.toContainEqual(event);
    });

    it('should tell a player who keeps another connection that someone else disconnected', async () => {
      // Arrange
      const { disconnectConnections, notifier, roomId, anaId, luisId, ana, luis1 } =
        await arrange();

      // Act
      await disconnectConnections.execute({ roomId, connections: [ana, luis1] });

      // Assert
      expect(notifier.receivedBy(luisId).at(-1)).toEqual(
        new ConnectionChangedEvent(roomId, anaId, false, ROOM_VERSION_WHEN_THE_GAME_STARTS + 3),
      );
    });

    it('should change nothing for a connection that is already closed', async () => {
      // Arrange
      const { disconnectConnections, notifier, roomRepository, roomId, anaId, luisId } =
        await arrange();
      const before = notifier.receivedBy(anaId).length;

      // Act
      await disconnectConnections.execute({
        roomId,
        connections: [{ playerId: luisId, connectionId: 'TestClosedConnectionId' }],
      });

      // Assert
      expect((await roomRepository.findById(roomId))?.isConnected(luisId)).toBe(true);
      expect(notifier.receivedBy(anaId)).toHaveLength(before);
    });

    it('should throw an error if the room does not exist', async () => {
      // Arrange
      const { disconnectConnections, ana } = await arrange();

      // Act & Assert
      await expect(
        disconnectConnections.execute({ roomId: 'TestUnknownRoomId', connections: [ana] }),
      ).rejects.toThrow(RoomNotFoundError);
    });
  });
});
