import type { Randomness } from '../../../domain/ports/randomness.port.ts';

/** Keeps every order as it was, since a shuffle swaps each item with itself, and picks the last option. */
export class KeepOrderRandomness implements Randomness {
  integer(maxExclusive: number): number {
    return maxExclusive - 1;
  }
}
