import { describe, expect, it } from 'vitest';
import {
  drawKey,
  drawsOf,
  categoriesToDraw,
  fixedDilemmaIds,
  composeGame,
  type Candidates,
  type ComposeGameInput,
} from '../../services/compose-game.ts';
import type { CandidateDilemma } from '../../vos/classification.vo.ts';
import type { Category } from '../../vos/category.vo.ts';
import type { LobbyDilemma, RoundContent, RoundSnapshot } from '../../vos/round.vo.ts';
import { FixedRandomness } from '../support/fixed-randomness.ts';
import { KeepOrderRandomness } from '../support/keep-order-randomness.ts';

/** The values of the thresholds of exploration: 2 slots from 6 random rounds and 3 from 11. */
const EXPLORATION_SLOTS = [
  { fromRandomRounds: 6, slots: 2 },
  { fromRandomRounds: 11, slots: 3 },
];

/** A standard, everyday dilemma for everyone, without the gap, unless the changes say. */
function candidate(dilemmaId: string, changes: Partial<CandidateDilemma> = {}): CandidateDilemma {
  return {
    dilemmaId,
    type: 'standard',
    scale: 'everyday',
    minimumAge: 16,
    hasGap: false,
    ...changes,
  };
}

function candidatesCalled(dilemmaIds: readonly string[]): CandidateDilemma[] {
  return dilemmaIds.map((dilemmaId) => candidate(dilemmaId));
}

const CATALOG = candidatesCalled(
  Array.from({ length: 20 }, (_, index) => `TestCatalog${index + 1}`),
);
const EXPLORATION = candidatesCalled(['TestNew1', 'TestNew2', 'TestNew3', 'TestNew4']);
const EVERY_CATEGORY: Candidates = { inCatalog: CATALOG, inExploration: EXPLORATION };
const HONESTY: Candidates = {
  inCatalog: candidatesCalled(['TestHonesty1']),
  inExploration: candidatesCalled(['TestHonestyNew1']),
};

function randomRounds(count: number): RoundSnapshot[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    origin: 'random',
    categories: null,
    content: { age: 'any', compromising: 'any' },
  }));
}

function input(changes: Partial<ComposeGameInput> = {}): ComposeGameInput {
  return {
    rounds: randomRounds(8),
    chosenDilemmas: [],
    newDilemmas: true,
    candidates: new Map([
      ['*|any', EVERY_CATEGORY],
      ['honesty|any', HONESTY],
    ]),
    explorationSlots: EXPLORATION_SLOTS,
    playsTheGap: true,
    playedBy: new Map(),
    ...changes,
  };
}

function ids(dilemmas: readonly { readonly dilemmaId: string }[]): string[] {
  return dilemmas.map(({ dilemmaId }) => dilemmaId);
}

