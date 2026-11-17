import { describe, expect, it } from 'vitest';
import {
  categoriesKey,
  categoriesToDraw,
  composeGame,
  type Candidates,
  type ComposeGameInput,
} from '../../services/compose-game.ts';
import type { RoundSnapshot } from '../../vos/round.vo.ts';
import { FixedRandomness } from '../support/fixed-randomness.ts';

/** The values of the thresholds of exploration: 2 slots from 6 random rounds and 3 from 11. */
const EXPLORATION_SLOTS = [
  { fromRandomRounds: 6, slots: 2 },
  { fromRandomRounds: 11, slots: 3 },
];

const CATALOG = Array.from({ length: 20 }, (_, index) => `TestCatalog${index + 1}`);
const EXPLORATION = ['TestNew1', 'TestNew2', 'TestNew3', 'TestNew4'];
const EVERY_CATEGORY: Candidates = { inCatalog: CATALOG, inExploration: EXPLORATION };
const HONESTY: Candidates = { inCatalog: ['TestHonesty1'], inExploration: ['TestHonestyNew1'] };

function randomRounds(count: number): RoundSnapshot[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    origin: 'random',
    categories: null,
  }));
}

function input(changes: Partial<ComposeGameInput> = {}): ComposeGameInput {
  return {
    rounds: randomRounds(8),
    chosenDilemmas: [],
    newDilemmas: true,
    candidates: new Map([
      ['*', EVERY_CATEGORY],
      ['honesty', HONESTY],
    ]),
    explorationSlots: EXPLORATION_SLOTS,
    ...changes,
  };
}

function ids(dilemmas: readonly { readonly dilemmaId: string }[]): string[] {
  return dilemmas.map(({ dilemmaId }) => dilemmaId);
}

const SPECIFIC = { dilemmaId: 'TestSpecific', minimumAge: 16, compromising: false } as const;

