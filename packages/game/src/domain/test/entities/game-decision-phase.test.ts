import { describe, expect, it } from 'vitest';
import { Game, type GameSettings } from '../../entities/game.ts';
import { Player } from '../../entities/player.ts';
import { AnswerIncompleteError } from '../../errors/answer-incomplete.error.ts';
import { DecisionPhaseOverError } from '../../errors/decision-phase-over.error.ts';
import { DilemmaNotReachedError } from '../../errors/dilemma-not-reached.error.ts';
import { DilemmaSkippedError } from '../../errors/dilemma-skipped.error.ts';
import { DuplicateVotePredictionError } from '../../errors/duplicate-vote-prediction.error.ts';
import { InvalidMatchPredictionError } from '../../errors/invalid-match-prediction.error.ts';
import { PlayerNotInPredictionSubsetError } from '../../errors/player-not-in-prediction-subset.error.ts';
import { PredictionsNotAllowedError } from '../../errors/predictions-not-allowed.error.ts';
import { VoteMissingError } from '../../errors/vote-missing.error.ts';
import { ProgressUpdatedEvent } from '../../events/progress-updated.event.ts';
import { RevealStartedEvent } from '../../events/reveal-started.event.ts';
import { TotalTimeRanOutEvent } from '../../events/total-time-ran-out.event.ts';
import { AvatarVO } from '../../vos/avatar.vo.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';
import { FixedRandomness } from '../support/fixed-randomness.ts';
import { KeepOrderRandomness } from '../support/keep-order-randomness.ts';

const OPTIONS = ['TestPull', 'TestWait', 'TestRun'];
const SEAL = {
  gameConsentVersion: 'TestGameConsentVersion',
  researchConsentVersion: null,
  commercialLicenceConsentVersion: null,
  underEighteen: false,
};
const AT = new Date('2026-11-09T10:00:00Z');
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const NOMINAL: GameSettings = {
  variant: 'nominal',
  groupNature: 'friends',
  place: 'together',
  dilemmaLanguage: 'es',
  totalTimeInMinutes: 6,
};

function after(ms: number): Date {
  return new Date(AT.getTime() + ms);
}

/** Ana, Luis and Marta play three dilemmas; the second one has the gap. */
function gameOfThree(settings: GameSettings = NOMINAL, randomness = new KeepOrderRandomness()) {
  const [ana, luis, marta] = ['Ana', 'Luis', 'Marta'].map((nickname) =>
    Player.create(
      { nickname, identity: `Test${nickname}Identity`, avatar: new AvatarVO('face-01', 'khaki') },
      new FixedIdGenerator(nickname),
    ),
  ) as [Player, Player, Player];
  const game = Game.create(
    {
      roomId: 'TestRoomId',
      dilemmas: ['TestDilemma1', 'TestDilemma2', 'TestDilemma3'].map((dilemmaId, index) => ({
        dilemmaId,
        version: 1,
        optionIds: OPTIONS,
        hasGap: index === 1,
        origin: 'picked-by-the-system' as const,
      })),
      settings,
    },
    new FixedIdGenerator('TestGameId'),
  );
  game.startDecisionPhase([ana, luis, marta], AT, randomness);
  game.pullEvents();
  return game;
}

/** The complete answer of a player in a nominal room: the vote and every prediction. */
function complete(game: Game, playerId: string, dilemmaId: string, vote = 'TestPull') {
  const predictionSubset = game.predictionSubsetOf(playerId, dilemmaId);
  return {
    vote,
    matchPrediction: 1,
    votePredictions: predictionSubset.map((other) => ({ playerId: other, vote: 'TestPull' })),
  };
}

function finish(game: Game, playerId: string, at = AT): void {
  for (const { dilemmaId } of game.dilemmas) {
    game.answer(playerId, dilemmaId, complete(game, playerId, dilemmaId), SEAL, at);
  }
}

