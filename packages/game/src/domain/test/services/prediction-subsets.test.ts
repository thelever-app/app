import { describe, expect, it } from 'vitest';
import { PREDICTION_LIMIT, predictionSubsets } from '../../services/prediction-subsets.ts';
import { SequentialRandomness } from '../../../adapters/in-memory/sequential-randomness.ts';
import { KeepOrderRandomness } from '../support/keep-order-randomness.ts';

function players(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `TestPlayer${index + 1}`);
}

describe('predictionSubsets', () => {
  it.each([
    [2, 1],
    [4, 3],
    [5, 4],
    [10, 4],
  ])('should give each of %i players subsets of %i other players', (count, size) => {
    // Act
    const subsets = predictionSubsets(players(count), 6, new SequentialRandomness());

    // Assert
    for (const [playerId, byDilemma] of subsets) {
      expect(byDilemma).toHaveLength(6);
      for (const subset of byDilemma) {
        expect(subset).toHaveLength(size);
        expect(subset).not.toContain(playerId);
        expect(new Set(subset).size).toBe(size);
      }
    }
  });

  it('should predict every player the same number of times in each dilemma', () => {
    // Act
    const subsets = predictionSubsets(players(10), 6, new SequentialRandomness());

    // Assert
    for (let position = 0; position < 6; position += 1) {
      const times = new Map<string, number>();
      for (const byDilemma of subsets.values()) {
        for (const predicted of byDilemma[position]!) {
          times.set(predicted, (times.get(predicted) ?? 0) + 1);
        }
      }
      expect(new Set(times.values())).toEqual(new Set([PREDICTION_LIMIT]));
    }
  });

  it('should change who a player predicts from one dilemma to the next', () => {
    // Act
    const subsets = predictionSubsets(players(10), 2, new KeepOrderRandomness());

    // Assert
    const [first, second] = subsets.get('TestPlayer1')!;
    expect(first).toEqual(['TestPlayer2', 'TestPlayer3', 'TestPlayer4', 'TestPlayer5']);
    expect(second).toEqual(['TestPlayer6', 'TestPlayer7', 'TestPlayer8', 'TestPlayer9']);
  });

  it('should give no one to predict to a player alone', () => {
    // Act & Assert
    expect(predictionSubsets(['TestPlayer1'], 2, new KeepOrderRandomness())).toEqual(
      new Map([['TestPlayer1', [[], []]]]),
    );
  });
});
