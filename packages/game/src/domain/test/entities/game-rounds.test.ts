import { describe, expect, it } from 'vitest';
import { Game, type GameSettings, type PlayedDilemma } from '../../entities/game.ts';
import { Player } from '../../entities/player.ts';
import { AnswerIncompleteError } from '../../errors/answer-incomplete.error.ts';
import { DecisionPhaseOverError } from '../../errors/decision-phase-over.error.ts';
import { DilemmaAlreadyReportedError } from '../../errors/dilemma-already-reported.error.ts';
import { DilemmaNotInRoundError } from '../../errors/dilemma-not-in-round.error.ts';
import { DilemmaNotReportedAsOffensiveError } from '../../errors/dilemma-not-reported-as-offensive.error.ts';
import { DilemmaSkippedError } from '../../errors/dilemma-skipped.error.ts';
import { DuplicateVotePredictionError } from '../../errors/duplicate-vote-prediction.error.ts';
import { NoNextRoundError } from '../../errors/no-next-round.error.ts';
import { PlayerLeftGameError } from '../../errors/player-left-game.error.ts';
import { PlayerNotPredictableError } from '../../errors/player-not-predictable.error.ts';
import { PredictionsNotAllowedError } from '../../errors/predictions-not-allowed.error.ts';
import { VoteMissingError } from '../../errors/vote-missing.error.ts';
import { AnsweredCountChangedEvent } from '../../events/answered-count-changed.event.ts';
import { DilemmaRevealedEvent } from '../../events/dilemma-revealed.event.ts';
import { ProgressUpdatedEvent } from '../../events/progress-updated.event.ts';
import { RoundStartedEvent } from '../../events/round-started.event.ts';
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
const NOMINAL: GameSettings = {
  variant: 'nominal',
  groupNature: 'friends',
  place: 'together',
  dilemmaLanguage: 'es',
  timePerDilemmaSeconds: 60,
};
const ANONYMOUS: GameSettings = { ...NOMINAL, variant: 'anonymous' };
const EVERYONE = ['Ana', 'Luis', 'Marta'];

function after(ms: number): Date {
  return new Date(AT.getTime() + ms);
}

/**
 * Ana, Luis and Marta play three dilemmas; the second one has the gap and the third one was added
 * by Luis.
 */
function gameOfThree(settings: GameSettings = NOMINAL, randomness = new KeepOrderRandomness()) {
  const players = EVERYONE.map((nickname) =>
    Player.create(
      { nickname, identity: `Test${nickname}Identity`, avatar: new AvatarVO('face-01', 'khaki') },
      new FixedIdGenerator(nickname),
    ),
  );
  const dilemmas: PlayedDilemma[] = ['TestDilemma1', 'TestDilemma2', 'TestDilemma3'].map(
    (dilemmaId, index) => ({
      dilemmaId,
      version: 1,
      optionIds: OPTIONS,
      hasGap: index === 1,
      origin: index === 2 ? 'added-by-a-player' : 'picked-by-the-system',
      addedBy: index === 2 ? 'Luis' : null,
    }),
  );
  const game = Game.create(
    { roomId: 'TestRoomId', dilemmas, settings },
    new FixedIdGenerator('TestGameId'),
  );
  game.start(players, AT, randomness);
  game.pullEvents();
  return game;
}

/** The complete answer of a player in a nominal room: the vote and every prediction. */
function complete(game: Game, playerId: string, vote = 'TestPull') {
  return {
    vote,
    votePredictions: game
      .playersToPredictBy(playerId)
      .map((other) => ({ playerId: other, vote: 'TestPull' })),
  };
}

/** Everyone answers the dilemma of the round, which reveals it; the rest of the arguments say how. */
function everyoneAnswers(game: Game, votes: Record<string, string> = {}, at = AT): void {
  const dilemmaId = game.round?.dilemmaId as string;
  for (const playerId of EVERYONE) {
    game.answer(playerId, dilemmaId, complete(game, playerId, votes[playerId]), SEAL, at);
  }
  game.revealIfEveryoneAnswered(EVERYONE);
}

