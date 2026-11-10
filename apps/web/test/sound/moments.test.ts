import type { GameStateDto } from '@thelever-app/protocol';
import { describe, expect, it } from 'vitest';
import { momentsBetween, type RoomSnapshot } from '../../src/sound/moments.ts';
import { aGame } from '../support/game.ts';
import { aRoom } from '../support/room.ts';

const ANA_ANSWER = { dilemmaId: 'test-dilemma-1', vote: 'test-option-1a', votePredictions: [] };

/** The game with Ana's answer to the dilemma of the round, as the server confirms it. */
function answered(game: GameStateDto, answer = ANA_ANSWER): GameStateDto {
  return {
    ...game,
    answers: [answer],
    players: game.players.map((player) =>
      player.playerId === game.playerId ? { ...player, answered: true } : player,
    ),
  };
}

function inGame(game: GameStateDto, secondsLeft = 60): RoomSnapshot {
  return { lobby: undefined, game, secondsLeft };
}

function inLobby(lobby = aRoom()): RoomSnapshot {
  return { lobby, game: undefined, secondsLeft: undefined };
}

describe('momentsBetween', () => {
  it('should hear nothing when nothing changed', () => {
    // Arrange
    const snapshot = inGame(aGame());

    // Act & Assert
    expect(momentsBetween(snapshot, snapshot)).toEqual([]);
  });

  describe('in the lobby', () => {
    it('should hear a player joining, once however many join at the same time', () => {
      // Arrange
      const before = aRoom();
      const after = aRoom({
        players: [
          ...before.players,
          {
            playerId: 'test-pablo-id',
            nickname: 'Pablo',
            avatar: { face: 'face-04', color: 'olive' },
            connected: true,
          },
          {
            playerId: 'test-eva-id',
            nickname: 'Eva',
            avatar: { face: 'face-05', color: 'cyan' },
            connected: true,
          },
        ],
      });

      // Act & Assert
      expect(momentsBetween(inLobby(before), inLobby(after))).toEqual(['player-joined']);
    });

    it('should hear nothing when a player leaves', () => {
      // Arrange
      const before = aRoom();
      const after = aRoom({ players: before.players.slice(0, 2) });

      // Act & Assert
      expect(momentsBetween(inLobby(before), inLobby(after))).toEqual([]);
    });

    it('should hear the game starting when the lobby gives way to the game', () => {
      // Act & Assert
      expect(momentsBetween(inLobby(), inGame(aGame()))).toEqual(['game-started']);
    });
  });

  describe('in the decision of a round', () => {
    it('should hear the answer once the room confirms it', () => {
      // Arrange
      const game = aGame();

      // Act & Assert
      expect(momentsBetween(inGame(game), inGame(answered(game)))).toEqual(['answer-confirmed']);
    });

    it('should hear a changed answer too, once the room confirms it', () => {
      // Arrange
      const before = answered(aGame());
      const after = answered(aGame(), { ...ANA_ANSWER, vote: 'test-option-1b' });

      // Act & Assert
      expect(momentsBetween(inGame(before), inGame(after))).toEqual(['answer-confirmed']);
    });

    it('should hear the answer in an anonymous room, which tells nobody who answered', () => {
      // Arrange
      const game = aGame({
        players: aGame().players.map((player) => ({ ...player, answered: null })),
      });

      // Act & Assert
      expect(momentsBetween(inGame(game), inGame({ ...game, answers: [ANA_ANSWER] }))).toEqual([
        'answer-confirmed',
      ]);
    });

    it('should hear nothing when another player answers', () => {
      // Arrange
      const before = aGame();
      const after = aGame({
        players: before.players.map((player) =>
          player.playerId === 'test-luis-id' ? { ...player, answered: true } : player,
        ),
      });

      // Act & Assert
      expect(momentsBetween(inGame(before), inGame(after))).toEqual([]);
    });

    it('should tick every second of the last seconds to whoever has not answered', () => {
      // Arrange
      const game = aGame();

      // Act
      const before = momentsBetween(inGame(game, 12), inGame(game, 11));
      const ticks = [10, 9, 1].map((second) =>
        momentsBetween(inGame(game, second + 1), inGame(game, second)),
      );
      const over = momentsBetween(inGame(game, 1), inGame(game, 0));
      const sameSecond = momentsBetween(inGame(game, 5), inGame(game, 5));

      // Assert
      expect(before).toEqual([]);
      expect(ticks).toEqual([['last-seconds'], ['last-seconds'], ['last-seconds']]);
      expect(over).toEqual([]);
      expect(sameSecond).toEqual([]);
    });

    it('should not warn of the last seconds to whoever has answered', () => {
      // Arrange
      const game = answered(aGame());

      // Act & Assert
      expect(momentsBetween(inGame(game, 11), inGame(game, 10))).toEqual([]);
    });

    it('should not warn of the last seconds of a round that has just begun', () => {
      // Arrange: the clock of the previous round was already low when the next one arrived.
      const before = aGame({ round: { ...aGame().round, phase: 'reveal' } });
      const after = aGame({ round: { ...aGame().round, position: 1 } });

      // Act & Assert
      expect(momentsBetween(inGame(before, 0), inGame(after, 10))).toEqual([]);
    });
  });

  describe('when the dilemma is revealed', () => {
    it('should hear the reveal', () => {
      // Arrange
      const before = aGame();
      const after = aGame({ round: { ...before.round, phase: 'reveal', revealedBy: 'time' } });

      // Act & Assert
      expect(momentsBetween(inGame(before, 1), inGame(after, 0))).toEqual(['dilemma-revealed']);
    });

    it('should hear nothing when the group moves on to the next round', () => {
      // Arrange
      const before = aGame({ round: { ...aGame().round, phase: 'reveal' } });
      const after = aGame({ round: { ...aGame().round, position: 1 } });

      // Act & Assert
      expect(momentsBetween(inGame(before), inGame(after))).toEqual([]);
    });
  });
});
