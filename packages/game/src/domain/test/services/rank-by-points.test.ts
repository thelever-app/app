import { describe, expect, it } from 'vitest';
import { rankByPoints } from '../../services/rank-by-points.ts';

describe('rankByPoints', () => {
  it('should order the players by their points, the most first', () => {
    // Act
    const ranking = rankByPoints([
      { playerId: 'TestAna', points: 120 },
      { playerId: 'TestLuis', points: 300 },
      { playerId: 'TestMarta', points: 210 },
    ]);

    // Assert
    expect(ranking).toEqual([
      { playerId: 'TestLuis', points: 300, position: 1, mentalist: true },
      { playerId: 'TestMarta', points: 210, position: 2, mentalist: false },
      { playerId: 'TestAna', points: 120, position: 3, mentalist: false },
    ]);
  });

  it('should share a position on a tie and skip the positions it takes', () => {
    // Act
    const ranking = rankByPoints([
      { playerId: 'TestAna', points: 200 },
      { playerId: 'TestLuis', points: 200 },
      { playerId: 'TestMarta', points: 150 },
      { playerId: 'TestSara', points: 150 },
      { playerId: 'TestNico', points: 90 },
    ]);

    // Assert
    expect(ranking.map(({ playerId, position }) => [playerId, position])).toEqual([
      ['TestAna', 1],
      ['TestLuis', 1],
      ['TestMarta', 3],
      ['TestSara', 3],
      ['TestNico', 5],
    ]);
    expect(ranking.filter(({ mentalist }) => mentalist).map(({ playerId }) => playerId)).toEqual([
      'TestAna',
      'TestLuis',
    ]);
  });

  it('should make nobody El Mentalista when nobody scored', () => {
    // Act
    const ranking = rankByPoints([
      { playerId: 'TestAna', points: 0 },
      { playerId: 'TestLuis', points: 0 },
    ]);

    // Assert
    expect(ranking.every(({ position, mentalist }) => position === 1 && !mentalist)).toBe(true);
  });
});