const SPECIFIC: LobbyDilemma = { ...candidate('TestSpecific'), compromising: false };

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
      { id: 1, origin: 'random', categories: null, content: { age: 'any', compromising: 'any' } },
      { id: 2, origin: 'players' },
    ];
    const chosenDilemmas = [
      { ...candidate('TestChosen'), compromising: false, roundId: 2, playerId: 'TestLuisId' },
    ];

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
      input({
        rounds: [
          {
            id: 1,
            origin: 'random',
            categories: ['honesty'],
            content: { age: 'any', compromising: 'any' },
          },
        ],
        newDilemmas: false,
      }),
      new FixedRandomness(),
    );

    // Assert
    expect(ids(composed)).toEqual(['TestHonesty1']);
  });

  it('should draw the dilemma of a round of a content from those of its content', () => {
    // Arrange
    const rounds: RoundSnapshot[] = [
      {
        id: 1,
        origin: 'random',
        categories: null,
        content: { age: 'adults-only', compromising: 'any' },
      },
      { id: 2, origin: 'random', categories: null, content: { age: 'any', compromising: 'any' } },
    ];
    const candidates = new Map([
      ['*|any', { inCatalog: CATALOG.slice(0, 3), inExploration: [] }],
      ['*|adults-only', { inCatalog: candidatesCalled(['TestAdult1']), inExploration: [] }],
    ]);

    // Act
    const composed = composeGame(
      input({ rounds, candidates, newDilemmas: false }),
      new KeepOrderRandomness(),
    );

    // Assert
    expect(ids(composed)[0]).toBe('TestAdult1');
  });

  it('should play any content of its categories in a round whose content has nothing left', () => {
    // Arrange
    const rounds: RoundSnapshot[] = [
      {
        id: 1,
        origin: 'random',
        categories: ['honesty'],
        content: { age: 'any', compromising: 'yes' },
      },
    ];
    const candidates = new Map([
      ['honesty|any', { inCatalog: candidatesCalled(['TestHonesty1']), inExploration: [] }],
      ['honesty|compromising', { inCatalog: [], inExploration: [] }],
    ]);

    // Act
    const composed = composeGame(
      input({ rounds, candidates, newDilemmas: false }),
      new KeepOrderRandomness(),
    );

    // Assert
    expect(ids(composed)).toEqual(['TestHonesty1']);
  });

  it('should keep a «no» of its content in a round whose content has nothing left, relaxing the age', () => {
    // Arrange: honesty has nothing from 16 that is not compromising, but has one for adults.
    const rounds: RoundSnapshot[] = [
      {
        id: 1,
        origin: 'random',
        categories: ['honesty'],
        content: { age: 'from-16', compromising: 'no' },
      },
    ];
    const candidates = new Map([
      [
        'honesty|any',
        { inCatalog: candidatesCalled(['TestHonestyCompromising']), inExploration: [] },
      ],
      ['honesty|from-16+not-compromising', { inCatalog: [], inExploration: [] }],
      [
        'honesty|not-compromising',
        { inCatalog: candidatesCalled(['TestHonestyAdult']), inExploration: [] },
      ],
    ]);

    // Act
    const composed = composeGame(
      input({ rounds, candidates, newDilemmas: false }),
      new KeepOrderRandomness(),
    );

    // Assert
    expect(ids(composed)).toEqual(['TestHonestyAdult']);
  });

  it('should play a round from every category before its categories play something it ruled out', () => {
    // Arrange: love has only compromising dilemmas.
    const rounds: RoundSnapshot[] = [
      {
        id: 1,
        origin: 'random',
        categories: ['love-and-relationships'],
        content: { age: 'from-16', compromising: 'no' },
      },
    ];
    const candidates = new Map([
      [
        'love-and-relationships|any',
        { inCatalog: candidatesCalled(['TestLoveCompromising']), inExploration: [] },
      ],
      ['love-and-relationships|from-16+not-compromising', { inCatalog: [], inExploration: [] }],
      ['love-and-relationships|not-compromising', { inCatalog: [], inExploration: [] }],
      [
        '*|from-16+not-compromising',
        { inCatalog: candidatesCalled(['TestMild']), inExploration: [] },
      ],
    ]);

    // Act
    const composed = composeGame(
      input({ rounds, candidates, newDilemmas: false }),
      new KeepOrderRandomness(),
    );

    // Assert
    expect(ids(composed)).toEqual(['TestMild']);
  });

  it('should let every round fall back on its own categories before any falls back on every category', () => {
    // Arrange: honesty has nothing that is not compromising; justice has a single one.
    const rounds: RoundSnapshot[] = [
      {
        id: 1,
        origin: 'random',
        categories: ['honesty'],
        content: { age: 'any', compromising: 'no' },
      },
      {
        id: 2,
        origin: 'random',
        categories: ['justice'],
        content: { age: 'from-16', compromising: 'no' },
      },
    ];
    const candidates = new Map([
      [
        '*|not-compromising',
        { inCatalog: candidatesCalled(['TestJustice', 'TestOther']), inExploration: [] },
      ],
      [
        'justice|not-compromising',
        { inCatalog: candidatesCalled(['TestJustice']), inExploration: [] },
      ],
    ]);

    // Act
    const composed = composeGame(
      input({ rounds, candidates, newDilemmas: false }),
      new KeepOrderRandomness(),
    );

    // Assert
    expect(ids(composed)).toEqual(['TestOther', 'TestJustice']);
  });

  it('should leave out a round that rules out compromising dilemmas when nothing else is left', () => {
    // Arrange
    const rounds: RoundSnapshot[] = [
      {
        id: 1,
        origin: 'random',
        categories: ['love-and-relationships'],
        content: { age: 'any', compromising: 'no' },
      },
    ];
    const candidates = new Map([
      [
        'love-and-relationships|any',
        { inCatalog: candidatesCalled(['TestLoveCompromising']), inExploration: [] },
      ],
    ]);

    // Act
    const composed = composeGame(
      input({ rounds, candidates, newDilemmas: false }),
      new KeepOrderRandomness(),
    );

    // Assert
    expect(composed).toEqual([]);
  });

  it('should take a dilemma of its content from the catalog before any content from exploration', () => {
    // Arrange: one exploration slot, which only dilemmas of any content could fill.
    const rounds: RoundSnapshot[] = [
      {
        id: 1,
        origin: 'random',
        categories: null,
        content: { age: 'adults-only', compromising: 'any' },
      },
    ];
    const candidates = new Map([
      ['*|any', { inCatalog: [], inExploration: candidatesCalled(['TestNewAny']) }],
      ['*|adults-only', { inCatalog: candidatesCalled(['TestAdult']), inExploration: [] }],
    ]);

    // Act
    const composed = composeGame(
      input({ rounds, candidates, explorationSlots: [{ fromRandomRounds: 1, slots: 1 }] }),
      new KeepOrderRandomness(),
    );

    // Assert
    expect(ids(composed)).toEqual(['TestAdult']);
  });

  it('should take a dilemma of its content from exploration before any content from the catalog', () => {
    // Arrange
    const rounds: RoundSnapshot[] = [
      { id: 1, origin: 'random', categories: null, content: { age: 'any', compromising: 'yes' } },
    ];
    const candidates = new Map([
      ['*|any', { inCatalog: candidatesCalled(['TestAny']), inExploration: [] }],
      [
        '*|compromising',
        { inCatalog: [], inExploration: candidatesCalled(['TestNewCompromising']) },
      ],
    ]);

    // Act
    const composed = composeGame(input({ rounds, candidates }), new KeepOrderRandomness());

    // Assert
    expect(ids(composed)).toEqual(['TestNewCompromising']);
  });

  it('should never draw a dilemma that is already in another round', () => {
    // Arrange
    const rounds: RoundSnapshot[] = [
      { id: 1, origin: 'specific', dilemma: { ...SPECIFIC, dilemmaId: 'TestCatalog1' } },
      { id: 2, origin: 'random', categories: null, content: { age: 'any', compromising: 'any' } },
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
      content: { age: 'any', compromising: 'any' },
    }));

    // Act
    const composed = composeGame(input({ rounds }), new FixedRandomness());

    // Assert
    expect([...ids(composed)].sort()).toEqual(['TestHonesty1', 'TestHonestyNew1']);
  });

  it.each([[new FixedRandomness()], [new FixedRandomness(1)]])(
    'should not leave a round of a narrow category without the only dilemma it could play',
    (randomness) => {
      // Arrange: every category has TestHonesty1 and TestLoyalty1, and honesty only TestHonesty1.
      const rounds: RoundSnapshot[] = [
        { id: 1, origin: 'random', categories: null, content: { age: 'any', compromising: 'any' } },
        {
          id: 2,
          origin: 'random',
          categories: ['honesty'],
          content: { age: 'any', compromising: 'any' },
        },
      ];
      const candidates = new Map([
        [
          '*|any',
          { inCatalog: candidatesCalled(['TestHonesty1', 'TestLoyalty1']), inExploration: [] },
        ],
        ['honesty|any', { inCatalog: candidatesCalled(['TestHonesty1']), inExploration: [] }],
      ]);

      // Act
      const composed = composeGame(input({ rounds, candidates, newDilemmas: false }), randomness);

      // Assert
      expect(ids(composed)).toEqual(['TestLoyalty1', 'TestHonesty1']);
    },
  );

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
          ['*|any', { inCatalog: CATALOG.slice(0, 2), inExploration: EXPLORATION }],
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

