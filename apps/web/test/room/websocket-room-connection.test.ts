import {
  CONTRACT_VERSION,
  type ErrorDto,
  type GameStateDto,
  type ServerMessageDto,
} from '@thelever-app/protocol';
import { describe, expect, it } from 'vitest';
import type { RoomConnectionStatus } from '../../src/room/room-connection.ts';
import { WebSocketRoomConnection } from '../../src/room/websocket-room-connection.ts';
import { FakeScheduler, FakeSocket } from '../support/fake-socket.ts';

const GAME_STATE: GameStateDto = {
  type: 'game-state',
  gameId: 'test-game-id',
  gameVersion: 1,
  roomVersion: 1,
  playerId: 'test-ana-id',
  dilemmas: [
    {
      dilemmaId: 'test-dilemma-1',
      text: 'TestText1',
      options: [
        { optionId: 'test-option-a', text: 'TestOptionA' },
        { optionId: 'test-option-b', text: 'TestOptionB' },
      ],
    },
  ],
  players: [{ playerId: 'test-ana-id', nickname: 'Ana', progress: 0, connected: true }],
  answers: [],
};

/** Lets the pending promises run, such as the one that asks for the token. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Opens a connection whose sockets, waits and randomness the test controls; `random` is 1 by default. */
function open(random = () => 1) {
  const sockets: FakeSocket[] = [];
  const scheduler = new FakeScheduler();
  const tokens = ['test-token-1', 'test-token-2', 'test-token-3', 'test-token-4'];
  const connection = WebSocketRoomConnection.open({
    url: 'wss://realtime.test',
    gameId: 'test-game-id',
    language: 'es',
    getToken: async (forceRefresh) =>
      forceRefresh ? 'test-fresh-token' : (tokens.shift() ?? 'test-token-last'),
    createSocket: (url) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    },
    schedule: scheduler.schedule,
    random,
  });
  const received: ServerMessageDto[] = [];
  const statuses: RoomConnectionStatus[] = [];
  connection.subscribe((message) => received.push(message));
  connection.subscribeStatus((status) => statuses.push(status));
  const current = () => sockets.at(-1)!;
  return { connection, sockets, current, scheduler, received, statuses };
}

/** Opens the current socket and lets the connection send `connect`. */
async function accept(socket: FakeSocket): Promise<void> {
  socket.open();
  await settle();
}

