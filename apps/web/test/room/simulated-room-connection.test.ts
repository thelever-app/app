import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameStateDto, ServerMessageDto } from '@thelever-app/protocol';
import {
  SimulatedRoomConnection,
  type SimulatedRoomOptions,
} from '../../src/room/simulated-room-connection.ts';

/** Luis answers a dilemma every second; the game has two. */
const OPTIONS: SimulatedRoomOptions = {
  nickname: 'Ana',
  others: [{ nickname: 'Luis', answerEveryMs: 1000 }],
  dilemmaIds: ['TestDilemma1', 'TestDilemma2'],
  vote: 'TestFakePlayerVote',
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

function lastGameState(received: readonly ServerMessageDto[]): GameStateDto {
  const states = received.filter((message) => message.type === 'game-state');
  const last = states.at(-1);
  if (!last) throw new Error('no game state received');
  return last;
}

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

  describe('subscribe', () => {
    it('should send the game state at once, with no progress and no answers', async () => {
      // Arrange & Act
      const opened = await openAndSubscribe();
      connection = opened.connection;

      // Assert
      expect(opened.received).toHaveLength(1);
      const state = lastGameState(opened.received);
      expect(state.dilemmaIds).toEqual(OPTIONS.dilemmaIds);
      expect(state.players.map(({ nickname, progress }) => ({ nickname, progress }))).toEqual([
        { nickname: 'Ana', progress: 0 },
        { nickname: 'Luis', progress: 0 },
      ]);
      expect(state.answers).toEqual([]);
    });

    it('should stop sending messages to a listener after it unsubscribes', async () => {
      // Arrange
      const opened = await openAndSubscribe();
      connection = opened.connection;

      // Act
      opened.unsubscribe();
      await vi.advanceTimersByTimeAsync(2000);

      // Assert
      expect(opened.received).toHaveLength(1);
    });
  });

  describe('fake players', () => {
    it('should send the progress of each fake player as they answer, until they finish', async () => {
      // Arrange
      const opened = await openAndSubscribe();
      connection = opened.connection;
      const luisId = lastGameState(opened.received).players[1]?.playerId;

      // Act
      await vi.advanceTimersByTimeAsync(5000);

      // Assert
      expect(opened.received.slice(1)).toEqual([
        { type: 'progress-updated', playerId: luisId, progress: 1 },
        { type: 'progress-updated', playerId: luisId, progress: 2 },
      ]);
    });

    it('should never send the vote of a fake player', async () => {
      // Arrange
      const opened = await openAndSubscribe();
      connection = opened.connection;

      // Act
      await vi.advanceTimersByTimeAsync(5000);

      // Assert
      expect(JSON.stringify(opened.received)).not.toContain(OPTIONS.vote);
    });
  });

  describe('send', () => {
    it('should answer for the player and send back their answer and progress', async () => {
      // Arrange
      const opened = await openAndSubscribe();
      connection = opened.connection;

      // Act
      opened.connection.send({
        type: 'answer-dilemma',
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
      });
      await vi.advanceTimersByTimeAsync(0);

      // Assert
      const state = lastGameState(opened.received);
      expect(state.answers).toEqual([{ dilemmaId: 'TestDilemma1', vote: 'TestOption' }]);
      expect(state.players.find(({ playerId }) => playerId === state.playerId)?.progress).toBe(1);
    });

    it('should keep only the new vote when the player changes an answer', async () => {
      // Arrange
      const opened = await openAndSubscribe();
      connection = opened.connection;
      opened.connection.send({
        type: 'answer-dilemma',
        dilemmaId: 'TestDilemma1',
        vote: 'TestOption',
      });
      await vi.advanceTimersByTimeAsync(0);

      // Act
      opened.connection.send({
        type: 'answer-dilemma',
        dilemmaId: 'TestDilemma1',
        vote: 'TestOtherOption',
      });
      await vi.advanceTimersByTimeAsync(0);

      // Assert
      const state = lastGameState(opened.received);
      expect(state.answers).toEqual([{ dilemmaId: 'TestDilemma1', vote: 'TestOtherOption' }]);
      expect(state.players.find(({ playerId }) => playerId === state.playerId)?.progress).toBe(1);
    });
  });

  describe('close', () => {
    it('should stop the fake players and send nothing more', async () => {
      // Arrange
      const opened = await openAndSubscribe();
      connection = opened.connection;

      // Act
      opened.connection.close();
      await vi.advanceTimersByTimeAsync(5000);

      // Assert
      expect(opened.received).toHaveLength(1);
    });
  });
});
