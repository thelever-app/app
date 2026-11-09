import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameStateDto, RoomStateDto, ServerMessageDto } from '@thelever-app/protocol';
import {
  SimulatedRoomConnection,
  type SimulatedRoomOptions,
} from '../../src/room/simulated-room-connection.ts';

/** Luis joins after a second and Marta after two; once playing, each answers a second into each round. */
const OPTIONS: SimulatedRoomOptions = {
  nickname: 'Ana',
  language: 'es',
  others: [
    { nickname: 'Luis', joinAfterMs: 1000, answerAfterMs: 1000 },
    { nickname: 'Marta', joinAfterMs: 2000, answerAfterMs: 1000 },
  ],
  dilemmas: [
    { text: 'TestText1', options: ['TestOptionA', 'TestOptionB'] },
    { text: 'TestText2', options: ['TestOptionC', 'TestOptionD', 'TestOptionE'] },
  ],
};

/** Opens a room and records every message it sends to the screen. */
async function openAndSubscribe() {
  const connection = await SimulatedRoomConnection.open(OPTIONS);
  const received: ServerMessageDto[] = [];
  const unsubscribe = connection.subscribe((message) => received.push(message));
  // Lets the use cases behind subscribe finish, without moving the clock.
  await vi.advanceTimersByTimeAsync(0);
  return { connection, received, unsubscribe };
}

function lastOf<T extends ServerMessageDto['type']>(
  received: readonly ServerMessageDto[],
  type: T,
): Extract<ServerMessageDto, { type: T }> {
  const last = received.filter((message) => message.type === type).at(-1);
  if (!last) throw new Error(`no ${type} received`);
  return last as Extract<ServerMessageDto, { type: T }>;
}

const lastLobby = (received: readonly ServerMessageDto[]): RoomStateDto =>
  lastOf(received, 'room-state');
const lastGame = (received: readonly ServerMessageDto[]): GameStateDto =>
  lastOf(received, 'game-state');

