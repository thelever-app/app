import { describe, expect, it } from 'vitest';
import type {
  ConnectionChangedDto,
  ErrorDto,
  GameStateDto,
  AnsweredCountDto,
  PlayerAnsweredDto,
} from '@thelever-app/protocol';
import { INITIAL_ROOM_STATE, roomReducer, type RoomState } from '../../src/room/room-reducer.ts';
import { aRoom } from '../support/room.ts';

const ANA_AVATAR = { face: 'face-01', color: 'teal' } as const;
const LUIS_AVATAR = { face: 'face-02', color: 'rust' } as const;

const GAME_STATE: GameStateDto = {
  type: 'game-state',
  gameId: 'TestGameId',
  gameVersion: 1,
  roomVersion: 2,
  playerId: 'TestAnaId',
  round: {
    position: 0,
    phase: 'decision',
    endsAt: '2026-11-09T10:01:00.000Z',
    revealedBy: null,
    movedOnBy: null,
  },
  hostId: 'TestAnaId',
  serverTime: '2026-11-09T10:00:00.000Z',
  answeredCount: 0,
  reveal: null,
  dilemmas: [
    {
      dilemmaId: 'TestDilemma1',
      predictionSubset: [],
      personInTheGap: null,
      text: 'TestText1',
      options: [
        { optionId: 'TestOptionA', text: 'TestOptionTextA' },
        { optionId: 'TestOptionB', text: 'TestOptionTextB' },
      ],
    },
    {
      dilemmaId: 'TestDilemma2',
      predictionSubset: [],
      personInTheGap: null,
      text: 'TestText2',
      options: [
        { optionId: 'TestOptionC', text: 'TestOptionTextC' },
        { optionId: 'TestOptionD', text: 'TestOptionTextD' },
      ],
    },
  ],
  players: [
    {
      playerId: 'TestAnaId',
      nickname: 'Ana',
      avatar: ANA_AVATAR,
      answered: false,
      connected: true,
      left: false,
    },
    {
      playerId: 'TestLuisId',
      nickname: 'Luis',
      avatar: LUIS_AVATAR,
      answered: false,
      connected: true,
      left: false,
    },
  ],
  answers: [],
  reports: [],
  didNotVote: [],
};

const ERROR: ErrorDto = {
  type: 'error',
  command: 'answer-dilemma',
  code: 'dilemma-not-in-round',
};

/** The room once the first state has arrived. */
const WITH_GAME: RoomState = { ...INITIAL_ROOM_STATE, game: GAME_STATE };

/** The room once the lobby has arrived. */
const LOBBY = aRoom({ roomId: 'TestRoomId', playerId: 'TestAnaId', roomVersion: 2 });
const WITH_LOBBY: RoomState = { ...INITIAL_ROOM_STATE, lobby: LOBBY };

