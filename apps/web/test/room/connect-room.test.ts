import { describe, expect, it } from 'vitest';
import { connectRoom, type ConnectRoomOptions } from '../../src/room/connect-room.ts';
import { SimulatedRoomConnection } from '../../src/room/simulated-room-connection.ts';
import { WebSocketRoomConnection } from '../../src/room/websocket-room-connection.ts';
import { FakeSocket } from '../support/fake-socket.ts';

/** Options whose config, token and sockets the test controls. */
function options(overrides: Partial<ConnectRoomOptions> = {}) {
  const sockets: FakeSocket[] = [];
  const all: ConnectRoomOptions = {
    pathname: '/games/test-game-id',
    language: 'es',
    development: false,
    loadConfig: async () => ({ realtimeUrl: 'wss://realtime.test' }),
    getToken: async () => 'test-token',
    createSocket: (url) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    },
    ...overrides,
  };
  return { all, sockets };
}

describe('connectRoom', () => {
  it('should connect to the room server of the environment for the game in the address', async () => {
    // Arrange
    const { all, sockets } = options();

    // Act
    const connection = await connectRoom(all);
    sockets[0]!.open();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(connection).toBeInstanceOf(WebSocketRoomConnection);
    expect(sockets.map(({ url }) => url)).toEqual(['wss://realtime.test']);
    expect(sockets[0]!.sentMessages()).toEqual([
      expect.objectContaining({ type: 'connect', gameId: 'test-game-id', language: 'es' }),
    ]);
    connection.close();
  });

  it('should read a game id that carries escaped characters', async () => {
    // Arrange
    const { all, sockets } = options({ pathname: '/games/test%20game/' });

    // Act
    const connection = await connectRoom(all);
    sockets[0]!.open();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(sockets[0]!.sentMessages()).toEqual([expect.objectContaining({ gameId: 'test game' })]);
    connection.close();
  });

  it('should open the simulated room in development when the address names no game', async () => {
    // Arrange
    const { all } = options({ pathname: '/', development: true });

    // Act
    const connection = await connectRoom(all);

    // Assert
    expect(connection).toBeInstanceOf(SimulatedRoomConnection);
    connection.close();
  });

  it('should fail outside development when the address names no game', async () => {
    // Arrange
    const { all } = options({ pathname: '/' });

    // Act & Assert
    await expect(connectRoom(all)).rejects.toThrow();
  });
});