describe('Game, by rounds', () => {
  describe('start', () => {
    it('should start the first round, in its decision phase, with the time per dilemma', () => {
      // Act
      const game = gameOfThree();

      // Assert
      expect(game.round).toEqual({
        position: 0,
        dilemmaId: 'TestDilemma1',
        phase: 'decision',
        startedAt: AT,
        endsAt: after(60 * SECOND),
        revealedBy: null,
        movedOnBy: null,
      });
      expect(game.isInDecisionPhase).toBe(true);
    });

    it('should give each player the options of each dilemma in an order of their own', () => {
      // Act
      // Two numbers for each option order.
      const game = gameOfThree(NOMINAL, new FixedRandomness(0, 0, 0, 0, 0, 0, 1, 0));

      // Assert
      const orders = EVERYONE.map((playerId) => game.optionOrderOf(playerId, 'TestDilemma1'));
      for (const order of orders) expect([...order].sort()).toEqual([...OPTIONS].sort());
      expect(new Set(orders.map((order) => order.join())).size).toBeGreaterThan(1);
    });

    it('should give every player all the others to predict in a nominal room', () => {
      // Act
      const game = gameOfThree();

      // Assert
      expect(game.playersToPredictBy('Ana')).toEqual(['Luis', 'Marta']);
    });

    it('should give nobody to predict in an anonymous room', () => {
      // Act
      const game = gameOfThree(ANONYMOUS);

      // Assert
      expect(game.playersToPredictBy('Ana')).toEqual([]);
    });

    it('should choose the same person in the gap for everyone, only for the dilemmas with it', () => {
      // Act
      const game = gameOfThree();

      // Assert
      expect(game.personInTheGap('TestDilemma1')).toBeNull();
      expect(EVERYONE).toContain(game.personInTheGap('TestDilemma2'));
    });
  });

  describe('answer, in a nominal room', () => {
    it('should not count as answered with only the vote', () => {
      // Arrange
      const game = gameOfThree();

      // Act
      game.answer('Luis', 'TestDilemma1', { vote: 'TestPull' }, SEAL, AT);

      // Assert
      expect(game.hasAnswered('Luis')).toBe(false);
      expect(game.pullEvents()).toEqual([]);
    });

    it('should count as answered once the vote comes with every prediction, and tell the others', () => {
      // Arrange
      const game = gameOfThree();

      // Act
      game.answer('Luis', 'TestDilemma1', complete(game, 'Luis'), SEAL, AT);

      // Assert
      expect(game.hasAnswered('Luis')).toBe(true);
      expect(game.progressOf('Luis')).toBe(1);
      expect(game.pullEvents()).toEqual([
        new ProgressUpdatedEvent('TestGameId', 'Luis', 1, game.version),
      ]);
    });

    it('should keep the predictions when the player changes the vote, and still count as answered', () => {
      // Arrange
      const game = gameOfThree();
      const answer = complete(game, 'Luis');
      game.answer('Luis', 'TestDilemma1', answer, SEAL, AT);

      // Act
      game.answer('Luis', 'TestDilemma1', { ...answer, vote: 'TestWait' }, SEAL, after(SECOND));

      // Assert
      const [kept] = game.answersOf('Luis');
      expect(kept?.vote).toBe('TestWait');
      expect(kept?.votePredictions).toEqual(answer.votePredictions);
      expect(game.hasAnswered('Luis')).toBe(true);
    });

    it('should not let a complete answer lose its predictions', () => {
      // Arrange
      const game = gameOfThree();
      game.answer('Luis', 'TestDilemma1', complete(game, 'Luis'), SEAL, AT);

      // Act & Assert
      expect(() => game.answer('Luis', 'TestDilemma1', { vote: 'TestWait' }, SEAL, AT)).toThrow(
        AnswerIncompleteError,
      );
    });

    it('should only take the dilemma of the round', () => {
      // Arrange
      const game = gameOfThree();

      // Act & Assert
      expect(() => game.answer('Luis', 'TestDilemma2', complete(game, 'Luis'), SEAL, AT)).toThrow(
        DilemmaNotInRoundError,
      );
    });

    it('should not take predictions without a vote', () => {
      // Arrange
      const game = gameOfThree();

      // Act & Assert
      expect(() =>
        game.answer(
          'Luis',
          'TestDilemma1',
          { vote: '', votePredictions: [{ playerId: 'Ana', vote: 'TestPull' }] },
          SEAL,
          AT,
        ),
      ).toThrow(VoteMissingError);
    });

    it('should throw an error for a vote prediction about oneself or repeated', () => {
      // Arrange
      const game = gameOfThree();
      const draft = (votePredictions: { playerId: string; vote: string }[]) => ({
        vote: 'TestPull',
        votePredictions,
      });

      // Act & Assert
      expect(() =>
        game.answer(
          'Luis',
          'TestDilemma1',
          draft([{ playerId: 'Luis', vote: 'TestPull' }]),
          SEAL,
          AT,
        ),
      ).toThrow(PlayerNotPredictableError);
      expect(() =>
        game.answer(
          'Luis',
          'TestDilemma1',
          draft([
            { playerId: 'Ana', vote: 'TestPull' },
            { playerId: 'Ana', vote: 'TestWait' },
          ]),
          SEAL,
          AT,
        ),
      ).toThrow(DuplicateVotePredictionError);
    });

    it('should record the order of the options the player saw and whether they were in the gap', () => {
      // Arrange
      const game = gameOfThree();
      everyoneAnswers(game);
      game.moveOn('Ana', 0, after(SECOND));
      const personInTheGap = game.personInTheGap('TestDilemma2') as string;

      // Act
      game.answer(
        personInTheGap,
        'TestDilemma2',
        complete(game, personInTheGap),
        SEAL,
        after(2 * SECOND),
      );

      // Assert
      const [, answer] = game.answersOf(personInTheGap);
      expect(answer?.optionOrder).toEqual(game.optionOrderOf(personInTheGap, 'TestDilemma2'));
      expect(answer?.voterInTheGap).toBe(true);
    });
  });

  describe('answer, in an anonymous room', () => {
    it('should not take predictions', () => {
      // Arrange
      const game = gameOfThree(ANONYMOUS);

      // Act & Assert
      expect(() =>
        game.answer(
          'Luis',
          'TestDilemma1',
          { vote: 'TestPull', votePredictions: [{ playerId: 'Ana', vote: 'TestPull' }] },
          SEAL,
          AT,
        ),
      ).toThrow(PredictionsNotAllowedError);
    });

    it('should tell how many have answered, never who', () => {
      // Arrange
      const game = gameOfThree(ANONYMOUS);

      // Act
      game.answer('Luis', 'TestDilemma1', { vote: 'TestPull' }, SEAL, AT);

      // Assert
      expect(game.answeredCount).toBe(1);
      expect(game.pullEvents()).toEqual([
        new AnsweredCountChangedEvent('TestGameId', 1, game.version),
      ]);
    });
  });

  describe('response time', () => {
    it('should record the time from the start of the round to the first complete answer', () => {
      // Arrange
      const game = gameOfThree();
      game.answer('Luis', 'TestDilemma1', { vote: 'TestPull' }, SEAL, after(10 * SECOND));

      // Act
      game.answer('Luis', 'TestDilemma1', complete(game, 'Luis'), SEAL, after(40 * SECOND));
      game.answer(
        'Luis',
        'TestDilemma1',
        complete(game, 'Luis', 'TestWait'),
        SEAL,
        after(50 * SECOND),
      );

      // Assert
      expect(game.answersOf('Luis').map(({ responseTimeMs }) => responseTimeMs)).toEqual([
        40 * SECOND,
      ]);
    });
  });

  describe('recordReport and skip', () => {
    it('should keep one report of the dilemma of the round by player, and whether as offensive', () => {
      // Arrange
      const game = gameOfThree();

      // Act
      game.recordReport('Luis', 'TestDilemma1', true);

      // Assert
      expect(game.reportsOf('Luis')).toEqual([{ dilemmaId: 'TestDilemma1', offensive: true }]);
      expect(() => game.recordReport('Luis', 'TestDilemma1', false)).toThrow(
        DilemmaAlreadyReportedError,
      );
    });

    it('should skip a dilemma reported as offensive as "did not vote", answered for the round', () => {
      // Arrange
      const game = gameOfThree();
      game.recordReport('Luis', 'TestDilemma1', true);

      // Act
      game.skip('Luis', 'TestDilemma1');

      // Assert
      expect(game.didNotVoteOf('Luis')).toEqual([
        { dilemmaId: 'TestDilemma1', reason: 'reported' },
      ]);
      expect(game.hasAnswered('Luis')).toBe(true);
      expect(() => game.answer('Luis', 'TestDilemma1', complete(game, 'Luis'), SEAL, AT)).toThrow(
        DilemmaSkippedError,
      );
    });

    it('should only skip a dilemma the player reported as offensive', () => {
      // Arrange
      const game = gameOfThree();
      game.recordReport('Luis', 'TestDilemma1', false);

      // Act & Assert
      expect(() => game.skip('Luis', 'TestDilemma1')).toThrow(DilemmaNotReportedAsOffensiveError);
    });
  });

  describe('reveal', () => {
    it('should reveal by itself once every connected player who has not left has answered', () => {
      // Arrange
      const game = gameOfThree();
      for (const playerId of ['Ana', 'Luis']) {
        game.answer(playerId, 'TestDilemma1', complete(game, playerId), SEAL, AT);
      }
      game.pullEvents();

      // Act
      const revealed = game.revealIfEveryoneAnswered(['Ana', 'Luis']);

      // Assert
      expect(revealed).toBe(true);
      expect(game.round?.phase).toBe('reveal');
      expect(game.round?.revealedBy).toBe('everyone');
      expect(game.didNotVoteOf('Marta')).toEqual([
        { dilemmaId: 'TestDilemma1', reason: 'not-answered' },
      ]);
      expect(game.pullEvents()).toEqual([new DilemmaRevealedEvent('TestGameId', 0, game.version)]);
    });

    it('should not reveal while a connected player has not answered, nor with nobody connected', () => {
      // Arrange
      const game = gameOfThree();
      game.answer('Ana', 'TestDilemma1', complete(game, 'Ana'), SEAL, AT);

      // Act & Assert
      expect(game.revealIfEveryoneAnswered(['Ana', 'Luis'])).toBe(false);
      expect(game.revealIfEveryoneAnswered([])).toBe(false);
      expect(game.isInDecisionPhase).toBe(true);
    });

    it('should not wait for a player who left, and wait again for one who comes back', () => {
      // Arrange
      const game = gameOfThree();
      for (const playerId of ['Ana', 'Luis']) {
        game.answer(playerId, 'TestDilemma1', complete(game, playerId), SEAL, AT);
      }
      game.leave('Marta');
      game.rejoin('Marta');

      // Act & Assert
      expect(game.revealIfEveryoneAnswered(EVERYONE)).toBe(false);
      game.leave('Marta');
      expect(game.revealIfEveryoneAnswered(EVERYONE)).toBe(true);
    });

    it('should reveal when the time for the dilemma runs out, and only once', () => {
      // Arrange
      const game = gameOfThree();

      // Act & Assert
      expect(game.runOutRound(after(59 * SECOND))).toBe(false);
      expect(game.runOutRound(after(60 * SECOND))).toBe(true);
      expect(game.round?.revealedBy).toBe('time');
      expect(game.runOutRound(after(61 * SECOND))).toBe(false);
    });

    it('should reveal early when the host asks', () => {
      // Arrange
      const game = gameOfThree();

      // Act
      game.reveal('host');

      // Assert
      expect(game.round?.revealedBy).toBe('host');
      expect(game.didNotVoteOf('Ana')).toEqual([
        { dilemmaId: 'TestDilemma1', reason: 'not-answered' },
      ]);
    });

    it('should count the vote of an incomplete answer and score only the predictions made', () => {
      // Arrange
      const game = gameOfThree();
      game.answer('Ana', 'TestDilemma1', { vote: 'TestPull' }, SEAL, AT);
      game.answer(
        'Marta',
        'TestDilemma1',
        { vote: 'TestPull', votePredictions: [{ playerId: 'Ana', vote: 'TestPull' }] },
        SEAL,
        AT,
      );

      // Act
      game.reveal('time');

      // Assert
      expect(game.didNotVoteOf('Marta')).toEqual([]);
      expect(game.pointsOf('Marta')).toEqual([{ dilemmaId: 'TestDilemma1', points: 50 }]);
      expect(game.pointsOf('Ana')).toEqual([{ dilemmaId: 'TestDilemma1', points: null }]);
    });

    it('should not take any answer once the dilemma is revealed', () => {
      // Arrange
      const game = gameOfThree();
      game.reveal('host');

      // Act & Assert
      expect(() => game.answer('Luis', 'TestDilemma1', complete(game, 'Luis'), SEAL, AT)).toThrow(
        DecisionPhaseOverError,
      );
    });
  });

  describe('moveOn', () => {
    it('should start the next round with its own time and who moved on', () => {
      // Arrange
      const game = gameOfThree();
      everyoneAnswers(game);
      game.pullEvents();

      // Act
      const moved = game.moveOn('Marta', 0, after(30 * SECOND));

      // Assert
      expect(moved).toBe(true);
      expect(game.round).toEqual({
        position: 1,
        dilemmaId: 'TestDilemma2',
        phase: 'decision',
        startedAt: after(30 * SECOND),
        endsAt: after(90 * SECOND),
        revealedBy: null,
        movedOnBy: 'Marta',
      });
      expect(game.pullEvents()).toEqual([
        new RoundStartedEvent('TestGameId', 1, 'Marta', game.version),
      ]);
    });

    it('should move on only once when two players ask from the same round', () => {
      // Arrange
      const game = gameOfThree();
      everyoneAnswers(game);
      game.moveOn('Ana', 0, AT);

      // Act
      const moved = game.moveOn('Luis', 0, AT);

      // Assert
      expect(moved).toBe(false);
      expect(game.round?.position).toBe(1);
      expect(game.round?.movedOnBy).toBe('Ana');
    });

    it('should not move on during the decision phase of the round', () => {
      // Arrange
      const game = gameOfThree();

      // Act & Assert
      expect(game.moveOn('Ana', 0, AT)).toBe(false);
      expect(game.round?.position).toBe(0);
    });

    it('should not move on from the last round', () => {
      // Arrange
      const game = gameOfThree();
      for (const position of [0, 1]) {
        everyoneAnswers(game);
        game.moveOn('Ana', position, AT);
      }
      everyoneAnswers(game);

      // Act & Assert
      expect(() => game.moveOn('Ana', 2, AT)).toThrow(NoNextRoundError);
    });
  });

  describe('a player who left', () => {
    it('should not answer, report, skip or move on until they come back', () => {
      // Arrange
      const game = gameOfThree();
      game.leave('Luis');

      // Act & Assert
      expect(() => game.answer('Luis', 'TestDilemma1', complete(game, 'Luis'), SEAL, AT)).toThrow(
        PlayerLeftGameError,
      );
      expect(() => game.recordReport('Luis', 'TestDilemma1', true)).toThrow(PlayerLeftGameError);
      game.rejoin('Luis');
      expect(() =>
        game.answer('Luis', 'TestDilemma1', complete(game, 'Luis'), SEAL, AT),
      ).not.toThrow();
    });

    it('should not count among those who answered while away', () => {
      // Arrange
      const game = gameOfThree(ANONYMOUS);
      game.answer('Luis', 'TestDilemma1', { vote: 'TestPull' }, SEAL, AT);

      // Act
      game.leave('Luis');

      // Assert
      expect(game.answeredCount).toBe(0);
      game.rejoin('Luis');
      expect(game.answeredCount).toBe(1);
    });
  });

  describe('revealOf', () => {
    it('should show the distribution, the votes and which predictions were right', () => {
      // Arrange
      const game = gameOfThree();
      const answer = (playerId: string, vote: string) =>
        game.answer(playerId, 'TestDilemma1', complete(game, playerId, vote), SEAL, AT);
      answer('Ana', 'TestPull');
      answer('Luis', 'TestWait');
      answer('Marta', 'TestPull');
      game.revealIfEveryoneAnswered(EVERYONE);

      // Act
      const reveal = game.revealOf(0);

      // Assert
      expect(reveal.distribution).toEqual([
        { optionId: 'TestPull', count: 2 },
        { optionId: 'TestWait', count: 1 },
        { optionId: 'TestRun', count: 0 },
      ]);
      expect(reveal.didNotVoteCount).toBe(0);
      expect(reveal.tooFewVotes).toBe(false);
      expect(reveal.votes).toEqual([
        { playerId: 'Ana', vote: 'TestPull' },
        { playerId: 'Luis', vote: 'TestWait' },
        { playerId: 'Marta', vote: 'TestPull' },
      ]);
      expect(reveal.votePredictions).toContainEqual({
        playerId: 'Ana',
        aboutId: 'Luis',
        vote: 'TestPull',
        right: false,
      });
    });

    it('should show who did not vote, and only the predictions of who voted', () => {
      // Arrange
      const game = gameOfThree();
      game.answer('Ana', 'TestDilemma1', complete(game, 'Ana'), SEAL, AT);
      game.answer('Luis', 'TestDilemma1', { vote: 'TestPull' }, SEAL, AT);
      game.reveal('host');

      // Act
      const reveal = game.revealOf(0);

      // Assert
      expect(reveal.votes).toContainEqual({ playerId: 'Marta', vote: null });
      expect(reveal.didNotVoteCount).toBe(1);
      expect(new Set(reveal.votePredictions.map(({ playerId }) => playerId))).toEqual(
        new Set(['Ana']),
      );
    });

    it('should show who added the dilemma and the person in the gap', () => {
      // Arrange
      const game = gameOfThree();
      for (const position of [0, 1]) {
        everyoneAnswers(game);
        game.moveOn('Ana', position, AT);
      }
      everyoneAnswers(game);

      // Act & Assert
      expect(game.revealOf(2).addedBy).toBe('Luis');
      expect(game.revealOf(1).personInTheGap).toBe(game.personInTheGap('TestDilemma2'));
    });

    it('should show only the distribution in an anonymous room, and hide it with fewer than 3 votes', () => {
      // Arrange
      const game = gameOfThree(ANONYMOUS);
      game.answer('Luis', 'TestDilemma1', { vote: 'TestPull' }, SEAL, AT);
      game.answer('Marta', 'TestDilemma1', { vote: 'TestWait' }, SEAL, AT);
      game.reveal('time');

      // Act
      const reveal = game.revealOf(0);

      // Assert
      expect(reveal.tooFewVotes).toBe(true);
      expect(reveal.distribution).toBeNull();
      expect(reveal.votes).toEqual([]);
      expect(reveal.votePredictions).toEqual([]);
      expect(reveal.addedBy).toBeNull();
      expect(reveal.didNotVoteCount).toBe(1);
    });
  });

  describe('restore', () => {
    it('should rebuild a game with its round, predictions, skipped dilemmas and points', () => {
      // Arrange
      const game = gameOfThree();
      game.recordReport('Luis', 'TestDilemma1', true);
      game.skip('Luis', 'TestDilemma1');
      game.answer('Ana', 'TestDilemma1', complete(game, 'Ana'), SEAL, AT);
      game.leave('Marta');
      game.revealIfEveryoneAnswered(['Ana', 'Luis']);
      game.moveOn('Luis', 0, after(2 * SECOND));

      // Act
      const restored = Game.restore(game.toSnapshot());

      // Assert
      expect(restored.toSnapshot()).toEqual(game.toSnapshot());
    });
  });
});
