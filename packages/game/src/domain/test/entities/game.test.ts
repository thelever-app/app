import { describe, expect, it } from 'vitest';
import { Game } from '../../entities/game.ts';
import { Player } from '../../entities/player.ts';
import { IdMissingError } from '../../errors/id-missing.error.ts';
import { DilemmasMissingError } from '../../errors/dilemmas-missing.error.ts';
import { DecisionPhaseNotStartedError } from '../../errors/decision-phase-not-started.error.ts';
import { PlayerNotInGameError } from '../../errors/player-not-in-game.error.ts';
import { DilemmaNotInGameError } from '../../errors/dilemma-not-in-game.error.ts';
import { ProgressUpdatedEvent } from '../../events/progress-updated.event.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';
import { DuplicateDilemmaError } from '../../errors/duplicate-dilemma.error.ts';
import { PlayersMissingError } from '../../errors/players-missing.error.ts';
import { DecisionPhaseAlreadyStartedError } from '../../errors/decision-phase-already-started.error.ts';
import { OptionNotInDilemmaError } from '../../errors/option-not-in-dilemma.error.ts';
import { DilemmaNotReachedError } from '../../errors/dilemma-not-reached.error.ts';
import { OptionsMissingError } from '../../errors/options-missing.error.ts';

const OPTION_IDS = ['TestOption', 'TestOtherOption', 'TestSecretOption'];
const DILEMMAS = ['TestDilemma1', 'TestDilemma2', 'TestDilemma3'].map((dilemmaId) => ({
  dilemmaId,
  optionIds: OPTION_IDS,
}));

function gameInDecisionPhase(): { game: Game; ana: Player; luis: Player } {
  const ana = Player.create({ nickname: 'Ana' }, new FixedIdGenerator('TestAnaId'));
  const luis = Player.create({ nickname: 'Luis' }, new FixedIdGenerator('TestLuisId'));
  const game = Game.create(
    { roomId: 'TestRoomId', dilemmas: DILEMMAS },
    new FixedIdGenerator('TestId'),
  );
  game.startDecisionPhase([ana, luis]);
  game.pullEvents();
  return { game, ana, luis };
}