describe('WebSocketRoomConnection', () => {
  describe('connecting', () => {
    it('should open a socket to the room server at once', () => {
      // Act
      const { sockets } = open();

      // Assert
      expect(sockets.map(({ url }) => url)).toEqual(['wss://realtime.test']);
    });

    it('should send connect with the contract version, the token, the game and the language', async () => {
      // Arrange
      const { current } = open();

      // Act
      await accept(current());

      // Assert
      expect(current().sentMessages()).toEqual([
        {
          type: 'connect',
          contractVersion: CONTRACT_VERSION,
          token: 'test-token-1',
          gameId: 'test-game-id',
          language: 'es',
        },
      ]);
    });

    it('should tell its current status when asked, without waiting for a change', async () => {
      // Arrange
      const { connection, current } = open();
      const beforeState = connection.getStatus();
      await accept(current());

      // Act
      current().receive(GAME_STATE);

      // Assert
      expect(beforeState).toBe('connecting');
      expect(connection.getStatus()).toBe('connected');
    });

    it('should be connecting until the first game state arrives, then connected', async () => {
      // Arrange
      const { current, statuses } = open();
      await accept(current());

      // Act
      current().receive(GAME_STATE);

      // Assert
      expect(statuses).toEqual(['connecting', 'connected']);
    });
  });

  describe('messages', () => {
    it('should hand every message of the server to the listeners', async () => {
      // Arrange
      const { current, received } = open();
      await accept(current());

      // Act
      current().receive(GAME_STATE);

      // Assert
      expect(received).toEqual([GAME_STATE]);
    });

    it('should drop a frame that does not follow the contract', async () => {
      // Arrange
      const { current, received } = open();
      await accept(current());

      // Act
      current().receive('not json');
      current().receive({ type: 'reveal-started' });

      // Assert
      expect(received).toEqual([]);
    });

    it('should send a message as JSON once connected', async () => {
      // Arrange
      const { connection, current } = open();
      await accept(current());
      current().receive(GAME_STATE);

      // Act
      connection.send({
        type: 'answer-dilemma',
        dilemmaId: 'test-dilemma-1',
        vote: 'test-option-a',
      });

      // Assert
      expect(current().sentMessages().at(-1)).toEqual({
        type: 'answer-dilemma',
        dilemmaId: 'test-dilemma-1',
        vote: 'test-option-a',
      });
    });

    it('should keep what the screen sends while not connected and send it once connected again', async () => {
      // Arrange
      const { connection, current, scheduler } = open();
      await accept(current());
      current().receive(GAME_STATE);
      current().drop();

      // Act
      connection.send({
        type: 'answer-dilemma',
        dilemmaId: 'test-dilemma-1',
        vote: 'test-option-a',
      });
      scheduler.runLast();
      await accept(current());
      const beforeState = current().sentMessages().length;
      current().receive(GAME_STATE);

      // Assert
      expect(beforeState).toBe(1);
      expect(
        current()
          .sentMessages()
          .map((message) => (message as { type: string }).type),
      ).toEqual(['connect', 'answer-dilemma']);
    });
  });

  describe('reconnecting', () => {
    it('should be reconnecting and wait before opening another socket when the connection drops', async () => {
      // Arrange
      const { current, sockets, scheduler, statuses } = open();
      await accept(current());
      current().receive(GAME_STATE);

      // Act
      current().drop();

      // Assert
      expect(statuses.at(-1)).toBe('reconnecting');
      expect(sockets).toHaveLength(1);
      expect(scheduler.waits.map(({ ms }) => ms)).toEqual([500]);
    });

    it('should wait a random part of the backoff', async () => {
      // Arrange
      const { current, scheduler } = open(() => 0.5);
      await accept(current());

      // Act
      current().drop();

      // Assert
      expect(scheduler.waits.map(({ ms }) => ms)).toEqual([250]);
    });

    it('should double the wait on every failed attempt, never above 10 seconds', async () => {
      // Arrange
      const { current, scheduler } = open();

      // Act
      for (let attempt = 0; attempt < 7; attempt += 1) {
        current().drop();
        scheduler.runLast();
      }

      // Assert
      expect(scheduler.waits.map(({ ms }) => ms)).toEqual([
        500, 1000, 2000, 4000, 8000, 10000, 10000,
      ]);
    });

    it('should open a new socket and send connect again when the wait is over', async () => {
      // Arrange
      const { current, sockets, scheduler } = open();
      await accept(current());
      current().drop();

      // Act
      scheduler.runLast();
      await accept(current());

      // Assert
      expect(sockets).toHaveLength(2);
      expect(current().sentMessages()).toEqual([
        expect.objectContaining({ type: 'connect', token: 'test-token-2' }),
      ]);
    });

    it('should go back to the shortest wait after a good connection', async () => {
      // Arrange
      const { current, scheduler } = open();
      current().drop();
      scheduler.runLast();
      current().drop();
      scheduler.runLast();
      await accept(current());
      current().receive(GAME_STATE);

      // Act
      current().drop();

      // Assert
      expect(scheduler.waits.map(({ ms }) => ms)).toEqual([500, 1000, 500]);
    });

    it('should not send connect on a socket that dropped while the token was coming', async () => {
      // Arrange
      const { current } = open();
      const socket = current();

      // Act
      socket.open();
      socket.drop();
      await settle();

      // Assert
      expect(socket.sent).toEqual([]);
    });
  });

  describe('rejected connect', () => {
    function rejection(code: ErrorDto['code']): ErrorDto {
      return { type: 'error', command: 'connect', code };
    }

    it('should send connect again on the same socket with a fresh token when the server rejects the token', async () => {
      // Arrange
      const { current, sockets, statuses, received } = open();
      await accept(current());

      // Act
      current().receive(rejection('invalid-token'));
      await settle();

      // Assert
      expect(current().sentMessages()).toEqual([
        expect.objectContaining({ type: 'connect', token: 'test-token-1' }),
        expect.objectContaining({ type: 'connect', token: 'test-fresh-token' }),
      ]);
      expect(sockets).toHaveLength(1);
      expect(statuses).toEqual(['connecting']);
      expect(received).toEqual([]);
    });

    it('should give up when the server rejects the fresh token too', async () => {
      // Arrange
      const { current, scheduler, statuses, received } = open();
      await accept(current());
      current().receive(rejection('invalid-token'));
      await settle();

      // Act
      current().receive(rejection('invalid-token'));
      current().drop();

      // Assert
      expect(statuses.at(-1)).toBe('rejected');
      expect(current().closedByClient).toBe(true);
      expect(scheduler.waits).toEqual([]);
      expect(received).toEqual([rejection('invalid-token')]);
    });

    it('should ask for a fresh token again after a good connection', async () => {
      // Arrange
      const { current, scheduler, statuses } = open();
      await accept(current());
      current().receive(rejection('invalid-token'));
      await settle();
      current().receive(GAME_STATE);
      current().drop();
      scheduler.runLast();
      await accept(current());

      // Act
      current().receive(rejection('invalid-token'));
      await settle();

      // Assert
      expect(statuses.at(-1)).toBe('reconnecting');
      expect(current().sentMessages().at(-1)).toEqual(
        expect.objectContaining({ type: 'connect', token: 'test-fresh-token' }),
      );
    });

    it.each(['game-not-found', 'player-not-in-game', 'unsupported-contract-version'] as const)(
      'should give up for good when the server rejects connect with %s',
      async (code) => {
        // Arrange
        const { current, sockets, scheduler, statuses, received } = open();
        await accept(current());

        // Act
        current().receive(rejection(code));
        current().drop();

        // Assert
        expect(statuses).toEqual(['connecting', 'rejected']);
        expect(current().closedByClient).toBe(true);
        expect(scheduler.waits).toEqual([]);
        expect(sockets).toHaveLength(1);
        expect(received).toEqual([rejection(code)]);
      },
    );

    it('should hand the rejection to the screen before it says it gave up, so the screen knows why', async () => {
      // Arrange
      const { connection, current, received } = open();
      await accept(current());
      const receivedWhenRejected: ServerMessageDto[] = [];
      connection.subscribeStatus((status) => {
        if (status === 'rejected') receivedWhenRejected.push(...received);
      });

      // Act
      current().receive(rejection('game-not-found'));

      // Assert
      expect(receivedWhenRejected).toEqual([rejection('game-not-found')]);
    });

    it('should give up when a reconnection finds that the game is gone', async () => {
      // Arrange
      const { current, scheduler, statuses } = open();
      await accept(current());
      current().receive(GAME_STATE);
      current().drop();
      scheduler.runLast();
      await accept(current());

      // Act
      current().receive(rejection('game-not-found'));

      // Assert
      expect(statuses).toEqual(['connecting', 'connected', 'reconnecting', 'rejected']);
    });

    it('should keep what the screen sends after giving up, and never send it', async () => {
      // Arrange
      const { connection, current } = open();
      await accept(current());
      current().receive(rejection('game-not-found'));

      // Act
      connection.send({
        type: 'answer-dilemma',
        dilemmaId: 'test-dilemma-1',
        vote: 'test-option-a',
      });

      // Assert
      expect(current().sentMessages()).toEqual([expect.objectContaining({ type: 'connect' })]);
    });
  });

  describe('close', () => {
    it('should close the socket and never reconnect', async () => {
      // Arrange
      const { connection, current, sockets, scheduler } = open();
      await accept(current());

      // Act
      connection.close();
      current().drop();

      // Assert
      expect(current().closedByClient).toBe(true);
      expect(scheduler.waits).toEqual([]);
      expect(sockets).toHaveLength(1);
    });

    it('should cancel a reconnection that is waiting', async () => {
      // Arrange
      const { connection, current, scheduler } = open();
      current().drop();

      // Act
      connection.close();

      // Assert
      expect(scheduler.waits.at(-1)?.cancelled).toBe(true);
    });
  });
});
