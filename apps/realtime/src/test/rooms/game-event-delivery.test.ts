import type { Logger } from '@thelever-app/db';
import {
  ConnectionChangedEvent,
  type DomainEvent,
  LobbyChangedEvent,
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

/** A connection of this instance, with the player in that room. */
function connectionOf(playerId: string, roomId: string): RoomConnection {
  const connection = new RoomConnection({ send: () => {} } as unknown as WebSocket);
  connection.session = { roomId, playerId, connectionId: `${playerId}Connection`, language: 'es' };
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
      return 'sent' as const;
    },
  };
}

/** The delivery of an instance with those connections. */
function deliveryWith(connections: readonly RoomConnection[], failingFor?: string) {
  const notifier = new RecordingNotifier();
  const roomLock = new KeyedLock();
  const sender = recordingSender(failingFor);
  const { logger, errors } = recordingLogger();
  const delivery = new GameEventDelivery(notifier, sender, roomLock, logger, () => connections);
  return { delivery, notifier, roomLock, sender, errors };
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('GameEventDelivery', () => {
  describe('deliver', () => {
    it('should wait for the command of the room before delivering an event of its game', async () => {
      // Arrange: a command of the room holds it, and has not sent the answerer their state yet.
      const { delivery, notifier, roomLock } = deliveryWith([
        connectionOf('TestAnaId', 'TestRoomId'),
      ]);
      const release = await roomLock.acquire('TestRoomId');
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

    it('should wait for the command of the room before delivering an event of the room', async () => {
      // Arrange
      const { delivery, notifier, roomLock } = deliveryWith([
        connectionOf('TestAnaId', 'TestRoomId'),
      ]);
      const release = await roomLock.acquire('TestRoomId');
      const change = new LobbyChangedEvent('TestRoomId', 'settings-changed', 3);

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

    it('should not hold an event for a room that no command of another room holds', async () => {
      // Arrange: a command holds another room.
      const { delivery, notifier, roomLock } = deliveryWith([
        connectionOf('TestAnaId', 'TestRoomId'),
      ]);
      const release = await roomLock.acquire('TestOtherRoomId');
      const change = new ConnectionChangedEvent('TestRoomId', 'TestLuisId', true, 3);

      // Act
      await delivery.deliver(['TestAnaId'], change, undefined);
      release();

      // Assert
      expect(notifier.delivered).toEqual([change]);
    });

    it('should log a delivery that fails and let the next one through', async () => {
      // Arrange
      const { delivery, notifier, errors } = deliveryWith([
        connectionOf('TestAnaId', 'TestRoomId'),
      ]);
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
    it('should send each player a fresh state once the command of their room is done', async () => {
      // Arrange: a command holds the room of Ana, not that of Luis.
      const { delivery, sender, roomLock } = deliveryWith([
        connectionOf('TestAnaId', 'TestRoomA'),
        connectionOf('TestLuisId', 'TestRoomB'),
      ]);
      const release = await roomLock.acquire('TestRoomA');

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
        [connectionOf('TestAnaId', 'TestRoomA'), connectionOf('TestLuisId', 'TestRoomB')],
        'TestAnaId',
      );

      // Act
      await delivery.catchUp();

      // Assert
      expect(errors).toEqual(['sending the state after listening again failed']);
      expect(sender.sentTo).toEqual(['TestLuisId']);
    });
  });
});