describe('composeGame, with the gap', () => {
  it.each([['specific'], ['players']] as const)(
    'should make random from every category a %s round whose dilemma has the gap in a room without the players it needs',
    (origin) => {
      // Arrange
      const dilemma = { ...SPECIFIC, hasGap: true };
      const rounds: RoundSnapshot[] = [
        origin === 'specific' ? { id: 1, origin, dilemma } : { id: 1, origin },
      ];
      const chosenDilemmas =
        origin === 'players' ? [{ ...dilemma, roundId: 1, playerId: 'TestLuisId' }] : [];

      // Act
      const composed = composeGame(
        input({ rounds, chosenDilemmas, newDilemmas: false, playsTheGap: false }),
        new KeepOrderRandomness(),
      );

      // Assert
      expect(composed).toEqual([
        { dilemmaId: expect.stringMatching(/^TestCatalog/), origin: 'random', chosenBy: null },
      ]);
    },
  );

  it('should play a dilemma with the gap in a room with the players it needs', () => {
    // Arrange
    const rounds: RoundSnapshot[] = [
      { id: 1, origin: 'specific', dilemma: { ...SPECIFIC, hasGap: true } },
    ];

    // Act
    const composed = composeGame(input({ rounds }), new KeepOrderRandomness());

    // Assert
    expect(ids(composed)).toEqual(['TestSpecific']);
  });

  it('should draw no dilemma with the gap for a room without the players it needs', () => {
    // Arrange
    const withGap = candidatesCalled(['TestGap1', 'TestGap2']).map((dilemma) => ({
      ...dilemma,
      hasGap: true,
    }));
    const candidates = new Map([
      ['*|any', { inCatalog: [...withGap, ...CATALOG.slice(0, 2)], inExploration: [] }],
    ]);

    // Act
    const composed = composeGame(
      input({ rounds: randomRounds(4), candidates, newDilemmas: false, playsTheGap: false }),
      new KeepOrderRandomness(),
    );

    // Assert
    expect(ids(composed)).toEqual(['TestCatalog1', 'TestCatalog2']);
  });
});

