import { describe, expect, it } from 'vitest';
import { Game, type GameSettings, type PlayedDilemma } from '../../entities/game.ts';
import { Player } from '../../entities/player.ts';
import { PersonInTheGapVotesError } from '../../errors/person-in-the-gap-votes.error.ts';
import { PlayerNotPredictableError } from '../../errors/player-not-predictable.error.ts';
import { VoteMissingError } from '../../errors/vote-missing.error.ts';
import { AvatarVO } from '../../vos/avatar.vo.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';
import { KeepOrderRandomness } from '../support/keep-order-randomness.ts';

const OPTIONS = ['TestPull', 'TestWait'];
const SEAL = {
  gameConsentVersion: 'TestGameConsentVersion',
  researchConsentVersion: null,
  commercialLicenceConsentVersion: null,
  underEighteen: false,
  objectsToAnalytics: false,
};
const AT = new Date('2026-11-18T10:00:00Z');
const NOMINAL: GameSettings = {
  ambience: 'classic',
  variant: 'nominal',
  dilemmaLanguage: 'es',
  timePerDilemmaSeconds: 60,
};
const ANONYMOUS: GameSettings = { ...NOMINAL, variant: 'anonymous' };
const EVERYONE = ['Ana', 'Luis', 'Marta', 'Sara'];
const GAP_DILEMMA = 'TestGapDilemma';

/** Ana, Luis, Marta and Sara play one dilemma with the gap; the first player takes it. */
function gameOfFour(settings: GameSettings = NOMINAL): { game: Game; person: string } {
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
  const dilemmas: PlayedDilemma[] = [
    {
      dilemmaId: GAP_DILEMMA,
      version: 1,
      optionIds: OPTIONS,
      hasGap: true,
      fixedOrder: false,
      origin: 'random',
      chosenBy: null,
    },
  ];
  const game = Game.create(
    { roomId: 'TestRoomId', dilemmas, settings },
    new FixedIdGenerator('TestGameId'),
  );
  game.start(players, AT, new KeepOrderRandomness());
  game.pullEvents();
  return { game, person: game.personInTheGap(GAP_DILEMMA) as string };
}

function predictions(
  game: Game,
  playerId: string,
  vote: (other: string) => string = () => 'TestPull',
) {
  return game
    .playersToPredictBy(playerId, GAP_DILEMMA)
    .map((other) => ({ playerId: other, vote: vote(other) }));
}

