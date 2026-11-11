import { randomUUID } from 'node:crypto';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { context, propagation, trace, TraceFlags } from '@opentelemetry/api';
import {
  ConnectionChangedEvent,
  HostChangedEvent,
  LobbyChangedEvent,
  PlayerLeftEvent,
  AnsweredCountChangedEvent,
  DilemmaRevealedEvent,
  PlayerJoinedLateEvent,
  RoundStartedEvent,
  ProgressUpdatedEvent,
  type DomainEvent,
} from '@thelever-app/game';
import { sql } from 'kysely';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ConsoleLogger } from '../../console-logger.ts';
import type { Database } from '../../schema.ts';
import { useTestDatabase } from '../../test/support/test-database.ts';
import { currentTransaction, inTransaction } from '../../transaction.ts';
import { GameEventsListener } from '../game-events-listener.ts';
import { PostgresPlayerNotifier } from '../postgres-player-notifier.ts';
import { openListenClient } from '../../connection.ts';

const database = useTestDatabase<Database>();
const listeners: GameEventsListener[] = [];

/** A listener of the test database that keeps what it receives. */
async function listening() {
  const received: { playerIds: readonly string[]; event: DomainEvent }[] = [];
  const listener = new GameEventsListener(
    () => openListenClient({ kind: 'url', url: database.url() }),
    {
      onEvents: (playerIds, event) => received.push({ playerIds, event }),
      logger: new ConsoleLogger(),
    },
  );
  listeners.push(listener);
  await listener.start();
  return received;
}

async function until(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('it never happened');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

afterEach(async () => {
  for (const listener of listeners.splice(0)) await listener.stop();
});

// What the SDK sets up in production: a context that follows async calls and W3C trace headers.
beforeAll(() => {
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());
});

afterAll(() => {
  context.disable();
  propagation.disable();
});

