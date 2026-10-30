import { describe, expect, it } from 'vitest';
import type {
  ConnectionChangedDto,
  ErrorDto,
  GameStateDto,
  ProgressUpdatedDto,
} from '@thelever-app/protocol';
import { INITIAL_ROOM_STATE, roomReducer, type RoomState } from '../../src/room/room-reducer.ts';

const GAME_STATE: GameStateDto = {
  type: 'game-state',
  gameId: 'TestGameId',
  gameVersion: 1,
  roomVersion: 2,
  playerId: 'TestAnaId',
  dilemmas: [
    {
      dilemmaId: 'TestDilemma1',
      text: 'TestText1',
      options: [
        { optionId: 'TestOptionA', text: 'TestOptionTextA' },
        { optionId: 'TestOptionB', text: 'TestOptionTextB' },
      ],
    },
    {
      dilemmaId: 'TestDilemma2',
      text: 'TestText2',
      options: [
        { optionId: 'TestOptionC', text: 'TestOptionTextC' },
        { optionId: 'TestOptionD', text: 'TestOptionTextD' },
      ],
    },
  ],
  players: [
    { playerId: 'TestAnaId', nickname: 'Ana', progress: 0, connected: true },
    { playerId: 'TestLuisId', nickname: 'Luis', progress: 0, connected: true },
  ],
  answers: [],
};

const ERROR: ErrorDto = {
  type: 'error',
  command: 'answer-dilemma',
  code: 'dilemma-not-reached',
};

/** The room once the first state has arrived. */
const WITH_GAME: RoomState = { game: GAME_STATE, rejection: undefined };

describe('roomReducer', () => {
  describe('game-state', () => {
    it('should become the state when there is none yet', () => {
      // Act
      const { game, rejection } = roomReducer(INITIAL_ROOM_STATE, GAME_STATE);

      // Assert
      expect(game).toBe(GAME_STATE);
      expect(rejection).toBeUndefined();
    });

    it('should replace the whole previous state', () => {
      // Arrange
      const newer: GameStateDto = {
        ...GAME_STATE,
        gameVersion: 3,
        players: [
          { playerId: 'TestAnaId', nickname: 'Ana', progress: 1, connected: true },
          { playerId: 'TestLuisId', nickname: 'Luis', progress: 2, connected: true },
        ],
        answers: [{ dilemmaId: 'TestDilemma1', vote: 'TestOption' }],
      };

      // Act
      const { game } = roomReducer(WITH_GAME, newer);

      // Assert
      expect(game).toBe(newer);
    });

    it('should drop a state older than the one it holds', () => {
      // Arrange
      const olderGame: GameStateDto = { ...GAME_STATE, gameVersion: 0 };
      const olderRoom: GameStateDto = { ...GAME_STATE, roomVersion: 1 };

      // Act & Assert
      expect(roomReducer(WITH_GAME, olderGame)).toBe(WITH_GAME);
      expect(roomReducer(WITH_GAME, olderRoom)).toBe(WITH_GAME);
    });

    it('should clear the rejection, because the state already shows what the server kept', () => {
      // Arrange
      const rejected: RoomState = { game: GAME_STATE, rejection: ERROR };

      // Act
      const { rejection } = roomReducer(rejected, { ...GAME_STATE, gameVersion: 2 });

      // Assert
      expect(rejection).toBeUndefined();
    });
  });

  describe('progress-updated', () => {
    const luisAnswered: ProgressUpdatedDto = {
      type: 'progress-updated',
      gameVersion: 2,
      playerId: 'TestLuisId',
      progress: 1,
    };

    it('should change the progress of that player and leave the others as they were', () => {
      // Act
      const { game } = roomReducer(WITH_GAME, luisAnswered);

      // Assert
      expect(game?.players).toEqual([
        { playerId: 'TestAnaId', nickname: 'Ana', progress: 0, connected: true },
        { playerId: 'TestLuisId', nickname: 'Luis', progress: 1, connected: true },
      ]);
    });

    it('should keep the version of the game it carries', () => {
      // Act
      const { game } = roomReducer(WITH_GAME, luisAnswered);

      // Assert
      expect(game?.gameVersion).toBe(2);
    });

    it('should not modify the previous state', () => {
      // Arrange
      const previous = structuredClone(WITH_GAME);

      // Act
      const next = roomReducer(previous, luisAnswered);

      // Assert
      expect(next.game).not.toBe(previous.game);
      expect(previous).toEqual(WITH_GAME);
    });

    it('should drop a progress the state already includes or that is older', () => {
      // Act & Assert
      expect(roomReducer(WITH_GAME, { ...luisAnswered, gameVersion: 1 })).toBe(WITH_GAME);
      expect(roomReducer(WITH_GAME, { ...luisAnswered, gameVersion: 0 })).toBe(WITH_GAME);
    });

    it('should do nothing when no state has arrived yet', () => {
      // Act & Assert
      expect(roomReducer(INITIAL_ROOM_STATE, luisAnswered)).toBe(INITIAL_ROOM_STATE);
    });

    it('should leave the players as they were when the player is not in the game', () => {
      // Act
      const { game } = roomReducer(WITH_GAME, { ...luisAnswered, playerId: 'TestStrangerId' });

      // Assert
      expect(game?.players).toEqual(GAME_STATE.players);
    });

    it('should keep the rejection, which is about the player and not about the others', () => {
      // Arrange
      const rejected: RoomState = { game: GAME_STATE, rejection: ERROR };

      // Act
      const { rejection } = roomReducer(rejected, luisAnswered);

      // Assert
      expect(rejection).toBe(ERROR);
    });
  });

  describe('connection-changed', () => {
    const luisDisconnected: ConnectionChangedDto = {
      type: 'connection-changed',
      roomVersion: 3,
      playerId: 'TestLuisId',
      connected: false,
    };

    it('should change whether that player is connected and keep the version of the room', () => {
      // Act
      const { game } = roomReducer(WITH_GAME, luisDisconnected);

      // Assert
      expect(game?.players).toEqual([
        { playerId: 'TestAnaId', nickname: 'Ana', progress: 0, connected: true },
        { playerId: 'TestLuisId', nickname: 'Luis', progress: 0, connected: false },
      ]);
      expect(game?.roomVersion).toBe(3);
    });

    it('should drop a change the state already includes or that is older', () => {
      // Act & Assert
      expect(roomReducer(WITH_GAME, { ...luisDisconnected, roomVersion: 2 })).toBe(WITH_GAME);
      expect(roomReducer(WITH_GAME, { ...luisDisconnected, roomVersion: 1 })).toBe(WITH_GAME);
    });

    it('should do nothing when no state has arrived yet', () => {
      // Act & Assert
      expect(roomReducer(INITIAL_ROOM_STATE, luisDisconnected)).toBe(INITIAL_ROOM_STATE);
    });
  });

  describe('error', () => {
    it('should keep the rejection and leave the game as it was', () => {
      // Act
      const { game, rejection } = roomReducer(WITH_GAME, ERROR);

      // Assert
      expect(game).toBe(GAME_STATE);
      expect(rejection).toBe(ERROR);
    });
  });

  describe('rejection-dismissed', () => {
    it('should clear the rejection and leave the game as it was', () => {
      // Arrange
      const rejected: RoomState = { game: GAME_STATE, rejection: ERROR };

      // Act
      const { game, rejection } = roomReducer(rejected, { type: 'rejection-dismissed' });

      // Assert
      expect(game).toBe(GAME_STATE);
      expect(rejection).toBeUndefined();
    });
  });
});