describe('Game, with the person in the gap', () => {
  describe('in a nominal room', () => {
    it('should give the person in the gap everyone else to predict', () => {
      // Arrange
      const { game, person } = gameOfFour();

      // Act & Assert
      expect(game.playersToPredictBy(person, GAP_DILEMMA)).toEqual(
        EVERYONE.filter((playerId) => playerId !== person),
      );
    });

    it('should leave the person in the gap out of whom the others predict', () => {
      // Arrange
      const { game, person } = gameOfFour();
      const other = EVERYONE.find((playerId) => playerId !== person) as string;

      // Act & Assert
      expect(game.playersToPredictBy(other, GAP_DILEMMA)).toEqual(
        EVERYONE.filter((playerId) => playerId !== person && playerId !== other),
      );
    });

    it('should count the person in the gap as answered with every prediction and no vote', () => {
      // Arrange
      const { game, person } = gameOfFour();

      // Act
      game.answer(
        person,
        GAP_DILEMMA,
        { vote: null, votePredictions: predictions(game, person) },
        SEAL,
        AT,
      );

      // Assert
      expect(game.hasAnswered(person)).toBe(true);
      expect(game.answersOf(person)[0]?.vote).toBeNull();
    });

    it('should not count the person in the gap as answered with a prediction missing', () => {
      // Arrange
      const { game, person } = gameOfFour();

      // Act
      game.answer(
        person,
        GAP_DILEMMA,
        { vote: null, votePredictions: predictions(game, person).slice(1) },
        SEAL,
        AT,
      );

      // Assert
      expect(game.hasAnswered(person)).toBe(false);
    });

    it('should not let the person in the gap vote', () => {
      // Arrange
      const { game, person } = gameOfFour();

      // Act & Assert
      expect(() =>
        game.answer(
          person,
          GAP_DILEMMA,
          { vote: 'TestPull', votePredictions: predictions(game, person) },
          SEAL,
          AT,
        ),
      ).toThrow(PersonInTheGapVotesError);
    });

    it('should not let the others predict the person in the gap', () => {
      // Arrange
      const { game, person } = gameOfFour();
      const other = EVERYONE.find((playerId) => playerId !== person) as string;

      // Act & Assert
      expect(() =>
        game.answer(
          other,
          GAP_DILEMMA,
          { vote: 'TestPull', votePredictions: [{ playerId: person, vote: 'TestPull' }] },
          SEAL,
          AT,
        ),
      ).toThrow(PlayerNotPredictableError);
    });

    it('should still ask the others for a vote', () => {
      // Arrange
      const { game, person } = gameOfFour();
      const other = EVERYONE.find((playerId) => playerId !== person) as string;

      // Act & Assert
      expect(() => game.answer(other, GAP_DILEMMA, { vote: null }, SEAL, AT)).toThrow(
        VoteMissingError,
      );
    });

    it('should reveal the person in the gap without a vote, with how many votes they guessed', () => {
      // Arrange
      const { game, person } = gameOfFour();
      const others = EVERYONE.filter((playerId) => playerId !== person);
      const [first, second, third] = others as [string, string, string];
      for (const voter of others) {
        game.answer(
          voter,
          GAP_DILEMMA,
          {
            vote: voter === first ? 'TestPull' : 'TestWait',
            votePredictions: predictions(game, voter),
          },
          SEAL,
          AT,
        );
      }
      // Right about the first and the second, wrong about the third.
      game.answer(
        person,
        GAP_DILEMMA,
        {
          vote: null,
          votePredictions: predictions(game, person, (other) =>
            other === first ? 'TestPull' : other === second ? 'TestWait' : 'TestPull',
          ),
        },
        SEAL,
        AT,
      );
      game.revealIfEveryoneAnswered(EVERYONE, AT);

      // Act
      const reveal = game.revealOf(0);

      // Assert
      expect(reveal.votes.map(({ playerId }) => playerId)).toEqual(others);
      expect(reveal.voteCount).toBe(3);
      expect(reveal.didNotVoteCount).toBe(0);
      expect(reveal.personInTheGap).toBe(person);
      expect(reveal.personInTheGapHits).toEqual({ right: 2, of: 3 });
      expect(reveal.votePredictions.filter(({ playerId }) => playerId === person)).toEqual([
        { playerId: person, aboutId: first, vote: 'TestPull', right: true },
        { playerId: person, aboutId: second, vote: 'TestWait', right: true },
        { playerId: person, aboutId: third, vote: 'TestPull', right: false },
      ]);
    });

    it('should never record the person in the gap as "did not vote"', () => {
      // Arrange
      const { game, person } = gameOfFour();

      // Act
      game.runOutRound(new Date(AT.getTime() + 60_000));

      // Assert
      expect(game.didNotVoteOf(person)).toEqual([]);
      expect(game.revealOf(0).didNotVoteCount).toBe(3);
      expect(game.revealOf(0).personInTheGapHits).toBeNull();
    });

    it('should count the hits of the person in the gap only of the votes there were', () => {
      // Arrange: the first votes the lever and the second waits; the third does not vote.
      const { game, person } = gameOfFour();
      const [first, second] = EVERYONE.filter((playerId) => playerId !== person) as [
        string,
        string,
      ];
      for (const [voter, vote] of [
        [first, 'TestPull'],
        [second, 'TestWait'],
      ] as const) {
        game.answer(
          voter,
          GAP_DILEMMA,
          { vote, votePredictions: predictions(game, voter) },
          SEAL,
          AT,
        );
      }
      // Pull for everyone: right about the first, wrong about the second.
      game.answer(
        person,
        GAP_DILEMMA,
        { vote: null, votePredictions: predictions(game, person) },
        SEAL,
        AT,
      );

      // Act
      game.runOutRound(new Date(AT.getTime() + 60_000));

      // Assert
      expect(game.revealOf(0).personInTheGapHits).toEqual({ right: 1, of: 2 });
    });

    it('should score each right prediction of the voters and of the person in the gap, all of them for the option everyone chose', () => {
      // Arrange
      const { game, person } = gameOfFour();
      const others = EVERYONE.filter((playerId) => playerId !== person);
      for (const voter of others) {
        game.answer(
          voter,
          GAP_DILEMMA,
          { vote: 'TestPull', votePredictions: predictions(game, voter) },
          SEAL,
          AT,
        );
      }
      game.answer(
        person,
        GAP_DILEMMA,
        { vote: null, votePredictions: predictions(game, person, () => 'TestPull') },
        SEAL,
        AT,
      );

      // Act
      game.revealIfEveryoneAnswered(EVERYONE, AT);

      // Assert
      for (const voter of others) {
        expect(game.pointsOf(voter)).toEqual([{ dilemmaId: GAP_DILEMMA, points: 20 }]);
      }
      expect(game.pointsOf(person)).toEqual([{ dilemmaId: GAP_DILEMMA, points: 30 }]);
    });
  });

  describe('in an anonymous room', () => {
    it('should count the person in the gap as answered with the distribution prediction and Ready', () => {
      // Arrange
      const { game, person } = gameOfFour(ANONYMOUS);

      // Act
      game.answer(person, GAP_DILEMMA, { vote: null, ready: true }, SEAL, AT);

      // Assert
      expect(game.hasAnswered(person)).toBe(true);
      expect(game.answersOf(person)[0]?.vote).toBeNull();
    });

    it('should not let the person in the gap vote', () => {
      // Arrange
      const { game, person } = gameOfFour(ANONYMOUS);

      // Act & Assert
      expect(() =>
        game.answer(person, GAP_DILEMMA, { vote: 'TestPull', ready: true }, SEAL, AT),
      ).toThrow(PersonInTheGapVotesError);
    });

    it('should score the person in the gap against the votes of the others', () => {
      // Arrange
      const { game, person } = gameOfFour(ANONYMOUS);
      const [first, ...rest] = EVERYONE.filter((playerId) => playerId !== person);
      game.answer(first as string, GAP_DILEMMA, { vote: 'TestPull', ready: true }, SEAL, AT);
      for (const voter of rest) {
        game.answer(voter, GAP_DILEMMA, { vote: 'TestWait', ready: true }, SEAL, AT);
      }
      game.answer(
        person,
        GAP_DILEMMA,
        {
          vote: null,
          distributionPrediction: [
            { optionId: 'TestPull', share: 35 },
            { optionId: 'TestWait', share: 65 },
          ],
          ready: true,
        },
        SEAL,
        AT,
      );

      // Act
      game.revealIfEveryoneAnswered(EVERYONE, AT);

      // Assert
      const reveal = game.revealOf(0);
      expect(reveal.distribution).toEqual([
        { optionId: 'TestPull', count: 1 },
        { optionId: 'TestWait', count: 2 },
      ]);
      expect(reveal.voteCount).toBe(3);
      expect(reveal.didNotVoteCount).toBe(0);
      expect(reveal.personInTheGapHits).toBeNull();
      // Predicted 35 and 65 against a third and two thirds.
      expect(game.pointsOf(person)).toEqual([{ dilemmaId: GAP_DILEMMA, points: 98 }]);
    });

    it('should count only who votes for the fewest votes to show the distribution', () => {
      // Arrange
      const { game, person } = gameOfFour(ANONYMOUS);
      const [first, second] = EVERYONE.filter((playerId) => playerId !== person);
      game.answer(first as string, GAP_DILEMMA, { vote: 'TestPull', ready: true }, SEAL, AT);
      game.answer(second as string, GAP_DILEMMA, { vote: 'TestWait', ready: true }, SEAL, AT);
      game.answer(person, GAP_DILEMMA, { vote: null, ready: true }, SEAL, AT);

      // Act
      game.reveal('time', AT);

      // Assert
      expect(game.revealOf(0).tooFewVotes).toBe(true);
      expect(game.pointsOf(person)).toEqual([]);
    });
  });
});
