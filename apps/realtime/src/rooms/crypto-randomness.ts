import { randomInt } from 'node:crypto';
import type { Randomness } from '@thelever-app/game';

/** Unpredictable, so nobody can guess a room code or which avatar or dilemma comes next. */
export class CryptoRandomness implements Randomness {
  integer(maxExclusive: number): number {
    return randomInt(maxExclusive);
  }
}
