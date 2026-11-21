import { describe, expect, it } from 'vitest';
import { gameResults, type ResultsDilemma } from '../../services/game-results.ts';

const PULL = 'TestPull';
const WAIT = 'TestWait';
const EVERYONE = ['TestAna', 'TestLuis', 'TestMarta'];

/** A dilemma: what each one voted, who predicted what about whom and who reacted to whose vote. */
function dilemma(
  votes: Record<string, string>,
  {
    predictions = [],
    reactions = [],
    personInTheGap = null,
  }: {
    predictions?: readonly [string, string, string][];
    reactions?: readonly [string, string][];
    personInTheGap?: string | null;
  } = {},
): ResultsDilemma {
  return {
    personInTheGap,
    votes: new Map(Object.entries(votes)),
    predictions: predictions.map(([playerId, aboutId, vote]) => ({ playerId, aboutId, vote })),
    voteReactions: reactions.map(([playerId, aboutId]) => ({ playerId, aboutId })),
  };
}

function players(points: Record<string, number> = {}) {
  return EVERYONE.map((playerId) => ({ playerId, points: points[playerId] ?? 0 }));
}

/**
 * Three dilemmas everyone votes: in the first, Ana alone with the pull; in the other two, Marta
 * alone with the wait. So Marta is with the minority twice, Ana once, and Luis always with the majority.
 */
function threeVoted(extra: Parameters<typeof dilemma>[1] = {}): ResultsDilemma[] {
  return [0, 1, 2].map((index) =>
    dilemma(
      { TestAna: PULL, TestLuis: index === 0 ? WAIT : PULL, TestMarta: WAIT },
      index === 0 ? extra : {},
    ),
  );
}

function titleOf(results: ReturnType<typeof gameResults>, title: string) {
  return results.titles.find((candidate) => candidate.title === title);
}

