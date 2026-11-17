import { InvalidPredictionError } from '../errors/invalid-prediction.error.ts';
import { InvalidWorldCountError } from '../errors/invalid-world-count.error.ts';

/** A prediction of the share of the world that voted the same: a whole percentage from 0 to 100. */
export function assertPrediction(prediction: number): void {
  if (!Number.isInteger(prediction) || prediction < 0 || prediction > 100) {
    throw new InvalidPredictionError(prediction);
  }
}

/** The answers from which the world result shows its figures: fewer would let anyone guess votes. */
export const MINIMUM_WORLD_ANSWERS = 20;

/**
 * How the world voted a version of a dilemma, its translations included, as published once a day:
 * the answers to each option, by its position.
 */
export class WorldResult {
  readonly #counts: readonly number[];

  constructor(counts: readonly number[]) {
    for (const count of counts) {
      if (!Number.isInteger(count) || count < 0) throw new InvalidWorldCountError(count);
    }
    this.#counts = [...counts];
  }

  get answers(): number {
    return this.#counts.reduce((total, count) => total + count, 0);
  }

  /** Whether it has answers enough to show its figures. */
  get isShown(): boolean {
    return this.answers >= MINIMUM_WORLD_ANSWERS;
  }

  /**
   * The share of each option in whole percentages that add up to 100: each one rounded down, and
   * the points left to the largest remainders, the first option first on a tie.
   */
  percentages(): number[] {
    const answers = this.answers;
    if (answers === 0) return this.#counts.map(() => 0);
    const exact = this.#counts.map((count) => (count * 100) / answers);
    const shares = exact.map(Math.floor);
    const left = 100 - shares.reduce((total, share) => total + share, 0);
    const byRemainder = exact
      .map((share, position) => ({ position, remainder: share - Math.floor(share) }))
      .sort((a, b) => b.remainder - a.remainder || a.position - b.position);
    for (const { position } of byRemainder.slice(0, left)) shares[position]! += 1;
    return shares;
  }

  /** How many points off a prediction of the share of the option at that position was. */
  predictionOff(position: number, prediction: number): number {
    assertPrediction(prediction);
    const share = this.percentages()[position];
    if (share === undefined) throw new RangeError(`the dilemma has no option at ${position}`);
    return Math.abs(prediction - share);
  }
}