describe('composeGame', () => {
  it('should draw a dilemma for each random round, without repeating any', () => {
    // Act
    const composed = composeGame(input(), new FixedRandomness());

    // Assert
    expect(composed).toHaveLength(8);
    expect(new Set(ids(composed)).size).toBe(8);
    expect(composed.every(({ origin, chosenBy }) => origin === 'random' && chosenBy === null)).toBe(
      true,
    );
  });

  it('should play each round in its place: the specific dilemma and the one a player chose', () => {
    // Arrange
    const rounds: RoundSnapshot[] = [
      { id: 4, origin: 'specific', dilemma: SPECIFIC },
      { id: 1, origin: 'random', categories: null },
      { id: 2, origin: 'players' },
    ];
    const chosenDilemmas = [
      {
        dilemmaId: 'TestChosen',
        minimumAge: 16,
        compromising: false,
        roundId: 2,
        playerId: 'TestLuisId',
      },
    ] as const;

    // Act
    const composed = composeGame(input({ rounds, chosenDilemmas }), new FixedRandomness());

    // Assert
    expect(composed[0]).toEqual({ dilemmaId: 'TestSpecific', origin: 'specific', chosenBy: null });
    expect(composed[1]?.origin).toBe('random');
    expect(composed[2]).toEqual({
      dilemmaId: 'TestChosen',
      origin: 'players',
      chosenBy: 'TestLuisId',
    });
  });

  it('should draw from every category for a round of the players nobody chose a dilemma for', () => {
    // Act
    const composed = composeGame(
      input({ rounds: [{ id: 1, origin: 'players' }], newDilemmas: false }),
      new FixedRandomness(),
    );

    // Assert
    expect(composed).toEqual([
      { dilemmaId: expect.stringMatching(/^TestCatalog/), origin: 'random', chosenBy: null },
    ]);
  });

  it('should draw the dilemma of a random round from its categories', () => {
    // Act
    const composed = composeGame(
      input({ rounds: [{ id: 1, origin: 'random', categories: ['honesty'] }], newDilemmas: false }),
      new FixedRandomness(),
    );

    // Assert
    expect(ids(composed)).toEqual(['TestHonesty1']);
  });

  it('should never draw a dilemma that is already in another round', () => {
    // Arrange
    const rounds: RoundSnapshot[] = [
      { id: 1, origin: 'specific', dilemma: { ...SPECIFIC, dilemmaId: 'TestCatalog1' } },
      { id: 2, origin: 'random', categories: null },
    ];

    // Act
    const composed = composeGame(input({ rounds, newDilemmas: false }), new FixedRandomness());

    // Assert
    expect(ids(composed)).toEqual(['TestCatalog1', 'TestCatalog2']);
  });

  it.each([
    [6, 2],
    [8, 2],
    [10, 2],
    [12, 3],
  ] as const)(
    'should keep room for new dilemmas in a game of %i random rounds: %i',
    (count, expected) => {
      // Act
      const composed = composeGame(input({ rounds: randomRounds(count) }), new FixedRandomness());

      // Assert
      expect(ids(composed).filter((id) => id.startsWith('TestNew'))).toHaveLength(expected);
      expect(composed).toHaveLength(count);
    },
  );

  it('should count only the random rounds for the exploration slots', () => {
    // Arrange: 5 random rounds and a specific one, fewer than the 6 a slot needs.
    const rounds = [...randomRounds(5), { id: 6, origin: 'specific', dilemma: SPECIFIC } as const];

    // Act
    const composed = composeGame(input({ rounds }), new FixedRandomness());

    // Assert
    expect(ids(composed).some((id) => id.startsWith('TestNew'))).toBe(false);
  });

  it('should take each new dilemma from the categories of its round', () => {
    // Arrange: every random round is of honesty, which has one dilemma in exploration.
    const rounds = Array.from({ length: 6 }, (_, index): RoundSnapshot => ({
      id: index + 1,
      origin: 'random',
      categories: ['honesty'],
    }));

    // Act
    const composed = composeGame(input({ rounds }), new FixedRandomness());

    // Assert
    expect([...ids(composed)].sort()).toEqual(['TestHonesty1', 'TestHonestyNew1']);
  });

  it('should take no dilemma in exploration when the host turns off new dilemmas', () => {
    // Act
    const composed = composeGame(input({ newDilemmas: false }), new FixedRandomness());

    // Assert
    expect(ids(composed).some((id) => id.startsWith('TestNew'))).toBe(false);
    expect(composed).toHaveLength(8);
  });

  it('should fill from exploration when the catalog runs short, and leave out a round with nothing left', () => {
    // Act
    const composed = composeGame(
      input({
        candidates: new Map([
          ['*', { inCatalog: ['TestCatalog1', 'TestCatalog2'], inExploration: EXPLORATION }],
        ]),
      }),
      new FixedRandomness(),
    );

    // Assert
    expect(composed).toHaveLength(6);
  });

  it('should draw the dilemmas in the order the randomness gives', () => {
    // Arrange
    const settings = input({ rounds: randomRounds(6), newDilemmas: false });

    // Act
    const inOrder = composeGame(settings, new FixedRandomness());
    const shuffled = composeGame(
      settings,
      new FixedRandomness(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1),
    );

    // Assert
    expect(ids(inOrder)).not.toEqual(ids(shuffled));
  });
});

describe('categoriesToDraw', () => {
  it('should give each set of categories the random rounds and the empty rounds of the players draw from, once', () => {
    // Arrange
    const rounds: RoundSnapshot[] = [
      { id: 1, origin: 'random', categories: ['loyalty', 'honesty'] },
      { id: 2, origin: 'random', categories: ['honesty', 'loyalty'] },
      { id: 3, origin: 'players' },
      { id: 4, origin: 'players' },
      { id: 5, origin: 'specific', dilemma: SPECIFIC },
    ];
    const chosenDilemmas = [
      {
        dilemmaId: 'TestChosen',
        minimumAge: 16,
        compromising: false,
        roundId: 4,
        playerId: 'TestLuisId',
      },
    ] as const;

    // Act
    const categories = categoriesToDraw(rounds, chosenDilemmas);

    // Assert
    expect(categories.map(categoriesKey)).toEqual(['honesty,loyalty', '*']);
  });
});
