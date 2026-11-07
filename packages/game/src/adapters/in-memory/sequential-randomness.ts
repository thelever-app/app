import type { Randomness } from '../../domain/ports/randomness.port.ts';

/** Predictable numbers (0, 1, 2…, each below what is asked) so tests and the simulated room repeat themselves. */
export class SequentialRandomness implements Randomness {
  #next = 0;

  integer(maxExclusive: number): number {
    return this.#next++ % maxExclusive;
  }
}
