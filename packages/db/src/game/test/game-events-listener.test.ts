import { EventEmitter } from 'node:events';
import { createServer, connect, type AddressInfo, type Socket } from 'node:net';
import { ProgressUpdatedEvent, type DomainEvent } from '@thelever-app/game';
import type pg from 'pg';
import { afterEach, describe, expect, it } from 'vitest';
import { openListenClient } from '../../connection.ts';
import { ConsoleLogger } from '../../console-logger.ts';
import type { Database } from '../../schema.ts';
import { endListeningConnections, useTestDatabase } from '../../test/support/test-database.ts';
import { GameEventsListener } from '../game-events-listener.ts';
import { PostgresPlayerNotifier } from '../postgres-player-notifier.ts';

const database = useTestDatabase<Database>();
const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

type Opened = Awaited<ReturnType<typeof openListenClient>>;

async function until(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('it never happened');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/** Opens connections to the test database, or through `url` if given, and keeps which it closed. */
function opener(url = () => database.url()) {
  const opened: { closed: boolean }[] = [];
  return {
    opened,
    open: async (): Promise<Opened> => {
      const { client, close } = await openListenClient({ kind: 'url', url: url() });
      const record = { closed: false };
      opened.push(record);
      return {
        client,
        close: async () => {
          record.closed = true;
          await close();
        },
      };
    },
  };
}

/** A connection that is lost while it starts to listen: it ends, and the query fails. */
function lostWhileListening(): { readonly opened: Opened; readonly closed: () => boolean } {
  const client = Object.assign(new EventEmitter(), {
    query: async () => {
      client.emit('end');
      throw new Error('Connection terminated unexpectedly');
    },
  });
  let closed = false;
  return {
    opened: {
      client: client as unknown as pg.Client,
      close: async () => {
        closed = true;
      },
    },
    closed: () => closed,
  };
}

/** A TCP proxy to the test database that can stop passing anything on without closing, as a network cut does. */
async function freezableProxy() {
  const target = new URL(database.url());
  const sockets: Socket[] = [];
  const server = createServer((socket) => {
    const upstream = connect(Number(target.port || 5432), target.hostname);
    for (const end of [socket, upstream]) {
      end.on('error', () => {});
      sockets.push(end);
    }
    socket.pipe(upstream).pipe(socket);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = new URL(target);
  url.hostname = '127.0.0.1';
  url.port = String((server.address() as AddressInfo).port);
  cleanups.push(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  });
  return {
    url: url.href,
    freeze: () => {
      for (const socket of sockets) {
        socket.unpipe();
        socket.pause();
      }
    },
  };
}

function listenerOf(
  open: () => Promise<Opened>,
  options: Partial<ConstructorParameters<typeof GameEventsListener>[1]> = {},
) {
  const received: DomainEvent[] = [];
  let reconnections = 0;
  const listener = new GameEventsListener(open, {
    onEvents: (_playerIds, event) => received.push(event),
    onReconnected: () => {
      reconnections += 1;
    },
    initialRetryMs: 10,
    logger: new ConsoleLogger(),
    ...options,
  });
  cleanups.push(() => listener.stop());
  return { listener, received, reconnections: () => reconnections };
}

async function publish(): Promise<void> {
  await new PostgresPlayerNotifier(database.db()).notify(
    ['TestAnaId'],
    new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 1, 2),
  );
}

describe('GameEventsListener', () => {
  it('should listen again after losing its connection, and say so', async () => {
    // Arrange
    const { open, opened } = opener();
    const { listener, received, reconnections } = listenerOf(open);
    await listener.start();

    // Act: the database ends the connection, as a restart or a network cut would.
    await endListeningConnections(database.db());
    await until(() => reconnections() === 1);
    await publish();

    // Assert
    await until(() => received.length === 1);
    expect(opened.map(({ closed }) => closed)).toEqual([true, false]);
  });

  it('should listen once, closing each connection it lost, when one is lost while it starts to listen', async () => {
    // Arrange: the first connection again fails as it starts to listen.
    const { open, opened } = opener();
    const lost = lostWhileListening();
    let opens = 0;
    const { listener, received, reconnections } = listenerOf(async () =>
      opens++ === 1 ? lost.opened : open(),
    );
    await listener.start();

    // Act
    await endListeningConnections(database.db());
    await until(() => reconnections() >= 1);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await publish();

    // Assert
    await until(() => received.length >= 1);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(received).toHaveLength(1);
    expect(reconnections()).toBe(1);
    expect(opens).toBe(3);
    expect(lost.closed()).toBe(true);
    expect(opened.map(({ closed }) => closed)).toEqual([true, false]);
  });

  it('should take a connection that stops answering for lost, and listen again', async () => {
    // Arrange: only the first connection goes through the proxy.
    const proxy = await freezableProxy();
    let opens = 0;
    const { open } = opener(() => (opens++ === 0 ? proxy.url : database.url()));
    const { listener, received, reconnections } = listenerOf(open, {
      probeEveryMs: 50,
      probeTimeoutMs: 200,
    });
    await listener.start();

    // Act
    proxy.freeze();
    await until(() => reconnections() === 1, 3000);
    await publish();

    // Assert
    await until(() => received.length === 1);
  });
});
