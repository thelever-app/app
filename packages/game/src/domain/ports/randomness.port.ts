/** Chance in the rules of the game: avatars, room codes and how a game is put together. */
export interface Randomness {
  /** A whole number from 0 up to, but not including, `maxExclusive`. */
  integer(maxExclusive: number): number;
}
