import { describe, expect, it } from 'vitest';
import { scoreDistributionPrediction } from '../../services/score-distribution-prediction.ts';
import { DistributionPredictionVO } from '../../vos/distribution-prediction.vo.ts';

/** A prediction over the options TestA and TestB, in that order. */
function predicted(first: number, second: number): DistributionPredictionVO {
  return new DistributionPredictionVO([
    { optionId: 'TestA', share: first },
    { optionId: 'TestB', share: second },
  ]);
}

/** How many voted TestA and TestB. */
function voted(first: number, second: number) {
  return [
    { optionId: 'TestA', count: first },
    { optionId: 'TestB', count: second },
  ];
}

describe('scoreDistributionPrediction', () => {
  it.each([
    [70, 30, 100],
    [50, 50, 80],
    [30, 70, 60],
    [0, 100, 30],
  ])('should give %i %% and %i %% against 7 to 3 its %i points', (first, second, points) => {
    // Act
    const scored = scoreDistributionPrediction(predicted(first, second), voted(7, 3));

    // Assert
    expect(scored).toBe(points);
  });

  it('should compare with the exact distribution and round only the points', () => {
    // Act
    const even = scoreDistributionPrediction(predicted(50, 50), voted(6, 3));
    const close = scoreDistributionPrediction(predicted(70, 30), voted(6, 3));

    // Assert
    expect(even).toBe(83);
    expect(close).toBe(97);
  });

  it('should score the options in the order of the distribution, whatever the order of the prediction', () => {
    // Arrange
    const prediction = new DistributionPredictionVO([
      { optionId: 'TestB', share: 30 },
      { optionId: 'TestA', share: 70 },
    ]);

    // Act
    const scored = scoreDistributionPrediction(prediction, voted(7, 3));

    // Assert
    expect(scored).toBe(100);
  });
});