describe('composeGame, spacing', () => {
  /** Of every category: a few of the kind each test spaces, and as many standard ones. */
  function withKind(changes: Partial<CandidateDilemma>, count = 10): Candidates {
    return {
      inCatalog: [
        ...Array.from({ length: count }, (_, index) => candidate(`TestKind${index + 1}`, changes)),
        ...CATALOG.slice(0, count),
      ],
      inExploration: [],
    };
  }

  function compose(candidates: Candidates, changes: Partial<ComposeGameInput> = {}) {
    // Every pool in its order: the dilemmas of the kind first, so only the rules space them.
    return composeGame(
      input({
        rounds: randomRounds(10),
        candidates: new Map([['*|any', candidates]]),
        newDilemmas: false,
        ...changes,
      }),
      new KeepOrderRandomness(),
    );
  }

  function kinds(composed: readonly { readonly dilemmaId: string }[]): boolean[] {
    return ids(composed).map((dilemmaId) => dilemmaId.startsWith('TestKind'));
  }

  it('should never play two would-you-rather dilemmas in consecutive rounds', () => {
    // Act
    const composed = compose(withKind({ type: 'would-you-rather' }));

    // Assert
    const kind = kinds(composed);
    expect(kind.some((isKind, index) => isKind && kind[index + 1])).toBe(false);
    expect(kind.filter(Boolean)).toHaveLength(5);
  });

  it('should play at most one game theory dilemma in any five rounds', () => {
    // Act
    const composed = compose(withKind({ type: 'game-theory' }));

    // Assert
    const kind = kinds(composed);
    for (let start = 0; start + 5 <= kind.length; start += 1) {
      expect(kind.slice(start, start + 5).filter(Boolean).length).toBeLessThanOrEqual(1);
    }
    expect(kind.filter(Boolean)).toHaveLength(2);
  });

  it('should play two game theory dilemmas in a row when nothing else is left', () => {
    // Act
    const composed = compose({
      inCatalog: candidatesCalled(['TestKind1', 'TestKind2']).map((dilemma) => ({
        ...dilemma,
        type: 'game-theory' as const,
      })),
      inExploration: [],
    });

    // Assert
    expect(ids(composed)).toEqual(['TestKind1', 'TestKind2']);
  });

  it('should play at most one extreme dilemma in any five rounds', () => {
    // Act
    const composed = compose(withKind({ scale: 'extreme' }));

    // Assert
    const extreme = kinds(composed);
    for (let start = 0; start + 5 <= extreme.length; start += 1) {
      expect(extreme.slice(start, start + 5).filter(Boolean).length).toBeLessThanOrEqual(1);
    }
    expect(extreme.filter(Boolean)).toHaveLength(2);
  });

  it('should space the drawn dilemmas around a specific round', () => {
    // Arrange
    const rounds: RoundSnapshot[] = [
      { id: 1, origin: 'random', categories: null, content: { age: 'any', compromising: 'any' } },
      { id: 2, origin: 'specific', dilemma: { ...SPECIFIC, type: 'game-theory' } },
      { id: 3, origin: 'random', categories: null, content: { age: 'any', compromising: 'any' } },
    ];

    // Act
    const composed = compose(withKind({ type: 'game-theory' }), { rounds });

    // Assert
    expect(kinds(composed)).toEqual([false, false, false]);
  });
});

