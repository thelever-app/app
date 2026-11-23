/** What time it is: each event is kept with it. */
export interface Clock {
  now(): Date;
}
