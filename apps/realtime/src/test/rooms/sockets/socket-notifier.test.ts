import { LobbyChangedEvent } from '@thelever-app/game';
import { describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { RoomConnection } from '../../../rooms/sockets/room-connection.ts';
import { SocketNotifier } from '../../../rooms/sockets/socket-notifier.ts';

/** A connection of Ana in the room, whose socket records what is sent and how it closes. */
function connectionOfAna() {
  const socket = { send: vi.fn(), close: vi.fn() };
  const connection = new RoomConnection(socket as unknown as WebSocket);
  connection.session = {
    roomId: 'TestRoomId',
    playerId: 'TestAnaId',
    connectionId: 'TestAnaConnection',
    language: 'es',
  };
  return { connection, socket };
}

describe('SocketNotifier', () => {
  describe('sendState', () => {
    it('should close the connection of an expelled player and stop delivering to it', async () => {
      // Arrange
      const send = vi.fn(async () => 'expelled' as const);
      const notifier = new SocketNotifier({ send });
      const { connection, socket } = connectionOfAna();
      notifier.register('TestAnaId', connection);

      // Act
      await notifier.sendState(connection, connection.session!);
      await notifier.notify(
        ['TestAnaId'],
        new LobbyChangedEvent('TestRoomId', 'settings-changed', 2),
      );

      // Assert
      expect(socket.close).toHaveBeenCalledWith(1000, 'expelled');
      expect(send).toHaveBeenCalledOnce();
    });

    it('should leave a player who is still in the room connected', async () => {
      // Arrange
      const notifier = new SocketNotifier({ send: async () => 'sent' as const });
      const { connection, socket } = connectionOfAna();
      notifier.register('TestAnaId', connection);

      // Act
      await notifier.sendState(connection, connection.session!);

      // Assert
      expect(socket.close).not.toHaveBeenCalled();
    });
  });
});
