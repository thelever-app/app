import type { DistributionPredictionVO } from '../vos/distribution-prediction.vo.ts';
import { MAXIMUM_POINTS } from './score-predictions.ts';

/**
 * The points of a distribution prediction against how many chose each option: 100 × (1 − ½ Σ
 * |predicted − real|), with the real shares exact and only the points rounded. 100 when it is
 * right, 0 when it is the other way round.
 */
export function scoreDistributionPrediction(
  prediction: DistributionPredictionVO,
  distribution: readonly { readonly optionId: string; readonly count: number }[],
): number {
  const voters = distribution.reduce((total, { count }) => total + count, 0);
  // In hundredths of a voter, so the sum stays exact until the one division.
  const off = distribution.reduce(
    (total, { optionId, count }) =>
      total + Math.abs(prediction.shareOf(optionId) * voters - MAXIMUM_POINTS * count),
    0,
  );
  return Math.round(MAXIMUM_POINTS - off / (2 * voters));
}