describe('Game, in the decision phase', () => {
  describe('startDecisionPhase', () => {
    it('should give each player the options of each dilemma in an order of their own', () => {
      // Act
      // Two numbers to shuffle the players for the subsets, then two for each option order.
      const game = gameOfThree(NOMINAL, new FixedRandomness(0, 0, 0, 0, 0, 0, 0, 0, 1, 0));

      // Assert
      const orders = ['Ana', 'Luis', 'Marta'].map((playerId) =>
        game.optionOrderOf(playerId, 'TestDilemma1'),
      );
      for (const order of orders) expect([...order].sort()).toEqual([...OPTIONS].sort());
      expect(new Set(orders.map((order) => order.join())).size).toBeGreaterThan(1);
    });

    it('should give every player the other two to predict in a nominal room of three', () => {
      // Act
      const game = gameOfThree();

      // Assert
      expect(game.predictionSubsetOf('Ana', 'TestDilemma1')).toEqual(['Luis', 'Marta']);
      expect(game.predictionSubsetOf('Marta', 'TestDilemma1')).toEqual(['Ana', 'Luis']);
    });

    it('should give nobody to predict in an anonymous room', () => {
      // Act
      const game = gameOfThree({ ...NOMINAL, variant: 'anonymous' });

      // Assert
      expect(game.predictionSubsetOf('Ana', 'TestDilemma1')).toEqual([]);
    });

    it('should choose the same person in the gap for everyone, only for the dilemmas with it', () => {
      // Act
      const game = gameOfThree();

      // Assert
      expect(game.personInTheGap('TestDilemma1')).toBeNull();
      expect(['Ana', 'Luis', 'Marta']).toContain(game.personInTheGap('TestDilemma2'));
    });

    it('should start the total time', () => {
      // Act
      const game = gameOfThree();

      // Assert
      expect(game.totalTimeEndsAt).toEqual(after(6 * MINUTE));
      expect(game.totalTimeRanOut).toBe(false);
      expect(game.phase).toBe('decision');
    });
  });

  describe('answer, in a nominal room', () => {
    it('should not raise the progress with only the vote', () => {
      // Arrange
      const game = gameOfThree();

      // Act
      game.answer('Luis', 'TestDilemma1', { vote: 'TestPull' }, SEAL, AT);

      // Assert
      expect(game.progressOf('Luis')).toBe(0);
      expect(game.pullEvents()).toEqual([]);
    });

    it('should raise the progress once the vote comes with every prediction', () => {
      // Arrange
      const game = gameOfThree();

      // Act
      game.answer('Luis', 'TestDilemma1', complete(game, 'Luis', 'TestDilemma1'), SEAL, AT);

      // Assert
      expect(game.progressOf('Luis')).toBe(1);
      expect(game.pullEvents()).toEqual([new ProgressUpdatedEvent('TestGameId', 'Luis', 1, 2)]);
    });

    it('should keep the predictions made so far of an incomplete answer', () => {
      // Arrange
      const game = gameOfThree();

      // Act
      game.answer('Luis', 'TestDilemma1', { vote: 'TestPull', matchPrediction: 1 }, SEAL, AT);

      // Assert
      expect(game.answersOf('Luis')).toMatchObject([
        { dilemmaId: 'TestDilemma1', vote: 'TestPull', matchPrediction: 1, votePredictions: [] },
      ]);
    });

    it('should not let the player answer the next dilemma with an incomplete answer', () => {
      // Arrange
      const game = gameOfThree();
      game.answer('Luis', 'TestDilemma1', { vote: 'TestPull', matchPrediction: 1 }, SEAL, AT);

      // Act & Assert
      expect(() =>
        game.answer('Luis', 'TestDilemma2', complete(game, 'Luis', 'TestDilemma2'), SEAL, AT),
      ).toThrow(DilemmaNotReachedError);
    });

    it('should not let a complete answer lose its predictions', () => {
      // Arrange
      const game = gameOfThree();
      game.answer('Luis', 'TestDilemma1', complete(game, 'Luis', 'TestDilemma1'), SEAL, AT);

      // Act & Assert
      expect(() => game.answer('Luis', 'TestDilemma1', { vote: 'TestWait' }, SEAL, AT)).toThrow(
        AnswerIncompleteError,
      );
    });

    it('should not take predictions without a vote', () => {
      // Arrange
      const game = gameOfThree();

      // Act & Assert
      expect(() =>
        game.answer('Luis', 'TestDilemma1', { vote: ' ', matchPrediction: 1 }, SEAL, AT),
      ).toThrow(VoteMissingError);
    });

    it('should throw an error for a match prediction above the number of other players', () => {
      // Arrange
      const game = gameOfThree();

      // Act & Assert
      expect(() =>
        game.answer('Luis', 'TestDilemma1', { vote: 'TestPull', matchPrediction: 3 }, SEAL, AT),
      ).toThrow(InvalidMatchPredictionError);
    });

    it('should throw an error for a vote prediction outside the subset or repeated', () => {
      // Arrange
      const game = gameOfThree();

      // Act & Assert
      expect(() =>
        game.answer(
          'Luis',
          'TestDilemma1',
          { vote: 'TestPull', votePredictions: [{ playerId: 'Luis', vote: 'TestPull' }] },
          SEAL,
          AT,
        ),
      ).toThrow(PlayerNotInPredictionSubsetError);
      expect(() =>
        game.answer(
          'Luis',
          'TestDilemma1',
          {
            vote: 'TestPull',
            votePredictions: [
              { playerId: 'Ana', vote: 'TestPull' },
              { playerId: 'Ana', vote: 'TestWait' },
            ],
          },
          SEAL,
          AT,
        ),
      ).toThrow(DuplicateVotePredictionError);
    });

    it('should record the order of the options the player saw and whether they were in the gap', () => {
      // Arrange
      const game = gameOfThree();
      const person = game.personInTheGap('TestDilemma2') as string;
      finish(game, 'Ana');
      finish(game, 'Luis');

      // Assert
      const voters = ['Ana', 'Luis'].map((playerId) => game.answersOf(playerId)[1]!);
      expect(voters.map(({ voterInTheGap }) => voterInTheGap)).toEqual(
        ['Ana', 'Luis'].map((playerId) => playerId === person),
      );
      expect(voters[0]?.optionOrder).toEqual(game.optionOrderOf('Ana', 'TestDilemma2'));
    });
  });

  describe('answer, in an anonymous room', () => {
    it('should not take predictions', () => {
      // Arrange
      const game = gameOfThree({ ...NOMINAL, variant: 'anonymous' });

      // Act & Assert
      expect(() =>
        game.answer('Luis', 'TestDilemma1', { vote: 'TestPull', matchPrediction: 0 }, SEAL, AT),
      ).toThrow(PredictionsNotAllowedError);
    });
  });

  describe('response time', () => {
    it('should record the time from when the player got each dilemma to when they completed it', () => {
      // Arrange
      const game = gameOfThree();

      // Act
      game.answer('Luis', 'TestDilemma1', { vote: 'TestPull' }, SEAL, after(10 * SECOND));
      game.answer(
        'Luis',
        'TestDilemma1',
        complete(game, 'Luis', 'TestDilemma1'),
        SEAL,
        after(40 * SECOND),
      );
      game.answer(
        'Luis',
        'TestDilemma2',
        complete(game, 'Luis', 'TestDilemma2'),
        SEAL,
        after(55 * SECOND),
      );
      game.answer(
        'Luis',
        'TestDilemma1',
        complete(game, 'Luis', 'TestDilemma1', 'TestWait'),
        SEAL,
        after(90 * SECOND),
      );

      // Assert
      expect(game.answersOf('Luis').map(({ responseTimeMs }) => responseTimeMs)).toEqual([
        40 * SECOND,
        15 * SECOND,
      ]);
    });
  });

  describe('skip', () => {
    it('should record the dilemma as "did not vote" and count it as progress', () => {
      // Arrange
      const game = gameOfThree();

      // Act
      game.skip('Luis', 'TestDilemma1', AT);

      // Assert
      expect(game.didNotVoteOf('Luis')).toEqual([
        { dilemmaId: 'TestDilemma1', reason: 'reported' },
      ]);
      expect(game.progressOf('Luis')).toBe(1);
      expect(game.pullEvents()).toEqual([new ProgressUpdatedEvent('TestGameId', 'Luis', 1, 2)]);
    });

    it('should not let the player answer the skipped dilemma', () => {
      // Arrange
      const game = gameOfThree();
      game.skip('Luis', 'TestDilemma1', AT);

      // Act & Assert
      expect(() =>
        game.answer('Luis', 'TestDilemma1', complete(game, 'Luis', 'TestDilemma1'), SEAL, AT),
      ).toThrow(DilemmaSkippedError);
    });

    it('should only skip the dilemma the player is on', () => {
      // Arrange
      const game = gameOfThree();

      // Act & Assert
      expect(() => game.skip('Luis', 'TestDilemma2', AT)).toThrow(DilemmaNotReachedError);
    });
  });

  describe('runOutTotalTime', () => {
    it('should do nothing before the total time is over', () => {
      // Arrange
      const game = gameOfThree();

      // Act & Assert
      expect(game.runOutTotalTime(after(6 * MINUTE - 1))).toBe(false);
      expect(game.totalTimeRanOut).toBe(false);
    });

    it('should record it once, with who had not finished, and let them keep answering', () => {
      // Arrange
      const game = gameOfThree();
      finish(game, 'Ana');
      finish(game, 'Luis');
      game.pullEvents();

      // Act
      const ranOut = game.runOutTotalTime(after(6 * MINUTE));

      // Assert
      expect(ranOut).toBe(true);
      expect(game.runOutTotalTime(after(7 * MINUTE))).toBe(false);
      expect(game.pullEvents()).toEqual([
        new TotalTimeRanOutEvent('TestGameId', ['Marta'], game.version),
      ]);
      game.answer(
        'Marta',
        'TestDilemma1',
        complete(game, 'Marta', 'TestDilemma1'),
        SEAL,
        after(7 * MINUTE),
      );
      expect(game.progressOf('Marta')).toBe(1);
    });
  });

  describe('startReveal', () => {
    it('should start by itself when everyone has finished, also after the time ran out', () => {
      // Arrange
      const game = gameOfThree();
      finish(game, 'Ana');
      finish(game, 'Luis');
      game.runOutTotalTime(after(6 * MINUTE));
      game.pullEvents();

      // Act
      finish(game, 'Marta', after(7 * MINUTE));

      // Assert
      expect(game.phase).toBe('reveal');
      expect(game.pullEvents().at(-1)).toEqual(new RevealStartedEvent('TestGameId', game.version));
    });

    it('should record as "did not vote" every dilemma without a vote', () => {
      // Arrange
      const game = gameOfThree();
      game.answer('Marta', 'TestDilemma1', complete(game, 'Marta', 'TestDilemma1'), SEAL, AT);
      game.answer('Marta', 'TestDilemma2', { vote: 'TestWait', matchPrediction: 0 }, SEAL, AT);

      // Act
      game.startReveal();

      // Assert
      expect(game.didNotVoteOf('Marta')).toEqual([
        { dilemmaId: 'TestDilemma3', reason: 'not-answered' },
      ]);
      expect(game.didNotVoteOf('Ana')).toHaveLength(3);
    });

    it('should score only the predictions made, in a nominal room', () => {
      // Arrange
      const game = gameOfThree();
      game.answer('Ana', 'TestDilemma1', complete(game, 'Ana', 'TestDilemma1'), SEAL, AT);
      game.answer('Marta', 'TestDilemma1', { vote: 'TestPull', matchPrediction: 1 }, SEAL, AT);

      // Act
      game.startReveal();

      // Assert
      expect(game.pointsOf('Marta')[0]).toEqual({
        dilemmaId: 'TestDilemma1',
        match: 100,
        votes: null,
      });
      expect(game.pointsOf('Ana')[0]).toEqual({ dilemmaId: 'TestDilemma1', match: 100, votes: 50 });
    });

    it('should not take any answer afterwards', () => {
      // Arrange
      const game = gameOfThree();
      game.startReveal();

      // Act & Assert
      expect(() => game.answer('Luis', 'TestDilemma1', { vote: 'TestPull' }, SEAL, AT)).toThrow(
        DecisionPhaseOverError,
      );
      expect(() => game.startReveal()).toThrow(DecisionPhaseOverError);
    });
  });

  describe('leave and rejoin', () => {
    it('should not wait for a player who left', () => {
      // Arrange
      const game = gameOfThree();
      finish(game, 'Ana');
      finish(game, 'Luis');

      // Act
      game.leave('Marta');

      // Assert
      expect(game.hasLeft('Marta')).toBe(true);
      expect(game.phase).toBe('reveal');
    });

    it('should wait again for a player who comes back', () => {
      // Arrange
      const game = gameOfThree();
      game.leave('Marta');

      // Act
      game.rejoin('Marta');
      finish(game, 'Ana');
      finish(game, 'Luis');

      // Assert
      expect(game.stragglerIds).toEqual(['Marta']);
      expect(game.phase).toBe('decision');
    });
  });

  describe('restore', () => {
    it('should rebuild a game with predictions, skipped dilemmas, time and points', () => {
      // Arrange
      const game = gameOfThree();
      finish(game, 'Ana', after(SECOND));
      game.skip('Luis', 'TestDilemma1', after(2 * SECOND));
      game.runOutTotalTime(after(6 * MINUTE));
      game.leave('Marta');
      game.startReveal();

      // Act
      const restored = Game.restore(game.toSnapshot());

      // Assert
      expect(restored.toSnapshot()).toEqual(game.toSnapshot());
    });
  });
});
