/** What time it is: when an issue is opened, decided or a moderation notice is seen. */
export interface Clock {
  now(): Date;
}
