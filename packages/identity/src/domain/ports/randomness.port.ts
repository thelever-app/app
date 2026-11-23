/** Chance in Identity: the code for requests by email, which nobody may guess. */
export interface Randomness {
  /** A whole number from 0 up to, but not including, `maxExclusive`. */
  integer(maxExclusive: number): number;
}
