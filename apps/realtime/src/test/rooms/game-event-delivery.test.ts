import type { Logger } from '@thelever-app/db';
import {
  ConnectionChangedEvent,
  type DomainEvent,
  type PlayerNotifier,
  ProgressUpdatedEvent,
} from '@thelever-app/game';
import { describe, expect, it } from 'vitest';
import { KeyedLock } from '../../concurrency/keyed-lock.ts';
import { GameEventDelivery } from '../../rooms/game-event-delivery.ts';

/** A notifier that remembers what it delivered, or fails if told to. */
class RecordingNotifier implements PlayerNotifier {
  readonly delivered: DomainEvent[] = [];
  failing = false;

  async notify(_playerIds: readonly string[], event: DomainEvent): Promise<void> {
    if (this.failing) throw new Error('socket closed');
    this.delivered.push(event);
  }
}

/** A logger that remembers the messages of its errors. */
function recordingLogger() {
  const errors: string[] = [];
  const logger: Logger = {
    info: () => {},
    warn: () => {},
    error: (message) => {
      errors.push(message);
    },
  };
  return { logger, errors };
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('GameEventDelivery', () => {
  it('should wait for the command of the game in progress before delivering its events', async () => {
    // Arrange: a command of the game holds it, and has not sent the answerer their state yet.
    const notifier = new RecordingNotifier();
    const gameLock = new KeyedLock();
    const delivery = new GameEventDelivery(notifier, gameLock, recordingLogger().logger);
    const release = await gameLock.acquire('TestGameId');
    const progress = new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 1, 6);

    // Act
    const delivering = delivery.deliver(['TestAnaId'], progress, undefined);
    await settle();
    const beforeTheCommandEnds = [...notifier.delivered];
    release();
    await delivering;

    // Assert
    expect(beforeTheCommandEnds).toEqual([]);
    expect(notifier.delivered).toEqual([progress]);
  });

  it('should deliver an event of the room without waiting for any game', async () => {
    // Arrange
    const notifier = new RecordingNotifier();
    const gameLock = new KeyedLock();
    const delivery = new GameEventDelivery(notifier, gameLock, recordingLogger().logger);
    await gameLock.acquire('TestGameId');
    const change = new ConnectionChangedEvent('TestRoomId', 'TestLuisId', true, 3);

    // Act
    await delivery.deliver(['TestAnaId'], change, undefined);

    // Assert
    expect(notifier.delivered).toEqual([change]);
  });

  it('should log a delivery that fails and let the next one through', async () => {
    // Arrange
    const notifier = new RecordingNotifier();
    const gameLock = new KeyedLock();
    const { logger, errors } = recordingLogger();
    const delivery = new GameEventDelivery(notifier, gameLock, logger);
    notifier.failing = true;

    // Act
    await delivery.deliver(
      ['TestAnaId'],
      new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 1, 6),
      undefined,
    );
    notifier.failing = false;
    await delivery.deliver(
      ['TestAnaId'],
      new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 2, 7),
      undefined,
    );

    // Assert
    expect(errors).toEqual(['delivering a game event failed']);
    expect(notifier.delivered).toHaveLength(1);
  });
});
