import { describe, expect, it } from 'vitest';
import { Game, type GameSettings, type PlayedDilemma } from '../../entities/game.ts';
import { Player } from '../../entities/player.ts';
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
  objectsToAnalytics: false,
};
const OBJECTING = { ...SEAL, objectsToAnalytics: true };
const AT = new Date('2026-11-23T10:00:00Z');
const SECOND = 1000;
const NOMINAL: GameSettings = {
  ambience: 'classic',
  variant: 'nominal',
  dilemmaLanguage: 'es',
  timePerDilemmaSeconds: 60,
};

function after(ms: number): Date {
  return new Date(AT.getTime() + ms);
}

function gameOf(nicknames: readonly string[]): Game {
  const players = nicknames.map((nickname) =>
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
  const dilemmas: PlayedDilemma[] = [1, 2].map((number) => ({
    dilemmaId: `TestDilemma${number}`,
    version: 1,
    optionIds: [PULL, WAIT],
    hasGap: false,
    fixedOrder: true,
    origin: 'random',
    chosenBy: null,
  }));
  const game = Game.create(
    { roomId: 'TestRoomId', dilemmas, settings: NOMINAL },
    new FixedIdGenerator('TestGameId'),
  );
  game.start(players, AT, new KeepOrderRandomness());
  game.pullEvents();
  return game;
}

/** Ana and Luis answer the first dilemma, predicting each other, after a few seconds. */
function bothAnswer(game: Game, seals = { Ana: SEAL, Luis: SEAL }): void {
  game.answer(
    'Ana',
    'TestDilemma1',
    { vote: PULL, votePredictions: [{ playerId: 'Luis', vote: WAIT }] },
    seals.Ana,
    after(5 * SECOND),
  );
  game.answer(
    'Luis',
    'TestDilemma1',
    { vote: WAIT, votePredictions: [{ playerId: 'Ana', vote: PULL }] },
    seals.Luis,
    after(8 * SECOND),
  );
}

describe('Game, forgetting a player', () => {
  it('should keep nothing of their answers, nor the predictions the others made of their vote', () => {
    // Arrange
    const game = gameOf(['Ana', 'Luis']);
    bothAnswer(game);

    // Act
    game.forget('Luis');

    // Assert
    expect(game.answersOf('Luis')).toEqual([]);
    expect(game.answersOf('Ana')[0]?.votePredictions).toEqual([]);
    expect(game.answersOf('Ana')[0]?.vote).toBe(PULL);
    expect(game.hasLeft('Luis')).toBe(true);
  });

  it('should keep no reaction of theirs, nor any to their vote', () => {
    // Arrange
    const game = gameOf(['Ana', 'Luis']);
    bothAnswer(game);
    game.reveal('host', after(10 * SECOND));
    game.react('Luis', 0, { kind: 'dilemma' }, '😮', SEAL);
    game.react('Ana', 0, { kind: 'vote', playerId: 'Luis' }, '❤️', SEAL);
    game.react('Ana', 0, { kind: 'dilemma' }, '🤔', SEAL);

    // Act
    game.forget('Luis');

    // Assert
    expect(game.reactions().map(({ playerId, emoji }) => ({ playerId, emoji }))).toEqual([
      { playerId: 'Ana', emoji: '🤔' },
    ]);
  });

  it('should do nothing for a player who is not in the game', () => {
    // Arrange
    const game = gameOf(['Ana', 'Luis']);
    const before = game.toSnapshot();

    // Act
    game.forget('Marta');

    // Assert
    expect(game.toSnapshot()).toEqual(before);
  });
});

describe('Game, with a player who objects to product analytics', () => {
  it('should keep no time of their answer, and the time of those who do not object', () => {
    // Arrange
    const game = gameOf(['Ana', 'Luis']);

    // Act
    bothAnswer(game, { Ana: SEAL, Luis: OBJECTING });

    // Assert
    expect(game.answersOf('Ana')[0]?.responseTimeMs).toBe(5 * SECOND);
    expect(game.answersOf('Luis')[0]?.responseTimeMs).toBeNull();
  });

  it('should keep no time the group spent on the reveal of a dilemma they answered', () => {
    // Arrange
    const game = gameOf(['Ana', 'Luis']);
    bothAnswer(game, { Ana: SEAL, Luis: OBJECTING });
    game.reveal('host', after(10 * SECOND));

    // Act
    game.moveOn('Ana', 0, after(40 * SECOND));

    // Assert
    expect(game.timeSpentOn('TestDilemma1')).toBeNull();
  });

  it('should keep the time the group spent when nobody objects', () => {
    // Arrange
    const game = gameOf(['Ana', 'Luis']);
    bothAnswer(game);
    game.reveal('host', after(10 * SECOND));

    // Act
    game.moveOn('Ana', 0, after(40 * SECOND));

    // Assert
    expect(game.timeSpentOn('TestDilemma1')).toBe(30 * SECOND);
  });
});
