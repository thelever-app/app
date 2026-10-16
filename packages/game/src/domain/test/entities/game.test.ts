import { describe, expect, it } from 'vitest';
import { Game } from '../../entities/game.ts';
import { Player } from '../../entities/player.ts';
import { IdMissingError } from '../../errors/id-missing.error.ts';
import { DilemmasMissingError } from '../../errors/dilemmas-missing.error.ts';
import { DecisionPhaseNotStartedError } from '../../errors/decision-phase-not-started.error.ts';
import { PlayerNotInGameError } from '../../errors/player-not-in-game.error.ts';
import { DilemmaNotInGameError } from '../../errors/dilemma-not-in-game.error.ts';
import { ProgressUpdatedEvent } from '../../events/progress-updated.event.ts';

const DILEMMAS = ['TestDilemma1', 'TestDilemma2', 'TestDilemma3'];

function gameInDecisionPhase(): { game: Game; ana: Player; luis: Player } {
  const ana = new Player('TestAnaId', 'Ana');
  const luis = new Player('TestLuisId', 'Luis');
  const game = new Game('TestId', 'TestRoomId', DILEMMAS);
  game.startDecisionPhase([ana, luis]);
  game.pullEvents();
  return { game, ana, luis };
}

describe('Game', () => {
  describe('constructor', () => {
    it('should have an id, its room id and its dilemmas', () => {
      // Arrange
      const id = 'TestId';
      const roomId = 'TestRoomId';

      // Act
      const game = new Game(id, roomId, DILEMMAS);

      // Assert
      expect(game.id).toBe(id);
      expect(game.roomId).toBe(roomId);
      expect(game.dilemmas).toEqual(DILEMMAS);
    });

    it('should not be in the decision phase yet', () => {
      // Arrange & Act
      const game = new Game('TestId', 'TestRoomId', DILEMMAS);

      // Assert
      expect(game.isInDecisionPhase).toBe(false);
    });

    it('should throw an error if the id is missing', () => {
      // Act & Assert
      expect(() => new Game('', 'TestRoomId', DILEMMAS)).toThrow(IdMissingError);
    });

    it('should throw an error if the room id is missing', () => {
      // Act & Assert
      expect(() => new Game('TestId', '', DILEMMAS)).toThrow(IdMissingError);
    });

    it('should throw an error if there are no dilemmas', () => {
      // Act & Assert
      expect(() => new Game('TestId', 'TestRoomId', [])).toThrow(DilemmasMissingError);
    });
  });

  describe('dilemmas', () => {
    it('should not let the dilemmas be changed from outside the game', () => {
      // Arrange
      const game = new Game('TestId', 'TestRoomId', DILEMMAS);

      // Act
      (game.dilemmas as string[]).push('TestIntruderDilemma');

      // Assert
      expect(game.dilemmas).toEqual(DILEMMAS);
    });
  });

  describe('startDecisionPhase', () => {
    it('should put the game in the decision phase', () => {
      // Arrange
      const game = new Game('TestId', 'TestRoomId', DILEMMAS);

      // Act
      game.startDecisionPhase([new Player('TestAnaId', 'Ana')]);

      // Assert
      expect(game.isInDecisionPhase).toBe(true);
    });

    it('should start every player with no progress', () => {
      // Arrange
      const game = new Game('TestId', 'TestRoomId', DILEMMAS);
      const ana = new Player('TestAnaId', 'Ana');

      // Act
      game.startDecisionPhase([ana]);

      // Assert
      expect(game.progressOf(ana.id)).toBe(0);
    });
  });

  describe('answer', () => {
    it('should increase the progress of the player', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();

      // Act
      game.answer(luis.id, 'TestDilemma1', 'TestOption');
      game.answer(luis.id, 'TestDilemma2', 'TestOption');
      game.answer(luis.id, 'TestDilemma3', 'TestOption');

      // Assert
      expect(game.progressOf(luis.id)).toBe(3);
    });

    it('should not change the progress of the other players', () => {
      // Arrange
      const { game, ana, luis } = gameInDecisionPhase();

      // Act
      game.answer(luis.id, 'TestDilemma1', 'TestOption');

      // Assert
      expect(game.progressOf(ana.id)).toBe(0);
    });

    it('should not increase the progress when the player changes an answer', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', 'TestOption');

      // Act
      game.answer(luis.id, 'TestDilemma1', 'TestOtherOption');

      // Assert
      expect(game.progressOf(luis.id)).toBe(1);
    });

    it('should record a progress updated event with the new progress', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', 'TestOption');

      // Act
      game.answer(luis.id, 'TestDilemma2', 'TestOption');

      // Assert
      expect(game.pullEvents()).toEqual([
        new ProgressUpdatedEvent(game.id, luis.id, 1),
        new ProgressUpdatedEvent(game.id, luis.id, 2),
      ]);
    });

    it('should not reveal the answer in the progress updated event', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();

      // Act
      game.answer(luis.id, 'TestDilemma1', 'TestSecretOption');

      // Assert
      const [event] = game.pullEvents();
      expect(JSON.stringify(event)).not.toContain('TestSecretOption');
      expect(JSON.stringify(event)).not.toContain('TestDilemma1');
    });

    it('should not record an event when the progress does not change', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', 'TestOption');
      game.pullEvents();

      // Act
      game.answer(luis.id, 'TestDilemma1', 'TestOtherOption');

      // Assert
      expect(game.pullEvents()).toEqual([]);
    });

    it('should throw an error if the game is not in the decision phase', () => {
      // Arrange
      const game = new Game('TestId', 'TestRoomId', DILEMMAS);

      // Act & Assert
      expect(() => game.answer('TestLuisId', 'TestDilemma1', 'TestOption')).toThrow(
        DecisionPhaseNotStartedError,
      );
    });

    it('should throw an error if the player is not in the game', () => {
      // Arrange
      const { game } = gameInDecisionPhase();

      // Act & Assert
      expect(() => game.answer('TestStrangerId', 'TestDilemma1', 'TestOption')).toThrow(
        PlayerNotInGameError,
      );
    });

    it('should throw an error if the dilemma is not in the game', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();

      // Act & Assert
      expect(() => game.answer(luis.id, 'TestOtherDilemma', 'TestOption')).toThrow(
        DilemmaNotInGameError,
      );
    });
  });

  describe('progressOf', () => {
    it('should throw an error if the player is not in the game', () => {
      // Arrange
      const { game } = gameInDecisionPhase();

      // Act & Assert
      expect(() => game.progressOf('TestStrangerId')).toThrow(PlayerNotInGameError);
    });
  });

  describe('pullEvents', () => {
    it('should empty the recorded events', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', 'TestOption');

      // Act
      game.pullEvents();

      // Assert
      expect(game.pullEvents()).toEqual([]);
    });
  });
});
