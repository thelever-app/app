import { describe, expect, it } from 'vitest';
import { Game, type GameSettings, type PlayedDilemma } from '../../entities/game.ts';
import { Player } from '../../entities/player.ts';
import { InvalidEmojiError } from '../../errors/invalid-emoji.error.ts';
import { NoVoteToReactToError } from '../../errors/no-vote-to-react-to.error.ts';
import { GameStageChangedEvent } from '../../events/game-stage-changed.event.ts';
import { ReactionsChangedEvent } from '../../events/reactions-changed.event.ts';
import { AvatarVO } from '../../vos/avatar.vo.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';
import { KeepOrderRandomness } from '../support/keep-order-randomness.ts';

const PULL = 'TestPull';
const WAIT = 'TestWait';
const SEAL = {
  gameConsentVersion: 'TestGameConsentVersion',
  researchConsentVersion: null,
  commercialLicenceConsentVersion: null,
  underEighteen: false,
};
const UNDER_EIGHTEEN = { ...SEAL, underEighteen: true };
const AT = new Date('2026-11-18T10:00:00Z');
const SECOND = 1000;
const NOMINAL: GameSettings = {
  variant: 'nominal',
  groupNature: 'friends',
  place: 'together',
  dilemmaLanguage: 'es',
  timePerDilemmaSeconds: 60,
};
const ANONYMOUS: GameSettings = { ...NOMINAL, variant: 'anonymous' };

function after(ms: number): Date {
  return new Date(AT.getTime() + ms);
}

