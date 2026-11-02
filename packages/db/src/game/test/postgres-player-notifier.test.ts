import { ConnectionChangedEvent, ProgressUpdatedEvent, type DomainEvent } from '@thelever-app/game';
import { afterEach, describe, expect, it } from 'vitest';
import type { Database } from '../../schema.ts';
import { useTestDatabase } from '../../test/support/test-database.ts';
import { inTransaction } from '../../transaction.ts';
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
    { onEvents: (playerIds, event) => received.push({ playerIds, event }) },
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

describe('PostgresPlayerNotifier', () => {
  describe('notify', () => {
    it('should deliver each event, rebuilt, and who receives it to every listener', async () => {
      // Arrange
      const received = await listening();
      const notifier = new PostgresPlayerNotifier(database.db());
      const progress = new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 2, 7);
      const connection = new ConnectionChangedEvent('TestRoomId', 'TestLuisId', false, 3);

      // Act
      await notifier.notify(['TestAnaId', 'TestMartaId'], progress);
      await notifier.notify(['TestAnaId'], connection);

      // Assert
      await until(() => received.length === 2);
      expect(received).toEqual([
        { playerIds: ['TestAnaId', 'TestMartaId'], event: progress },
        { playerIds: ['TestAnaId'], event: connection },
      ]);
      expect(received[0]?.event).toBeInstanceOf(ProgressUpdatedEvent);
      expect(received[1]?.event).toBeInstanceOf(ConnectionChangedEvent);
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
  });
});

describe('GameEventsListener', () => {
  it('should listen again after losing its connection, and say so', async () => {
    // Arrange
    const received: DomainEvent[] = [];
    let reconnections = 0;
    const listener = new GameEventsListener(
      () => openListenClient({ kind: 'url', url: database.url() }),
      {
        onEvents: (_playerIds, event) => received.push(event),
        onReconnected: () => {
          reconnections += 1;
        },
        initialRetryMs: 10,
      },
    );
    listeners.push(listener);
    await listener.start();

    // Act: the database ends the connection, as a restart or a network cut would.
    await database
      .db()
      .selectNoFrom((eb) =>
        eb.fn<boolean>('pg_terminate_backend', [eb.val(listener.processId ?? 0)]).as('ended'),
      )
      .execute();
    await until(() => reconnections === 1);
    await new PostgresPlayerNotifier(database.db()).notify(
      ['TestAnaId'],
      new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 1, 2),
    );

    // Assert
    await until(() => received.length === 1);
  });
});
