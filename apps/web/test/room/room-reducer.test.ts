import { describe, expect, it } from 'vitest';
import type { GameStateDto, ProgressUpdatedDto } from '@thelever-app/protocol';
import { roomReducer } from '../../src/room/room-reducer.ts';

const GAME_STATE: GameStateDto = {
  type: 'game-state',
  gameId: 'TestGameId',
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
    { playerId: 'TestAnaId', nickname: 'Ana', progress: 0 },
    { playerId: 'TestLuisId', nickname: 'Luis', progress: 0 },
  ],
  answers: [],
};

describe('roomReducer', () => {
  describe('game-state', () => {
    it('should become the state when there is none yet', () => {
      // Act
      const game = roomReducer(undefined, GAME_STATE);

      // Assert
      expect(game).toBe(GAME_STATE);
    });

    it('should replace the whole previous state', () => {
      // Arrange
      const newer: GameStateDto = {
        ...GAME_STATE,
        players: [
          { playerId: 'TestAnaId', nickname: 'Ana', progress: 1 },
          { playerId: 'TestLuisId', nickname: 'Luis', progress: 2 },
        ],
        answers: [{ dilemmaId: 'TestDilemma1', vote: 'TestOption' }],
      };

      // Act
      const game = roomReducer(GAME_STATE, newer);

      // Assert
      expect(game).toBe(newer);
    });
  });

  describe('progress-updated', () => {
    const luisAnswered: ProgressUpdatedDto = {
      type: 'progress-updated',
      playerId: 'TestLuisId',
      progress: 1,
    };

    it('should change the progress of that player and leave the others as they were', () => {
      // Act
      const game = roomReducer(GAME_STATE, luisAnswered);

      // Assert
      expect(game?.players).toEqual([
        { playerId: 'TestAnaId', nickname: 'Ana', progress: 0 },
        { playerId: 'TestLuisId', nickname: 'Luis', progress: 1 },
      ]);
    });

    it('should not modify the previous state', () => {
      // Arrange
      const previous = structuredClone(GAME_STATE);

      // Act
      const game = roomReducer(previous, luisAnswered);

      // Assert
      expect(game).not.toBe(previous);
      expect(previous).toEqual(GAME_STATE);
    });

    it('should do nothing when no state has arrived yet', () => {
      // Act & Assert
      expect(roomReducer(undefined, luisAnswered)).toBeUndefined();
    });

    it('should leave the players as they were when the player is not in the game', () => {
      // Act
      const game = roomReducer(GAME_STATE, { ...luisAnswered, playerId: 'TestStrangerId' });

      // Assert
      expect(game?.players).toEqual(GAME_STATE.players);
    });
  });
});
