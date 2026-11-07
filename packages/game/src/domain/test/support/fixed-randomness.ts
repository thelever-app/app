import type { Randomness } from '../../ports/randomness.port.ts';

/** Hands out the given numbers in order, then 0, so tests can steer every random choice. */
export class FixedRandomness implements Randomness {
  readonly #numbers: number[];

  constructor(...numbers: number[]) {
    this.#numbers = numbers;
  }

  integer(maxExclusive: number): number {
    const next = this.#numbers.shift() ?? 0;
    if (next >= maxExclusive) {
      throw new Error(`FixedRandomness was asked for less than ${maxExclusive} and had ${next}`);
    }
    return next;
  }
}
