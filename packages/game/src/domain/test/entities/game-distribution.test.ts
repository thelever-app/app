import { describe, expect, it } from 'vitest';
import { Game, type GameSettings, type PlayedDilemma } from '../../entities/game.ts';
import { Player } from '../../entities/player.ts';
import { DistributionPredictionNotAllowedError } from '../../errors/distribution-prediction-not-allowed.error.ts';
import { InvalidDistributionPredictionError } from '../../errors/invalid-distribution-prediction.error.ts';
import { AnsweredCountChangedEvent } from '../../events/answered-count-changed.event.ts';
import { GameStageChangedEvent } from '../../events/game-stage-changed.event.ts';
import { AvatarVO } from '../../vos/avatar.vo.ts';
import type { PredictedShare } from '../../vos/distribution-prediction.vo.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';
import { KeepOrderRandomness } from '../support/keep-order-randomness.ts';

const SEAL = {
  gameConsentVersion: 'TestGameConsentVersion',
  researchConsentVersion: null,
  commercialLicenceConsentVersion: null,
  underEighteen: false,
};
const AT = new Date('2026-11-18T10:00:00Z');
const ANONYMOUS: GameSettings = {
  ambience: 'classic',
  variant: 'anonymous',
  groupNature: 'friends',
  place: 'together',
  dilemmaLanguage: 'es',
  timePerDilemmaSeconds: 60,
};
const NOMINAL: GameSettings = { ...ANONYMOUS, variant: 'nominal' };
const EVERYONE = ['Ana', 'Luis', 'Marta', 'Sara'];
const DILEMMAS = ['TestDilemma1', 'TestDilemma2'];

/** Ana, Luis, Marta and Sara play two dilemmas of two options, TestPull and TestWait. */
function gameOfFour(settings: GameSettings = ANONYMOUS): Game {
  const players = EVERYONE.map((nickname) =>
    Player.create(
      {
        underEighteen: false,
        nickname,
        identity: `Test${nickname}Identity`,
        avatar: new AvatarVO('face-01', 'khaki'),
      },
      new FixedIdGenerator(nickname),
    ),
  );
  const dilemmas: PlayedDilemma[] = DILEMMAS.map((dilemmaId) => ({
    dilemmaId,
    version: 1,
    optionIds: ['TestPull', 'TestWait'],
    hasGap: false,
    fixedOrder: false,
    origin: 'random',
    chosenBy: null,
  }));
  const game = Game.create(
    { roomId: 'TestRoomId', dilemmas, settings },
    new FixedIdGenerator('TestGameId'),
  );
  game.start(players, AT, new KeepOrderRandomness());
  game.pullEvents();
  return game;
}

function predicted(pull: number, wait: number): PredictedShare[] {
  return [
    { optionId: 'TestPull', share: pull },
    { optionId: 'TestWait', share: wait },
  ];
}

/** Each player votes and predicts the dilemma of the round, with Ready, and the round is revealed. */
function everyoneAnswers(
  game: Game,
  answers: Record<string, { readonly vote: string; readonly prediction: PredictedShare[] }>,
): void {
  const dilemmaId = game.round?.dilemmaId as string;
  for (const [playerId, { vote, prediction }] of Object.entries(answers)) {
    game.answer(
      playerId,
      dilemmaId,
      { vote, distributionPrediction: prediction, ready: true },
      SEAL,
      AT,
    );
  }
  game.reveal('everyone', AT);
}

const SAME = { vote: 'TestPull', prediction: predicted(50, 50) };

/** Plays both rounds and moves on to the game results. */
function toTheResults(game: Game): void {
  everyoneAnswers(game, { Ana: SAME, Luis: SAME, Marta: SAME, Sara: SAME });
  game.moveOn('Ana', 0, AT);
  everyoneAnswers(game, { Ana: SAME, Luis: SAME, Marta: SAME, Sara: SAME });
  game.moveOn('Luis', 1, AT);
}

