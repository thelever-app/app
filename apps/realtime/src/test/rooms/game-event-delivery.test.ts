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

/**
 * The sockets of the instance: they remember what they delivered and to whom they sent a fresh
 * state, or fail if told to, or for one player.
 */
class RecordingNotifier implements PlayerNotifier {
  readonly delivered: DomainEvent[] = [];
  readonly sentTo: string[] = [];
  failing = false;
  readonly #failingFor: string | undefined;

  constructor(failingFor?: string) {
    this.#failingFor = failingFor;
  }

  async notify(_playerIds: readonly string[], event: DomainEvent): Promise<void> {
    if (this.failing) throw new Error('socket closed');
    this.delivered.push(event);
  }

  async sendState(_connection: RoomConnection, { playerId }: Session): Promise<void> {
    if (playerId === this.#failingFor) throw new Error('socket closed');
    this.sentTo.push(playerId);
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

/** The delivery of an instance with those connections. */
function deliveryWith(connections: readonly RoomConnection[], failingFor?: string) {
  const notifier = new RecordingNotifier(failingFor);
  const roomLock = new KeyedLock();
  const { logger, errors } = recordingLogger();
  const delivery = new GameEventDelivery(notifier, roomLock, logger, () => connections);
  return { delivery, notifier, roomLock, sender: notifier, errors };
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
