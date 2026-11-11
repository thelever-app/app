import { describe, expect, it, vi } from 'vitest';
import {
  connectRoom,
  type ConnectRoomOptions,
  SIMULATED_ROOM_ID,
} from '../../src/room/connect-room.ts';
import type { RoomApi } from '../../src/room/room-api.ts';
import { FakePageActivity } from '../support/fake-page-activity.ts';
import { FakeSocket } from '../support/fake-socket.ts';

/** Routes that should not be called unless the test says so. */
function unusedApi(): RoomApi {
  return {
    createRoom: vi.fn(),
    previewRoom: vi.fn(),
    joinRoom: vi.fn(),
    searchDilemmas: vi.fn(),
    enterAccessCode: vi.fn(),
  };
}

/** Options whose player, routes, sockets and page the test controls. */
function options(overrides: Partial<ConnectRoomOptions> = {}) {
  const sockets: FakeSocket[] = [];
  const pageActivity = new FakePageActivity();
  const getToken = vi.fn(async () => 'test-token');
  const all: ConnectRoomOptions = {
    roomId: 'test-room-id',
    language: 'es',
    development: false,
    realtimeUrl: 'wss://realtime.test',
    player: { getToken, getAppCheckToken: async () => undefined },
    api: unusedApi(),
    createSocket: (url) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    },
    pageActivity,
    ...overrides,
  };
  return { all, sockets, pageActivity, getToken };
}

describe('connectRoom', () => {
  it('should connect to the room server of the environment for the room of the address', async () => {
    // Arrange
    const { all, sockets } = options();

    // Act
    const { connection } = await connectRoom(all);
    sockets[0]!.open();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(sockets.map(({ url }) => url)).toEqual(['wss://realtime.test']);
    expect(sockets[0]!.sentMessages()).toEqual([
      expect.objectContaining({
        type: 'connect',
        token: 'test-token',
        roomId: 'test-room-id',
        language: 'es',
      }),
    ]);
    connection.close();
  });

  it('should hand over the routes of the room server as they are', async () => {
    // Arrange
    const { all } = options();

    // Act
    const { connection, api } = await connectRoom(all);

    // Assert
    expect(api).toBe(all.api);
    connection.close();
  });

  it('should stop watching the page and close the socket when the screen leaves the room', async () => {
    // Arrange
    const { all, sockets, pageActivity } = options();
    const { connection } = await connectRoom(all);

    // Act
    connection.close();

    // Assert
    expect(pageActivity.listeners()).toBe(0);
    expect(sockets[0]!.closedByClient).toBe(true);
  });

  it('should open the simulated room in development, without signing in', async () => {
    // Arrange
    const { all, getToken, sockets } = options({
      roomId: SIMULATED_ROOM_ID,
      development: true,
    });

    // Act
    const { connection, api } = await connectRoom(all);
    const found = await api.searchDilemmas(SIMULATED_ROOM_ID, {});

    // Assert
    expect(connection.getStatus()).toBe('connected');
    expect(found.length).toBeGreaterThan(0);
    expect(getToken).not.toHaveBeenCalled();
    expect(sockets).toEqual([]);
    connection.close();
  });

  it('should take the simulated room for a real one outside development', async () => {
    // Arrange
    const { all, sockets } = options({ roomId: SIMULATED_ROOM_ID });

    // Act
    const { connection } = await connectRoom(all);

    // Assert
    expect(sockets).toHaveLength(1);
    connection.close();
  });
});