describe('SimulatedRoomConnection', () => {
  let connection: SimulatedRoomConnection | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    connection?.close();
    connection = undefined;
    vi.useRealTimers();
  });

  /** Opens the room, lets everyone in and starts the game. */
  async function playing() {
    const opened = await openAndSubscribe();
    connection = opened.connection;
    await vi.advanceTimersByTimeAsync(2000);
    connection.send({ type: 'start-game' });
    await vi.advanceTimersByTimeAsync(0);
    return opened;
  }

  describe('lobby', () => {
    it('should send the lobby at once, with the player as its host and connected', async () => {
      // Arrange & Act
      const opened = await openAndSubscribe();
      connection = opened.connection;

      // Assert
      const lobby = lastLobby(opened.received);
      expect(lobby.hostId).toBe(lobby.playerId);
      expect(lobby.players.map(({ nickname, connected }) => ({ nickname, connected }))).toEqual([
        { nickname: 'Ana', connected: true },
      ]);
    });

    it('should let each fake player in when their time comes', async () => {
      // Arrange
      const opened = await openAndSubscribe();
      connection = opened.connection;

      // Act
      await vi.advanceTimersByTimeAsync(1000);
      const afterLuis = lastLobby(opened.received).players.map(({ nickname }) => nickname);
      await vi.advanceTimersByTimeAsync(1000);

      // Assert
      expect(afterLuis).toEqual(['Ana', 'Luis']);
      expect(lastLobby(opened.received).players.map(({ nickname }) => nickname)).toEqual([
        'Ana',
        'Luis',
        'Marta',
      ]);
    });

    it('should apply what the host changes and send the lobby again', async () => {
      // Arrange
      const opened = await openAndSubscribe();
      connection = opened.connection;

      // Act
      connection.send({ type: 'change-settings', changes: { variant: 'anonymous' } });
      await vi.advanceTimersByTimeAsync(0);

      // Assert
      expect(lastLobby(opened.received).settings.variant).toBe('anonymous');
    });

    it('should find the dilemmas of its catalog', async () => {
      // Arrange
      const opened = await openAndSubscribe();
      connection = opened.connection;

      // Act
      const found = await connection.searchDilemmas({});

      // Assert
      expect(found.map(({ text }) => text).sort()).toEqual(['TestText1', 'TestText2']);
    });

    it('should stop sending messages to a listener after it unsubscribes', async () => {
      // Arrange
      const opened = await openAndSubscribe();
      connection = opened.connection;
      const before = opened.received.length;

      // Act
      opened.unsubscribe();
      await vi.advanceTimersByTimeAsync(2000);

      // Assert
      expect(opened.received).toHaveLength(before);
    });
  });

  describe('game', () => {
    /** The answer of the player using the screen to the dilemma of the round, with every prediction. */
    function answerTheRound(received: readonly ServerMessageDto[]) {
      const game = lastGame(received);
      const dilemma = game.dilemmas[game.round.position]!;
      const vote = dilemma.options[0]!.optionId;
      const votePredictions = dilemma.predictionSubset.map((playerId) => ({ playerId, vote }));
      connection!.send({
        type: 'answer-dilemma',
        dilemmaId: dilemma.dilemmaId,
        vote,
        matchPrediction: 0,
        votePredictions,
      });
      return { dilemmaId: dilemma.dilemmaId, vote, votePredictions };
    }

    it('should send the game once the host starts it, on the decision of its first round', async () => {
      // Arrange & Act
      const { received } = await playing();

      // Assert
      const game = lastGame(received);
      expect(game.dilemmas.map(({ text }) => text).sort()).toEqual(['TestText1', 'TestText2']);
      expect(game.round).toMatchObject({ position: 0, phase: 'decision' });
      expect(game.players.map(({ answered }) => answered)).toEqual([false, false, false]);
    });

    it('should send who answered as each fake player answers the round, once', async () => {
      // Arrange
      const { received } = await playing();
      const ids = lastGame(received).players.map(({ playerId }) => playerId);

      // Act
      await vi.advanceTimersByTimeAsync(5000);

      // Assert
      const answered = received
        .filter((message) => message.type === 'player-answered')
        .map(({ playerId }) => playerId);
      expect(answered).toEqual([ids[1], ids[2]]);
    });

    it('should never send the votes of a fake player before the reveal', async () => {
      // Arrange
      const { received } = await playing();

      // Act
      await vi.advanceTimersByTimeAsync(5000);

      // Assert
      expect(received.filter(({ type }) => type === 'player-answered')).not.toHaveLength(0);
      for (const message of received) expect(message).not.toHaveProperty('vote');
      expect(lastGame(received).reveal).toBeNull();
    });

    it('should answer for the player and reveal the dilemma once everyone answered', async () => {
      // Arrange: a nominal room, where the answer is the vote with every prediction.
      const { received } = await playing();
      await vi.advanceTimersByTimeAsync(1000);

      // Act
      const { dilemmaId, vote, votePredictions } = answerTheRound(received);
      await vi.advanceTimersByTimeAsync(0);

      // Assert
      const game = lastGame(received);
      expect(game.answers).toEqual([{ dilemmaId, vote, matchPrediction: 0, votePredictions }]);
      expect(game.round).toMatchObject({ position: 0, phase: 'reveal', revealedBy: 'everyone' });
      expect(game.reveal?.votes).toHaveLength(3);
    });

    it('should reveal the dilemma when the time of the round runs out', async () => {
      // Arrange
      const { received } = await playing();

      // Act
      await vi.advanceTimersByTimeAsync(60_000);

      // Assert
      expect(lastGame(received).round).toMatchObject({ phase: 'reveal', revealedBy: 'time' });
    });

    it('should reveal the dilemma early when the host asks', async () => {
      // Arrange
      const { received } = await playing();

      // Act
      connection!.send({ type: 'reveal-early' });
      await vi.advanceTimersByTimeAsync(0);

      // Assert
      expect(lastGame(received).round).toMatchObject({ phase: 'reveal', revealedBy: 'host' });
    });

    it('should move everyone on to the next round, where the fake players answer again', async () => {
      // Arrange
      const { received } = await playing();
      connection!.send({ type: 'reveal-early' });
      await vi.advanceTimersByTimeAsync(0);

      // Act
      connection!.send({ type: 'move-on', fromPosition: 0 });
      await vi.advanceTimersByTimeAsync(0);
      const moved = lastGame(received);
      await vi.advanceTimersByTimeAsync(1000);

      // Assert
      expect(moved.round).toMatchObject({ position: 1, phase: 'decision' });
      expect(moved.round.movedOnBy).toBe(moved.playerId);
      const answeredSince = received
        .slice(received.indexOf(moved))
        .filter(({ type }) => type === 'player-answered');
      expect(answeredSince).toHaveLength(2);
    });

    it('should stop the fake players and send nothing more once closed', async () => {
      // Arrange
      const { received } = await playing();
      const before = received.length;

      // Act
      connection!.close();
      await vi.advanceTimersByTimeAsync(60_000);

      // Assert
      expect(received).toHaveLength(before);
    });
  });

  it('should always be connected, because it runs in the browser', async () => {
    // Arrange
    const opened = await openAndSubscribe();
    connection = opened.connection;
    const statuses: string[] = [];

    // Act
    connection.subscribeStatus((status) => statuses.push(status));

    // Assert
    expect(statuses).toEqual(['connected']);
    expect(connection.getStatus()).toBe('connected');
  });
});