describe('composeGame, history', () => {
  it('should draw first the dilemmas nobody in the room has played, then those fewer have', () => {
    // Arrange
    const playedBy = new Map(
      CATALOG.slice(0, 16).map(({ dilemmaId }, index) => [dilemmaId, index < 14 ? 3 : 1]),
    );

    // Act
    const composed = composeGame(
      input({ rounds: randomRounds(6), newDilemmas: false, playedBy }),
      new KeepOrderRandomness(),
    );

    // Assert
    expect([...ids(composed)].sort()).toEqual(
      [
        'TestCatalog15',
        'TestCatalog16',
        'TestCatalog17',
        'TestCatalog18',
        'TestCatalog19',
        'TestCatalog20',
      ].sort(),
    );
  });

  it('should space the dilemmas before minding the history', () => {
    // Arrange: only two game theory dilemmas nobody played; the rest, standard, played by everyone.
    const candidates: Candidates = {
      inCatalog: [
        candidate('TestKind1', { type: 'game-theory' }),
        candidate('TestKind2', { type: 'game-theory' }),
        ...CATALOG.slice(0, 2),
      ],
      inExploration: [],
    };
    const playedBy = new Map(CATALOG.slice(0, 2).map(({ dilemmaId }) => [dilemmaId, 3]));

    // Act
    const composed = composeGame(
      input({
        rounds: randomRounds(2),
        candidates: new Map([['*|any', candidates]]),
        newDilemmas: false,
        playedBy,
      }),
      new KeepOrderRandomness(),
    );

    // Assert
    expect(ids(composed)).toEqual(['TestKind1', 'TestCatalog1']);
  });
});

