import type { ServerMessageDto } from '@thelever-app/protocol';
import { vi } from 'vitest';
import type { RoomConnection, ServerMessageListener } from '../../src/room/room-connection.ts';

/** A room connection that records what the screen sends and delivers what the test says. */
export function fakeConnection() {
  const listeners = new Set<ServerMessageListener>();
  const connection = {
    send: vi.fn(),
    subscribe: vi.fn((listener: ServerMessageListener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }),
    close: vi.fn(),
  } satisfies RoomConnection;
  const deliver = (message: ServerMessageDto) => {
    for (const listener of listeners) listener(message);
  };
  return { connection, deliver, listeners };
}