describe('PostgresPlayerNotifier', () => {
  describe('notify', () => {
    it('should deliver each event, rebuilt, and who receives it to every listener', async () => {
      // Arrange
      const received = await listening();
      const notifier = new PostgresPlayerNotifier(database.db());
      const progress = new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 2, 7);
      const connection = new ConnectionChangedEvent('TestRoomId', 'TestLuisId', false, 3);
      const lobby = new LobbyChangedEvent('TestRoomId', 'settings-changed', 4);

      // Act
      await notifier.notify(['TestAnaId', 'TestMartaId'], progress);
      await notifier.notify(['TestAnaId'], connection);
      await notifier.notify(['TestAnaId', 'TestLuisId'], lobby);

      // Assert
      await until(() => received.length === 3);
      expect(received).toEqual([
        { playerIds: ['TestAnaId', 'TestMartaId'], event: progress },
        { playerIds: ['TestAnaId'], event: connection },
        { playerIds: ['TestAnaId', 'TestLuisId'], event: lobby },
      ]);
      expect(received[0]?.event).toBeInstanceOf(ProgressUpdatedEvent);
      expect(received[1]?.event).toBeInstanceOf(ConnectionChangedEvent);
      expect(received[2]?.event).toBeInstanceOf(LobbyChangedEvent);
    });

    it('should deliver the events of the decision phase, rebuilt', async () => {
      // Arrange
      const received = await listening();
      const notifier = new PostgresPlayerNotifier(database.db());
      const events = [
        new AnsweredCountChangedEvent('TestGameId', 2, 8),
        new DilemmaRevealedEvent('TestGameId', 0, 9),
        new RoundStartedEvent('TestGameId', 1, 'TestMartaId', 10),
        new HostChangedEvent('TestRoomId', 'TestLuisId', 5),
        new PlayerLeftEvent('TestRoomId', 'TestAnaId', true, 6),
        new PlayerJoinedLateEvent('TestGameId', 'TestPedroId', 11),
      ];

      // Act
      for (const event of events) await notifier.notify(['TestLuisId'], event);

      // Assert
      await until(() => received.length === events.length);
      expect(received.map(({ event }) => event)).toEqual(events);
      received.forEach(({ event }, index) =>
        expect(event).toBeInstanceOf(events[index]!.constructor),
      );
    });

    it('should deliver what a command notifies only once it commits', async () => {
      // Arrange
      const received = await listening();
      const notifier = new PostgresPlayerNotifier(database.db());
      let seenBeforeCommit = -1;

      // Act
      await inTransaction(database.db(), async () => {
        await notifier.notify(
          ['TestAnaId'],
          new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 1, 2),
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        seenBeforeCommit = received.length;
      });

      // Assert
      expect(seenBeforeCommit).toBe(0);
      await until(() => received.length === 1);
    });

    it('should deliver nothing of a command that does not commit', async () => {
      // Arrange
      const received = await listening();
      const notifier = new PostgresPlayerNotifier(database.db());

      // Act
      await expect(
        inTransaction(database.db(), async () => {
          await notifier.notify(
            ['TestAnaId'],
            new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 1, 2),
          );
          throw new Error('the command fails');
        }),
      ).rejects.toThrow('the command fails');
      await notifier.notify(
        ['TestAnaId'],
        new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 1, 3),
      );

      // Assert
      await until(() => received.length === 1);
      expect((received[0]?.event as ProgressUpdatedEvent).gameVersion).toBe(3);
    });

    it('should deliver to more players than fit in one notification, in several', async () => {
      // Arrange
      const received = await listening();
      const notifier = new PostgresPlayerNotifier(database.db());
      const playerIds = Array.from({ length: 500 }, () => randomUUID());
      const progress = new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 2, 7);

      // Act
      await notifier.notify(playerIds, progress);

      // Assert
      await until(() => received.flatMap((notification) => notification.playerIds).length === 500);
      expect(received.length).toBeGreaterThan(1);
      expect(received.flatMap((notification) => notification.playerIds)).toEqual(playerIds);
      expect(received.every(({ event }) => event instanceof ProgressUpdatedEvent)).toBe(true);
    });

    it('should keep what a command saved when one of its notifications fails', async () => {
      // Arrange: no notification fits a player id that long.
      const notifier = new PostgresPlayerNotifier(database.db());
      const tooLong = 'x'.repeat(8000);

      // Act
      await inTransaction(database.db(), async () => {
        await sql`insert into instances (id, seen_at) values ('TestInstance', now())`.execute(
          currentTransaction() ?? database.db(),
        );
        await expect(
          notifier.notify([tooLong], new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 1, 2)),
        ).rejects.toThrow();
      });

      // Assert
      const saved = await database.db().selectFrom('instances').select('id').execute();
      expect(saved).toEqual([{ id: 'TestInstance' }]);
    });

    it('should tell each listener when the event was published', async () => {
      // Arrange
      const published: (number | undefined)[] = [];
      const listener = new GameEventsListener(
        () => openListenClient({ kind: 'url', url: database.url() }),
        {
          onEvents: (_playerIds, _event, publishedAt) => published.push(publishedAt),
          logger: new ConsoleLogger(),
        },
      );
      listeners.push(listener);
      await listener.start();
      const before = Date.now();

      // Act
      await new PostgresPlayerNotifier(database.db()).notify(
        ['TestAnaId'],
        new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 1, 2),
      );

      // Assert
      await until(() => published.length === 1);
      expect(published[0]).toBeGreaterThanOrEqual(before);
      expect(published[0]).toBeLessThanOrEqual(Date.now());
    });

    it('should hand each listener the trace of the command that notified', async () => {
      // Arrange
      const traceIds: (string | undefined)[] = [];
      const listener = new GameEventsListener(
        () => openListenClient({ kind: 'url', url: database.url() }),
        {
          onEvents: () => traceIds.push(trace.getSpanContext(context.active())?.traceId),
          logger: new ConsoleLogger(),
        },
      );
      listeners.push(listener);
      await listener.start();
      const command = trace.setSpanContext(context.active(), {
        traceId: '0af7651916cd43dd8448eb211c80319c',
        spanId: 'b7ad6b7169203331',
        traceFlags: TraceFlags.SAMPLED,
      });

      // Act
      await context.with(command, () =>
        new PostgresPlayerNotifier(database.db()).notify(
          ['TestAnaId'],
          new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 1, 2),
        ),
      );

      // Assert
      await until(() => traceIds.length === 1);
      expect(traceIds).toEqual(['0af7651916cd43dd8448eb211c80319c']);
    });
  });
});