describe('categoriesToDraw', () => {
  it('should give each set of categories the random rounds and the empty rounds of the players draw from, once', () => {
    // Arrange
    const rounds: RoundSnapshot[] = [
      {
        id: 1,
        origin: 'random',
        categories: ['loyalty', 'honesty'],
        content: { age: 'any', compromising: 'any' },
      },
      {
        id: 2,
        origin: 'random',
        categories: ['honesty', 'loyalty'],
        content: { age: 'any', compromising: 'any' },
      },
      { id: 3, origin: 'players' },
      { id: 4, origin: 'players' },
      { id: 5, origin: 'specific', dilemma: SPECIFIC },
    ];
    const chosenDilemmas = [
      { ...candidate('TestChosen'), compromising: false, roundId: 4, playerId: 'TestLuisId' },
    ];

    // Act
    const draws = categoriesToDraw(rounds, chosenDilemmas, true);

    // Assert
    expect(
      draws.map(({ categories, content, rounds }) => [drawKey(categories, content), rounds]),
    ).toEqual([
      ['honesty,loyalty|any', 2],
      ['*|any', 1],
    ]);
  });

  it('should draw from every category for a dilemma with the gap in a room without the players it needs', () => {
    // Arrange
    const rounds: RoundSnapshot[] = [
      {
        id: 1,
        origin: 'random',
        categories: ['honesty'],
        content: { age: 'any', compromising: 'any' },
      },
      { id: 2, origin: 'specific', dilemma: { ...SPECIFIC, hasGap: true } },
    ];

    // Act
    const draws = categoriesToDraw(rounds, [], false);

    // Assert
    expect(
      draws.map(({ categories, content, rounds }) => [drawKey(categories, content), rounds]),
    ).toEqual([
      ['honesty|any', 1],
      ['*|any', 1],
    ]);
  });

  it('should draw each content of a set of categories apart, and count its rounds for any content too', () => {
    // Arrange
    const rounds: RoundSnapshot[] = [
      { id: 1, origin: 'random', categories: null, content: { age: 'any', compromising: 'any' } },
      {
        id: 2,
        origin: 'random',
        categories: null,
        content: { age: 'adults-only', compromising: 'any' },
      },
      { id: 3, origin: 'random', categories: null, content: { age: 'any', compromising: 'yes' } },
      {
        id: 4,
        origin: 'random',
        categories: null,
        content: { age: 'adults-only', compromising: 'any' },
      },
      {
        id: 5,
        origin: 'random',
        categories: null,
        content: { age: 'adults-only', compromising: 'yes' },
      },
    ];

    // Act
    const draws = categoriesToDraw(rounds, [], true);

    // Assert
    expect(
      draws.map(({ categories, content, rounds }) => [drawKey(categories, content), rounds]),
    ).toEqual([
      ['*|any', 5],
      ['*|adults-only', 2],
      ['*|compromising', 1],
      ['*|adults-only+compromising', 1],
    ]);
  });

  it('should draw for a round that rules out compromising dilemmas what it falls back on too', () => {
    // Arrange
    const rounds: RoundSnapshot[] = [
      {
        id: 1,
        origin: 'random',
        categories: ['honesty'],
        content: { age: 'from-16', compromising: 'no' },
      },
    ];

    // Act
    const draws = categoriesToDraw(rounds, [], true);

    // Assert
    expect(
      draws.map(({ categories, content, rounds }) => [drawKey(categories, content), rounds]),
    ).toEqual([
      ['honesty|any', 1],
      ['honesty|from-16+not-compromising', 1],
      ['honesty|not-compromising', 1],
      ['*|from-16+not-compromising', 1],
      ['*|not-compromising', 1],
    ]);
  });
});

describe('fixedDilemmaIds', () => {
  it('should give the dilemmas the rounds play without drawing them', () => {
    // Arrange
    const rounds: RoundSnapshot[] = [
      { id: 1, origin: 'random', categories: null, content: { age: 'any', compromising: 'any' } },
      { id: 2, origin: 'players' },
      { id: 3, origin: 'players' },
      { id: 4, origin: 'specific', dilemma: SPECIFIC },
      { id: 5, origin: 'specific', dilemma: { ...SPECIFIC, dilemmaId: 'TestGap', hasGap: true } },
    ];
    const chosenDilemmas = [
      { ...candidate('TestChosen'), compromising: false, roundId: 3, playerId: 'TestLuisId' },
    ];

    // Act
    const ids = fixedDilemmaIds(rounds, chosenDilemmas, false);

    // Assert
    expect(ids).toEqual(['TestChosen', SPECIFIC.dilemmaId]);
  });
});

describe('drawsOf', () => {
  const keysOf = (categories: readonly Category[] | null, content: RoundContent) =>
    drawsOf(categories, content).map((draw) => drawKey(draw.categories, draw.content));

  it('should fall back on any content of its categories for a round that rules nothing out', () => {
    // Act & Assert
    expect(keysOf(['honesty'], { age: 'adults-only', compromising: 'yes' })).toEqual([
      'honesty|adults-only+compromising',
      'honesty|any',
    ]);
    expect(keysOf(['honesty'], { age: 'any', compromising: 'any' })).toEqual(['honesty|any']);
  });

  it('should keep a «no», and then try every category, for a round that rules out compromising dilemmas', () => {
    // Act & Assert
    expect(keysOf(['honesty'], { age: 'from-16', compromising: 'no' })).toEqual([
      'honesty|from-16+not-compromising',
      'honesty|not-compromising',
      '*|from-16+not-compromising',
      '*|not-compromising',
    ]);
    expect(keysOf(null, { age: 'any', compromising: 'no' })).toEqual(['*|not-compromising']);
  });
});
