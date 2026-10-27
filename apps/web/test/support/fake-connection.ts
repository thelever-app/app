import type { ServerMessageDto } from '@thelever-app/protocol';
import { vi } from 'vitest';
import type {
  RoomConnection,
  RoomConnectionStatus,
  RoomConnectionStatusListener,
  ServerMessageListener,
} from '../../src/room/room-connection.ts';

/** A room connection that records what the screen sends and delivers what the test says. */
export function fakeConnection(initialStatus: RoomConnectionStatus = 'connected') {
  const listeners = new Set<ServerMessageListener>();
  const statusListeners = new Set<RoomConnectionStatusListener>();
  let status = initialStatus;
  const connection = {
    send: vi.fn(),
    subscribe: vi.fn((listener: ServerMessageListener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }),
    subscribeStatus: vi.fn((listener: RoomConnectionStatusListener) => {
      statusListeners.add(listener);
      listener(status);
      return () => {
        statusListeners.delete(listener);
      };
    }),
    getStatus: () => status,
    close: vi.fn(),
  } satisfies RoomConnection;
  const deliver = (message: ServerMessageDto) => {
    for (const listener of listeners) listener(message);
  };
  const changeStatus = (next: RoomConnectionStatus) => {
    status = next;
    for (const listener of statusListeners) listener(next);
  };
  return { connection, deliver, changeStatus, listeners };
}