describe('Game', () => {
  describe('create', () => {
    it('should have an id, its room id and its dilemmas', () => {
      // Arrange
      const id = 'TestId';
      const roomId = 'TestRoomId';

      // Act
      const game = Game.create({ roomId, dilemmas: DILEMMAS }, new FixedIdGenerator(id));

      // Assert
      expect(game.id).toBe(id);
      expect(game.roomId).toBe(roomId);
      expect(game.dilemmas).toEqual(DILEMMAS);
    });

    it('should not be in the decision phase yet', () => {
      // Arrange & Act
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS },
        new FixedIdGenerator('TestId'),
      );

      // Assert
      expect(game.isInDecisionPhase).toBe(false);
    });

    it('should throw an error if the id is missing', () => {
      // Act & Assert
      expect(() =>
        Game.create({ roomId: 'TestRoomId', dilemmas: DILEMMAS }, new FixedIdGenerator('')),
      ).toThrow(IdMissingError);
    });

    it('should throw an error if the room id is missing', () => {
      // Act & Assert
      expect(() =>
        Game.create({ roomId: '', dilemmas: DILEMMAS }, new FixedIdGenerator('TestId')),
      ).toThrow(IdMissingError);
    });

    it('should throw an error if there are no dilemmas', () => {
      // Act & Assert
      expect(() =>
        Game.create({ roomId: 'TestRoomId', dilemmas: [] }, new FixedIdGenerator('TestId')),
      ).toThrow(DilemmasMissingError);
    });
  });

  describe('dilemmas', () => {
    it('should not let the dilemmas be changed from outside the game', () => {
      // Arrange
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS },
        new FixedIdGenerator('TestId'),
      );

      // Act
      (game.dilemmas as { dilemmaId: string; optionIds: string[] }[]).push({
        dilemmaId: 'TestIntruderDilemma',
        optionIds: OPTION_IDS,
      });

      // Assert
      expect(game.dilemmas).toEqual(DILEMMAS);
    });
  });

  describe('startDecisionPhase', () => {
    it('should put the game in the decision phase', () => {
      // Arrange
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS },
        new FixedIdGenerator('TestId'),
      );

      // Act
      game.startDecisionPhase([
        Player.create({ nickname: 'Ana' }, new FixedIdGenerator('TestAnaId')),
      ]);

      // Assert
      expect(game.isInDecisionPhase).toBe(true);
    });

    it('should start every player with no progress', () => {
      // Arrange
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS },
        new FixedIdGenerator('TestId'),
      );
      const ana = Player.create({ nickname: 'Ana' }, new FixedIdGenerator('TestAnaId'));

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
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS },
        new FixedIdGenerator('TestId'),
      );

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

    it('should throw an error if the vote is not one of the options of the dilemma', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();

      // Act & Assert
      expect(() => game.answer(luis.id, 'TestDilemma1', 'TestUnknownOption')).toThrow(
        OptionNotInDilemmaError,
      );
      expect(game.progressOf(luis.id)).toBe(0);
    });

    it('should throw an error if the player skips a dilemma they have not answered', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', 'TestOption');

      // Act & Assert
      expect(() => game.answer(luis.id, 'TestDilemma3', 'TestOption')).toThrow(
        DilemmaNotReachedError,
      );
      expect(game.progressOf(luis.id)).toBe(1);
    });

    it('should let the player go back and change an earlier answer', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', 'TestOption');
      game.answer(luis.id, 'TestDilemma2', 'TestOption');

      // Act
      game.answer(luis.id, 'TestDilemma1', 'TestOtherOption');

      // Assert
      expect(game.answersOf(luis.id)[0]).toEqual({
        dilemmaId: 'TestDilemma1',
        vote: 'TestOtherOption',
      });
      expect(game.progressOf(luis.id)).toBe(2);
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

  describe('answersOf', () => {
    it('should be empty before the player answers', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();

      // Act & Assert
      expect(game.answersOf(luis.id)).toEqual([]);
    });

    it('should list the answers of the player in the order of the dilemmas', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', 'TestOption');
      game.answer(luis.id, 'TestDilemma2', 'TestOtherOption');
      game.answer(luis.id, 'TestDilemma1', 'TestSecretOption');

      // Act
      const answers = game.answersOf(luis.id);

      // Assert
      expect(answers).toEqual([
        { dilemmaId: 'TestDilemma1', vote: 'TestSecretOption' },
        { dilemmaId: 'TestDilemma2', vote: 'TestOtherOption' },
      ]);
    });

    it('should list only the new vote of a changed answer', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', 'TestOption');

      // Act
      game.answer(luis.id, 'TestDilemma1', 'TestOtherOption');

      // Assert
      expect(game.answersOf(luis.id)).toEqual([
        { dilemmaId: 'TestDilemma1', vote: 'TestOtherOption' },
      ]);
    });

    it('should not include the answers of the other players', () => {
      // Arrange
      const { game, ana, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', 'TestOption');

      // Act & Assert
      expect(game.answersOf(ana.id)).toEqual([]);
    });

    it('should throw an error if the player is not in the game', () => {
      // Arrange
      const { game } = gameInDecisionPhase();

      // Act & Assert
      expect(() => game.answersOf('TestStrangerId')).toThrow(PlayerNotInGameError);
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

  describe('playerIds', () => {
    it('should be empty before the decision phase', () => {
      // Arrange & Act
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS },
        new FixedIdGenerator('TestId'),
      );

      // Assert
      expect(game.playerIds).toEqual([]);
    });

    it('should list the players of the decision phase', () => {
      // Arrange & Act
      const { game, ana, luis } = gameInDecisionPhase();

      // Assert
      expect(game.playerIds).toEqual([ana.id, luis.id]);
    });
  });

  describe('toSnapshot', () => {
    it('should return its state as plain data', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', 'TestOption');

      // Act
      const snapshot = game.toSnapshot();

      // Assert
      expect(snapshot).toEqual({
        id: 'TestId',
        roomId: 'TestRoomId',
        dilemmas: DILEMMAS,
        inDecisionPhase: true,
        players: [
          { id: 'TestAnaId', answers: [] },
          { id: 'TestLuisId', answers: [{ dilemmaId: 'TestDilemma1', vote: 'TestOption' }] },
        ],
      });
    });
  });

  describe('restore', () => {
    it('should rebuild the game from its snapshot', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', 'TestOption');
      game.answer(luis.id, 'TestDilemma2', 'TestOption');

      // Act
      const restored = Game.restore(game.toSnapshot());

      // Assert
      expect(restored.toSnapshot()).toEqual(game.toSnapshot());
      expect(restored.progressOf(luis.id)).toBe(2);
    });

    it('should rebuild a game that is not in the decision phase yet', () => {
      // Arrange
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS },
        new FixedIdGenerator('TestId'),
      );

      // Act
      const restored = Game.restore(game.toSnapshot());

      // Assert
      expect(restored.isInDecisionPhase).toBe(false);
      expect(restored.playerIds).toEqual([]);
    });

    it('should not record any event', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', 'TestOption');

      // Act
      const restored = Game.restore(game.toSnapshot());

      // Assert
      expect(restored.pullEvents()).toEqual([]);
    });

    it('should go on from the restored progress', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', 'TestOption');
      const restored = Game.restore(game.toSnapshot());

      // Act
      restored.answer(luis.id, 'TestDilemma2', 'TestOption');

      // Assert
      expect(restored.pullEvents()).toEqual([new ProgressUpdatedEvent('TestId', luis.id, 2)]);
    });
  });

  describe('invariants', () => {
    it('should throw an error if a dilemma has no options', () => {
      // Act & Assert
      expect(() =>
        Game.create(
          { roomId: 'TestRoomId', dilemmas: [{ dilemmaId: 'TestDilemma1', optionIds: [] }] },
          new FixedIdGenerator('TestId'),
        ),
      ).toThrow(OptionsMissingError);
    });

    it('should throw an error if a dilemma is repeated', () => {
      // Act & Assert
      expect(() =>
        Game.create(
          {
            roomId: 'TestRoomId',
            dilemmas: ['TestDilemma1', 'TestDilemma1', 'TestDilemma2'].map((dilemmaId) => ({
              dilemmaId,
              optionIds: OPTION_IDS,
            })),
          },
          new FixedIdGenerator('TestId'),
        ),
      ).toThrow(DuplicateDilemmaError);
    });

    it('should throw an error if the decision phase starts without players', () => {
      // Arrange
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS },
        new FixedIdGenerator('TestId'),
      );

      // Act & Assert
      expect(() => game.startDecisionPhase([])).toThrow(PlayersMissingError);
      expect(game.isInDecisionPhase).toBe(false);
    });

    it('should throw an error if the decision phase starts twice, keeping the answers', () => {
      // Arrange
      const { game, ana, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', 'TestOption');

      // Act & Assert
      expect(() => game.startDecisionPhase([ana, luis])).toThrow(DecisionPhaseAlreadyStartedError);
      expect(game.progressOf(luis.id)).toBe(1);
    });
  });
});
