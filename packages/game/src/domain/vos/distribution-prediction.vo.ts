import { InvalidDistributionPredictionError } from '../errors/invalid-distribution-prediction.error.ts';
import { OptionNotInDilemmaError } from '../errors/option-not-in-dilemma.error.ts';

/** The share of the group a player believes will choose an option, in percent. */
export interface PredictedShare {
  readonly optionId: string;
  readonly share: number;
}

/** Every share is a multiple of it. */
export const SHARE_STEP = 5;

const WHOLE = 100;

/** The nearest step of a share, between 0 and 100. */
function toStep(share: number): number {
  return Math.min(WHOLE, Math.max(0, Math.round(share / SHARE_STEP) * SHARE_STEP));
}

/**
 * Splits an amount in steps among the weights: each one gets its proportion rounded down to a
 * step, and the steps left over go to the largest remainders, the first one first on a tie.
 * Without any weight, the amount is split evenly.
 */
function splitInSteps(amount: number, weights: readonly number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const exact = weights.map((weight) =>
    total > 0 ? (weight * amount) / total : amount / weights.length,
  );
  const shares = exact.map((share) => Math.floor(share / SHARE_STEP) * SHARE_STEP);
  let left = amount - shares.reduce((sum, share) => sum + share, 0);
  const byRemainder = exact
    .map((share, index) => ({ index, remainder: share - (shares[index] as number) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (left <= 0) break;
    shares[index] = (shares[index] as number) + SHARE_STEP;
    left -= SHARE_STEP;
  }
  return shares;
}

/**
 * In an anonymous room, the share of the group, the player included, a player believes will
 * choose each option of a dilemma: multiples of 5 that add up to 100, in the order the player
 * sees the options.
 */
export class DistributionPredictionVO {
  readonly #shares: readonly PredictedShare[];

  constructor(shares: readonly PredictedShare[]) {
    if (shares.length === 0) throw new InvalidDistributionPredictionError('needs an option');
    const optionIds = new Set(shares.map(({ optionId }) => optionId));
    if (optionIds.size !== shares.length) {
      throw new InvalidDistributionPredictionError('has each option once');
    }
    for (const { share } of shares) {
      if (!Number.isInteger(share) || share < 0 || share > WHOLE || share % SHARE_STEP !== 0) {
        throw new InvalidDistributionPredictionError(
          `has shares in steps of ${SHARE_STEP} %, not ${share}`,
        );
      }
    }
    if (shares.reduce((sum, { share }) => sum + share, 0) !== WHOLE) {
      throw new InvalidDistributionPredictionError('adds up to 100 %');
    }
    this.#shares = shares.map(({ optionId, share }) => ({ optionId, share }));
  }

  /** The even split where a prediction starts, the steps left over to the first options. */
  static even(optionOrder: readonly string[]): DistributionPredictionVO {
    const shares = splitInSteps(
      WHOLE,
      optionOrder.map(() => 1),
    );
    return new DistributionPredictionVO(
      optionOrder.map((optionId, index) => ({ optionId, share: shares[index] as number })),
    );
  }

  get shares(): readonly PredictedShare[] {
    return this.#shares.map(({ optionId, share }) => ({ optionId, share }));
  }

  shareOf(optionId: string): number {
    const found = this.#shares.find((each) => each.optionId === optionId);
    if (!found) throw new OptionNotInDilemmaError(optionId, 'of the prediction');
    return found.share;
  }

  /** Whether it has a share for each of those options and for no other. */
  coversExactly(optionIds: readonly string[]): boolean {
    return (
      optionIds.length === this.#shares.length &&
      optionIds.every((optionId) => this.#shares.some((each) => each.optionId === optionId))
    );
  }

  /**
   * The same prediction with that share for the option, to its nearest step: the other options
   * share what is left in proportion to what they had.
   */
  withShare(optionId: string, share: number): DistributionPredictionVO {
    this.shareOf(optionId);
    const moved = toStep(share);
    const others = this.#shares.filter((each) => each.optionId !== optionId);
    const split = splitInSteps(
      WHOLE - moved,
      others.map((each) => each.share),
    );
    return new DistributionPredictionVO(
      this.#shares.map((each) =>
        each.optionId === optionId
          ? { optionId, share: moved }
          : { optionId: each.optionId, share: split[others.indexOf(each)] as number },
      ),
    );
  }
}
