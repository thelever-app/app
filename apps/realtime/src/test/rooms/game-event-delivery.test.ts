import type { Logger } from '@thelever-app/db';
import {
  ConnectionChangedEvent,
  type DomainEvent,
  type PlayerNotifier,
  ProgressUpdatedEvent,
} from '@thelever-app/game';
import { describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import { KeyedLock } from '../../concurrency/keyed-lock.ts';
import { GameEventDelivery } from '../../rooms/game-event-delivery.ts';
import { RoomConnection, type Session } from '../../rooms/sockets/room-connection.ts';

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

/** A connection of this instance, with the player in that game. */
function connectionOf(playerId: string, gameId: string): RoomConnection {
  const connection = new RoomConnection({ send: () => {} } as unknown as WebSocket);
  connection.session = { gameId, playerId, connectionId: `${playerId}Connection`, language: 'es' };
  return connection;
}

/** A sender of fresh states that remembers to whom it sent them, or fails for one player. */
function recordingSender(failingFor?: string) {
  const sentTo: string[] = [];
  return {
    sentTo,
    send: async (_connection: RoomConnection, { playerId }: Session) => {
      if (playerId === failingFor) throw new Error('socket closed');
      sentTo.push(playerId);
    },
  };
}

/** The delivery of an instance with those connections. */
function deliveryWith(connections: readonly RoomConnection[] = [], failingFor?: string) {
  const notifier = new RecordingNotifier();
  const gameLock = new KeyedLock();
  const sender = recordingSender(failingFor);
  const { logger, errors } = recordingLogger();
  const delivery = new GameEventDelivery(notifier, sender, gameLock, logger, () => connections);
  return { delivery, notifier, gameLock, sender, errors };
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('GameEventDelivery', () => {
  describe('deliver', () => {
    it('should wait for the command of the game in progress before delivering its events', async () => {
      // Arrange: a command of the game holds it, and has not sent the answerer their state yet.
      const { delivery, notifier, gameLock } = deliveryWith();
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

    it('should wait for the command of the game each player plays before delivering an event of the room', async () => {
      // Arrange: Ana plays here a game that a command holds.
      const { delivery, notifier, gameLock } = deliveryWith([
        connectionOf('TestAnaId', 'TestGameId'),
      ]);
      const release = await gameLock.acquire('TestGameId');
      const change = new ConnectionChangedEvent('TestRoomId', 'TestLuisId', true, 3);

      // Act
      const delivering = delivery.deliver(['TestAnaId'], change, undefined);
      await settle();
      const beforeTheCommandEnds = [...notifier.delivered];
      release();
      await delivering;

      // Assert
      expect(beforeTheCommandEnds).toEqual([]);
      expect(notifier.delivered).toEqual([change]);
    });

    it('should log a delivery that fails and let the next one through', async () => {
      // Arrange
      const { delivery, notifier, errors } = deliveryWith();
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

  describe('catchUp', () => {
    it('should send each player a fresh state once the command of their game is done', async () => {
      // Arrange: a command holds the game of Ana, not that of Luis.
      const { delivery, sender, gameLock } = deliveryWith([
        connectionOf('TestAnaId', 'TestGameA'),
        connectionOf('TestLuisId', 'TestGameB'),
      ]);
      const release = await gameLock.acquire('TestGameA');

      // Act
      const catchingUp = delivery.catchUp();
      await settle();
      const beforeTheCommandEnds = [...sender.sentTo];
      release();
      await catchingUp;

      // Assert
      expect(beforeTheCommandEnds).toEqual(['TestLuisId']);
      expect(sender.sentTo.sort()).toEqual(['TestAnaId', 'TestLuisId']);
    });

    it('should log a fresh state that fails and send the others', async () => {
      // Arrange
      const { delivery, sender, errors } = deliveryWith(
        [connectionOf('TestAnaId', 'TestGameA'), connectionOf('TestLuisId', 'TestGameB')],
        'TestAnaId',
      );

      // Act
      await delivery.catchUp();

      // Assert
      expect(errors).toEqual(['sending the game state after listening again failed']);
      expect(sender.sentTo).toEqual(['TestLuisId']);
    });
  });
});