function gameOf(
  nicknames: readonly string[],
  settings: GameSettings = NOMINAL,
  dilemmaCount = 3,
): Game {
  const players = nicknames.map((nickname) =>
    Player.create(
      { nickname, identity: `Test${nickname}Identity`, avatar: new AvatarVO('face-01', 'khaki') },
      new FixedIdGenerator(nickname),
    ),
  );
  const dilemmas: PlayedDilemma[] = Array.from({ length: dilemmaCount }, (_, index) => ({
    dilemmaId: `TestDilemma${index + 1}`,
    version: 1,
    optionIds: [PULL, WAIT],
    hasGap: false,
    fixedOrder: true,
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

/**
 * Everyone answers the round in progress with those votes; in a nominal room each one predicts
 * the others as `predict` says, or that they voted what they did. Then the dilemma is revealed.
 */
function round(
  game: Game,
  votes: Record<string, string>,
  predict: (playerId: string, aboutId: string) => string = (_, aboutId) => votes[aboutId] ?? PULL,
  revealedAt = AT,
): void {
  const { dilemmaId } = game.round!;
  for (const [playerId, vote] of Object.entries(votes)) {
    const votePredictions = game
      .playersToPredictBy(playerId, dilemmaId)
      .map((aboutId) => ({ playerId: aboutId, vote: predict(playerId, aboutId) }));
    const anonymous = game.settings.variant === 'anonymous';
    game.answer(
      playerId,
      dilemmaId,
      anonymous ? { vote, ready: true } : { vote, votePredictions },
      SEAL,
      AT,
    );
  }
  if (game.isInDecisionPhase) game.reveal('host', revealedAt);
}

const ALIKE = { Ana: PULL, Luis: PULL, Marta: WAIT };

/** Plays every round with the same votes, moving on from each one but the last. */
function playAll(game: Game, votes: Record<string, string> = ALIKE): void {
  const last = game.dilemmas.length - 1;
  for (let position = 0; position <= last; position += 1) {
    round(game, votes);
    if (position < last) game.moveOn('Ana', position, AT);
  }
}

describe('Game, at the end', () => {
  describe('vote predictions', () => {
    it('should score each right prediction more the fewer chose that option', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta', 'Sara']);

      // Act
      round(game, { Ana: PULL, Luis: PULL, Marta: PULL, Sara: WAIT }, (playerId, aboutId) =>
        playerId === 'Ana' && aboutId === 'Marta'
          ? WAIT
          : (({ Ana: PULL, Luis: PULL, Marta: PULL, Sara: WAIT } as Record<string, string>)[
              aboutId
            ] as string),
      );

      // Assert
      expect(game.pointsOf('Ana')).toEqual([{ dilemmaId: 'TestDilemma1', points: 111 }]);
    });
  });

  describe('moveOn to the results, in a nominal room', () => {
    it('should go from the last reveal through each title, who knows each one best and the ranking, to the end', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta']);
      playAll(game);

      // Act
      const firstMove = game.moveOn('Luis', 2, after(SECOND));
      const screens = game.results()!.titles.length + 2;
      const steps = [game.stage.step];
      for (let step = 0; step < screens - 1; step += 1) {
        game.moveOn('Marta', 3 + step, AT);
        steps.push(game.stage.step);
      }
      const lastMove = game.moveOn('Ana', 3 + screens - 1, AT);

      // Assert
      expect(firstMove).toBe(true);
      expect(steps).toEqual(Array.from({ length: screens }, (_, step) => step));
      expect(lastMove).toBe(true);
      expect(game.stage).toEqual({ kind: 'ended', movedOnBy: 'Ana', step: null });
    });

    it('should keep the results as the rounds ended them when a player leaves during them', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta']);
      playAll(game);
      game.moveOn('Luis', 2, AT);
      game.moveOn('Luis', 3, AT);
      const results = game.results();
      const ranking = game.ranking();

      // Act
      game.leave('Marta');

      // Assert
      expect(game.results()).toEqual(results);
      expect(game.ranking()).toEqual(ranking);
      expect(game.stage.step).toBe(1);
    });

    it('should move one screen only when two players move on from the same one', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta']);
      playAll(game);
      game.moveOn('Luis', 2, AT);
      game.pullEvents();

      // Act
      const first = game.moveOn('Ana', 3, AT);
      const second = game.moveOn('Marta', 3, AT);

      // Assert
      expect([first, second]).toEqual([true, false]);
      expect(game.stage).toEqual({ kind: 'results', movedOnBy: 'Ana', step: 1 });
      expect(game.pullEvents()).toEqual([
        new GameStageChangedEvent('TestGameId', 'results', 'Ana', game.version),
      ]);
    });

    it('should rank the players and give El Mentalista to whoever predicted best', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta']);
      const last = game.dilemmas.length - 1;
      for (let position = 0; position <= last; position += 1) {
        round(game, ALIKE, (playerId, aboutId) =>
          playerId === 'Marta' ? (ALIKE as Record<string, string>)[aboutId]! : WAIT,
        );
        if (position < last) game.moveOn('Ana', position, AT);
      }

      // Act
      game.moveOn('Ana', last, AT);

      // Assert
      expect(game.ranking()?.[0]).toMatchObject({
        playerId: 'Marta',
        position: 1,
        mentalist: true,
      });
      expect(game.results()?.titles.at(-1)?.winners).toEqual([
        { playerIds: ['Marta'], count: game.ranking()![0]!.points, of: null },
      ]);
    });

    it('should have no results while the rounds go on', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta']);

      // Act & Assert
      expect(game.results()).toBeNull();
      expect(game.ranking()).toBeNull();
    });
  });

  describe('time spent on a dilemma', () => {
    it('should record from the reveal to moving on, and up to the results for the last round', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta'], NOMINAL, 2);
      round(game, ALIKE, undefined, after(10 * SECOND));
      game.moveOn('Luis', 0, after(100 * SECOND));
      round(game, ALIKE, undefined, after(200 * SECOND));

      // Act
      game.moveOn('Luis', 1, after(230 * SECOND));

      // Assert
      expect(game.timeSpentOn('TestDilemma1')).toBe(90 * SECOND);
      expect(game.timeSpentOn('TestDilemma2')).toBe(30 * SECOND);
      expect(game.round?.revealedAt).toEqual(after(200 * SECOND));
    });

    it('should record no time below nothing when the clock that moves on is behind the one that revealed', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta'], NOMINAL, 2);
      round(game, ALIKE, undefined, after(10 * SECOND));

      // Act
      game.moveOn('Luis', 0, after(10 * SECOND - 3));

      // Assert
      expect(game.timeSpentOn('TestDilemma1')).toBe(0);
    });
  });

  describe('react', () => {
    it('should keep one reaction per player to the dilemma, the latest, with its seal', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta']);
      round(game, ALIKE);
      game.pullEvents();

      // Act
      game.react('Luis', 0, { kind: 'dilemma' }, '😂', SEAL);
      const reacted = game.react('Luis', 0, { kind: 'dilemma' }, '🤔', UNDER_EIGHTEEN);

      // Assert
      expect(reacted).toBe(true);
      expect(game.reactions()).toEqual([
        {
          dilemmaId: 'TestDilemma1',
          playerId: 'Luis',
          aboutId: null,
          emoji: '🤔',
          seal: UNDER_EIGHTEEN,
        },
      ]);
      expect(game.pullEvents()).toEqual([
        new ReactionsChangedEvent('TestGameId', 0, game.version - 1),
        new ReactionsChangedEvent('TestGameId', 0, game.version),
      ]);
    });

    it('should show in a nominal room who reacted to the dilemma and to each vote, one per vote and player', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta']);
      round(game, ALIKE);

      // Act
      game.react('Luis', 0, { kind: 'dilemma' }, '😂', SEAL);
      game.react('Marta', 0, { kind: 'dilemma' }, '😂', SEAL);
      game.react('Ana', 0, { kind: 'dilemma' }, '👏', SEAL);
      game.react('Luis', 0, { kind: 'vote', playerId: 'Ana' }, '😮', SEAL);
      game.react('Luis', 0, { kind: 'vote', playerId: 'Ana' }, '❤️', SEAL);
      game.react('Luis', 0, { kind: 'vote', playerId: 'Luis' }, '👍', SEAL);

      // Assert
      const reveal = game.revealOf(0);
      expect(reveal.dilemmaReactions).toEqual([
        { emoji: '😂', count: 2, playerIds: ['Luis', 'Marta'] },
        { emoji: '👏', count: 1, playerIds: ['Ana'] },
      ]);
      expect(reveal.voteReactions).toEqual([
        { playerId: 'Luis', aboutId: 'Ana', emoji: '❤️' },
        { playerId: 'Luis', aboutId: 'Luis', emoji: '👍' },
      ]);
    });

    it('should show in an anonymous room only how many reacted with each emoji, and take no reaction to a vote', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta'], ANONYMOUS);
      round(game, ALIKE);

      // Act
      game.react('Luis', 0, { kind: 'dilemma' }, '😂', SEAL);
      game.react('Ana', 0, { kind: 'dilemma' }, '😂', SEAL);

      // Assert
      expect(game.revealOf(0).dilemmaReactions).toEqual([{ emoji: '😂', count: 2, playerIds: [] }]);
      expect(game.revealOf(0).voteReactions).toEqual([]);
      expect(() => game.react('Luis', 0, { kind: 'vote', playerId: 'Ana' }, '😂', SEAL)).toThrow(
        NoVoteToReactToError,
      );
      expect(game.reactionOf('Luis', 0)).toEqual({ dilemma: '😂', votes: [] });
    });

    it('should not take a reaction to who did not vote, nor one that is not an emoji', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta']);
      round(game, { Ana: PULL, Luis: PULL });

      // Act & Assert
      expect(() => game.react('Luis', 0, { kind: 'vote', playerId: 'Marta' }, '😂', SEAL)).toThrow(
        NoVoteToReactToError,
      );
      expect(() => game.react('Luis', 0, { kind: 'dilemma' }, 'hola', SEAL)).toThrow(
        InvalidEmojiError,
      );
    });

    it('should take no reaction outside the reveal of that dilemma', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta']);

      // Act
      const during = game.react('Luis', 0, { kind: 'dilemma' }, '😂', SEAL);
      round(game, ALIKE);
      game.moveOn('Ana', 0, AT);
      const past = game.react('Luis', 0, { kind: 'dilemma' }, '😂', SEAL);

      // Assert
      expect([during, past]).toEqual([false, false]);
      expect(game.reactions()).toEqual([]);
    });

    it('should count the reactions to the votes of each one for Imán de reacciones', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta']);
      const last = game.dilemmas.length - 1;
      for (let position = 0; position <= last; position += 1) {
        round(game, ALIKE);
        game.react('Ana', position, { kind: 'vote', playerId: 'Marta' }, '😮', SEAL);
        if (position < last) game.moveOn('Ana', position, AT);
      }

      // Act
      game.moveOn('Ana', last, AT);

      // Assert
      expect(
        game.results()?.titles.find(({ title }) => title === 'iman-de-reacciones')?.winners,
      ).toEqual([{ playerIds: ['Marta'], count: 3, of: null }]);
    });
  });

  describe('mostDivisiveDilemma', () => {
    it('should be the dilemma closest to an even split, once the rounds are over', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta'], ANONYMOUS);
      round(game, { Ana: PULL, Luis: PULL, Marta: PULL });
      game.moveOn('Ana', 0, AT);
      round(game, { Ana: PULL, Luis: WAIT, Marta: PULL });
      game.moveOn('Ana', 1, AT);
      round(game, { Ana: WAIT, Luis: WAIT, Marta: WAIT });
      const during = game.mostDivisiveDilemma();

      // Act
      game.moveOn('Ana', 2, AT);

      // Assert
      expect(during).toBeNull();
      expect(game.mostDivisiveDilemma()).toBe('TestDilemma2');
    });
  });

  describe('restore', () => {
    it('should keep the reactions, the time spent on each dilemma and the screen of the results', () => {
      // Arrange
      const game = gameOf(['Ana', 'Luis', 'Marta']);
      playAll(game);
      game.react('Luis', 2, { kind: 'vote', playerId: 'Ana' }, '😮', SEAL);
      game.moveOn('Ana', 2, after(5 * SECOND));
      game.moveOn('Ana', 3, AT);

      // Act
      const restored = Game.restore(game.toSnapshot());

      // Assert
      expect(restored.toSnapshot()).toEqual(game.toSnapshot());
      expect(restored.stage).toEqual({ kind: 'results', movedOnBy: 'Ana', step: 1 });
      expect(restored.timeSpentOn('TestDilemma3')).toBe(5 * SECOND);
      expect(restored.reactions()).toHaveLength(1);
    });
  });
});