describe('gameResults', () => {
  it('should give the titles with a winner in their fixed order, El Mentalista the last', () => {
    // Arrange
    const dilemmas = threeVoted({
      predictions: [
        ['TestAna', 'TestMarta', WAIT],
        ['TestMarta', 'TestAna', PULL],
        ['TestLuis', 'TestAna', WAIT],
      ],
      reactions: [['TestLuis', 'TestMarta']],
    });

    // Act
    const results = gameResults({ players: players({ TestAna: 50 }), dilemmas });

    // Assert
    expect(results.titles.map(({ title }) => title)).toEqual([
      'almas-gemelas',
      'verso-suelto',
      'la-voz-del-grupo',
      'iman-de-reacciones',
      'enigma',
      'libro-abierto',
      'el-mentalista',
    ]);
  });

  it('should give Verso suelto to who voted with the minority most often, with the runner-up', () => {
    // Act
    const results = gameResults({ players: players(), dilemmas: threeVoted() });

    // Assert
    expect(titleOf(results, 'verso-suelto')).toEqual({
      title: 'verso-suelto',
      winners: [{ playerIds: ['TestMarta'], count: 2, of: 3 }],
      runnersUp: [{ playerIds: ['TestAna'], count: 1, of: 3 }],
    });
  });

  it('should give La voz del grupo to who voted the only most voted option most often', () => {
    // Act
    const results = gameResults({ players: players(), dilemmas: threeVoted() });

    // Assert
    expect(titleOf(results, 'la-voz-del-grupo')?.winners).toEqual([
      { playerIds: ['TestLuis'], count: 3, of: 3 },
    ]);
  });

  it('should give Imán de reacciones to whose votes got the most reactions from the others', () => {
    // Arrange
    const dilemmas = threeVoted({
      reactions: [
        ['TestAna', 'TestLuis'],
        ['TestMarta', 'TestLuis'],
        ['TestLuis', 'TestLuis'],
        ['TestLuis', 'TestAna'],
      ],
    });

    // Act
    const results = gameResults({ players: players(), dilemmas });

    // Assert
    expect(titleOf(results, 'iman-de-reacciones')?.winners).toEqual([
      { playerIds: ['TestLuis'], count: 2, of: null },
    ]);
  });

  it('should give Libro abierto and Enigma by the share of right predictions about each one', () => {
    // Arrange
    const dilemmas = threeVoted({
      predictions: [
        ['TestLuis', 'TestAna', PULL],
        ['TestMarta', 'TestAna', PULL],
        ['TestAna', 'TestLuis', PULL],
        ['TestMarta', 'TestLuis', WAIT],
        ['TestAna', 'TestMarta', PULL],
        ['TestLuis', 'TestMarta', PULL],
      ],
    });

    // Act
    const results = gameResults({ players: players(), dilemmas });

    // Assert
    expect(titleOf(results, 'libro-abierto')?.winners).toEqual([
      { playerIds: ['TestAna'], count: 2, of: 2 },
    ]);
    expect(titleOf(results, 'enigma')?.winners).toEqual([
      { playerIds: ['TestMarta'], count: 0, of: 2 },
    ]);
  });

  it('should give Almas gemelas to the pair with the most points predicting each other', () => {
    // Arrange
    const dilemmas = threeVoted({
      predictions: [
        ['TestAna', 'TestMarta', WAIT],
        ['TestMarta', 'TestAna', PULL],
        ['TestAna', 'TestLuis', PULL],
        ['TestLuis', 'TestAna', WAIT],
      ],
    });

    // Act
    const results = gameResults({ players: players(), dilemmas });

    // Assert
    expect(titleOf(results, 'almas-gemelas')?.winners).toEqual([
      { playerIds: ['TestAna', 'TestMarta'], count: 2, of: 2 },
    ]);
  });

  it('should give El Mentalista to who has the most points, and mark it in the ranking', () => {
    // Act
    const results = gameResults({
      players: players({ TestAna: 120, TestLuis: 300, TestMarta: 300 }),
      dilemmas: threeVoted(),
    });

    // Assert
    expect(titleOf(results, 'el-mentalista')).toEqual({
      title: 'el-mentalista',
      winners: [
        { playerIds: ['TestLuis'], count: 300, of: null },
        { playerIds: ['TestMarta'], count: 300, of: null },
      ],
      runnersUp: [{ playerIds: ['TestAna'], count: 120, of: null }],
    });
    expect(
      results.ranking.filter(({ mentalist }) => mentalist).map(({ playerId }) => playerId),
    ).toEqual(['TestLuis', 'TestMarta']);
  });

  it('should only let players who voted at least 3 dilemmas get a title', () => {
    // Arrange
    const dilemmas = threeVoted();
    dilemmas[2] = dilemma({ TestAna: PULL, TestLuis: PULL });

    // Act
    const results = gameResults({ players: players({ TestMarta: 500 }), dilemmas });

    // Assert
    const holders = results.titles.flatMap(({ winners }) =>
      winners.flatMap(({ playerIds }) => playerIds),
    );
    expect(holders).not.toContain('TestMarta');
    expect(results.ranking.find(({ playerId }) => playerId === 'TestMarta')).toMatchObject({
      position: 1,
      mentalist: false,
    });
  });

  it('should count as voted the dilemma a player was the person in the gap of', () => {
    // Arrange
    const dilemmas = threeVoted();
    dilemmas[0] = dilemma({ TestAna: PULL, TestLuis: PULL }, { personInTheGap: 'TestMarta' });

    // Act
    const results = gameResults({ players: players(), dilemmas });

    // Assert
    expect(titleOf(results, 'verso-suelto')?.winners).toEqual([
      { playerIds: ['TestMarta'], count: 2, of: 2 },
    ]);
  });

  it('should share a title on a tie and skip it when everybody ties or the best is nothing', () => {
    // Arrange
    const dilemmas = [0, 1, 2].map(() =>
      dilemma({ TestAna: WAIT, TestLuis: WAIT, TestMarta: PULL }),
    );
    dilemmas.push(dilemma({ TestAna: PULL, TestLuis: PULL, TestMarta: PULL }));

    // Act
    const results = gameResults({ players: players(), dilemmas });

    // Assert
    expect(titleOf(results, 'la-voz-del-grupo')?.winners).toEqual([
      { playerIds: ['TestAna'], count: 4, of: 4 },
      { playerIds: ['TestLuis'], count: 4, of: 4 },
    ]);
    expect(titleOf(results, 'iman-de-reacciones')).toBeUndefined();
    expect(titleOf(results, 'el-mentalista')).toBeUndefined();
  });

  it('should give no title when a single player can get it, who would win against nobody', () => {
    // Arrange: only Ana voted 3 dilemmas; Luis, 2.
    const dilemmas = [0, 1, 2].map((index) =>
      dilemma(index < 2 ? { TestAna: PULL, TestLuis: WAIT } : { TestAna: PULL }, {
        reactions: [['TestLuis', 'TestAna']],
      }),
    );

    // Act
    const results = gameResults({ players: players({ TestAna: 90 }), dilemmas });

    // Assert
    expect(results.titles).toEqual([]);
  });

  it('should tell each player who knows them best, by the points of the predictions about them, shared on a tie', () => {
    // Arrange
    const dilemmas = threeVoted({
      predictions: [
        ['TestAna', 'TestMarta', WAIT],
        ['TestLuis', 'TestMarta', WAIT],
        ['TestMarta', 'TestAna', WAIT],
      ],
    });

    // Act
    const results = gameResults({ players: players(), dilemmas });

    // Assert
    expect(results.knownBestBy.get('TestMarta')).toEqual({
      playerIds: ['TestAna', 'TestLuis'],
      points: 40,
    });
    expect(results.knownBestBy.get('TestAna')).toEqual({ playerIds: [], points: 0 });
  });
});