describe('roomReducer', () => {
  describe('room-state', () => {
    it('should become the lobby when there is none yet', () => {
      // Act
      const { lobby, game } = roomReducer(INITIAL_ROOM_STATE, LOBBY);

      // Assert
      expect(lobby).toBe(LOBBY);
      expect(game).toBeUndefined();
    });

    it('should drop a lobby older than the room it holds', () => {
      // Act & Assert
      expect(roomReducer(WITH_LOBBY, { ...LOBBY, roomVersion: 1 })).toBe(WITH_LOBBY);
      expect(roomReducer(WITH_GAME, { ...LOBBY, roomVersion: 1 })).toBe(WITH_GAME);
    });

    it('should clear the rejection, because the lobby already shows what the server kept', () => {
      // Arrange
      const rejected: RoomState = { ...WITH_LOBBY, rejection: ERROR };

      // Act
      const { rejection } = roomReducer(rejected, { ...LOBBY, roomVersion: 3 });

      // Assert
      expect(rejection).toBeUndefined();
    });
  });

  describe('expelled', () => {
    it('should say the player was expelled and keep the lobby they saw', () => {
      // Act
      const { lobby, expelled } = roomReducer(WITH_LOBBY, { type: 'expelled' });

      // Assert
      expect(expelled).toBe(true);
      expect(lobby).toBe(LOBBY);
    });
  });

  describe('game-state', () => {
    it('should replace the lobby once the game starts', () => {
      // Act
      const { lobby, game } = roomReducer(WITH_LOBBY, { ...GAME_STATE, roomVersion: 3 });

      // Assert
      expect(lobby).toBeUndefined();
      expect(game?.roomVersion).toBe(3);
    });

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
          {
            playerId: 'TestAnaId',
            nickname: 'Ana',
            avatar: ANA_AVATAR,
            answered: true,
            connected: true,
            left: false,
          },
          {
            playerId: 'TestLuisId',
            nickname: 'Luis',
            avatar: LUIS_AVATAR,
            answered: false,
            connected: true,
            left: false,
          },
        ],
        answers: [
          {
            dilemmaId: 'TestDilemma1',
            vote: 'TestOption',
            matchPrediction: null,
            votePredictions: [],
          },
        ],
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
      const rejected: RoomState = { ...INITIAL_ROOM_STATE, game: GAME_STATE, rejection: ERROR };

      // Act
      const { rejection } = roomReducer(rejected, { ...GAME_STATE, gameVersion: 2 });

      // Assert
      expect(rejection).toBeUndefined();
    });
  });

  describe('player-answered', () => {
    const luisAnswered: PlayerAnsweredDto = {
      type: 'player-answered',
      gameVersion: 2,
      playerId: 'TestLuisId',
    };

    it('should mark that player as answered, count them and leave the others as they were', () => {
      // Act
      const { game } = roomReducer(WITH_GAME, luisAnswered);

      // Assert
      expect(game?.players.map(({ answered }) => answered)).toEqual([false, true]);
      expect(game?.answeredCount).toBe(1);
    });

    it('should not count again a player who had already answered', () => {
      // Arrange
      const once = roomReducer(WITH_GAME, luisAnswered);

      // Act
      const { game } = roomReducer(once, { ...luisAnswered, gameVersion: 3 });

      // Assert
      expect(game?.answeredCount).toBe(1);
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

    it('should drop an answer the state already includes or that is older', () => {
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
      expect(game?.answeredCount).toBe(0);
    });

    it('should keep the rejection, which is about the player and not about the others', () => {
      // Arrange
      const rejected: RoomState = { ...INITIAL_ROOM_STATE, game: GAME_STATE, rejection: ERROR };

      // Act
      const { rejection } = roomReducer(rejected, luisAnswered);

      // Assert
      expect(rejection).toBe(ERROR);
    });
  });

  describe('answered-count', () => {
    const twoAnswered: AnsweredCountDto = {
      type: 'answered-count',
      gameVersion: 2,
      answeredCount: 2,
    };

    it('should keep how many answered and the version of the game it carries', () => {
      // Act
      const { game } = roomReducer(WITH_GAME, twoAnswered);

      // Assert
      expect(game?.answeredCount).toBe(2);
      expect(game?.gameVersion).toBe(2);
      expect(game?.players).toEqual(GAME_STATE.players);
    });

    it('should drop a count the state already includes or that is older', () => {
      // Act & Assert
      expect(roomReducer(WITH_GAME, { ...twoAnswered, gameVersion: 1 })).toBe(WITH_GAME);
    });

    it('should do nothing when no state has arrived yet', () => {
      // Act & Assert
      expect(roomReducer(INITIAL_ROOM_STATE, twoAnswered)).toBe(INITIAL_ROOM_STATE);
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
        {
          playerId: 'TestAnaId',
          nickname: 'Ana',
          avatar: ANA_AVATAR,
          answered: false,
          connected: true,
          left: false,
        },
        {
          playerId: 'TestLuisId',
          nickname: 'Luis',
          avatar: LUIS_AVATAR,
          answered: false,
          connected: false,
          left: false,
        },
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

    it('should change whether that player is connected in the lobby too', () => {
      // Act
      const { lobby } = roomReducer(WITH_LOBBY, {
        ...luisDisconnected,
        playerId: 'test-luis-id',
      });

      // Assert
      expect(lobby?.players.map(({ connected }) => connected)).toEqual([true, false, true]);
      expect(lobby?.roomVersion).toBe(3);
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
      const rejected: RoomState = { ...INITIAL_ROOM_STATE, game: GAME_STATE, rejection: ERROR };

      // Act
      const { game, rejection } = roomReducer(rejected, { type: 'rejection-dismissed' });

      // Assert
      expect(game).toBe(GAME_STATE);
      expect(rejection).toBeUndefined();
    });
  });
});