describe('Game, in an anonymous room', () => {
  describe('answer', () => {
    it('should start the distribution prediction at the even split, without counting as answered', () => {
      // Arrange
      const game = gameOfFour();

      // Act
      game.answer('Luis', 'TestDilemma1', { vote: 'TestWait' }, SEAL, AT);

      // Assert
      const [answer] = game.answersOf('Luis');
      expect(answer?.distributionPrediction).toEqual(predicted(50, 50));
      expect(answer?.ready).toBe(false);
      expect(game.hasAnswered('Luis')).toBe(false);
      expect(game.pullEvents()).toEqual([]);
    });

    it('should count as answered once the player presses Ready, and tell how many have answered', () => {
      // Arrange
      const game = gameOfFour();
      game.answer('Luis', 'TestDilemma1', { vote: 'TestWait' }, SEAL, AT);

      // Act
      game.answer(
        'Luis',
        'TestDilemma1',
        { vote: 'TestWait', distributionPrediction: predicted(30, 70), ready: true },
        SEAL,
        AT,
      );

      // Assert
      expect(game.answersOf('Luis')[0]?.distributionPrediction).toEqual(predicted(30, 70));
      expect(game.hasAnswered('Luis')).toBe(true);
      expect(game.pullEvents()).toEqual([
        new AnsweredCountChangedEvent('TestGameId', 1, game.version),
      ]);
    });

    it('should keep the prediction and Ready when the player changes the vote', () => {
      // Arrange
      const game = gameOfFour();
      game.answer(
        'Luis',
        'TestDilemma1',
        { vote: 'TestWait', distributionPrediction: predicted(30, 70), ready: true },
        SEAL,
        AT,
      );

      // Act
      game.answer('Luis', 'TestDilemma1', { vote: 'TestPull' }, SEAL, AT);

      // Assert
      const [answer] = game.answersOf('Luis');
      expect(answer?.vote).toBe('TestPull');
      expect(answer?.distributionPrediction).toEqual(predicted(30, 70));
      expect(game.hasAnswered('Luis')).toBe(true);
    });

    it('should throw an error for a prediction without every option of the dilemma', () => {
      // Arrange
      const game = gameOfFour();

      // Act
      const answer = () =>
        game.answer(
          'Luis',
          'TestDilemma1',
          { vote: 'TestPull', distributionPrediction: [{ optionId: 'TestPull', share: 100 }] },
          SEAL,
          AT,
        );

      // Assert
      expect(answer).toThrow(InvalidDistributionPredictionError);
    });

    it('should throw an error for a distribution prediction in a nominal room', () => {
      // Arrange
      const game = gameOfFour(NOMINAL);

      // Act
      const answer = () =>
        game.answer(
          'Luis',
          'TestDilemma1',
          { vote: 'TestPull', distributionPrediction: predicted(50, 50) },
          SEAL,
          AT,
        );

      // Assert
      expect(answer).toThrow(DistributionPredictionNotAllowedError);
    });
  });

  describe('reveal', () => {
    it('should score the prediction of each voter against the distribution', () => {
      // Arrange
      const game = gameOfFour();

      // Act
      everyoneAnswers(game, {
        Ana: { vote: 'TestPull', prediction: predicted(75, 25) },
        Luis: { vote: 'TestPull', prediction: predicted(50, 50) },
        Marta: { vote: 'TestPull', prediction: predicted(0, 100) },
        Sara: { vote: 'TestWait', prediction: predicted(100, 0) },
      });

      // Assert
      expect(game.pointsOf('Ana')).toEqual([{ dilemmaId: 'TestDilemma1', points: 100 }]);
      expect(game.pointsOf('Luis')).toEqual([{ dilemmaId: 'TestDilemma1', points: 75 }]);
      expect(game.pointsOf('Marta')).toEqual([{ dilemmaId: 'TestDilemma1', points: 25 }]);
      expect(game.pointsOf('Sara')).toEqual([{ dilemmaId: 'TestDilemma1', points: 75 }]);
    });

    it('should score the prediction of a voter who did not press Ready', () => {
      // Arrange
      const game = gameOfFour();
      game.answer(
        'Luis',
        'TestDilemma1',
        { vote: 'TestPull', distributionPrediction: predicted(70, 30) },
        SEAL,
        AT,
      );

      // Act
      everyoneAnswers(game, { Ana: SAME, Marta: SAME });

      // Assert
      expect(game.pointsOf('Luis')).toEqual([{ dilemmaId: 'TestDilemma1', points: 70 }]);
    });

    it('should score nothing with fewer than 3 votes', () => {
      // Arrange
      const game = gameOfFour();

      // Act
      everyoneAnswers(game, { Ana: SAME, Luis: SAME });

      // Assert
      expect(EVERYONE.flatMap((playerId) => game.pointsOf(playerId))).toEqual([]);
    });

    it('should not score who did not vote', () => {
      // Arrange
      const game = gameOfFour();

      // Act
      everyoneAnswers(game, { Ana: SAME, Luis: SAME, Marta: SAME });

      // Assert
      expect(game.pointsOf('Sara')).toEqual([]);
    });

    it('should count but not score the answers kept from before the prediction, which have none', () => {
      // Arrange: answers complete with the vote, as the game kept them before.
      const before = gameOfFour().toSnapshot();
      const restored = Game.restore({
        ...before,
        players: before.players.map((player, index) => ({
          ...player,
          answers:
            index === 3
              ? []
              : [
                  {
                    dilemmaId: 'TestDilemma1',
                    vote: 'TestPull',
                    votePredictions: [],
                    distributionPrediction: null,
                    ready: true,
                    optionOrder: ['TestPull', 'TestWait'],
                    responseTimeMs: 1000,
                    seal: SEAL,
                    voterInTheGap: false,
                  },
                ],
        })),
      });
      restored.answer(
        'Sara',
        'TestDilemma1',
        { vote: 'TestPull', distributionPrediction: predicted(100, 0), ready: true },
        SEAL,
        AT,
      );

      // Act
      restored.reveal('everyone', AT);

      // Assert
      expect(restored.revealOf(0).voteCount).toBe(4);
      expect(restored.pointsOf('Ana')).toEqual([]);
      expect(restored.pointsOf('Sara')).toEqual([{ dilemmaId: 'TestDilemma1', points: 100 }]);
    });

    it('should score a player who joined late from their round', () => {
      // Arrange
      const game = gameOfFour();
      everyoneAnswers(game, { Ana: SAME, Luis: SAME, Marta: SAME, Sara: SAME });
      game.moveOn('Ana', 0, AT);
      game.joinLate('Nico', new KeepOrderRandomness());

      // Act
      everyoneAnswers(game, { Ana: SAME, Luis: SAME, Nico: SAME });

      // Assert
      expect(game.pointsOf('Nico')).toEqual([{ dilemmaId: 'TestDilemma2', points: 50 }]);
    });
  });

  describe('moveOn, from the last round', () => {
    it('should move everyone on to the game results', () => {
      // Arrange
      const game = gameOfFour();
      everyoneAnswers(game, { Ana: SAME, Luis: SAME, Marta: SAME, Sara: SAME });
      game.moveOn('Ana', 0, AT);
      everyoneAnswers(game, { Ana: SAME, Luis: SAME, Marta: SAME, Sara: SAME });
      game.pullEvents();

      // Act
      const moved = game.moveOn('Luis', 1, AT);
      const again = game.moveOn('Marta', 1, AT);

      // Assert
      expect(moved).toBe(true);
      expect(again).toBe(false);
      expect(game.stage).toEqual({ kind: 'results', movedOnBy: 'Luis', step: 0 });
      expect(game.pullEvents()).toEqual([
        new GameStageChangedEvent('TestGameId', 'results', 'Luis', game.version),
      ]);
    });

    it('should end the game from the game results, once', () => {
      // Arrange
      const game = gameOfFour();
      toTheResults(game);
      game.pullEvents();

      // Act
      const ended = game.moveOn('Sara', DILEMMAS.length, AT);
      const again = game.moveOn('Ana', DILEMMAS.length, AT);

      // Assert
      expect(ended).toBe(true);
      expect(again).toBe(false);
      expect(game.stage).toEqual({ kind: 'ended', movedOnBy: 'Sara', step: null });
      expect(game.pullEvents()).toEqual([
        new GameStageChangedEvent('TestGameId', 'ended', 'Sara', game.version),
      ]);
    });

    it('should not end the game from the last round', () => {
      // Arrange
      const game = gameOfFour();
      toTheResults(game);

      // Act
      const moved = game.moveOn('Ana', 1, AT);

      // Assert
      expect(moved).toBe(false);
      expect(game.stage.kind).toBe('results');
    });

    it('should take a nominal room to its results too, with its titles', () => {
      // Arrange
      const game = gameOfFour(NOMINAL);
      game.reveal('host', AT);
      game.moveOn('Ana', 0, AT);
      game.reveal('host', AT);

      // Act
      const moved = game.moveOn('Ana', 1, AT);

      // Assert
      expect(moved).toBe(true);
      expect(game.stage).toEqual({ kind: 'results', movedOnBy: 'Ana', step: 0 });
      expect(game.results()).not.toBeNull();
    });
  });

  describe('ranking', () => {
    it('should rank who reads the group best by the points of every dilemma', () => {
      // Arrange
      const game = gameOfFour();
      everyoneAnswers(game, {
        Ana: { vote: 'TestPull', prediction: predicted(75, 25) },
        Luis: { vote: 'TestPull', prediction: predicted(50, 50) },
        Marta: { vote: 'TestPull', prediction: predicted(75, 25) },
        Sara: { vote: 'TestWait', prediction: predicted(0, 100) },
      });
      game.moveOn('Ana', 0, AT);
      everyoneAnswers(game, { Ana: SAME, Luis: SAME, Marta: SAME, Sara: SAME });

      // Act
      const during = game.ranking();
      game.moveOn('Ana', 1, AT);

      // Assert
      expect(during).toBeNull();
      expect(game.ranking()).toEqual([
        { playerId: 'Ana', points: 150, position: 1, mentalist: true },
        { playerId: 'Marta', points: 150, position: 1, mentalist: true },
        { playerId: 'Luis', points: 125, position: 3, mentalist: false },
        { playerId: 'Sara', points: 75, position: 4, mentalist: false },
      ]);
    });

    it('should leave out who left the game during its rounds, and keep who left once in the ranking', () => {
      // Arrange
      const game = gameOfFour();
      everyoneAnswers(game, { Ana: SAME, Luis: SAME, Marta: SAME, Sara: SAME });
      game.moveOn('Ana', 0, AT);
      game.leave('Marta');
      everyoneAnswers(game, { Ana: SAME, Luis: SAME, Sara: SAME });
      game.moveOn('Luis', 1, AT);

      // Act
      game.leave('Sara');

      // Assert
      expect(game.ranking()?.map(({ playerId }) => playerId)).toEqual(['Ana', 'Luis', 'Sara']);
    });

    it('should have no ranking in a nominal room', () => {
      // Act
      const game = gameOfFour(NOMINAL);

      // Assert
      expect(game.ranking()).toBeNull();
    });
  });

  describe('restore', () => {
    it('should keep the stage of the game and the distribution predictions', () => {
      // Arrange
      const game = gameOfFour();
      toTheResults(game);

      // Act
      const restored = Game.restore(game.toSnapshot());

      // Assert
      expect(restored.stage).toEqual({ kind: 'results', movedOnBy: 'Luis', step: 0 });
      expect(restored.answersOf('Ana')[0]?.distributionPrediction).toEqual(predicted(50, 50));
      expect(restored.ranking()).toEqual(game.ranking());
    });
  });
});
