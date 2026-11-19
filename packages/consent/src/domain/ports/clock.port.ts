/** What time it is: each acceptance keeps when it was given. */
export interface Clock {
  now(): Date;
}
