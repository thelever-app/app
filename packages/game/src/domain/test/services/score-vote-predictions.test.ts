import { describe, expect, it } from 'vitest';
import {
  pointsOfVotePrediction,
  scoreVotePredictions,
} from '../../services/score-vote-predictions.ts';

describe('pointsOfVotePrediction', () => {
  it.each([
    { same: 1, points: 78 },
    { same: 2, points: 55 },
    { same: 3, points: 33 },
    { same: 4, points: 10 },
  ])(
    'should give $points points when $same of 4 voters chose what the predicted player chose',
    ({ same, points }) => {
      // Arrange
      const votes = new Map([
        ['TestLuis', 'TestPull'],
        ...['TestAna', 'TestMarta', 'TestSara'].map((playerId, index): [string, string] => [
          playerId,
          index < same - 1 ? 'TestPull' : 'TestWait',
        ]),
      ]);

      // Act
      const scored = pointsOfVotePrediction(votes, { playerId: 'TestLuis', vote: 'TestPull' });

      // Assert
      expect(scored).toBe(points);
    },
  );

  it('should give nothing for a wrong prediction, nor for one about who did not vote', () => {
    // Arrange
    const votes = new Map([
      ['TestLuis', 'TestPull'],
      ['TestAna', 'TestWait'],
    ]);

    // Act
    const wrong = pointsOfVotePrediction(votes, { playerId: 'TestLuis', vote: 'TestWait' });
    const aboutNobody = pointsOfVotePrediction(votes, { playerId: 'TestMarta', vote: 'TestPull' });

    // Assert
    expect(wrong).toBe(0);
    expect(aboutNobody).toBe(0);
  });
});

describe('scoreVotePredictions', () => {
  it('should add up the points of each right prediction, each one rounded', () => {
    // Arrange
    const votes = new Map([
      ['TestAna', 'TestPull'],
      ['TestLuis', 'TestPull'],
      ['TestMarta', 'TestPull'],
      ['TestSara', 'TestWait'],
    ]);

    // Act
    const points = scoreVotePredictions({
      predictorIds: ['TestAna'],
      votes,
      predictionsOf: () => [
        { playerId: 'TestLuis', vote: 'TestPull' },
        { playerId: 'TestSara', vote: 'TestWait' },
        { playerId: 'TestMarta', vote: 'TestWait' },
      ],
    });

    // Assert
    expect(points.get('TestAna')).toBe(111);
  });

  it('should score 0 for predictions all wrong, and null for a player who made none', () => {
    // Arrange
    const votes = new Map([
      ['TestAna', 'TestPull'],
      ['TestLuis', 'TestWait'],
    ]);

    // Act
    const points = scoreVotePredictions({
      predictorIds: ['TestAna', 'TestLuis'],
      votes,
      predictionsOf: (playerId) =>
        playerId === 'TestAna' ? [{ playerId: 'TestLuis', vote: 'TestPull' }] : [],
    });

    // Assert
    expect(points).toEqual(
      new Map([
        ['TestAna', 0],
        ['TestLuis', null],
      ]),
    );
  });
});
